import { randomUUID } from "node:crypto";
import {
  ErrorEnvelope,
  PublicListingDetailResponse,
  PublicListingListResponse,
} from "@evone/contracts";
import { DEMO_REVIEWER_ID } from "@evone/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { encodeListingCursor } from "../src/marketplace/listing-cursor.js";
import { authEnv } from "./auth-fixture.js";
import { cleanup, db, run, startApi } from "./support.js";

let api: Awaited<ReturnType<typeof startApi>>;
let prod: Awaited<ReturnType<typeof startApi>>;
let sellerId: string;
let reviewerId: string;

beforeAll(async () => {
  api = await startApi("test");
  prod = await startApi("production");

  const seller = await db.user.create({
    data: {
      authIssuer: authEnv.AUTH_ISSUER,
      authProviderId: `pub_listing_seller_${run}`,
      status: "ACTIVE",
      roles: { create: { role: "USER", scopeType: "GLOBAL" } },
    },
  });
  sellerId = seller.id;

  const reviewer = await db.user.create({
    data: {
      authIssuer: authEnv.AUTH_ISSUER,
      authProviderId: `pub_listing_reviewer_${run}`,
      status: "ACTIVE",
      roles: { create: { role: "MODERATOR", scopeType: "GLOBAL" } },
    },
  });
  reviewerId = reviewer.id;
});

afterAll(async () => {
  await api.app.close();
  await prod.app.close();
  await cleanup();
  await db.$disconnect();
});

const json = async <T>(res: Response, schema: { parse: (v: unknown) => T }) =>
  schema.parse(await res.json());

/**
 * Listings and their referenced variants are immutable evidence (ON DELETE RESTRICT
 * + ev_variants_listing_guard), so catalogue fixtures for listing tests avoid the
 * `${run}-` slug prefix that cleanup() deletes.
 */
async function createCatalogueFixture(
  opts: { vehicleType?: "CAR" | "SCOOTER"; brandName?: string } = {},
) {
  const suffix = randomUUID().slice(0, 8);
  const brand = await db.brand.create({
    data: {
      slug: `demo-pub-brand-${suffix}`,
      name: opts.brandName ?? `DEMO Brand ${suffix}`,
      isDemo: true,
      status: "PUBLISHED",
    },
  });
  const model = await db.evModel.create({
    data: {
      brandId: brand.id,
      slug: `demo-pub-model-${suffix}`,
      name: `DEMO Model ${suffix}`,
      vehicleType: opts.vehicleType ?? "CAR",
      isDemo: true,
      status: "PUBLISHED",
    },
  });
  const variant = await db.$transaction(async (tx) => {
    const created = await tx.evVariant.create({
      data: {
        modelId: model.id,
        slug: `demo-pub-variant-${suffix}`,
        name: `DEMO Variant ${suffix}`,
        isDemo: true,
        batteryKwh: "35.00",
        claimedRangeKm: 350,
        rangeStandard: "MIDC",
      },
    });
    await tx.specSource.createMany({
      data: [
        {
          variantId: created.id,
          fieldName: "BATTERY_KWH",
          valueText: "35 kWh",
          sourceUrl: "https://example.com/oem",
          sourceKind: "OEM",
          reviewedAt: new Date("2026-11-03T10:00:00Z"),
          reviewerId: DEMO_REVIEWER_ID,
        },
        {
          variantId: created.id,
          fieldName: "CLAIMED_RANGE",
          valueText: "350 km MIDC",
          sourceUrl: "https://example.com/reg",
          sourceKind: "REGULATOR",
          effectiveAt: new Date("2026-01-01"),
          reviewedAt: new Date("2026-11-03T10:00:00Z"),
          reviewerId: DEMO_REVIEWER_ID,
        },
        {
          variantId: created.id,
          fieldName: "MOTOR_KW",
          valueText: "unreviewed draft",
          sourceUrl: "https://example.com/draft",
          sourceKind: "PRESS",
        },
      ],
    });
    return tx.evVariant.update({
      where: { id: created.id },
      data: { status: "PUBLISHED" },
    });
  });
  return { brand, model, variant };
}

async function createListingFixture(opts: {
  variantId: string;
  ownerId?: string;
  year?: number;
  odometerKm?: number;
  city?: string;
  askingPricePaise?: bigint;
  ownershipCount?: number;
  conditionNotes?: string;
  targetStatus?:
    "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "ARCHIVED" | "SOLD";
}) {
  const ownerId = opts.ownerId ?? sellerId;
  const targetStatus = opts.targetStatus ?? "PUBLISHED";
  const slug = `demo-listing-${randomUUID().replace(/-/g, "").slice(0, 12)}`;

  const asset = await db.mediaAsset.create({
    data: {
      ownerId,
      contentType: "image/webp",
      sizeBytes: 128,
      status: "READY",
      objectKey: `ready/synthetic-${randomUUID()}.webp`,
      expiresAt: new Date(Date.now() + 300000),
    },
  });

  // Step 1: Create DRAFT and attach photo as owner
  const draft = await db.$transaction(async (tx) => {
    const req1 = randomUUID();
    await tx.$queryRaw`SELECT set_config('evone.actor_id', ${ownerId}, true), set_config('evone.request_id', ${req1}, true)`;
    const created = await tx.listing.create({
      data: {
        sellerUserId: ownerId,
        slug,
        variantId: opts.variantId,
        year: opts.year ?? 2024,
        odometerKm: opts.odometerKm ?? 12000,
        city: opts.city ?? "DEMO Bengaluru",
        askingPricePaise: opts.askingPricePaise ?? 90000000n,
        ownershipCount: opts.ownershipCount ?? 1,
        conditionNotes:
          opts.conditionNotes ??
          "DEMO synthetic condition notes; no personal information.",
      },
    });
    await tx.listingMedia.create({
      data: {
        listingId: created.id,
        mediaAssetId: asset.id,
        position: 0,
        alt: "DEMO synthetic front angle",
      },
    });
    return tx.listing.findUniqueOrThrow({ where: { id: created.id } });
  });

  if (targetStatus === "DRAFT") return draft;

  // Step 2: Submit to PENDING_REVIEW as owner
  const submitted = await db.$transaction(async (tx) => {
    const req2 = randomUUID();
    await tx.$queryRaw`SELECT set_config('evone.actor_id', ${ownerId}, true), set_config('evone.request_id', ${req2}, true)`;
    return tx.listing.update({
      where: { id: draft.id },
      data: { status: "PENDING_REVIEW", version: draft.version + 1 },
    });
  });

  if (targetStatus === "PENDING_REVIEW") return submitted;

  // Step 3: Moderator review (APPROVE -> PUBLISHED, REJECT -> REJECTED)
  const reviewed = await db.$transaction(async (tx) => {
    const req3 = randomUUID();
    await tx.$queryRaw`SELECT set_config('evone.actor_id', ${reviewerId}, true), set_config('evone.request_id', ${req3}, true)`;
    await tx.listingReview.create({
      data: {
        listingId: submitted.id,
        listingVersion: submitted.version,
        reviewerId,
        decision: targetStatus === "REJECTED" ? "REJECT" : "APPROVE",
        reason:
          targetStatus === "REJECTED"
            ? "DEMO synthetic moderation rejection reason."
            : null,
        snapshot: {},
        requestId: req3,
      },
    });
    return tx.listing.findUniqueOrThrow({ where: { id: submitted.id } });
  });

  if (targetStatus === "PUBLISHED" || targetStatus === "REJECTED") {
    return reviewed;
  }

  // Step 4: Owner transitions PUBLISHED -> ARCHIVED or SOLD
  return db.$transaction(async (tx) => {
    const req4 = randomUUID();
    await tx.$queryRaw`SELECT set_config('evone.actor_id', ${ownerId}, true), set_config('evone.request_id', ${req4}, true)`;
    return tx.listing.update({
      where: { id: reviewed.id },
      data: { status: targetStatus, version: reviewed.version + 1 },
    });
  });
}

describe("GET /listings pagination and sorting", () => {
  it("walks every published listing across pages without skips or duplicates for all sort modes", async () => {
    const { brand, variant } = await createCatalogueFixture();
    // Duplicate askingPricePaise values verify deterministic UUID tie-breaking.
    const rows = [
      { price: 85000000n, year: 2022, odo: 28000 },
      { price: 65000000n, year: 2024, odo: 9000 },
      { price: 85000000n, year: 2023, odo: 15000 },
      { price: 110000000n, year: 2025, odo: 4000 },
      { price: 75000000n, year: 2021, odo: 35000 },
    ];
    for (const r of rows) {
      await createListingFixture({
        variantId: variant.id,
        askingPricePaise: r.price,
        year: r.year,
        odometerKm: r.odo,
      });
    }

    const collectAll = async (
      sort: "PRICE_ASC" | "PRICE_DESC" | "YEAR_DESC" | "ODOMETER_ASC",
    ) => {
      const seen: {
        id: string;
        price: bigint;
        year: number;
        odo: number;
      }[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const qs = `?brandSlug=${brand.slug}&sort=${sort}&limit=2${cursor ? `&cursor=${cursor}` : ""}`;
        const res = await api.get(`/listings${qs}`);
        expect(res.status).toBe(200);
        const body = await json(res, PublicListingListResponse);
        expect(body.data.length).toBeLessThanOrEqual(2);
        seen.push(
          ...body.data.map((item) => ({
            id: item.id,
            price: BigInt(item.askingPricePaise),
            year: item.year,
            odo: item.odometerKm,
          })),
        );
        expect(body.page.hasMore).toBe(body.page.nextCursor !== null);
        cursor = body.page.nextCursor;
        pages += 1;
      } while (cursor && pages < 10);
      expect(pages).toBe(3);
      expect(new Set(seen.map((x) => x.id)).size).toBe(5);
      return seen;
    };

    const asc = await collectAll("PRICE_ASC");
    expect(asc).toEqual(
      [...asc].sort((a, b) =>
        a.price === b.price
          ? a.id < b.id
            ? -1
            : 1
          : a.price < b.price
            ? -1
            : 1,
      ),
    );

    const desc = await collectAll("PRICE_DESC");
    expect(desc).toEqual(
      [...desc].sort((a, b) =>
        a.price === b.price
          ? a.id < b.id
            ? -1
            : 1
          : a.price > b.price
            ? -1
            : 1,
      ),
    );

    const yearDesc = await collectAll("YEAR_DESC");
    expect(yearDesc).toEqual(
      [...yearDesc].sort((a, b) =>
        a.year === b.year ? (a.id < b.id ? -1 : 1) : b.year - a.year,
      ),
    );

    const odoAsc = await collectAll("ODOMETER_ASC");
    expect(odoAsc).toEqual(
      [...odoAsc].sort((a, b) =>
        a.odo === b.odo ? (a.id < b.id ? -1 : 1) : a.odo - b.odo,
      ),
    );
  });
});

describe("GET /listings filters", () => {
  it("filters by vehicleType, brandSlug, modelSlug, city (case-insensitive), price, year, and odometer", async () => {
    const carCat = await createCatalogueFixture({ vehicleType: "CAR" });
    const scooterCat = await createCatalogueFixture({ vehicleType: "SCOOTER" });

    const carMatch = await createListingFixture({
      variantId: carCat.variant.id,
      city: "DEMO Pune",
      askingPricePaise: 95000000n,
      year: 2024,
      odometerKm: 11000,
    });
    await createListingFixture({
      variantId: carCat.variant.id,
      city: "DEMO Mumbai",
      askingPricePaise: 140000000n,
      year: 2021,
      odometerKm: 42000,
    });
    const scooterMatch = await createListingFixture({
      variantId: scooterCat.variant.id,
      city: "DEMO Pune",
      askingPricePaise: 11500000n,
      year: 2024,
      odometerKm: 3500,
    });

    const filteredCars = await json(
      await api.get(
        `/listings?brandSlug=${carCat.brand.slug}&modelSlug=${carCat.model.slug}&vehicleType=CAR&city=demo%20pune&minPricePaise=80000000&maxPricePaise=100000000&minYear=2023&maxYear=2025&maxOdometerKm=15000`,
      ),
      PublicListingListResponse,
    );
    expect(filteredCars.data.map((x) => x.id)).toEqual([carMatch.id]);

    const filteredScooters = await json(
      await api.get(
        `/listings?brandSlug=${scooterCat.brand.slug}&vehicleType=SCOOTER`,
      ),
      PublicListingListResponse,
    );
    expect(filteredScooters.data.map((x) => x.id)).toEqual([scooterMatch.id]);
  });
});

describe("public listing visibility and security guards", () => {
  it("exposes only PUBLISHED listings and hides DRAFT, PENDING_REVIEW, REJECTED, ARCHIVED, and SOLD", async () => {
    const { brand, variant } = await createCatalogueFixture();
    const published = await createListingFixture({
      variantId: variant.id,
      targetStatus: "PUBLISHED",
    });
    const nonPublic = await Promise.all(
      (
        ["DRAFT", "PENDING_REVIEW", "REJECTED", "ARCHIVED", "SOLD"] as const
      ).map((targetStatus) =>
        createListingFixture({ variantId: variant.id, targetStatus }),
      ),
    );

    const list = await json(
      await api.get(`/listings?brandSlug=${brand.slug}`),
      PublicListingListResponse,
    );
    expect(list.data.map((x) => x.id)).toEqual([published.id]);

    for (const hidden of nonPublic) {
      const res = await api.get(`/used-evs/${hidden.slug}`);
      expect(res.status, `status ${hidden.status} must 404`).toBe(404);
    }
  });

  it("hides published listings when the seller account is suspended or lacks an active USER/ADMIN grant", async () => {
    const { brand, variant } = await createCatalogueFixture();
    const tempSeller = await db.user.create({
      data: {
        authIssuer: authEnv.AUTH_ISSUER,
        authProviderId: `pub_suspended_${run}_${randomUUID()}`,
        status: "ACTIVE",
        roles: { create: { role: "USER", scopeType: "GLOBAL" } },
      },
    });
    const listing = await createListingFixture({
      variantId: variant.id,
      ownerId: tempSeller.id,
      targetStatus: "PUBLISHED",
    });

    expect((await api.get(`/used-evs/${listing.slug}`)).status).toBe(200);

    await db.user.update({
      where: { id: tempSeller.id },
      data: { status: "SUSPENDED" },
    });
    expect((await api.get(`/used-evs/${listing.slug}`)).status).toBe(404);
    const whileSuspended = await json(
      await api.get(`/listings?brandSlug=${brand.slug}`),
      PublicListingListResponse,
    );
    expect(whileSuspended.data.map((x) => x.id)).not.toContain(listing.id);

    // Reactivate user but expire their role grant: still hidden
    await db.user.update({
      where: { id: tempSeller.id },
      data: { status: "ACTIVE" },
    });
    await db.roleAssignment.updateMany({
      where: { userId: tempSeller.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    expect((await api.get(`/used-evs/${listing.slug}`)).status).toBe(404);
  });

  it("returns PublicListingDetail with reviewed provenance and no private seller/storage fields", async () => {
    const { brand, model, variant } = await createCatalogueFixture();
    const published = await createListingFixture({
      variantId: variant.id,
      year: 2024,
      odometerKm: 8400,
      city: "DEMO Hyderabad",
      askingPricePaise: 92000000n,
      ownershipCount: 1,
      conditionNotes:
        "DEMO synthetic condition notes; no personal information.",
    });

    const res = await api.get(`/used-evs/${published.slug}`);
    expect(res.status).toBe(200);
    const body = await json(res, PublicListingDetailResponse);
    expect(body.data).toMatchObject({
      id: published.id,
      slug: published.slug,
      year: 2024,
      odometerKm: 8400,
      city: "DEMO Hyderabad",
      askingPricePaise: "92000000",
      ownershipCount: 1,
      conditionNotes:
        "DEMO synthetic condition notes; no personal information.",
      isDemo: true,
      sellerType: "INDIVIDUAL_OWNER",
      photoCount: 1,
    });
    expect(body.data.vehicle.brand.slug).toBe(brand.slug);
    expect(body.data.vehicle.model.slug).toBe(model.slug);
    expect(body.data.vehicle.variant.id).toBe(variant.id);
    expect(body.data.media).toHaveLength(1);
    expect(body.data.media[0]).toMatchObject({
      position: 0,
      alt: "DEMO synthetic front angle",
    });
    expect(body.data.sources.map((s) => s.fieldName).sort()).toEqual([
      "BATTERY_KWH",
      "CLAIMED_RANGE",
    ]);

    const raw = JSON.stringify(body);
    expect(raw).not.toContain("unreviewed draft");
    expect(raw).not.toContain("reviewerId");
    expect(raw).not.toContain("sellerUserId");
    expect(raw).not.toContain("mediaAssetId");
    expect(raw).not.toContain("objectKey");
  });
});

describe("demo listing isolation in production", () => {
  it("returns demo listings in test/dev and hides them in production", async () => {
    const { brand, variant } = await createCatalogueFixture();
    const published = await createListingFixture({
      variantId: variant.id,
      targetStatus: "PUBLISHED",
    });

    const devList = await json(
      await api.get(`/listings?brandSlug=${brand.slug}`),
      PublicListingListResponse,
    );
    expect(devList.data.map((x) => ({ id: x.id, isDemo: x.isDemo }))).toEqual([
      { id: published.id, isDemo: true },
    ]);

    const prodList = await json(
      await prod.get(`/listings?brandSlug=${brand.slug}`),
      PublicListingListResponse,
    );
    expect(prodList.data).toEqual([]);
    expect((await prod.get(`/used-evs/${published.slug}`)).status).toBe(404);
  });
});

describe("public listing validation errors", () => {
  const validCursorForPriceAsc = encodeListingCursor({
    s: "PRICE_ASC",
    p: "90000000",
    i: "7f088e6e-32fd-4086-af08-0aef72dabef2",
  });

  it.each([
    ["limit zero", "?limit=0", "limit"],
    ["limit above 50", "?limit=51", "limit"],
    ["tampered cursor", "?cursor=bm90LWEtY3Vyc29y", "cursor"],
    [
      "cursor sort mismatch",
      `?sort=YEAR_DESC&cursor=${validCursorForPriceAsc}`,
      "cursor",
    ],
    [
      "minPricePaise above maxPricePaise",
      "?minPricePaise=90000000&maxPricePaise=50000000",
      "maxPricePaise",
    ],
    ["minYear above maxYear", "?minYear=2025&maxYear=2022", "maxYear"],
    ["invalid vehicleType", "?vehicleType=TRUCK", "vehicleType"],
    ["invalid brandSlug", "?brandSlug=BAD_SLUG!", "brandSlug"],
    ["unknown parameter", "?unexpected=1", "unexpected"],
  ])(
    "rejects GET /listings %s with 400 VALIDATION_ERROR",
    async (_label, qs, field) => {
      const res = await api.get(`/listings${qs}`);
      expect(res.status).toBe(400);
      const body = await json(res, ErrorEnvelope);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(Object.keys(body.error.fields ?? {})).toContain(field);
    },
  );

  it("rejects malformed slug on GET /used-evs/{slug} with 400 VALIDATION_ERROR", async () => {
    const res = await api.get("/used-evs/INVALID_SLUG!");
    expect(res.status).toBe(400);
    const body = await json(res, ErrorEnvelope);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(body.error.fields ?? {})).toContain("slug");
  });
});
