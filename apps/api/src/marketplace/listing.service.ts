import { randomUUID } from "node:crypto";
import {
  Inject,
  Injectable,
  HttpException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { DbClient } from "@evone/db";
import type {
  SellerListing,
  SellerListingResponse,
  SellerListingListResponse,
  ListingFields,
} from "@evone/contracts";
import { DB_CLIENT } from "../database/database.token.js";
import type { AuthenticatedActor } from "../identity/verify.js";
import { reportError } from "../observability/telemetry.js";

type Command =
  | { kind: "list"; cursor?: string }
  | { kind: "create" }
  | { kind: "get"; id: string }
  | { kind: "save"; id: string; version: number; fields: ListingFields }
  | { kind: "submit"; id: string; version: number; sellerDeclaration: true }
  | {
      kind: "attach";
      id: string;
      version: number;
      mediaAssetId: string;
      alt: string;
    }
  | { kind: "photo"; id: string; photoId: string; version: number; alt: string }
  | { kind: "remove"; id: string; photoId: string; version: number };
const include = {
  variant: { include: { model: { include: { brand: true } } } },
  media: { orderBy: { position: "asc" as const } },
  reviews: { orderBy: { listingVersion: "desc" as const }, take: 1 },
};
type Row = Awaited<ReturnType<DbClient["listing"]["findUniqueOrThrow"]>> & {
  variant: {
    name: string;
    status: string;
    model: {
      id: string;
      slug: string;
      name: string;
      status: string;
      vehicleType: NonNullable<ListingFields["preferredVehicleType"]>;
      brand: { id: string; slug: string; name: string; status: string };
    };
  } | null;
  media: { id: string; mediaAssetId: string; position: number; alt: string }[];
  reviews: { reason: string | null }[];
};
function view(row: Row): SellerListing {
  const canonical =
    row.variant?.status === "PUBLISHED" &&
    row.variant.model.status === "PUBLISHED" &&
    row.variant.model.brand.status === "PUBLISHED"
      ? {
          brand: row.variant.model.brand.name,
          brandId: row.variant.model.brand.id,
          brandSlug: row.variant.model.brand.slug,
          model: row.variant.model.name,
          modelId: row.variant.model.id,
          modelSlug: row.variant.model.slug,
          variant: row.variant.name,
          vehicleType: row.variant.model.vehicleType,
        }
      : null;
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    fields: {
      preferredVehicleType:
        row.preferredVehicleType ?? canonical?.vehicleType ?? null,
      variantId: row.variantId,
      year: row.year,
      odometerKm: row.odometerKm,
      city: row.city,
      askingPricePaise: row.askingPricePaise?.toString() ?? null,
      ownershipCount: row.ownershipCount,
      conditionNotes: row.conditionNotes,
    },
    canonical,
    media: row.media.map(({ id, mediaAssetId, position, alt }) => ({
      id,
      mediaAssetId,
      position,
      alt,
    })),
    reviewReason:
      row.status === "REJECTED" ? (row.reviews[0]?.reason ?? null) : null,
  };
}
@Injectable()
export class ListingService {
  constructor(@Inject(DB_CLIENT) private readonly db: DbClient) {}
  async run(
    actor: AuthenticatedActor,
    requestId: string,
    command: Command,
  ): Promise<{
    data: SellerListing | SellerListingListResponse["data"];
    meta: SellerListingResponse["meta"];
  }> {
    const id = "id" in command ? command.id.toLowerCase() : randomUUID();
    let userId: string | null = null;
    const action =
      command.kind === "submit" ? "LISTING_SUBMIT" : "LISTING_ACCESS";
    try {
      const result = await this.db.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: {
            authIssuer_authProviderId: {
              authIssuer: actor.issuer,
              authProviderId: actor.subject,
            },
          },
          include: {
            roles: {
              where: {
                active: true,
                scopeType: "GLOBAL",
                scopeId: null,
                role: { in: ["USER", "ADMIN"] },
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              },
            },
          },
        });
        userId = user?.id ?? null;
        const audit = (allowed: boolean) =>
          tx.auditEvent.create({
            data: {
              actorUserId: userId,
              scope: "ACCOUNT",
              scopeId: userId ?? id,
              resourceId: command.kind === "list" ? null : id,
              action,
              outcome: allowed ? "ALLOWED" : "DENIED",
              requestId,
            },
          });
        const deny = async (status: number, message: string) => {
          await audit(false);
          return { error: { status, message } };
        };
        if (!user || user.status !== "ACTIVE" || !user.roles.length)
          return deny(403, "Active seller permission required");
        if (command.kind === "list") {
          const rows = await tx.listing.findMany({
            where: {
              sellerUserId: user.id,
              ...(command.cursor
                ? { id: { gt: command.cursor.toLowerCase() } }
                : {}),
            },
            orderBy: { id: "asc" },
            take: 21,
            include: { variant: { include: { model: true } } },
          });
          await audit(true);
          return {
            data: {
              items: rows.slice(0, 20).map((row) => ({
                id: row.id,
                status: row.status,
                version: row.version,
                label: row.variant
                  ? `${row.variant.model.name} · ${row.variant.name}`
                  : null,
                updatedAt: row.updatedAt.toISOString(),
              })),
              nextCursor: rows.length > 20 ? rows[19]!.id : null,
            },
          };
        }
        await tx.$queryRaw`SELECT set_config('evone.actor_id',${user.id},true),set_config('evone.request_id',${requestId},true)`;
        if (command.kind === "create") {
          const row = await tx.listing.create({
            data: { id, sellerUserId: user.id, slug: `demo-${id}` },
            include,
          });
          await audit(true);
          return { data: view(row) };
        }
        await tx.$queryRaw`SELECT id FROM listings WHERE id=${id}::uuid FOR UPDATE`;
        const row = await tx.listing.findUnique({ where: { id }, include });
        if (!row || row.sellerUserId !== user.id)
          return deny(404, "Draft not found");
        if (command.kind === "get") {
          await audit(true);
          return { data: view(row) };
        }
        if (row.version !== command.version)
          return deny(
            409,
            "This draft changed. Reload the saved revision before continuing.",
          );
        if (!["DRAFT", "REJECTED"].includes(row.status))
          return deny(409, "Only a draft or rejected listing can be edited");
        if (command.kind === "save") {
          const fields = command.fields;
          if (
            fields.year !== null &&
            fields.year > new Date().getUTCFullYear() + 1
          )
            return deny(400, "Model year cannot be later than next year");
          if (fields.variantId) {
            const variant = await tx.evVariant.findFirst({
              where: {
                id: fields.variantId,
                status: "PUBLISHED",
                model: { status: "PUBLISHED", brand: { status: "PUBLISHED" } },
              },
              include: { model: true },
            });
            if (!variant)
              return deny(400, "Choose an available published variant");
            if (
              fields.preferredVehicleType &&
              fields.preferredVehicleType !== variant.model.vehicleType
            )
              return deny(400, "The variant must match the vehicle type");
          }
          const updated = await tx.listing.update({
            where: { id, version: command.version },
            data: {
              ...fields,
              askingPricePaise:
                fields.askingPricePaise === null
                  ? null
                  : BigInt(fields.askingPricePaise),
              status: "DRAFT",
              version: { increment: 1 },
            },
            include,
          });
          await audit(true);
          return { data: view(updated) };
        }
        if (command.kind === "submit") {
          if (row.status !== "DRAFT")
            return deny(409, "Save the revised draft before submitting");
          if (
            !row.variantId ||
            row.year === null ||
            row.odometerKm === null ||
            !row.city ||
            !row.askingPricePaise ||
            row.ownershipCount === null ||
            !row.conditionNotes ||
            row.media.length === 0
          )
            return deny(
              400,
              "Complete the vehicle fields and add at least one validated photo",
            );
          const updated = await tx.listing.update({
            where: { id, version: command.version },
            data: { status: "PENDING_REVIEW", version: { increment: 1 } },
            include,
          });
          await audit(true);
          return { data: view(updated) };
        }
        if (command.kind === "attach") {
          if (row.media.length >= 12)
            return deny(400, "A listing can contain at most 12 photos");
          const asset = await tx.mediaAsset.findUnique({
            where: { id: command.mediaAssetId.toLowerCase() },
          });
          if (!asset || asset.ownerId !== user.id)
            return deny(404, "Photo not found");
          if (asset.status !== "READY")
            return deny(400, "Complete photo validation before attaching it");
          const position = Array.from({ length: 12 }, (_, index) => index).find(
            (index) => !row.media.some((photo) => photo.position === index),
          )!;
          await tx.listingMedia.create({
            data: {
              listingId: id,
              mediaAssetId: asset.id,
              position,
              alt: command.alt,
            },
          });
        } else {
          const photo = row.media.find(
            (item) => item.id === command.photoId.toLowerCase(),
          );
          if (!photo) return deny(404, "Photo not found");
          if (command.kind === "photo")
            await tx.listingMedia.update({
              where: { id: photo.id },
              data: { alt: command.alt },
            });
          else await tx.listingMedia.delete({ where: { id: photo.id } });
        }
        const updated = await tx.listing.findUniqueOrThrow({
          where: { id },
          include,
        });
        await audit(true);
        return { data: view(updated) };
      });
      if ("error" in result)
        throw new HttpException(result.error.message, result.error.status);
      return { data: result.data, meta: { requestId } };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      reportError("listing.operation_failed", { requestId });
      // A trigger failure aborts its transaction; denial evidence needs a fresh one.
      try {
        await this.db.auditEvent.create({
          data: {
            actorUserId: userId,
            scope: "ACCOUNT",
            scopeId: userId ?? id,
            resourceId: command.kind === "list" ? null : id,
            action,
            outcome: "DENIED",
            requestId,
          },
        });
      } catch {
        throw new ServiceUnavailableException();
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        ["P2002", "P2003", "P2004", "P2010", "P2025", "P2034"].includes(
          String(error.code),
        )
      )
        throw new HttpException(
          "The draft or its references changed. Reload and check the vehicle and photos.",
          409,
        );
      throw new ServiceUnavailableException();
    }
  }
}
