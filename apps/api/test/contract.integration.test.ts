import { randomUUID } from "node:crypto";
import {
  ServiceUnavailableException,
  type INestApplication,
} from "@nestjs/common";
import { CatalogueEditorService } from "../src/catalogue/catalogue-editor.service.js";
import { ListingService } from "../src/marketplace/listing.service.js";
import { catalogueDocument } from "./fixtures/catalogue-document.js";
import { ErrorEnvelope, SellerListingResponse, routes } from "@evone/contracts";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { mediaFixture } from "./media-fixture.js";
import type { ApiConfig } from "../src/config/env.js";
import { loadConfig } from "../src/config/env.js";
import { authEnv, authToken } from "./auth-fixture.js";
import { API_PREFIX, createApp } from "../src/create-app.js";
import type { ReadinessCheck } from "../src/health/readiness.js";
import {
  cleanup,
  databaseUrl,
  db,
  run,
  model,
  publishedBrand,
  variant,
} from "./support.js";

// Contract tests: what the API serves must match @evone/contracts exactly.
// Fails on a served-but-undocumented route, a documented-but-missing route,
// a documented status with no request below, or a body that does not parse.

let app: INestApplication;
let config: ApiConfig;
let storage: Awaited<ReturnType<typeof mediaFixture>>;
let base: string;
let dependencyUp = true;
const dependency: ReadinessCheck = {
  name: "database",
  check: () =>
    dependencyUp ? Promise.resolve() : Promise.reject(new Error("down")),
};

/** One concrete request per documented (operationId, status). */
type ContractRequest =
  string | { path: string; body?: unknown; headers?: Record<string, string> };
let requests: Record<string, Record<string, ContractRequest>> = {};

beforeAll(async () => {
  storage = await mediaFixture();
  config = loadConfig({
    ...storage.env,
    ...authEnv,
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    REDIS_URL: "redis://127.0.0.1:6379",
  });
  app = await createApp({
    config,
    db,
    readinessChecks: [dependency],
  });
  await app.listen(0, "127.0.0.1");
  base = `${await app.getUrl()}/${API_PREFIX}`;

  const authorizationUser = await db.user.create({
    data: {
      authIssuer: authEnv.AUTH_ISSUER,
      authProviderId: `contract_${run}`,
      status: "ACTIVE",
    },
  });
  await db.roleAssignment.create({
    data: { userId: authorizationUser.id, role: "USER", scopeType: "GLOBAL" },
  });
  const authorizationHeader = {
    Authorization: `Bearer ${authToken({ sub: authorizationUser.authProviderId, exp: Math.floor(Date.now() / 1000) + 3600 })}`,
  };
  const image = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const pending = await db.mediaAsset.create({
    data: {
      ownerId: authorizationUser.id,
      contentType: "image/png",
      sizeBytes: image.length,
      expiresAt: new Date(Date.now() + 300000),
    },
  });
  const ready = await db.mediaAsset.create({
    data: {
      ownerId: authorizationUser.id,
      contentType: "image/png",
      sizeBytes: image.length,
      expiresAt: new Date(Date.now() + 300000),
      status: "READY",
      objectKey: "ready/synthetic-contract.webp",
    },
  });
  storage.objects.set(
    `/local-media/quarantine/${authorizationUser.id}/${pending.id}`,
    { body: image, type: "image/png" },
  );
  const noGrantHeader = {
    Authorization: `Bearer ${authToken({ sub: `no_grant_${run}`, exp: Math.floor(Date.now() / 1000) + 3600 })}`,
  };
  const editor = await db.user.create({
    data: {
      authIssuer: authEnv.AUTH_ISSUER,
      authProviderId: `contract_editor_${run}`,
      status: "ACTIVE",
      roles: { create: { role: "EDITOR", scopeType: "GLOBAL" } },
    },
  });
  const admin = await db.user.create({
    data: {
      authIssuer: authEnv.AUTH_ISSUER,
      authProviderId: `contract_admin_${run}`,
      status: "ACTIVE",
      roles: { create: { role: "ADMIN", scopeType: "GLOBAL" } },
    },
  });
  const editorHeaders = {
    Authorization: `Bearer ${authToken({ sub: editor.authProviderId, exp: Math.floor(Date.now() / 1000) + 3600 })}`,
  };
  const adminHeaders = {
    Authorization: `Bearer ${authToken({ sub: admin.authProviderId, exp: Math.floor(Date.now() / 1000) + 3600 })}`,
  };
  const document = catalogueDocument(`contract-${run}`);
  const getDraft = await db.catalogueDraft.create({
    data: { ownerId: editor.id, document },
  });
  const saveDraft = await db.catalogueDraft.create({
    data: { ownerId: editor.id, document },
  });
  const submitDraft = await db.catalogueDraft.create({
    data: { ownerId: editor.id, document },
  });
  const reviewDraft = await db.catalogueDraft.create({
    data: { ownerId: editor.id, document, status: "IN_REVIEW" },
  });
  const editorRequests: Record<string, Record<string, ContractRequest>> = {};
  for (const [operationId, path, body, headers] of [
    [
      "listCatalogueDrafts",
      "/admin/catalogue/drafts",
      undefined,
      editorHeaders,
    ],
    [
      "createCatalogueDraft",
      "/admin/catalogue/drafts",
      { document },
      editorHeaders,
    ],
    [
      "getCatalogueDraft",
      `/admin/catalogue/drafts/${getDraft.id}`,
      undefined,
      editorHeaders,
    ],
    [
      "saveCatalogueDraft",
      `/admin/catalogue/drafts/${saveDraft.id}`,
      { version: 1, document },
      editorHeaders,
    ],
    [
      "submitCatalogueDraft",
      `/admin/catalogue/drafts/${submitDraft.id}/submit`,
      { version: 1 },
      editorHeaders,
    ],
    [
      "reviewCatalogueDraft",
      `/admin/catalogue/drafts/${reviewDraft.id}/review`,
      { version: 1, decision: "APPROVE", reviewedSources: true },
      adminHeaders,
    ],
  ] as const) {
    const request = { path, ...(body ? { body } : {}), headers };
    const invalid = body
      ? { ...request, body: {} }
      : {
          ...request,
          path: path.includes(getDraft.id)
            ? path.replace(getDraft.id, "bad-id")
            : path + "?cursor=bad-id",
        };
    const cases: Record<string, ContractRequest> = {
      200: request,
      400: invalid,
      401: { path, ...(body ? { body } : {}) },
      403: { ...request, headers: authorizationHeader },
      503: request,
    };
    if (path.includes("/drafts/"))
      cases[404] = {
        ...request,
        path: path.replace(
          /drafts\/[^/]+/,
          "drafts/7f088e6e-32fd-4086-af08-0aef72dabef2",
        ),
      };
    if (body && "version" in body)
      cases[409] = { ...request, body: { ...body, version: 999 } };
    editorRequests[operationId] = cases;
  }
  const brand = await publishedBrand();
  const m = await model(brand.id);
  const v = await variant(m.id);
  const v2 = await variant(m.id);

  // Seller listing drafts. Listings and their variant references are
  // immutable evidence (ON DELETE RESTRICT), so the demo catalogue rows below
  // deliberately avoid the `${run}-` slugs that cleanup() deletes.
  const seller = async (path: string, method: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { ...authorizationHeader, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    expect(res.status, `${method} ${path}`).toBe(200);
    return SellerListingResponse.parse(await res.json()).data;
  };
  const draft = () => seller("/listings", "POST", {});
  const readyPhoto = async () => {
    const asset = await db.mediaAsset.create({
      data: {
        ownerId: authorizationUser.id,
        contentType: "image/webp",
        sizeBytes: 12,
        status: "READY",
        objectKey: `ready/synthetic-contract-${randomUUID()}.webp`,
        expiresAt: new Date(Date.now() + 300000),
      },
    });
    return { mediaAssetId: asset.id, alt: "DEMO synthetic contract photo" };
  };
  const listingBrand = await db.brand.create({
    data: {
      name: "DEMO Contract Listing Brand",
      slug: `demo-contract-${randomUUID()}`,
      isDemo: true,
      status: "PUBLISHED",
    },
  });
  const listingModel = await db.evModel.create({
    data: {
      brandId: listingBrand.id,
      name: "DEMO Contract Listing Model",
      slug: "demo-model",
      vehicleType: "SCOOTER",
      isDemo: true,
      status: "PUBLISHED",
    },
  });
  const listingVariant = await db.evVariant.create({
    data: {
      modelId: listingModel.id,
      name: "DEMO Contract Listing Variant",
      slug: "demo-variant",
      isDemo: true,
      status: "PUBLISHED",
    },
  });
  const getRow = await draft();
  const saveRow = await draft();
  const attachRow = await draft();
  let submitRow = await draft();
  submitRow = await seller(`/listings/${submitRow.id}`, "PATCH", {
    version: submitRow.version,
    fields: {
      ...submitRow.fields,
      preferredVehicleType: "SCOOTER",
      variantId: listingVariant.id,
      year: 2024,
      odometerKm: 123,
      ownershipCount: 1,
      city: "DEMO City",
      askingPricePaise: "25000000",
      conditionNotes: "DEMO synthetic condition; no personal information.",
    },
  });
  const withPhoto = async (row: { id: string; version: number }) =>
    seller(`/listings/${row.id}/media`, "POST", {
      version: row.version,
      ...(await readyPhoto()),
    });
  submitRow = await withPhoto(submitRow);
  let publishedRow = await draft();
  publishedRow = await seller(`/listings/${publishedRow.id}`, "PATCH", {
    version: publishedRow.version,
    fields: {
      ...publishedRow.fields,
      preferredVehicleType: "SCOOTER",
      variantId: listingVariant.id,
      year: 2024,
      odometerKm: 123,
      ownershipCount: 1,
      city: "DEMO City",
      askingPricePaise: "25000000",
      conditionNotes: "DEMO synthetic condition; no personal information.",
    },
  });
  publishedRow = await withPhoto(publishedRow);
  publishedRow = await seller(`/listings/${publishedRow.id}/submit`, "POST", {
    version: publishedRow.version,
    sellerDeclaration: true,
  });
  await db.$transaction(async (tx) => {
    const requestId = randomUUID();
    await tx.$queryRaw`SELECT set_config('evone.actor_id', ${admin.id}, true), set_config('evone.request_id', ${requestId}, true)`;
    await tx.listingReview.create({
      data: {
        listingId: publishedRow.id,
        listingVersion: publishedRow.version,
        reviewerId: admin.id,
        decision: "APPROVE",
        snapshot: {},
        requestId,
      },
    });
  });
  const editRow = await withPhoto(await draft());
  const removeRow = await withPhoto(await draft());
  const listingCases: [string, string, Record<string, unknown>?][] = [
    ["listOwnListings", "/seller/listings"],
    ["createListingDraft", "/listings", {}],
    ["getOwnListing", `/listings/${getRow.id}`],
    [
      "saveListingDraft",
      `/listings/${saveRow.id}`,
      { version: saveRow.version, fields: saveRow.fields },
    ],
    [
      "submitListingDraft",
      `/listings/${submitRow.id}/submit`,
      { version: submitRow.version, sellerDeclaration: true },
    ],
    [
      "attachListingPhoto",
      `/listings/${attachRow.id}/media`,
      { version: attachRow.version, ...(await readyPhoto()) },
    ],
    [
      "editListingPhoto",
      `/listings/${editRow.id}/media/${editRow.media[0]!.id}`,
      { version: editRow.version, alt: "DEMO updated contract photo" },
    ],
    [
      "removeListingPhoto",
      `/listings/${removeRow.id}/media/${removeRow.media[0]!.id}`,
      { version: removeRow.version },
    ],
  ];
  const listingRequests: Record<string, Record<string, ContractRequest>> = {};
  for (const [operationId, path, body] of listingCases) {
    const request = {
      path,
      ...(body ? { body } : {}),
      headers: authorizationHeader,
    };
    const cases: Record<string, ContractRequest> = {
      200: request,
      // Strict schemas reject unknown keys; GETs get a malformed UUID instead.
      400: body
        ? { ...request, body: { ...body, unexpected: true } }
        : {
            ...request,
            path: path.startsWith("/listings/")
              ? "/listings/not-a-uuid"
              : `${path}?cursor=bad-id`,
          },
      401: { path, ...(body ? { body } : {}) },
      403: { ...request, headers: noGrantHeader },
      503: request,
    };
    if (path.startsWith("/listings/")) {
      cases[404] = {
        ...request,
        path: path.replace(
          /^\/listings\/[^/]+/,
          "/listings/7f088e6e-32fd-4086-af08-0aef72dabef2",
        ),
      };
      if (body) cases[409] = { ...request, body: { ...body, version: 999 } };
    }
    listingRequests[operationId] = cases;
  }

  requests = {
    ...editorRequests,
    ...listingRequests,
    presignMediaUpload: {
      200: {
        path: "/media/presign",
        body: { contentType: "image/png", sizeBytes: image.length },
        headers: authorizationHeader,
      },
      400: { path: "/media/presign", body: {}, headers: authorizationHeader },
      401: { path: "/media/presign", body: {} },
      403: {
        path: "/media/presign",
        body: { contentType: "image/png", sizeBytes: 1 },
        headers: noGrantHeader,
      },
      503: {
        path: "/media/presign",
        body: { contentType: "image/png", sizeBytes: 1 },
        headers: authorizationHeader,
      },
    },
    completeMediaUpload: {
      200: {
        path: `/media/${pending.id}/complete`,
        body: {},
        headers: authorizationHeader,
      },
      400: {
        path: "/media/not-a-uuid/complete",
        body: {},
        headers: authorizationHeader,
      },
      401: { path: `/media/${pending.id}/complete`, body: {} },
      403: {
        path: `/media/${pending.id}/complete`,
        body: {},
        headers: noGrantHeader,
      },
      404: {
        path: "/media/7f088e6e-32fd-4086-af08-0aef72dabef2/complete",
        body: {},
        headers: authorizationHeader,
      },
      503: {
        path: `/media/${pending.id}/complete`,
        body: {},
        headers: authorizationHeader,
      },
    },
    getMediaReadUrl: {
      200: {
        path: `/media/${ready.id}/read-url`,
        headers: authorizationHeader,
      },
      400: { path: "/media/not-a-uuid/read-url", headers: authorizationHeader },
      401: `/media/${ready.id}/read-url`,
      403: { path: `/media/${ready.id}/read-url`, headers: noGrantHeader },
      404: {
        path: "/media/7f088e6e-32fd-4086-af08-0aef72dabef2/read-url",
        headers: authorizationHeader,
      },
      503: {
        path: `/media/${ready.id}/read-url`,
        headers: authorizationHeader,
      },
    },
    checkResourceAccess: {
      200: {
        path: `/auth/access/account/${authorizationUser.id}`,
        headers: authorizationHeader,
      },
      400: {
        path: "/auth/access/account/not-a-uuid",
        headers: authorizationHeader,
      },
      401: `/auth/access/account/${authorizationUser.id}`,
      403: {
        path: "/auth/access/account/7f088e6e-32fd-4086-af08-0aef72dabef2",
        headers: authorizationHeader,
      },
    },
    getAuthSession: {
      200: {
        path: "/auth/session",
        headers: {
          Authorization: `Bearer ${authToken({ exp: Math.floor(Date.now() / 1000) + 3600 })}`,
        },
      },
      401: "/auth/session",
    },
    calculateEvSavings: {
      200: {
        path: "/calculators/ev-savings",
        body: {
          monthlyKm: 1000,
          fuelPriceInrPerLitre: 100,
          iceKmPerLitre: 15,
          evKwhPerKm: 0.15,
          electricityInrPerKwh: 8,
        },
      },
      400: { path: "/calculators/ev-savings", body: {} },
    },
    getLiveness: { 200: "/health/live" },
    getReadiness: { 200: "/health/ready", 503: "/health/ready" },
    listBrands: { 200: "/brands" },
    listModels: {
      200: `/models?brandId=${brand.id}&limit=1`,
      400: "/models?limit=500",
    },
    getModel: {
      200: `/brands/${brand.slug}/models/${m.slug}`,
      404: `/brands/${brand.slug}/models/no-such-model`,
    },
    compareVariants: {
      200: `/compare?variantIds=${v.id},${v2.id}`,
      400: `/compare?variantIds=${v.id}`,
      404: `/compare?variantIds=${v.id},3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c`,
    },
    getVariant: {
      200: `/variants/${v.id}`,
      400: "/variants/not-a-uuid",
      404: "/variants/3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c",
    },
    listPublicListings: {
      200: `/listings?brandSlug=${listingBrand.slug}&limit=1`,
      400: "/listings?limit=500",
    },
    getPublicListing: {
      200: `/used-evs/${publishedRow.slug}`,
      400: "/used-evs/INVALID_SLUG!",
      404: "/used-evs/no-such-published-listing",
    },
  };
});

afterAll(async () => {
  await app.close();
  await storage.close();
  await cleanup();
  await db.$disconnect();
});

interface Layer {
  route?: { path: string; methods: Record<string, boolean> };
}

function servedRoutes(): string[] {
  // Express 5 keeps its route table on `router.stack`; read-only use.
  const express = app.getHttpAdapter().getInstance() as unknown as {
    router: { stack: Layer[] };
  };
  return express.router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route!.methods).map(
        (method) => `${method} ${layer.route!.path}`,
      ),
    )
    .sort();
}

describe("API contract", () => {
  it("serves exactly the documented routes", () => {
    const documented = routes
      .map(
        (r) =>
          `${r.method} /${API_PREFIX}${r.path.replace(/\{(\w+)\}/g, ":$1")}`,
      )
      .sort();
    expect(servedRoutes()).toEqual(documented);
  });

  it("has a request for every documented response", () => {
    for (const route of routes) {
      for (const status of Object.keys(route.responses)) {
        expect(
          requests[route.operationId]?.[status],
          `${route.operationId} ${status}`,
        ).toBeDefined();
      }
    }
  });

  for (const route of routes) {
    for (const [status, response] of Object.entries(route.responses)) {
      it(`${route.operationId} ${status} matches its schema`, async () => {
        dependencyUp = !(
          route.operationId === "getReadiness" && status === "503"
        );
        const selected = requests[route.operationId]![status]!;
        const request =
          typeof selected === "string" ? { path: selected } : selected;
        const originalMedia = config.media;
        if (route.tag === "media" && status === "503")
          config.media = { mode: "disabled" };
        const failureMock =
          route.tag === "catalogue-editor" && status === "503"
            ? vi
                .spyOn(app.get(CatalogueEditorService), "run")
                .mockRejectedValueOnce(new ServiceUnavailableException())
            : route.tag === "seller-listings" && status === "503"
              ? vi
                  .spyOn(app.get(ListingService), "run")
                  .mockRejectedValueOnce(new ServiceUnavailableException())
              : undefined;
        const res = await fetch(`${base}${request.path}`, {
          method: route.method.toUpperCase(),
          headers: {
            ...("body" in request
              ? { "Content-Type": "application/json" }
              : {}),
            ...("headers" in request ? request.headers : {}),
          },
          ...("body" in request
            ? {
                body: JSON.stringify(request.body),
              }
            : {}),
        });
        failureMock?.mockRestore();
        config.media = originalMedia;
        dependencyUp = true;
        expect(res.status).toBe(Number(status));
        const body: unknown = await res.json();
        const parsed = response.schema.safeParse(body);
        expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
      });
    }
  }

  it("errors use the contract error envelope", async () => {
    const res = await fetch(`${base}/no-such-route`);
    expect(res.status).toBe(404);
    const body: unknown = await res.json();
    expect(() => ErrorEnvelope.parse(body)).not.toThrow();
  });
});
