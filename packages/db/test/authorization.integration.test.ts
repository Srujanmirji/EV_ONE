import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createDbClient } from "../src/index.js";

const url = process.env.DATABASE_URL;
if (!url)
  throw new Error(
    "Authorization database tests require a migrated disposable DATABASE_URL",
  );
const db = createDbClient(url);
let userId: string;
let auditId: string;
const issuer = "https://evone-db-test.clerk.accounts.dev";
const subject = `synthetic_${randomUUID()}`;
beforeAll(async () => {
  const user = await db.user.create({
    data: { authIssuer: issuer, authProviderId: subject },
  });
  userId = user.id;
  auditId = (
    await db.auditEvent.create({
      data: {
        actorUserId: userId,
        scope: "ACCOUNT",
        scopeId: userId,
        outcome: "DENIED",
        requestId: randomUUID(),
      },
    })
  ).id;
});
afterAll(async () => {
  await db.$disconnect();
});
// Evidence and synthetic actors intentionally remain in the disposable test DB.
it("defaults new identities to suspended and keys identity by issuer and subject", async () => {
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: userId } })).status,
  ).toBe("SUSPENDED");
  await expect(
    db.user.create({ data: { authIssuer: issuer, authProviderId: subject } }),
  ).rejects.toThrow();
  await expect(
    db.user.create({
      data: {
        authIssuer: "https://another.clerk.accounts.dev",
        authProviderId: subject,
      },
    }),
  ).resolves.toBeDefined();
});
it("rejects empty identity fields", async () => {
  await expect(
    db.user.create({ data: { authIssuer: issuer, authProviderId: "   " } }),
  ).rejects.toThrow(/users_auth_identity_check/);
});
it("enforces unique global grants even with nullable scope IDs", async () => {
  await db.roleAssignment.create({
    data: { userId, role: "USER", scopeType: "GLOBAL" },
  });
  await expect(
    db.roleAssignment.create({
      data: { userId, role: "USER", scopeType: "GLOBAL" },
    }),
  ).rejects.toThrow();
});
it("enforces dealer grant uniqueness per dealer while allowing different dealers", async () => {
  const scopeId = randomUUID();
  await db.roleAssignment.create({
    data: { userId, role: "DEALER_STAFF", scopeType: "DEALER", scopeId },
  });
  await expect(
    db.roleAssignment.create({
      data: { userId, role: "DEALER_STAFF", scopeType: "DEALER", scopeId },
    }),
  ).rejects.toThrow();
  await expect(
    db.roleAssignment.create({
      data: {
        userId,
        role: "DEALER_STAFF",
        scopeType: "DEALER",
        scopeId: randomUUID(),
      },
    }),
  ).resolves.toBeDefined();
});
it.each([
  {
    role: "USER" as const,
    scopeType: "DEALER" as const,
    scopeId: randomUUID(),
  },
  {
    role: "DEALER_STAFF" as const,
    scopeType: "GLOBAL" as const,
    scopeId: null,
  },
  {
    role: "ADMIN" as const,
    scopeType: "GLOBAL" as const,
    scopeId: randomUUID(),
  },
])("rejects invalid role/scope combinations", async (grant) => {
  await expect(
    db.roleAssignment.create({ data: { userId, ...grant } }),
  ).rejects.toThrow(/role_assignments_scope_check/);
});
it.each(["UPDATE", "DELETE", "TRUNCATE"])(
  "rejects audit %s; test always rolls back even if protection regresses",
  async (operation) => {
    await expect(
      db.$transaction(async (tx) => {
        if (operation === "UPDATE")
          await tx.$executeRaw`UPDATE audit_events SET outcome = 'ALLOWED' WHERE id = ${auditId}::uuid`;
        if (operation === "DELETE")
          await tx.$executeRaw`DELETE FROM audit_events WHERE id = ${auditId}::uuid`;
        if (operation === "TRUNCATE")
          await tx.$executeRaw`TRUNCATE audit_events`;
        throw new Error("Unexpected audit mutation allowed; roll back");
      }),
    ).rejects.toThrow(/append-only/);
    expect(
      await db.auditEvent.findUnique({ where: { id: auditId } }),
    ).toMatchObject({ outcome: "DENIED" });
  },
);
it("prevents removing an actor referenced only by immutable evidence", async () => {
  const actor = await db.user.create({
    data: { authIssuer: issuer, authProviderId: `audit_only_${randomUUID()}` },
  });
  await db.auditEvent.create({
    data: {
      actorUserId: actor.id,
      scope: "ACCOUNT",
      scopeId: actor.id,
      outcome: "DENIED",
      requestId: randomUUID(),
    },
  });
  await expect(db.user.delete({ where: { id: actor.id } })).rejects.toThrow(
    /audit_events_actor_user_id_fkey/,
  );
});
