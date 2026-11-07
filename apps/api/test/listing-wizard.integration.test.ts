import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { beforeAll, afterAll, it, expect } from "vitest";
import sharp from "sharp";
import { SellerListingResponse, MediaUploadResponse } from "@evone/contracts";
import type { SellerListing } from "@evone/contracts";
import { createApp, API_PREFIX } from "../src/create-app.js";
import { loadConfig } from "../src/config/env.js";
import { authEnv, authToken } from "./auth-fixture.js";
import { mediaFixture } from "./media-fixture.js";
import { db, databaseUrl, run } from "./support.js";
let app: INestApplication,
  base: string,
  storage: Awaited<ReturnType<typeof mediaFixture>>,
  variantId: string;
const users: Record<string, string> = {};
const request = (
  path: string,
  method = "GET",
  body?: unknown,
  actor = "owner",
) =>
  fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${authToken({ sub: `wizard_${run}_${actor}`, exp: Math.floor(Date.now() / 1000) + 3600 })}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
async function created() {
  const response = await request("/listings", "POST", {});
  expect(response.status).toBe(200);
  return SellerListingResponse.parse(await response.json()).data;
}
async function full() {
  const row = await created();
  const response = await request(`/listings/${row.id}`, "PATCH", {
    version: row.version,
    fields: {
      ...row.fields,
      preferredVehicleType: "SCOOTER",
      variantId,
      year: 2024,
      odometerKm: 123,
      ownershipCount: 1,
      city: "DEMO City",
      askingPricePaise: "25000000",
      conditionNotes: "DEMO synthetic condition; no personal information.",
    },
  });
  expect(response.status).toBe(200);
  return SellerListingResponse.parse(await response.json()).data;
}
async function withPhoto(row: SellerListing) {
  const asset = await db.mediaAsset.create({
    data: {
      ownerId: users.owner!,
      contentType: "image/webp",
      sizeBytes: 12,
      status: "READY",
      objectKey: `ready/synthetic-${randomUUID()}.webp`,
      expiresAt: new Date(Date.now() + 300000),
    },
  });
  const response = await request(`/listings/${row.id}/media`, "POST", {
    version: row.version,
    mediaAssetId: asset.id,
    alt: "DEMO synthetic vehicle photo",
  });
  expect(response.status).toBe(200);
  return SellerListingResponse.parse(await response.json()).data;
}
beforeAll(async () => {
  storage = await mediaFixture();
  app = await createApp({
    db,
    config: loadConfig({
      ...authEnv,
      ...storage.env,
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      REDIS_URL: "redis://127.0.0.1:6379",
    }),
  });
  await app.listen(0, "127.0.0.1");
  base = `${await app.getUrl()}/${API_PREFIX}`;
  for (const [name, role] of [
    ["owner", "USER"],
    ["other", "USER"],
    ["admin", "ADMIN"],
    ["moderator", "MODERATOR"],
    ["dealer", "DEALER_STAFF"],
  ] as const) {
    users[name] = (
      await db.user.create({
        data: {
          authIssuer: authEnv.AUTH_ISSUER,
          authProviderId: `wizard_${run}_${name}`,
          status: "ACTIVE",
          roles: {
            create:
              role === "DEALER_STAFF"
                ? { role, scopeType: "DEALER", scopeId: randomUUID() }
                : { role, scopeType: "GLOBAL" },
          },
        },
      })
    ).id;
  }
  const brand = await db.brand.create({
    data: {
      name: "DEMO Wizard Brand",
      slug: `demo-wizard-${randomUUID()}`,
      isDemo: true,
      status: "PUBLISHED",
    },
  });
  const model = await db.evModel.create({
    data: {
      brandId: brand.id,
      name: "DEMO Wizard Model",
      slug: "demo-model",
      vehicleType: "SCOOTER",
      isDemo: true,
      status: "PUBLISHED",
    },
  });
  variantId = (
    await db.evVariant.create({
      data: {
        modelId: model.id,
        name: "DEMO Unknown Variant",
        slug: "demo-variant",
        isDemo: true,
        status: "PUBLISHED",
      },
    })
  ).id;
});
afterAll(async () => {
  await app?.close();
  await storage?.close();
  await db.$disconnect();
});
it("creates/resumes private drafts, preserves preferred type, and serializes conflicting saves", async () => {
  const row = await created();
  expect(row.fields.variantId).toBeNull();
  const save = await request(`/listings/${row.id}`, "PATCH", {
    version: 1,
    fields: { ...row.fields, preferredVehicleType: "SCOOTER" },
  });
  expect(save.status).toBe(200);
  const resumed = SellerListingResponse.parse(
    await (await request(`/listings/${row.id}`)).json(),
  ).data;
  expect(resumed.fields.preferredVehicleType).toBe("SCOOTER");
  expect(resumed.version).toBe(2);
  const results = await Promise.all(
    ["DEMO City A", "DEMO City B"].map((city) =>
      request(`/listings/${row.id}`, "PATCH", {
        version: 2,
        fields: { ...resumed.fields, city },
      }),
    ),
  );
  expect(results.map((response) => response.status).sort()).toEqual([200, 409]);
  expect(
    (await db.listing.findUniqueOrThrow({ where: { id: row.id } })).version,
  ).toBe(3);
  expect(
    await db.auditEvent.count({
      where: {
        resourceId: row.id,
        action: "LISTING_ACCESS",
        outcome: "DENIED",
      },
    }),
  ).toBe(1);
});
it("rejects anonymous, dealer-only and cross-owner access including admin wildcard", async () => {
  const row = await created();
  expect((await fetch(base + `/listings/${row.id}`)).status).toBe(401);
  expect(
    (await request("/seller/listings", "GET", undefined, "dealer")).status,
  ).toBe(403);
  for (const actor of ["other", "admin"]) {
    expect(
      (await request(`/listings/${row.id}`, "GET", undefined, actor)).status,
    ).toBe(404);
    expect(
      (
        await request(
          `/listings/${row.id}`,
          "PATCH",
          { version: 1, fields: row.fields },
          actor,
        )
      ).status,
    ).toBe(404);
  }
  const list = await request("/seller/listings", "GET", undefined, "other");
  expect(list.status).toBe(200);
  expect(await list.text()).not.toContain(row.id);
});
it("strictly validates price/identity fields without exposing parser exceptions", async () => {
  const row = await created();
  for (const value of ["not-money", "1.5", "0", "9223372036854775808"]) {
    const response = await request(`/listings/${row.id}`, "PATCH", {
      version: 1,
      fields: { ...row.fields, askingPricePaise: value },
    });
    expect(response.status).toBe(400);
  }
  expect(
    (await request("/listings", "POST", { sellerUserId: users.other })).status,
  ).toBe(400);
  expect(
    (
      await request(`/listings/${row.id}`, "PATCH", {
        version: 1,
        fields: { ...row.fields, year: 2100 },
      })
    ).status,
  ).toBe(400);
  const large = await request(`/listings/${row.id}`, "PATCH", {
    version: 1,
    fields: { ...row.fields, askingPricePaise: "9223372036854775807" },
  });
  expect(large.status).toBe(200);
  expect(
    SellerListingResponse.parse(await large.json()).data.fields
      .askingPricePaise,
  ).toBe("9223372036854775807");
});
it("validates a real synthetic upload, attaches it, previews privately and submits only for moderation", async () => {
  let row = await full();
  const image = await sharp({
    create: { width: 4, height: 4, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const upload = MediaUploadResponse.parse(
    await (
      await request("/media/presign", "POST", {
        contentType: "image/png",
        sizeBytes: image.length,
      })
    ).json(),
  ).data;
  expect(
    (
      await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: upload.headers,
        body: new Uint8Array(image),
      })
    ).status,
  ).toBe(200);
  expect(
    (await request(`/media/${upload.id}/complete`, "POST", {})).status,
  ).toBe(200);
  const attach = await request(`/listings/${row.id}/media`, "POST", {
    version: row.version,
    mediaAssetId: upload.id,
    alt: "DEMO generated square",
  });
  expect(attach.status).toBe(200);
  row = SellerListingResponse.parse(await attach.json()).data;
  expect(row.media).toHaveLength(1);
  expect(
    (
      await request(`/listings/${row.id}/submit`, "POST", {
        version: row.version,
        sellerDeclaration: false,
      })
    ).status,
  ).toBe(400);
  const submit = await request(`/listings/${row.id}/submit`, "POST", {
    version: row.version,
    sellerDeclaration: true,
  });
  expect(submit.status).toBe(200);
  row = SellerListingResponse.parse(await submit.json()).data;
  expect(row.status).toBe("PENDING_REVIEW");
  expect(
    (await db.listing.findUniqueOrThrow({ where: { id: row.id } })).publishedAt,
  ).toBeNull();
  expect(
    (
      await request(`/listings/${row.id}`, "PATCH", {
        version: row.version,
        fields: row.fields,
      })
    ).status,
  ).toBe(409);
  expect(
    await db.auditEvent.count({
      where: {
        resourceId: row.id,
        action: "LISTING_SUBMIT",
        outcome: "ALLOWED",
      },
    }),
  ).toBe(1);
});
it("rejects incomplete submission and foreign/pending photos, and removes only owned attachments", async () => {
  const partial = await created();
  expect(
    (
      await request(`/listings/${partial.id}/submit`, "POST", {
        version: 1,
        sellerDeclaration: true,
      })
    ).status,
  ).toBe(400);
  let row = await full();
  for (const [owner, ready, status] of [
    [users.other!, true, 404],
    [users.owner!, false, 400],
  ] as const) {
    const photo = await db.mediaAsset.create({
      data: {
        ownerId: owner,
        contentType: "image/webp",
        sizeBytes: 1,
        expiresAt: new Date(Date.now() + 300000),
        ...(ready
          ? { status: "READY", objectKey: "ready/synthetic-foreign.webp" }
          : {}),
      },
    });
    expect(
      (
        await request(`/listings/${row.id}/media`, "POST", {
          version: row.version,
          mediaAssetId: photo.id,
          alt: "DEMO",
        })
      ).status,
    ).toBe(status);
  }
  row = await withPhoto(row);
  const photo = row.media[0]!;
  expect(
    (
      await request(
        `/listings/${row.id}/media/${photo.id}`,
        "DELETE",
        { version: row.version },
        "other",
      )
    ).status,
  ).toBe(404);
  const removed = await request(
    `/listings/${row.id}/media/${photo.id}`,
    "DELETE",
    { version: row.version },
  );
  expect(removed.status).toBe(200);
  expect(
    SellerListingResponse.parse(await removed.json()).data.media,
  ).toHaveLength(0);
});
it("exposes rejection feedback and allows corrected drafts to be saved again", async () => {
  let row = await withPhoto(await full());
  row = SellerListingResponse.parse(
    await (
      await request(`/listings/${row.id}/submit`, "POST", {
        version: row.version,
        sellerDeclaration: true,
      })
    ).json(),
  ).data;
  await db.$transaction(async (tx) => {
    const requestId = randomUUID();
    await tx.$queryRaw`SELECT set_config('evone.actor_id',${users.moderator!},true),set_config('evone.request_id',${requestId},true)`;
    await tx.listingReview.create({
      data: {
        listingId: row.id,
        listingVersion: row.version,
        reviewerId: users.moderator!,
        decision: "REJECT",
        reason: "DEMO: replace the unclear photograph.",
        snapshot: {},
        requestId,
      },
    });
  });
  row = SellerListingResponse.parse(
    await (await request(`/listings/${row.id}`)).json(),
  ).data;
  expect(row.reviewReason).toContain("replace");
  const saved = await request(`/listings/${row.id}`, "PATCH", {
    version: row.version,
    fields: row.fields,
  });
  expect(saved.status).toBe(200);
  expect(SellerListingResponse.parse(await saved.json()).data).toMatchObject({
    status: "DRAFT",
    reviewReason: null,
  });
});
it("denies revoked/expired grants and suspended seller accounts", async () => {
  for (const data of [
    { active: false },
    { active: true, expiresAt: new Date(0) },
  ]) {
    await db.roleAssignment.updateMany({
      where: { userId: users.other },
      data,
    });
    expect(
      (await request("/seller/listings", "GET", undefined, "other")).status,
    ).toBe(403);
  }
  await db.roleAssignment.updateMany({
    where: { userId: users.other },
    data: { active: true, expiresAt: null },
  });
  await db.user.update({
    where: { id: users.other },
    data: { status: "SUSPENDED" },
  });
  expect(
    (await request("/seller/listings", "GET", undefined, "other")).status,
  ).toBe(403);
});
