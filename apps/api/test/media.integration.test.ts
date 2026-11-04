import { MediaUploadResponse, MediaReadResponse } from "@evone/contracts";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { beforeAll, afterAll, it, expect } from "vitest";
import sharp from "sharp";
import { loadConfig } from "../src/config/env.js";
import { createApp, API_PREFIX } from "../src/create-app.js";
import { authEnv, authToken } from "./auth-fixture.js";
import { mediaFixture } from "./media-fixture.js";
import { db, databaseUrl, run } from "./support.js";
let app: INestApplication,
  base: string,
  fixture: Awaited<ReturnType<typeof mediaFixture>>;
let owner: string, other: string;
let png: Buffer;
const subject = `media_${run}`;
const headers = (sub = subject) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${authToken({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })}`,
});
const request = (path: string, body?: unknown, sub = subject) =>
  fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: headers(sub),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
async function intent() {
  const response = await request("/media/presign", {
    contentType: "image/png",
    sizeBytes: png.length,
  });
  expect(response.status).toBe(200);
  return MediaUploadResponse.parse(await response.json()).data;
}
beforeAll(async () => {
  fixture = await mediaFixture();
  app = await createApp({
    db,
    config: loadConfig({
      ...authEnv,
      ...fixture.env,
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      REDIS_URL: "redis://127.0.0.1:6379",
    }),
  });
  await app.listen(0, "127.0.0.1");
  base = `${await app.getUrl()}/${API_PREFIX}`;
  for (const sub of [subject, subject + "_other"]) {
    const user = await db.user.create({
      data: {
        authIssuer: authEnv.AUTH_ISSUER,
        authProviderId: sub,
        status: "ACTIVE",
        roles: { create: { role: "USER", scopeType: "GLOBAL" } },
      },
    });
    if (sub === subject) owner = user.id;
    else other = user.id;
  }
  png = await sharp({
    create: { width: 12, height: 8, channels: 3, background: "red" },
  })
    .withMetadata()
    .png()
    .toBuffer();
});
afterAll(async () => {
  await app?.close();
  await fixture?.close();
  await db.$disconnect();
});
it("round trips a private upload, strips metadata, locks completion and audits", async () => {
  const upload = await intent();
  const signed = new URL(upload.uploadUrl);
  expect(signed.searchParams.get("X-Amz-Expires")).toBe("300");
  expect(signed.searchParams.get("X-Amz-SignedHeaders")).toContain(
    "content-length",
  );
  expect(signed.searchParams.get("X-Amz-SignedHeaders")).toContain(
    "content-type",
  );
  const pending = await request(`/media/${upload.id}/read-url`);
  expect(pending.status).toBe(400);
  expect(
    (
      await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: upload.headers,
        body: new Uint8Array(png),
      })
    ).status,
  ).toBe(200);
  expect((await request(`/media/${upload.id}/complete`, {})).status).toBe(200);

  expect(
    await db.mediaAsset.findUnique({ where: { id: upload.id } }),
  ).toMatchObject({ status: "READY" });
  expect(
    fixture.objects.has(`/local-media/quarantine/${owner}/${upload.id}`),
  ).toBe(false);
  const asset = await db.mediaAsset.findUniqueOrThrow({
    where: { id: upload.id },
  });
  const safe = fixture.objects.get(`/local-media/${asset.objectKey!}`)!;
  expect(await sharp(safe.body).metadata()).toMatchObject({ format: "webp" });
  expect((await sharp(safe.body).metadata()).exif).toBeUndefined();
  const response = await request(`/media/${upload.id}/read-url`);
  expect(response.status).toBe(200);
  const data = MediaReadResponse.parse(await response.json()).data;
  expect(new URL(data.readUrl).searchParams.get("X-Amz-Expires")).toBe("60");
  expect((await fetch(data.readUrl)).status).toBe(200);
  expect(
    await db.auditEvent.count({
      where: {
        actorUserId: owner,
        action: "MEDIA_COMPLETE",
        outcome: "ALLOWED",
      },
    }),
  ).toBe(1);
});
it("serializes concurrent completion without replacing a ready object", async () => {
  const upload = await intent();
  fixture.objects.set(`/local-media/quarantine/${owner}/${upload.id}`, {
    body: png,
    type: "image/png",
  });
  const results = await Promise.all([
    request(`/media/${upload.id}/complete`, {}),
    request(`/media/${upload.id}/complete`, {}),
  ]);
  expect(results.map((response) => response.status)).toEqual([200, 200]);
  expect(
    (await db.mediaAsset.findUnique({ where: { id: upload.id } }))?.status,
  ).toBe("READY");
});
it("denies another owner and unknown IDs identically", async () => {
  const upload = await intent();
  for (const path of [
    `/media/${upload.id}/complete`,
    `/media/${randomUUID()}/complete`,
  ])
    expect((await request(path, {}, subject + "_other")).status).toBe(404);
  expect(
    (
      await request(
        `/media/${upload.id}/read-url`,
        undefined,
        subject + "_other",
      )
    ).status,
  ).toBe(404);
  expect(
    await db.auditEvent.count({
      where: { actorUserId: other, outcome: "DENIED" },
    }),
  ).toBe(3);
});
it("rejects declared/actual mismatches and corrupt input without producing a read link", async () => {
  for (const object of [
    { body: png, type: "image/jpeg" },
    { body: Buffer.from("not-an-image"), type: "image/png" },
    { body: Buffer.concat([png, Buffer.from("extra")]), type: "image/png" },
  ]) {
    const upload = await intent();
    fixture.objects.set(
      `/local-media/quarantine/${owner}/${upload.id}`,
      object,
    );
    expect((await request(`/media/${upload.id}/complete`, {})).status).toBe(
      400,
    );
    expect(
      (await db.mediaAsset.findUnique({ where: { id: upload.id } }))?.status,
    ).toBe("REJECTED");
    expect((await request(`/media/${upload.id}/read-url`)).status).toBe(400);
    expect(
      (await db.mediaAsset.findUniqueOrThrow({ where: { id: upload.id } }))
        .objectKey,
    ).toBeNull();
  }
});
it("storage failure leaves a retryable pending asset, expiry blocks processing", async () => {
  const upload = await intent();
  fixture.fail(true);
  expect((await request(`/media/${upload.id}/complete`, {})).status).toBe(503);
  fixture.fail(false);
  expect(
    (await db.mediaAsset.findUnique({ where: { id: upload.id } }))?.status,
  ).toBe("PENDING");
  await db.mediaAsset.update({
    where: { id: upload.id },
    data: { expiresAt: new Date(0) },
  });
  expect((await request(`/media/${upload.id}/complete`, {})).status).toBe(400);
});
it("rejects anonymous, unknown, revoked and suspended actors", async () => {
  expect(
    (
      await fetch(base + "/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await request(
        "/media/presign",
        { contentType: "image/png", sizeBytes: 1 },
        "no_media_grant",
      )
    ).status,
  ).toBe(403);
  await db.roleAssignment.updateMany({
    where: { userId: owner },
    data: { active: false },
  });
  expect(
    (
      await request("/media/presign", {
        contentType: "image/png",
        sizeBytes: 1,
      })
    ).status,
  ).toBe(403);
  await db.roleAssignment.updateMany({
    where: { userId: owner },
    data: { active: true },
  });
  await db.user.update({ where: { id: owner }, data: { status: "SUSPENDED" } });
  expect(
    (
      await request("/media/presign", {
        contentType: "image/png",
        sizeBytes: 1,
      })
    ).status,
  ).toBe(403);
});
