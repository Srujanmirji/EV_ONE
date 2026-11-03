import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

// Fixtures go straight into PostgreSQL (plain SQL, no ORM) under a unique
// brand, so tests can filter to exactly their own data. The demo seed must
// also be present. Publishing happens in one transaction so the database's
// deferred publish rules (EV-021) see sourced specs at commit.
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const run = `w${randomBytes(4).toString("hex")}`;
const brandId = randomUUID();
const REVIEWER = "00000000-0000-4000-8000-00000000d3e0";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await db.connect();
  await db.query("BEGIN");
  await db.query(
    `INSERT INTO brands (id, slug, name, status, updated_at) VALUES ($1, $2, $3, 'PUBLISHED', now())`,
    [brandId, `${run}-brand`, `Zeta ${run}`],
  );
  // 14 models: more than one page of 12.
  for (let i = 0; i < 14; i++) {
    const modelId = randomUUID();
    await db.query(
      `INSERT INTO ev_models (id, brand_id, slug, name, vehicle_type, status, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'PUBLISHED', now())`,
      [
        modelId,
        brandId,
        `${run}-m${i}`,
        `Model ${String(i).padStart(2, "0")}`,
        i === 0 ? "SCOOTER" : "CAR",
      ],
    );
    if (i === 0) {
      const variantId = randomUUID();
      await db.query(
        `INSERT INTO ev_variants (id, model_id, slug, name, battery_kwh, claimed_range_km, range_standard, status, updated_at)
         VALUES ($1, $2, $3, 'V', 2.88, 110, 'IDC', 'PUBLISHED', now())`,
        [variantId, modelId, `${run}-v`],
      );
      for (const field of ["BATTERY_KWH", "CLAIMED_RANGE"]) {
        await db.query(
          `INSERT INTO spec_sources (id, variant_id, field_name, value_text, source_url, source_kind, reviewed_at, reviewer_id)
           VALUES ($1, $2, $3, 'as stated', 'https://example.com/spec', 'OEM', '2026-10-15T00:00:00Z', $4)`,
          [randomUUID(), variantId, field, REVIEWER],
        );
      }
    }
  }
  await db.query("COMMIT");
});

test.afterAll(async () => {
  const prefix = `${run}-%`;
  await db.query(
    `UPDATE ev_variants SET status = 'ARCHIVED' WHERE slug LIKE $1`,
    [prefix],
  );
  await db.query(`DELETE FROM ev_variants WHERE slug LIKE $1`, [prefix]);
  await db.query(
    `UPDATE ev_models SET status = 'ARCHIVED' WHERE slug LIKE $1`,
    [prefix],
  );
  await db.query(`DELETE FROM ev_models WHERE slug LIKE $1`, [prefix]);
  await db.query(`UPDATE brands SET status = 'ARCHIVED' WHERE slug LIKE $1`, [
    prefix,
  ]);
  await db.query(`DELETE FROM brands WHERE slug LIKE $1`, [prefix]);
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

test("lists demo models with labelled, source-aware cards", async ({
  page,
}) => {
  await page.goto("/evs");
  const demo = cards(page).filter({ hasText: "DEMO Urban Hatch (fictional)" });
  await expect(demo).toContainText("Demo data");
  await expect(demo).toContainText("40.5 kWh");
  await expect(demo).toContainText("400 km");
  await expect(demo.getByText("(MIDC)")).toHaveAttribute(
    "title",
    "Modified Indian Driving Cycle",
  );
  await expect(demo).toContainText(/reviewed sources · checked 3 Nov 2026/);
  await noAxeViolations(page);
});

test("cards say 'Not stated' instead of inventing values", async ({ page }) => {
  await page.goto(`/evs?brandId=${brandId}&vehicleType=CAR`);
  const first = cards(page).first();
  await expect(first).toContainText("Not stated");
  await expect(first).toContainText("Specifications not published yet");
});

test("filters persist in the URL and narrow results", async ({ page }) => {
  await page.goto("/evs");
  if (isDesktop(page)) {
    const aside = page.getByRole("complementary");
    await aside.getByLabel("Brand").selectOption({ label: `Zeta ${run}` });
    await aside.getByLabel("Vehicle type").selectOption("SCOOTER");
    await aside.getByRole("button", { name: "Apply filters" }).click();
  } else {
    await page.getByRole("button", { name: "Filters" }).click();
    const sheet = page.getByRole("dialog", { name: "Filter models" });
    await expect(sheet).toBeVisible();
    if ((page.viewportSize()?.width ?? 0) < 640) {
      // Bottom sheet on phones: the panel touches the bottom edge.
      const box = await sheet.boundingBox();
      expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(
        page.viewportSize()?.height,
      );
    }
    await sheet.getByLabel("Brand").selectOption({ label: `Zeta ${run}` });
    await sheet.getByLabel("Vehicle type").selectOption("SCOOTER");
    await sheet.getByRole("button", { name: "Apply filters" }).click();
  }
  await expect(page).toHaveURL(`/evs?brandId=${brandId}&vehicleType=SCOOTER`);
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText("110 km");
  await expect(cards(page).first()).toContainText("(IDC)");
  if (!isDesktop(page)) {
    await expect(
      page.getByRole("button", { name: "Filters (2)" }),
    ).toBeVisible();
  }
  // Reloading keeps the same results: state is in the URL.
  await page.reload();
  await expect(cards(page)).toHaveCount(1);
});

test("paginates 12 at a time and keeps filters", async ({ page }) => {
  await page.goto(`/evs?brandId=${brandId}`);
  await expect(cards(page)).toHaveCount(12);
  await page.getByRole("link", { name: "Next page" }).click();
  await expect(page).toHaveURL(new RegExp(`brandId=${brandId}&cursor=`));
  await expect(cards(page)).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Next page" })).toHaveCount(0);
  await page.getByRole("link", { name: "Back to first page" }).click();
  await expect(cards(page)).toHaveCount(12);
});

test("shows an empty state with a way out when filters match nothing", async ({
  page,
}) => {
  await page.goto(`/evs?brandId=${brandId}&vehicleType=THREE_WHEELER`);
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "No models match these filters",
  );
  await page
    .getByRole("main")
    .getByRole("status")
    .getByRole("link", { name: "Clear filters" })
    .click();
  await expect(page).toHaveURL("/evs");
  await noAxeViolations(page);
});

test("explains invalid or outdated filter links", async ({ page }) => {
  for (const qs of [
    "vehicleType=TRUCK",
    "brandId=nope",
    "cursor=bm90LWEtY3Vyc29y",
  ]) {
    await page.goto(`/evs?${qs}`);
    // Scope to <main>: Next.js adds its own route announcer with role="alert".
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "These filters are not valid",
    );
  }
  await noAxeViolations(page);
});
