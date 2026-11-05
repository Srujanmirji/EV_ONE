import { randomUUID } from "node:crypto";
import { it, expect, vi } from "vitest";
import { CatalogueEditorService } from "./catalogue-editor.service.js";
import { catalogueDocument } from "../../test/fixtures/catalogue-document.js";
const actor = {
  issuer: "https://evone-local.clerk.accounts.dev",
  subject: "synthetic-editor",
};
const owner = randomUUID(),
  admin = randomUUID(),
  id = randomUUID();
function harness() {
  const tx = {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: admin,
        status: "ACTIVE",
        roles: [{ role: "ADMIN" }],
      }),
    },
    auditEvent: { create: vi.fn().mockResolvedValue({}) },
    catalogueDraft: {
      create: vi.fn().mockResolvedValue({
        id,
        ownerId: admin,
        document: catalogueDocument("unit"),
        version: 1,
        status: "DRAFT",
        modelId: null,
        reviewReason: null,
      }),
      findUnique: vi.fn().mockResolvedValue({
        id,
        ownerId: owner,
        document: catalogueDocument("unit"),
        version: 2,
        status: "IN_REVIEW",
        modelId: null,
        reviewReason: null,
      }),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    brand: {
      findUnique: vi.fn().mockResolvedValue({
        id: randomUUID(),
        name: "DEMO Editor unit",
        status: "PUBLISHED",
      }),
    },
    evModel: { findUnique: vi.fn().mockResolvedValue({ id: randomUUID() }) },
  };
  const db = {
    $transaction: vi.fn(
      async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  };
  return { tx, db, service: new CatalogueEditorService(db as never) };
}
it("loads database editor/admin grants and never releases a draft on audit failure", async () => {
  const h = harness();
  h.tx.auditEvent.create.mockRejectedValue(
    new Error("synthetic-private-details"),
  );
  await expect(
    h.service.run(actor, randomUUID(), {
      kind: "create",
      document: catalogueDocument("unit"),
    }),
  ).rejects.toMatchObject({ status: 503 });
  expect(h.tx.user.findUnique).toHaveBeenCalledWith({
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
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) as unknown } },
          ],
        },
      },
    },
  });
});
it("retries a slug uniqueness race so the conflict denial is committed with its request ID", async () => {
  const h = harness();
  h.db.$transaction.mockRejectedValueOnce({ code: "P2002" });
  const requestId = randomUUID();
  await expect(
    h.service.run(actor, requestId, {
      kind: "review",
      id,
      version: 2,
      decision: "APPROVE",
      reviewedSources: true,
    }),
  ).rejects.toMatchObject({ status: 409 });
  expect(h.db.$transaction).toHaveBeenCalledTimes(2);
  expect(h.tx.auditEvent.create).toHaveBeenCalledWith({
    data: {
      actorUserId: admin,
      scope: "ACCOUNT",
      scopeId: admin,
      resourceId: id,
      action: "CATALOGUE_REVIEW",
      outcome: "DENIED",
      requestId,
    },
  });
});
it("bounds retries and fails closed if database conflicts persist", async () => {
  const h = harness();
  h.db.$transaction.mockRejectedValue({ code: "P2002" });
  await expect(
    h.service.run(actor, randomUUID(), {
      kind: "create",
      document: catalogueDocument("unit"),
    }),
  ).rejects.toMatchObject({ status: 503 });
  expect(h.db.$transaction).toHaveBeenCalledTimes(2);
});
