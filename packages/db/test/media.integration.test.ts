import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, it, expect } from "vitest";
import { createDbClient } from "../src/index.js";
const url = process.env.DATABASE_URL;
if (!url)
  throw new Error("Media tests require a migrated disposable DATABASE_URL");
const db = createDbClient(url);
let owner: string;
beforeAll(async () => {
  owner = (
    await db.user.create({
      data: {
        authIssuer: "https://media-db-test.clerk.accounts.dev",
        authProviderId: `media_${randomUUID()}`,
      },
    })
  ).id;
});
afterAll(async () => {
  await db.$disconnect();
});
const input = () => ({
  ownerId: owner,
  contentType: "image/png",
  sizeBytes: 100,
  expiresAt: new Date(Date.now() + 300000),
});
it("defaults media to pending and refuses invalid type/size and missing owner", async () => {
  const asset = await db.mediaAsset.create({ data: input() });
  expect(asset.status).toBe("PENDING");
  expect(asset.objectKey).toBeNull();
  for (const patch of [
    { contentType: "image/svg+xml" },
    { sizeBytes: 0 },
    { sizeBytes: 5242881 },
    { ownerId: randomUUID() },
  ])
    await expect(
      db.mediaAsset.create({ data: { ...input(), ...patch } }),
    ).rejects.toThrow();
});
it("ready status requires a committed object key and pending cannot expose one", async () => {
  await expect(
    db.mediaAsset.create({ data: { ...input(), status: "READY" } }),
  ).rejects.toThrow(/media_ready_object/);
  await expect(
    db.mediaAsset.create({
      data: { ...input(), objectKey: "ready/uncommitted.webp" },
    }),
  ).rejects.toThrow(/media_ready_object/);
});
it("rolls back the asset when its audit append fails", async () => {
  const id = randomUUID();
  await expect(
    db.$transaction(async (tx) => {
      await tx.mediaAsset.create({ data: { id, ...input() } });
      await tx.auditEvent.create({
        data: {
          actorUserId: randomUUID(),
          scope: "ACCOUNT",
          scopeId: owner,
          resourceId: id,
          action: "MEDIA_UPLOAD",
          outcome: "ALLOWED",
          requestId: randomUUID(),
        },
      });
    }),
  ).rejects.toThrow();
  expect(await db.mediaAsset.findUnique({ where: { id } })).toBeNull();
});
it("media audit retains an immutable target even for a missing resource", async () => {
  const id = randomUUID();
  const audit = await db.auditEvent.create({
    data: {
      actorUserId: owner,
      scope: "ACCOUNT",
      scopeId: owner,
      resourceId: id,
      action: "MEDIA_READ",
      outcome: "DENIED",
      requestId: randomUUID(),
    },
  });
  expect(audit.resourceId).toBe(id);
  await expect(
    db.$transaction(async (tx) => {
      await tx.auditEvent.update({
        where: { id: audit.id },
        data: { resourceId: randomUUID() },
      });
      throw new Error("Unexpected audit mutation allowed; roll back");
    }),
  ).rejects.toThrow(/append-only/);
});
