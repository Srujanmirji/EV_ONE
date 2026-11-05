import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, it, expect } from "vitest";
import { createDbClient } from "../src/index.js";
const url = process.env.DATABASE_URL;
if (!url)
  throw new Error(
    "Catalogue draft tests need a migrated disposable DATABASE_URL",
  );
const db = createDbClient(url);
let owner: string, reviewer: string, modelId: string;
beforeAll(async () => {
  owner = (
    await db.user.create({
      data: {
        authIssuer: "https://draft-db.clerk.accounts.dev",
        authProviderId: randomUUID(),
      },
    })
  ).id;
  reviewer = (
    await db.user.create({
      data: {
        authIssuer: "https://draft-db.clerk.accounts.dev",
        authProviderId: randomUUID(),
      },
    })
  ).id;
  const brand = await db.brand.create({
    data: {
      name: "DEMO Draft Brand",
      slug: `demo-draft-${randomUUID()}`,
      isDemo: true,
      status: "PUBLISHED",
    },
  });
  modelId = (
    await db.evModel.create({
      data: {
        brandId: brand.id,
        name: "DEMO Draft Model",
        slug: "demo-model",
        vehicleType: "SCOOTER",
        isDemo: true,
        status: "PUBLISHED",
      },
    })
  ).id;
});
afterAll(async () => {
  await db.$disconnect();
});
it("defaults to private draft and enforces valid review/state relationships", async () => {
  const input = { ownerId: owner, document: { synthetic: true } };
  expect(await db.catalogueDraft.create({ data: input })).toMatchObject({
    version: 1,
    status: "DRAFT",
    modelId: null,
    reviewerId: null,
  });
  for (const patch of [
    { version: 0 },
    {
      status: "REJECTED" as const,
      reviewerId: reviewer,
      reviewedAt: new Date(),
    },
    {
      status: "PUBLISHED" as const,
      reviewerId: owner,
      reviewedAt: new Date(),
      modelId,
    },
    {
      status: "PUBLISHED" as const,
      reviewerId: reviewer,
      reviewedAt: new Date(),
    },
  ])
    await expect(
      db.catalogueDraft.create({ data: { ...input, ...patch } }),
    ).rejects.toThrow(/catalogue_draft_state/);
});
it("retains published snapshot and model/actor references; destructive probes always roll back", async () => {
  const snapshot = await db.catalogueDraft.create({
    data: {
      ownerId: owner,
      document: { synthetic: true },
      status: "PUBLISHED",
      reviewerId: reviewer,
      reviewedAt: new Date(),
      modelId,
    },
  });
  await expect(
    db.$transaction(async (tx) => {
      await tx.catalogueDraft.update({
        where: { id: snapshot.id },
        data: { version: 2 },
      });
      throw new Error("Unexpected mutation; roll back");
    }),
  ).rejects.toThrow(/immutable/);
  await expect(
    db.$transaction(async (tx) => {
      await tx.catalogueDraft.delete({ where: { id: snapshot.id } });
      throw new Error("Unexpected deletion; roll back");
    }),
  ).rejects.toThrow(/immutable/);
  expect(
    await db.catalogueDraft.findUnique({ where: { id: snapshot.id } }),
  ).toMatchObject({ version: 1, modelId });
  await expect(db.user.delete({ where: { id: reviewer } })).rejects.toThrow();
  await expect(db.evModel.delete({ where: { id: modelId } })).rejects.toThrow();
});
it("rolls back draft creation when audit insert fails", async () => {
  const id = randomUUID();
  await expect(
    db.$transaction(async (tx) => {
      await tx.catalogueDraft.create({
        data: { id, ownerId: owner, document: { synthetic: true } },
      });
      await tx.auditEvent.create({
        data: {
          actorUserId: randomUUID(),
          scope: "ACCOUNT",
          scopeId: owner,
          resourceId: id,
          action: "CATALOGUE_WRITE",
          outcome: "ALLOWED",
          requestId: randomUUID(),
        },
      });
    }),
  ).rejects.toThrow();
  expect(await db.catalogueDraft.findUnique({ where: { id } })).toBeNull();
});
