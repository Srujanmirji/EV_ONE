import { Inject, Injectable } from "@nestjs/common";
import type { DbClient } from "@evone/db";
import { DB_CLIENT } from "../database/database.token.js";
import type { AuthenticatedActor } from "./verify.js";

@Injectable()
export class AuthorizationService {
  constructor(@Inject(DB_CLIENT) private readonly db: DbClient) {}

  // shortcut: scope-read probes only; add action policies before domain mutations.
  async check(
    actor: AuthenticatedActor,
    scope: "account" | "dealer",
    scopeId: string,
    requestId: string,
  ): Promise<boolean> {
    scopeId = scopeId.toLowerCase();
    return this.db.$transaction(
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
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              },
            },
          },
        });
        const allowed =
          user?.status === "ACTIVE" &&
          user.roles.some((grant) =>
            scope === "account"
              ? user.id === scopeId &&
                grant.scopeType === "GLOBAL" &&
                grant.scopeId === null &&
                ["USER", "ADMIN"].includes(grant.role)
              : grant.scopeType === "DEALER" &&
                grant.scopeId === scopeId &&
                ["DEALER_STAFF", "DEALER_OWNER"].includes(grant.role),
          );
        // Commit denial evidence before the guard throws; audit failure denies access.
        await tx.auditEvent.create({
          data: {
            actorUserId: user?.id ?? null,
            scope: scope === "account" ? "ACCOUNT" : "DEALER",
            scopeId,
            outcome: allowed ? "ALLOWED" : "DENIED",
            requestId,
          },
        });
        return allowed;
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
}
