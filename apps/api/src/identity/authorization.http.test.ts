import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { createEvoneClient } from "@evone/sdk";
import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { authEnv, authToken } from "../../test/auth-fixture.js";
import { loadConfig } from "../config/env.js";
import { createApp } from "../create-app.js";

const userId = randomUUID();
const dealerId = randomUUID();
const tx = {
  user: {
    findUnique: vi.fn().mockResolvedValue({
      id: userId,
      status: "ACTIVE",
      roles: [
        { role: "USER", scopeType: "GLOBAL", scopeId: null },
        { role: "DEALER_STAFF", scopeType: "DEALER", scopeId: dealerId },
      ],
    }),
  },
  auditEvent: { create: vi.fn().mockResolvedValue({}) },
};
const db = {
  $transaction: async (run: (value: typeof tx) => Promise<boolean>) => run(tx),
};
let app: INestApplication;
let origin: string;
beforeAll(async () => {
  app = await createApp({
    config: loadConfig({
      ...authEnv,
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://unused@127.0.0.1:1/unused",
      REDIS_URL: "redis://127.0.0.1:1",
    }),
    db: db as never,
  });
  await app.listen(0, "127.0.0.1");
  origin = await app.getUrl();
});
afterAll(async () => {
  await app.close();
});
it("serves an actual generated SDK request only for its authorized account", async () => {
  const client = createEvoneClient({ origin });
  const response = await client.GET("/auth/access/{scope}/{scopeId}", {
    params: { path: { scope: "account", scopeId: userId } },
    headers: { Authorization: `Bearer ${authToken()}` },
  });
  expect(response.response.status).toBe(200);
  expect(response.data?.data).toEqual({ authorized: true });
  expect(response.response.headers.get("Cache-Control")).toBe("no-store");
});
it("rejects cross-account and cross-dealer requests with a safe 403", async () => {
  for (const scope of ["account", "dealer"]) {
    const response = await fetch(
      `${origin}/api/v1/auth/access/${scope}/${randomUUID()}`,
      { headers: { Authorization: `Bearer ${authToken()}` } },
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "FORBIDDEN", message: "Access denied" },
    });
  }
});
it("returns 400 for invalid scope and ID without writing an audit", async () => {
  const count = tx.auditEvent.create.mock.calls.length;
  const response = await fetch(
    `${origin}/api/v1/auth/access/unknown/not-a-uuid`,
    { headers: { Authorization: `Bearer ${authToken()}` } },
  );
  expect(response.status).toBe(400);
  expect(tx.auditEvent.create.mock.calls).toHaveLength(count);
});
it("rejects unauthenticated requests before a database check", async () => {
  const count = tx.user.findUnique.mock.calls.length;
  expect(
    (await fetch(`${origin}/api/v1/auth/access/account/${userId}`)).status,
  ).toBe(401);
  expect(tx.user.findUnique.mock.calls).toHaveLength(count);
});
it("fails closed with safe 500 when the audit cannot commit", async () => {
  tx.auditEvent.create.mockRejectedValueOnce(
    new Error("synthetic-private-storage-detail"),
  );
  const response = await fetch(
    `${origin}/api/v1/auth/access/account/${userId}`,
    { headers: { Authorization: `Bearer ${authToken()}` } },
  );
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain(
    "synthetic-private-storage-detail",
  );
});

it("accepts canonical-equivalent uppercase account and dealer UUID paths", async () => {
  for (const [scope, id] of [
    ["account", userId],
    ["dealer", dealerId],
  ]) {
    const response = await fetch(
      `${origin}/api/v1/auth/access/${scope}/${id!.toUpperCase()}`,
      { headers: { Authorization: `Bearer ${authToken()}` } },
    );
    expect(response.status).toBe(200);
  }
});
