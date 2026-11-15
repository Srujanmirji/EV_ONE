import { randomUUID } from "node:crypto";
import { it, expect, vi } from "vitest";
import { ListingService } from "./listing.service.js";

const actor = {
  issuer: "https://evone-local.clerk.accounts.dev",
  subject: "synthetic-seller",
};
const owner = randomUUID();
const id = randomUUID();

function harness() {
  const tx = {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: owner,
        status: "ACTIVE",
        roles: [{ role: "USER" }],
      }),
    },
    auditEvent: { create: vi.fn().mockResolvedValue({}) },
    $queryRaw: vi.fn().mockResolvedValue([]),
    listing: {
      create: vi.fn().mockResolvedValue({
        id,
        sellerUserId: owner,
        preferredVehicleType: null,
        variantId: null,
        slug: `demo-${id}`,
        year: null,
        odometerKm: null,
        city: null,
        askingPricePaise: null,
        ownershipCount: null,
        conditionNotes: null,
        status: "DRAFT",
        version: 1,
        updatedAt: new Date("2026-11-05T08:00:00.000Z"),
        variant: null,
        media: [],
        reviews: [],
      }),
    },
  };
  const db = {
    auditEvent: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(
      async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  };
  return { tx, db, service: new ListingService(db as never) };
}

it("loads database seller grants and never releases a draft on audit failure", async () => {
  const h = harness();
  h.tx.auditEvent.create.mockRejectedValue(
    new Error("synthetic-private-details"),
  );
  await expect(
    h.service.run(actor, randomUUID(), { kind: "create" }),
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
          role: { in: ["USER", "ADMIN"] },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) as unknown } },
          ],
        },
      },
    },
  });
});

it("records a fresh denial audit and returns 409 when a database guard or serialization check aborts", async () => {
  const h = harness();
  h.tx.$queryRaw.mockRejectedValueOnce({ code: "P2034" });
  const requestId = randomUUID();
  await expect(
    h.service.run(actor, requestId, {
      kind: "submit",
      id,
      version: 1,
      sellerDeclaration: true,
    }),
  ).rejects.toMatchObject({ status: 409 });
  expect(h.db.auditEvent.create).toHaveBeenCalledWith({
    data: {
      actorUserId: owner,
      scope: "ACCOUNT",
      scopeId: owner,
      resourceId: id,
      action: "LISTING_SUBMIT",
      outcome: "DENIED",
      requestId,
    },
  });
});

it("fails closed with 503 if post-abort denial audit storage fails", async () => {
  const h = harness();
  h.tx.listing.create.mockRejectedValueOnce({ code: "P2002" });
  h.db.auditEvent.create.mockRejectedValueOnce(new Error("audit-down"));
  await expect(
    h.service.run(actor, randomUUID(), { kind: "create" }),
  ).rejects.toMatchObject({ status: 503 });
});
