import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const BRAND_SLUG = "zzz-used-e2e-brand";
const BRAND_NAME = "ZZZ Used E2E Brand";
const REVIEWER = "00000000-0000-4000-8000-00000000d3e0";

test.describe.configure({ mode: "serial" });

async function createPublishedListing(opts: {
  sellerId: string;
  moderatorId: string;
  variantId: string;
  slug: string;
  year: number;
  odometerKm: number;
  city: string;
  askingPricePaise: number;
}) {
  const listingId = randomUUID();
  const assetId = randomUUID();
  const mediaId = randomUUID();

  await db.query(
    `INSERT INTO media_assets (id, owner_id, status, object_key, content_type, size_bytes, expires_at, created_at, updated_at)
     VALUES ($1, $2, 'READY', $3, 'image/webp', 128, now() + interval '1 hour', now(), now())`,
    [assetId, opts.sellerId, `ready/e2e-${assetId}.webp`],
  );

  const req1 = randomUUID();
  await db.query(
    `SELECT set_config('evone.actor_id', $1, true), set_config('evone.request_id', $2, true)`,
    [opts.sellerId, req1],
  );
  await db.query(
    `INSERT INTO listings (
       id, seller_user_id, variant_id, slug, year, odometer_km, city,
       asking_price_paise, ownership_count, condition_notes, status, version, is_demo, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, 1,
       'DEMO synthetic condition notes; no personal information.',
       'DRAFT', 1, true, now(), now()
     )`,
    [
      listingId,
      opts.sellerId,
      opts.variantId,
      opts.slug,
      opts.year,
      opts.odometerKm,
      opts.city,
      opts.askingPricePaise,
    ],
  );
  await db.query(
    `INSERT INTO listing_media (id, listing_id, media_asset_id, position, alt, created_at, updated_at)
     VALUES ($1, $2, $3, 0, 'DEMO synthetic side profile', now(), now())`,
    [mediaId, listingId, assetId],
  );

  // Attach bumped version to 2; submit to PENDING_REVIEW (version 3)
  const req2 = randomUUID();
  await db.query(
    `SELECT set_config('evone.actor_id', $1, true), set_config('evone.request_id', $2, true)`,
    [opts.sellerId, req2],
  );
  await db.query(
    `UPDATE listings SET status = 'PENDING_REVIEW', version = 3 WHERE id = $1`,
    [listingId],
  );

  // Moderator approves version 3 -> PUBLISHED (version 4)
  const req3 = randomUUID();
  await db.query(
    `SELECT set_config('evone.actor_id', $1, true), set_config('evone.request_id', $2, true)`,
    [opts.moderatorId, req3],
  );
  await db.query(
    `INSERT INTO listing_reviews (id, listing_id, listing_version, reviewer_id, decision, snapshot, request_id, created_at)
     VALUES ($1, $2, 3, $3, 'APPROVE', '{}'::jsonb, $4, now())`,
    [randomUUID(), listingId, opts.moderatorId, req3],
  );
}

test.beforeAll(async () => {
  await db.connect();
  await db.query("BEGIN");
  await db.query("SELECT pg_advisory_xact_lock(30302026)");

  const existing = await db.query(`SELECT id FROM brands WHERE slug = $1`, [
    BRAND_SLUG,
  ]);
  if (existing.rowCount === 0) {
    const sellerId = randomUUID();
    const moderatorId = randomUUID();
    await db.query(
      `INSERT INTO users (id, auth_issuer, auth_provider_id, status, created_at, updated_at)
       VALUES
         ($1, 'https://clerk.evone.test', 'used_e2e_seller', 'ACTIVE', now(), now()),
         ($2, 'https://clerk.evone.test', 'used_e2e_moderator', 'ACTIVE', now(), now())`,
      [sellerId, moderatorId],
    );
    await db.query(
      `INSERT INTO role_assignments (id, user_id, role, scope_type, active, created_at, updated_at)
       VALUES
         ($1, $2, 'USER', 'GLOBAL', true, now(), now()),
         ($3, $4, 'MODERATOR', 'GLOBAL', true, now(), now())`,
      [randomUUID(), sellerId, randomUUID(), moderatorId],
    );

    const brandId = randomUUID();
    await db.query(
      `INSERT INTO brands (id, slug, name, is_demo, status, updated_at)
       VALUES ($1, $2, $3, true, 'PUBLISHED', now())`,
      [brandId, BRAND_SLUG, BRAND_NAME],
    );

    const scooterModelId = randomUUID();
    const scooterVariantId = randomUUID();
    await db.query(
      `INSERT INTO ev_models (id, brand_id, slug, name, vehicle_type, is_demo, status, updated_at)
       VALUES ($1, $2, 'zzz-used-e2e-scooter', 'ZZZ Used E2E Scooter', 'SCOOTER', true, 'PUBLISHED', now())`,
      [scooterModelId, brandId],
    );
    await db.query(
      `INSERT INTO ev_variants (id, model_id, slug, name, battery_kwh, claimed_range_km, range_standard, is_demo, status, updated_at)
       VALUES ($1, $2, 'zzz-used-e2e-scooter-v', 'Pro', 3.20, 125, 'IDC', true, 'PUBLISHED', now())`,
      [scooterVariantId, scooterModelId],
    );
    for (const field of ["BATTERY_KWH", "CLAIMED_RANGE"]) {
      await db.query(
        `INSERT INTO spec_sources (id, variant_id, field_name, value_text, source_url, source_kind, reviewed_at, reviewer_id)
         VALUES ($1, $2, $3, 'as stated', 'https://example.com/spec', 'OEM', '2026-10-15T00:00:00Z', $4)`,
        [randomUUID(), scooterVariantId, field, REVIEWER],
      );
    }

    const carModelId = randomUUID();
    const carVariantId = randomUUID();
    await db.query(
      `INSERT INTO ev_models (id, brand_id, slug, name, vehicle_type, is_demo, status, updated_at)
       VALUES ($1, $2, 'zzz-used-e2e-car', 'ZZZ Used E2E Car', 'CAR', true, 'PUBLISHED', now())`,
      [carModelId, brandId],
    );
    await db.query(
      `INSERT INTO ev_variants (id, model_id, slug, name, is_demo, status, updated_at)
       VALUES ($1, $2, 'zzz-used-e2e-car-v', 'Base', true, 'PUBLISHED', now())`,
      [carVariantId, carModelId],
    );

    await createPublishedListing({
      sellerId,
      moderatorId,
      variantId: scooterVariantId,
      slug: "demo-used-e2e-scooter-0",
      year: 2025,
      odometerKm: 1800,
      city: "DEMO Kochi",
      askingPricePaise: 11500000,
    });

    for (let i = 1; i <= 13; i++) {
      await createPublishedListing({
        sellerId,
        moderatorId,
        variantId: carVariantId,
        slug: `demo-used-e2e-car-${i}`,
        year: 2021 + (i % 4),
        odometerKm: 10000 + i * 2000,
        city: "DEMO Pune",
        askingPricePaise: (800000 + i * 25000) * 100,
      });
    }
  }

  await db.query("COMMIT");
});

test.afterAll(async () => {
  await db.end();
});

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;
const cards = (page: Page) =>
  page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 2 }) });

async function noAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations.map((v) => v.id)).toEqual([]);
}

test("lists published demo used EVs with truthful labels, prices, specs and axe AA compliance", async ({
  page,
}) => {
  await page.goto(`/used-evs?brandSlug=${BRAND_SLUG}`);
  const first = cards(page).first();
  await expect(first).toContainText("ZZZ Used E2E Scooter Pro");
  await expect(first).toContainText("Demo data");
  await expect(first).toContainText("Individual seller");
  await expect(first).toContainText("Scooter");
  await expect(first).toContainText("₹1,15,000");
  await expect(first).toContainText(
    "Asking price · Enquiry only (sale happens off-platform)",
  );
  await expect(first).toContainText("1,800 km");
  await expect(first).toContainText("1st owner");
  await expect(first).toContainText("3.2 kWh");
  await expect(first).toContainText("125 km");
  await expect(first.getByText("(IDC)")).toHaveAttribute(
    "title",
    "Indian Driving Cycle",
  );
  await expect(first).not.toContainText("Verified Dealer");
  await expect(first).not.toContainText("Identity Verified");
  await expect(first).not.toContainText("Battery Inspected");
  await noAxeViolations(page);
});

test("cards say 'Not stated' when canonical battery or range is not stated", async ({
  page,
}) => {
  await page.goto(`/used-evs?brandSlug=${BRAND_SLUG}&vehicleType=CAR`);
  const first = cards(page).first();
  await expect(first).toContainText("ZZZ Used E2E Car Base");
  await expect(first).toContainText("Not stated");
});

test("filters and sort persist in the URL across desktop sidebar and mobile sheet", async ({
  page,
}) => {
  await page.goto("/used-evs");
  if (isDesktop(page)) {
    const aside = page.getByRole("complementary");
    await aside.getByLabel("Sort by").selectOption("YEAR_DESC");
    await aside.getByLabel("Brand").selectOption({ label: BRAND_NAME });
    await aside.getByLabel("Vehicle type").selectOption("SCOOTER");
    await aside.getByLabel("City").fill("DEMO Kochi");
    await aside.getByRole("button", { name: "Apply filters" }).click();
  } else {
    await page.getByRole("button", { name: "Filters" }).click();
    const sheet = page.getByRole("dialog", { name: "Filter listings" });
    await expect(sheet).toBeVisible();
    if ((page.viewportSize()?.width ?? 0) < 640) {
      const box = await sheet.boundingBox();
      expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(
        page.viewportSize()?.height,
      );
    }
    await sheet.getByLabel("Sort by").selectOption("YEAR_DESC");
    await sheet.getByLabel("Brand").selectOption({ label: BRAND_NAME });
    await sheet.getByLabel("Vehicle type").selectOption("SCOOTER");
    await sheet.getByLabel("City").fill("DEMO Kochi");
    await sheet.getByRole("button", { name: "Apply filters" }).click();
  }

  await expect(page).toHaveURL(
    new RegExp(
      `sort=YEAR_DESC.*brandSlug=${BRAND_SLUG}.*vehicleType=SCOOTER.*city=DEMO\\+Kochi`,
    ),
  );
  await expect(cards(page)).toHaveCount(1);
  await expect(page.getByRole("main")).toContainText(
    "Showing 1 listing · Year: newest first",
  );
  if (!isDesktop(page)) {
    await expect(
      page.getByRole("button", { name: "Filters (3)" }),
    ).toBeVisible();
  }
  await page.reload();
  await expect(cards(page)).toHaveCount(1);
});

test("paginates 12 listings at a time and keeps filters and sort", async ({
  page,
}) => {
  await page.goto(`/used-evs?brandSlug=${BRAND_SLUG}&sort=PRICE_DESC`);
  await expect(cards(page)).toHaveCount(12);
  await expect(cards(page).first()).toContainText("₹11,25,000");

  await page.getByRole("link", { name: "Next page" }).click();
  await expect(page).toHaveURL(
    new RegExp(`brandSlug=${BRAND_SLUG}&sort=PRICE_DESC&cursor=`),
  );
  await expect(cards(page)).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Next page" })).toHaveCount(0);

  await page.getByRole("link", { name: "Back to first page" }).click();
  await expect(cards(page)).toHaveCount(12);
});

test("shows an empty state with Clear filters when filters match nothing", async ({
  page,
}) => {
  await page.goto(`/used-evs?brandSlug=${BRAND_SLUG}&city=NoSuchCity`);
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "No listings match these filters",
  );
  await page
    .getByRole("main")
    .getByRole("status")
    .getByRole("link", { name: "Clear filters" })
    .click();
  await expect(page).toHaveURL("/used-evs");
  await noAxeViolations(page);
});

test("explains invalid or outdated filter links", async ({ page }) => {
  for (const qs of [
    "vehicleType=TRUCK",
    "minYear=2025&maxYear=2021",
    "cursor=bm90LWEtY3Vyc29y",
  ]) {
    await page.goto(`/used-evs?${qs}`);
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "These filters are not valid",
    );
  }
  await noAxeViolations(page);
});
