import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { AuthorizationService } from "./authorization.service.js";

const ownId = randomUUID();
const otherId = randomUUID();
const dealer = randomUUID();
const actor = {
  subject: "user_synthetic",
  issuer: "https://evone-local.clerk.accounts.dev",
};
const globalGrant = { role: "USER", scopeType: "GLOBAL", scopeId: null };
const dealerGrant = {
  role: "DEALER_STAFF",
  scopeType: "DEALER",
  scopeId: dealer,
};
function harness(
  user: {
    id: string;
    status: string;
    roles: (typeof globalGrant)[] | (typeof dealerGrant)[];
  } | null,
) {
  const tx = {
    user: { findUnique: vi.fn().mockResolvedValue(user) },
    auditEvent: { create: vi.fn().mockResolvedValue({}) },
  };
  const db = {
    $transaction: vi.fn(async (run: (value: typeof tx) => Promise<boolean>) =>
      run(tx),
    ),
  };
  return { service: new AuthorizationService(db as never), tx, db };
}
it("loads app-owned identity and grants, not token metadata, and audits allow", async () => {
  const { service, tx, db } = harness({
    id: ownId,
    status: "ACTIVE",
    roles: [globalGrant],
  });
  const requestId = randomUUID();
  expect(await service.check(actor, "account", ownId, requestId)).toBe(true);
  expect(tx.user.findUnique).toHaveBeenCalledWith({
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
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) as unknown } },
          ],
        },
      },
    },
  });
  expect(tx.auditEvent.create).toHaveBeenCalledWith({
    data: {
      actorUserId: ownId,
      scope: "ACCOUNT",
      scopeId: ownId,
      outcome: "ALLOWED",
      requestId,
    },
  });
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: "RepeatableRead",
  });
});
it.each([
  { user: null, scope: "account" as const, target: ownId },
  {
    user: { id: ownId, status: "SUSPENDED", roles: [globalGrant] },
    scope: "account" as const,
    target: ownId,
  },
  {
    user: { id: ownId, status: "ACTIVE", roles: [] },
    scope: "account" as const,
    target: ownId,
  },
  {
    user: { id: ownId, status: "ACTIVE", roles: [globalGrant] },
    scope: "account" as const,
    target: otherId,
  },
  {
    user: {
      id: ownId,
      status: "ACTIVE",
      roles: [{ ...globalGrant, role: "ADMIN" }],
    },
    scope: "account" as const,
    target: otherId,
  },
  {
    user: { id: ownId, status: "ACTIVE", roles: [dealerGrant] },
    scope: "dealer" as const,
    target: otherId,
  },
  {
    user: { id: ownId, status: "ACTIVE", roles: [globalGrant] },
    scope: "dealer" as const,
    target: dealer,
  },
])(
  "denies and persists audit for unknown/suspended/missing/wrong scope",
  async ({ user, scope, target }) => {
    const { service, tx } = harness(user);
    expect(await service.check(actor, scope, target, randomUUID())).toBe(false);
    expect(tx.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        outcome: "DENIED",
        actorUserId: user?.id ?? null,
        scopeId: target,
      }) as unknown,
    });
  },
);
it("allows a dealer grant only in its exact scope", async () => {
  const { service } = harness({
    id: ownId,
    status: "ACTIVE",
    roles: [dealerGrant],
  });
  expect(await service.check(actor, "dealer", dealer, randomUUID())).toBe(true);
});
it("fails closed when audit storage fails", async () => {
  const { service, tx } = harness({
    id: ownId,
    status: "ACTIVE",
    roles: [globalGrant],
  });
  tx.auditEvent.create.mockRejectedValue(
    new Error("synthetic storage failure"),
  );
  await expect(
    service.check(actor, "account", ownId, randomUUID()),
  ).rejects.toThrow("synthetic storage failure");
});

it("normalizes valid uppercase account and dealer UUID spellings", async () => {
  const account = harness({
    id: ownId,
    status: "ACTIVE",
    roles: [globalGrant],
  });
  expect(
    await account.service.check(
      actor,
      "account",
      ownId.toUpperCase(),
      randomUUID(),
    ),
  ).toBe(true);
  const tenant = harness({ id: ownId, status: "ACTIVE", roles: [dealerGrant] });
  expect(
    await tenant.service.check(
      actor,
      "dealer",
      dealer.toUpperCase(),
      randomUUID(),
    ),
  ).toBe(true);
});
