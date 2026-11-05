import { randomUUID } from "node:crypto";
import {
  Inject,
  Injectable,
  HttpException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { DbClient } from "@evone/db";
import { CatalogueDocument, missingCatalogueSources } from "@evone/contracts";
import type {
  CatalogueDraftView,
  CatalogueDraftResponse,
  CatalogueDraftListResponse,
} from "@evone/contracts";
import type { AuthenticatedActor } from "../identity/verify.js";
import { DB_CLIENT } from "../database/database.token.js";
import { reportError } from "../observability/telemetry.js";

type Command =
  | { kind: "list"; cursor?: string }
  | { kind: "get"; id: string }
  | { kind: "create"; document: CatalogueDocument }
  | { kind: "save"; id: string; version: number; document: CatalogueDocument }
  | { kind: "submit"; id: string; version: number }
  | {
      kind: "review";
      id: string;
      version: number;
      decision: "APPROVE" | "REJECT";
      reason?: string;
      reviewedSources: boolean;
    };

@Injectable()
export class CatalogueEditorService {
  constructor(@Inject(DB_CLIENT) private readonly db: DbClient) {}
  async run(
    actor: AuthenticatedActor,
    requestId: string,
    command: Command,
    retryConflict = true,
  ): Promise<{
    data: CatalogueDraftView | CatalogueDraftListResponse["data"];
    meta: CatalogueDraftResponse["meta"];
  }> {
    const id = "id" in command ? command.id.toLowerCase() : randomUUID();
    const action =
      command.kind === "list" || command.kind === "get"
        ? "CATALOGUE_READ"
        : command.kind === "submit"
          ? "CATALOGUE_SUBMIT"
          : command.kind === "review"
            ? "CATALOGUE_REVIEW"
            : "CATALOGUE_WRITE";
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
                role: { in: ["EDITOR", "ADMIN"] },
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              },
            },
          },
        });
        const admin =
          user?.roles.some((role) => role.role === "ADMIN") ?? false;
        const audit = (allowed: boolean) =>
          tx.auditEvent.create({
            data: {
              actorUserId: user?.id ?? null,
              scope: "ACCOUNT",
              scopeId: user?.id ?? id,
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
        if (!user || user.status !== "ACTIVE" || user.roles.length === 0)
          return deny(403, "Catalogue permission required");
        if (command.kind === "list") {
          const rows = await tx.catalogueDraft.findMany({
            where: {
              ...(admin ? {} : { ownerId: user.id }),
              ...(command.cursor
                ? { id: { gt: command.cursor.toLowerCase() } }
                : {}),
            },
            orderBy: { id: "asc" },
            take: 21,
            select: { id: true, document: true, version: true, status: true },
          });
          const items = rows.slice(0, 20).map((row) => ({
            id: row.id,
            name: CatalogueDocument.parse(row.document).model.name,
            version: row.version,
            status: row.status,
          }));
          await audit(true);
          return {
            data: {
              role: admin ? ("ADMIN" as const) : ("EDITOR" as const),
              items,
              nextCursor: rows.length > 20 ? items.at(-1)!.id : null,
            },
          };
        }
        const view = (row: {
          id: string;
          document: unknown;
          version: number;
          status: CatalogueDraftView["status"];
          ownerId: string;
          reviewerId: string | null;
          updatedAt: Date;
          reviewReason: string | null;
          modelId: string | null;
        }): CatalogueDraftView => ({
          id: row.id,
          document: CatalogueDocument.parse(row.document),
          version: row.version,
          updatedAt: row.updatedAt.toISOString(),
          lastActorId: row.reviewerId ?? row.ownerId,
          status: row.status,
          reviewReason: row.reviewReason,
          modelId: row.modelId,
          isOwner: row.ownerId === user.id,
          canReview:
            admin && row.ownerId !== user.id && row.status === "IN_REVIEW",
        });
        if (command.kind === "create") {
          const draft = await tx.catalogueDraft.create({
            data: { id, ownerId: user.id, document: command.document },
          });
          await audit(true);
          return { data: view(draft) };
        }
        await tx.$queryRaw`SELECT id FROM catalogue_drafts WHERE id = ${id}::uuid FOR UPDATE`;
        const draft = await tx.catalogueDraft.findUnique({ where: { id } });
        if (!draft || (!admin && draft.ownerId !== user.id))
          return deny(404, "Draft not found");
        if (command.kind === "get") {
          await audit(true);
          return { data: view(draft) };
        }
        if (command.kind !== "review" && draft.ownerId !== user.id)
          return deny(403, "Only the draft owner can change it");
        if (command.kind === "review" && (!admin || draft.ownerId === user.id))
          return deny(403, "A different admin must review this draft");
        if (command.version !== draft.version)
          return deny(409, "This draft changed. Reload before continuing.");
        if (command.kind === "save") {
          if (!["DRAFT", "REJECTED"].includes(draft.status))
            return deny(409, "Only a draft or rejected entry can be edited");
          const updated = await tx.catalogueDraft.update({
            where: { id },
            data: {
              document: command.document,
              status: "DRAFT",
              version: { increment: 1 },
              reviewReason: null,
              reviewerId: null,
              reviewedAt: null,
            },
          });
          await audit(true);
          return { data: view(updated) };
        }
        const document = CatalogueDocument.parse(draft.document);
        if (command.kind === "submit") {
          if (draft.status !== "DRAFT")
            return deny(409, "Only a saved draft can be submitted");
          if (missingCatalogueSources(document).length)
            return deny(400, "Add a citation for every stated specification");
          const updated = await tx.catalogueDraft.update({
            where: { id },
            data: { status: "IN_REVIEW", version: { increment: 1 } },
          });
          await audit(true);
          return { data: view(updated) };
        }
        if (draft.status !== "IN_REVIEW")
          return deny(409, "Only a submitted draft can be reviewed");
        const reviewedAt = new Date();
        if (command.decision === "REJECT") {
          const updated = await tx.catalogueDraft.update({
            where: { id },
            data: {
              status: "REJECTED",
              version: { increment: 1 },
              reviewerId: user.id,
              reviewedAt,
              reviewReason: command.reason!,
            },
          });
          await audit(true);
          return { data: view(updated) };
        }
        if (
          !command.reviewedSources ||
          missingCatalogueSources(document).length
        )
          return deny(400, "Review all cited sources before approval");
        let brand = await tx.brand.findUnique({
          where: { slug: document.brand.slug },
        });
        if (
          brand &&
          (brand.name !== document.brand.name || brand.status !== "PUBLISHED")
        )
          return deny(
            409,
            "Brand slug already belongs to a different or unpublished brand",
          );
        if (
          brand &&
          (await tx.evModel.findUnique({
            where: {
              brandId_slug: { brandId: brand.id, slug: document.model.slug },
            },
          }))
        )
          return deny(409, "This model slug is already in use");
        if (!brand)
          brand = await tx.brand.create({
            data: { ...document.brand, status: "PUBLISHED", isDemo: true },
          });
        const model = await tx.evModel.create({
          data: {
            brandId: brand.id,
            name: document.model.name,
            slug: document.model.slug,
            vehicleType: document.model.vehicleType,
            availabilityStatus: document.model.availability,
            releaseDate: document.model.releaseDate
              ? new Date(document.model.releaseDate)
              : null,
            status: "PUBLISHED",
            isDemo: true,
          },
        });
        for (const variant of document.variants) {
          const { claimedRange, ...specs } = variant.specs;
          const created = await tx.evVariant.create({
            data: {
              modelId: model.id,
              name: variant.name,
              slug: variant.slug,
              ...specs,
              claimedRangeKm: claimedRange?.km ?? null,
              rangeStandard: claimedRange?.standard ?? null,
              status: "PUBLISHED",
              isDemo: true,
            },
          });
          for (const source of variant.sources)
            await tx.specSource.create({
              data: {
                variantId: created.id,
                ...source,
                effectiveAt: source.effectiveAt
                  ? new Date(source.effectiveAt)
                  : null,
                reviewerId: user.id,
                reviewedAt,
              },
            });
        }
        const updated = await tx.catalogueDraft.update({
          where: { id },
          data: {
            status: "PUBLISHED",
            version: { increment: 1 },
            reviewerId: user.id,
            reviewedAt,
            reviewReason: null,
            modelId: model.id,
          },
        });
        await audit(true);
        return { data: view(updated) };
      });
      if ("error" in result)
        throw new HttpException(result.error.message, result.error.status);
      return { data: result.data, meta: { requestId } };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      // A competing publisher may win after the precheck; retry once to commit the denial audit.
      if (
        retryConflict &&
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      )
        return this.run(actor, requestId, command, false);
      reportError("catalogue.editor_failed", { requestId });
      throw new ServiceUnavailableException();
    }
  }
}
