import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { AccessResponse, ErrorEnvelope } from "@evone/contracts";
import { afterAll, beforeAll, expect, it } from "vitest";
import { authEnv, authToken } from "./auth-fixture.js";
import { db, databaseUrl, run } from "./support.js";
import { loadConfig } from "../src/config/env.js";
import { createApp } from "../src/create-app.js";

let app: INestApplication;
let base: string;
let userId: string;
let otherId: string;
let grantId: string;
const dealerId = randomUUID();
const otherDealerId = randomUUID();
const subject = `user_authz_${run}`;
beforeAll(async () => {
  const user = await db.user.create({
    data: {
      authIssuer: authEnv.AUTH_ISSUER,
      authProviderId: subject,
      status: "ACTIVE",
    },
  });
  userId = user.id;
  otherId = (
    await db.user.create({
      data: {
        authIssuer: authEnv.AUTH_ISSUER,
        authProviderId: `other_${run}`,
        status: "ACTIVE",
      },
    })
  ).id;
  await db.roleAssignment.create({
    data: { userId, role: "USER", scopeType: "GLOBAL" },
  });
  grantId = (
    await db.roleAssignment.create({
      data: {
        userId,
        role: "DEALER_STAFF",
        scopeType: "DEALER",
        scopeId: dealerId,
      },
    })
  ).id;
  app = await createApp({
    config: loadConfig({
      ...authEnv,
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      REDIS_URL: "redis://127.0.0.1:1",
    }),
    db,
  });
  await app.listen(0, "127.0.0.1");
  base = `${await app.getUrl()}/api/v1/auth/access`;
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});
// Append-only evidence and its synthetic actors remain in the disposable test DB.
async function access(
  scope: "account" | "dealer",
  id: string,
  claims: Record<string, unknown> = {},
) {
  const requestId = randomUUID();
  const response = await fetch(`${base}/${scope}/${id}`, {
    headers: {
      Authorization: `Bearer ${authToken({ sub: subject, ...claims })}`,
      "X-Request-ID": requestId,
    },
  });
  return {
    response,
    events: await db.auditEvent.findMany({ where: { requestId } }),
  };
}
it("allows own account and exact dealer, denying cross-account and cross-dealer", async () => {
  for (const [scope, id, status] of [
    ["account", userId, 200],
    ["account", userId.toUpperCase(), 200],
    ["account", otherId, 403],
    ["dealer", dealerId, 200],
    ["dealer", dealerId.toUpperCase(), 200],
    ["dealer", otherDealerId, 403],
  ] as const) {
    const { response, events } = await access(scope, id);
    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body: unknown = await response.json();
    expect(
      status === 200
        ? AccessResponse.safeParse(body).success
        : ErrorEnvelope.safeParse(body).success,
    ).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actorUserId: userId,
      scopeId: id.toLowerCase(),
      outcome: status === 200 ? "ALLOWED" : "DENIED",
      action: "ACCESS_CHECK",
    });
    expect(JSON.stringify(body)).not.toContain(subject);
  }
});
it("ignores signed token roles and denies an unprovisioned subject", async () => {
  const { response, events } = await access("dealer", otherDealerId, {
    roles: ["ADMIN"],
    org_id: otherDealerId,
  });
  expect(response.status).toBe(403);
  expect(events[0]?.outcome).toBe("DENIED");
  const unknown = await access("account", userId, { sub: `unknown_${run}` });
  expect(unknown.response.status).toBe(403);
  expect(unknown.events[0]?.actorUserId).toBeNull();
});
it("rechecks revocation and expiry without cached grants", async () => {
  await db.roleAssignment.update({
    where: { id: grantId },
    data: { active: false },
  });
  expect((await access("dealer", dealerId)).response.status).toBe(403);
  await db.roleAssignment.update({
    where: { id: grantId },
    data: { active: true, expiresAt: new Date(0) },
  });
  expect((await access("dealer", dealerId)).response.status).toBe(403);
  await db.roleAssignment.update({
    where: { id: grantId },
    data: { expiresAt: null },
  });
  expect((await access("dealer", dealerId)).response.status).toBe(200);
});
it("denies a suspended user even with a grant", async () => {
  await db.user.update({
    where: { id: userId },
    data: { status: "SUSPENDED" },
  });
  expect((await access("account", userId)).response.status).toBe(403);
  await db.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
});
it("rejects malformed paths before writing a decision", async () => {
  const requestId = randomUUID();
  const response = await fetch(`${base}/account/not-a-uuid`, {
    headers: {
      Authorization: `Bearer ${authToken({ sub: subject })}`,
      "X-Request-ID": requestId,
    },
  });
  expect(response.status).toBe(400);
  expect(await db.auditEvent.count({ where: { requestId } })).toBe(0);
});
it("denies unauthenticated callers without querying or recording a principal", async () => {
  expect((await fetch(`${base}/account/${userId}`)).status).toBe(401);
});
