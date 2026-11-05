import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { beforeAll, afterAll, it, expect } from "vitest";
import { CatalogueDraftResponse } from "@evone/contracts";
import { createApp, API_PREFIX } from "../src/create-app.js";
import { loadConfig } from "../src/config/env.js";
import { authEnv, authToken } from "./auth-fixture.js";
import { db, databaseUrl, run } from "./support.js";
import { catalogueDocument } from "./fixtures/catalogue-document.js";
let app: INestApplication, base: string;
const ids: Record<string, string> = {};
const request = async (
  path: string,
  method = "GET",
  body?: unknown,
  actor = "editor",
  requestId = randomUUID(),
) =>
  fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${authToken({ sub: `${run}_catalogue_${actor}`, exp: Math.floor(Date.now() / 1000) + 3600 })}`,
      "Content-Type": "application/json",
      "X-Request-ID": requestId,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
async function create(suffix = randomUUID()) {
  const response = await request("/admin/catalogue/drafts", "POST", {
    document: catalogueDocument(suffix),
  });
  expect(response.status).toBe(200);
  return CatalogueDraftResponse.parse(await response.json()).data;
}
async function submitted(suffix = randomUUID()) {
  const draft = await create(suffix);
  const response = await request(
    `/admin/catalogue/drafts/${draft.id}/submit`,
    "POST",
    { version: 1 },
  );
  expect(response.status).toBe(200);
  return CatalogueDraftResponse.parse(await response.json()).data;
}
beforeAll(async () => {
  app = await createApp({
    db,
    config: loadConfig({
      ...authEnv,
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      REDIS_URL: "redis://127.0.0.1:6379",
    }),
  });
  await app.listen(0, "127.0.0.1");
  base = `${await app.getUrl()}/${API_PREFIX}`;
  for (const [actor, role] of [
    ["editor", "EDITOR"],
    ["other", "EDITOR"],
    ["admin", "ADMIN"],
    ["user", "USER"],
    ["dealer", "DEALER_STAFF"],
  ] as const) {
    const user = await db.user.create({
      data: {
        authIssuer: authEnv.AUTH_ISSUER,
        authProviderId: `${run}_catalogue_${actor}`,
        status: "ACTIVE",
        roles: {
          create:
            role === "DEALER_STAFF"
              ? { role, scopeType: "DEALER", scopeId: randomUUID() }
              : { role, scopeType: "GLOBAL" },
        },
      },
    });
    ids[actor] = user.id;
  }
});
afterAll(async () => {
  await app?.close();
  await db.$disconnect();
});
it("saves private drafts, rejects stale saves, then publishes reviewed provenance atomically", async () => {
  const draft = await create();
  expect(
    (
      await request(
        `/brands/${draft.document.brand.slug}/models/${draft.document.model.slug}`,
      )
    ).status,
  ).toBe(404);
  const edited = structuredClone(draft.document);
  edited.model.name = "DEMO Revised model";
  expect(
    (
      await request(`/admin/catalogue/drafts/${draft.id}`, "PATCH", {
        version: 1,
        document: edited,
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await request(`/admin/catalogue/drafts/${draft.id}`, "PATCH", {
        version: 1,
        document: draft.document,
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await request(`/admin/catalogue/drafts/${draft.id}/submit`, "POST", {
        version: 2,
      })
    ).status,
  ).toBe(200);
  const approve = await request(
    `/admin/catalogue/drafts/${draft.id}/review`,
    "POST",
    { version: 3, decision: "APPROVE", reviewedSources: true },
    "admin",
  );
  expect(approve.status).toBe(200);
  const published = CatalogueDraftResponse.parse(await approve.json()).data;
  expect(published.status).toBe("PUBLISHED");
  expect(published.version).toBe(4);
  const read = await request(
    `/brands/${draft.document.brand.slug}/models/${draft.document.model.slug}`,
  );
  expect(read.status).toBe(200);
  const model = await db.evModel.findUniqueOrThrow({
    where: { id: published.modelId! },
    include: { variants: { include: { sources: true } } },
  });
  expect(model).toMatchObject({
    name: "DEMO Revised model",
    status: "PUBLISHED",
    isDemo: true,
  });
  expect(model.variants[0]?.sources[0]).toMatchObject({
    reviewerId: ids.admin,
    fieldName: "BATTERY_KWH",
  });
  expect(model.variants[0]?.sources[0]?.reviewedAt).toBeInstanceOf(Date);
  expect(
    (
      await request(`/admin/catalogue/drafts/${draft.id}`, "PATCH", {
        version: 4,
        document: edited,
      })
    ).status,
  ).toBe(409);
});
it("denies anonymous, ordinary/dealer roles, cross-editor reads and editor approvals", async () => {
  const draft = await submitted();
  expect((await fetch(base + "/admin/catalogue/drafts")).status).toBe(401);
  for (const actor of ["user", "dealer", "unknown"])
    expect(
      (await request("/admin/catalogue/drafts", "GET", undefined, actor))
        .status,
    ).toBe(403);
  expect(
    (
      await request(
        `/admin/catalogue/drafts/${draft.id}`,
        "GET",
        undefined,
        "other",
      )
    ).status,
  ).toBe(404);
  expect(
    (
      await request(
        `/admin/catalogue/drafts/${randomUUID()}`,
        "GET",
        undefined,
        "other",
      )
    ).status,
  ).toBe(404);
  expect(
    (
      await request(`/admin/catalogue/drafts/${draft.id}/review`, "POST", {
        version: 2,
        decision: "APPROVE",
        reviewedSources: true,
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await request(
        `/admin/catalogue/drafts/${draft.id}`,
        "PATCH",
        { version: 2, document: draft.document },
        "admin",
      )
    ).status,
  ).toBe(403);
  const listed = await request(
    "/admin/catalogue/drafts",
    "GET",
    undefined,
    "other",
  );
  expect(listed.status).toBe(200);
  expect(await listed.text()).not.toContain(draft.id);
});
it("requires a different admin and explicit reviewed-source attestation", async () => {
  const document = catalogueDocument(randomUUID());
  const createAdmin = await request(
    "/admin/catalogue/drafts",
    "POST",
    { document },
    "admin",
  );
  const draft = CatalogueDraftResponse.parse(await createAdmin.json()).data;
  await request(
    `/admin/catalogue/drafts/${draft.id}/submit`,
    "POST",
    { version: 1 },
    "admin",
  );
  expect(
    (
      await request(
        `/admin/catalogue/drafts/${draft.id}/review`,
        "POST",
        { version: 2, decision: "APPROVE", reviewedSources: true },
        "admin",
      )
    ).status,
  ).toBe(403);
  const other = await submitted();
  expect(
    (
      await request(
        `/admin/catalogue/drafts/${other.id}/review`,
        "POST",
        { version: 2, decision: "APPROVE", reviewedSources: false },
        "admin",
      )
    ).status,
  ).toBe(400);
});
it("blocks missing citations, supports rejection and preserves the reviewed revision", async () => {
  const document = catalogueDocument(randomUUID());
  document.variants[0]!.sources = [];
  const created = await request("/admin/catalogue/drafts", "POST", {
    document,
  });
  const draft = CatalogueDraftResponse.parse(await created.json()).data;
  expect(
    (
      await request(`/admin/catalogue/drafts/${draft.id}/submit`, "POST", {
        version: 1,
      })
    ).status,
  ).toBe(400);
  const review = await submitted();
  const rejected = await request(
    `/admin/catalogue/drafts/${review.id}/review`,
    "POST",
    {
      version: 2,
      decision: "REJECT",
      reviewedSources: false,
      reason: "Add the original test conditions.",
    },
    "admin",
  );
  expect(rejected.status).toBe(200);
  expect(
    CatalogueDraftResponse.parse(await rejected.json()).data,
  ).toMatchObject({ status: "REJECTED", version: 3 });
  expect(
    (
      await request(`/admin/catalogue/drafts/${review.id}`, "PATCH", {
        version: 3,
        document: review.document,
      })
    ).status,
  ).toBe(200);
  expect(
    await db.catalogueDraft.findUniqueOrThrow({ where: { id: review.id } }),
  ).toMatchObject({
    status: "DRAFT",
    reviewerId: null,
    reviewedAt: null,
    reviewReason: null,
    version: 4,
  });
});
it("serializes concurrent approvals and audits both competing request IDs", async () => {
  const suffix = randomUUID();
  const first = await submitted(suffix),
    second = await submitted(suffix);
  const requestIds = [randomUUID(), randomUUID()];
  const responses = await Promise.all(
    [first, second].map((draft, index) =>
      request(
        `/admin/catalogue/drafts/${draft.id}/review`,
        "POST",
        { version: 2, decision: "APPROVE", reviewedSources: true },
        "admin",
        requestIds[index],
      ),
    ),
  );
  expect(responses.map((response) => response.status).sort()).toEqual([
    200, 409,
  ]);
  const audits = await db.auditEvent.findMany({
    where: { requestId: { in: requestIds } },
  });
  expect(audits).toHaveLength(2);
  expect(audits.map((row) => row.outcome).sort()).toEqual([
    "ALLOWED",
    "DENIED",
  ]);
  expect(
    await db.evModel.count({ where: { slug: first.document.model.slug } }),
  ).toBe(1);
});
it("denies suspended, revoked and expired editor grants", async () => {
  for (const data of [
    { active: false },
    { active: true, expiresAt: new Date(0) },
  ]) {
    await db.roleAssignment.updateMany({ where: { userId: ids.other }, data });
    expect(
      (await request("/admin/catalogue/drafts", "GET", undefined, "other"))
        .status,
    ).toBe(403);
  }
  await db.roleAssignment.updateMany({
    where: { userId: ids.other },
    data: { active: true, expiresAt: null },
  });
  await db.user.update({
    where: { id: ids.other },
    data: { status: "SUSPENDED" },
  });
  expect(
    (await request("/admin/catalogue/drafts", "GET", undefined, "other"))
      .status,
  ).toBe(403);
});
