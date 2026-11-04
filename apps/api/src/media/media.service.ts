import { randomUUID } from "node:crypto";
import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { DbClient } from "@evone/db";
import type { MediaUploadRequest } from "@evone/contracts";
import { API_CONFIG } from "../config/config.token.js";
import type { ApiConfig } from "../config/env.js";
import { DB_CLIENT } from "../database/database.token.js";
import type { AuthenticatedActor } from "../identity/verify.js";
import { MediaStorage } from "./storage.js";
import { InvalidImage, sanitizeImage } from "./image.js";
import { reportError } from "../observability/telemetry.js";

type Action = "MEDIA_UPLOAD" | "MEDIA_COMPLETE" | "MEDIA_READ";

@Injectable()
export class MediaService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    private readonly storage: MediaStorage,
    @Inject(API_CONFIG) private readonly config: ApiConfig,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    action: Action,
    requestId: string,
    id: string,
    input?: MediaUploadRequest,
  ) {
    if (this.config.media.mode === "disabled")
      throw new ServiceUnavailableException();
    // shortcut: small local images hold a row lock during bounded processing; use a worker before production volume.
    const result = await this.db.$transaction(
      async (tx) => {
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
        const audit = (allowed: boolean) =>
          tx.auditEvent.create({
            data: {
              actorUserId: user?.id ?? null,
              scope: "ACCOUNT",
              scopeId: user?.id ?? id,
              action,
              resourceId: id,
              outcome: allowed ? "ALLOWED" : "DENIED",
              requestId,
            },
          });
        if (!user || user.status !== "ACTIVE" || user.roles.length === 0) {
          await audit(false);
          return { error: 403 as const };
        }
        if (action === "MEDIA_UPLOAD") {
          if (!input) throw new Error("Missing validated media input");
          const expiresAt = new Date(Date.now() + 300_000);
          const uploadUrl = await this.storage.uploadUrl(
            `quarantine/${user.id}/${id}`,
            input.contentType,
            input.sizeBytes,
          );
          await tx.mediaAsset.create({
            data: { id, ownerId: user.id, ...input, expiresAt },
          });
          await audit(true);
          return {
            data: {
              id,
              uploadUrl,
              expiresAt: expiresAt.toISOString(),
              headers: { "Content-Type": input.contentType },
            },
          };
        }
        // Lock before reading state; concurrent completions cannot replace the sanitized object.
        await tx.$queryRaw`SELECT id FROM media_assets WHERE id = ${id}::uuid FOR UPDATE`;
        const asset = await tx.mediaAsset.findUnique({ where: { id } });
        if (!asset || asset.ownerId !== user.id) {
          await audit(false);
          return { error: 404 as const };
        }
        if (action === "MEDIA_READ") {
          if (asset.status !== "READY") {
            await audit(false);
            return { error: 400 as const };
          }
          const readUrl = await this.storage.readUrl(asset.objectKey!);
          await audit(true);
          return { data: { readUrl, expiresInSeconds: 60 as const } };
        }
        if (asset.status === "READY") {
          await audit(true);
          return { data: { id, status: "READY" as const } };
        }
        if (asset.status !== "PENDING" || asset.expiresAt <= new Date()) {
          await audit(false);
          return { error: 400 as const };
        }
        const objectKey = `ready/${id}/${randomUUID()}.webp`;
        try {
          const original = await this.storage.original(
            `quarantine/${user.id}/${id}`,
            asset.contentType,
            asset.sizeBytes,
          );
          const safe = await sanitizeImage(original, asset.contentType);
          await this.storage.store(objectKey, safe);
        } catch (error) {
          if (!(error instanceof InvalidImage)) throw error;
          await tx.mediaAsset.update({
            where: { id },
            data: { status: "REJECTED" },
          });
          await audit(false);
          return { error: 400 as const };
        }
        await tx.mediaAsset.update({
          where: { id },
          data: { status: "READY", objectKey },
        });
        await audit(true);
        return {
          data: { id, status: "READY" as const },
          cleanup: `quarantine/${user.id}/${id}`,
        };
      },
      { timeout: 20_000 },
    );
    if ("error" in result) {
      if (result.error === 403) throw new ForbiddenException();
      if (result.error === 404) throw new NotFoundException();
      throw new BadRequestException("Media is invalid, expired or unavailable");
    }
    if ("cleanup" in result && result.cleanup) {
      try {
        await this.storage.remove(result.cleanup);
      } catch {
        reportError("media.cleanup_failed", {});
      }
    }
    return { data: result.data, meta: { requestId } };
  }

  async run(
    actor: AuthenticatedActor,
    action: Action,
    requestId: string,
    id: string = randomUUID(),
    input?: MediaUploadRequest,
  ) {
    try {
      return await this.execute(
        actor,
        action,
        requestId,
        id.toLowerCase(),
        input,
      );
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      // Storage errors can contain signed URLs; report a fixed event, never the SDK error.
      reportError("media.operation_failed", {});
      throw new ServiceUnavailableException();
    }
  }
}
