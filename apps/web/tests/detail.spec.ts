import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

// Model with one fully sourced variant, one with unknown specs, and one
// draft variant; inserted with plain SQL in one transaction (EV-021 rules).
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const run = `d${randomBytes(4).toString("hex")}`;
const REVIEWER = "00000000-0000-4000-8000-00000000d3e0";
const brand = { id: randomUUID(), slug: `${run}-brand`, name: `Brand ${run}` };
const model = { id: randomUUID(), slug: `${run}-model`, name: `Model ${run}` };
const full = { id: randomUUID(), slug: `${run}-full`, name: "Long Range" };
const bare = { id: randomUUID(), slug: `${run}-bare`, name: "Base" };
const draft = { id: randomUUID(), slug: `${run}-draft`, name: "Secret draft" };
const base = `/evs/${brand.slug}/${model.slug}`;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await db.connect();
  await db.query("BEGIN");
  await db.query(
    `INSERT INTO brands (id, slug, name, status, updated_at) VALUES ($1,$2,$3,'PUBLISHED',now())`,
    [brand.id, brand.slug, brand.name],
  );
  await db.query(
    `INSERT INTO ev_models (id, brand_id, slug, name, vehicle_type, availability_status, status, updated_at)
     VALUES ($1,$2,$3,$4,'CAR','ON_SALE','PUBLISHED',now())`,
    [model.id, brand.id, model.slug, model.name],
  );
  await db.query(
    `INSERT INTO ev_variants (id, model_id, slug, name, battery_kwh, claimed_range_km, range_standard, motor_kw, charging_ac_kw, status, updated_at)
     VALUES ($1,$2,$3,$4,40.5,1200,'MIDC',100,7.2,'PUBLISHED',now())`,
    [full.id, model.id, full.slug, full.name],
  );
  const src = (
    variant: string,
    field: string,
    text: string,
    kind: string,
    reviewed: boolean,
    effective: string | null,
  ) =>
    db.query(
      `INSERT INTO spec_sources (id, variant_id, field_name, value_text, source_url, source_kind, effective_at, reviewed_at, reviewer_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        randomUUID(),
        variant,
        field,
        text,
        `https://example.com/${run}/${field.toLowerCase()}`,
        kind,
        effective,
        reviewed ? "2026-10-20T00:00:00Z" : null,
        reviewed ? REVIEWER : null,
      ],
    );
  await src(
    full.id,
    "BATTERY_KWH",
    "40.5 kWh usable",
    "OEM",
    true,
    "2026-01-01",
  );
  await src(
    full.id,
    "CLAIMED_RANGE",
    "1200 km (MIDC)",
    "REGULATOR",
    true,
    null,
  );
  await src(full.id, "MOTOR_KW", "100 kW peak", "OEM", true, null);
  await src(full.id, "MOTOR_KW", "unreviewed rumour", "PRESS", false, null);
  await src(full.id, "CHARGING_AC_KW", "7.2 kW onboard", "OEM", true, null);
  await db.query(
    `INSERT INTO ev_variants (id, model_id, slug, name, status, updated_at) VALUES ($1,$2,$3,$4,'PUBLISHED',now())`,
    [bare.id, model.id, bare.slug, bare.name],
  );
  await db.query(
    `INSERT INTO ev_variants (id, model_id, slug, name, status, updated_at) VALUES ($1,$2,$3,$4,'DRAFT',now())`,
    [draft.id, model.id, draft.slug, draft.name],
  );
  await db.query("COMMIT");
});

test.afterAll(async () => {
  const prefix = `${run}-%`;
  for (const table of ["ev_variants", "ev_models", "brands"]) {
    await db.query(
      `UPDATE ${table} SET status = 'ARCHIVED' WHERE slug LIKE $1`,
      [prefix],
    );
    await db.query(`DELETE FROM ${table} WHERE slug LIKE $1`, [prefix]);
  }
  await db.end();
});

const axe = async (page: import("@playwright/test").Page) =>
  (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()
  ).violations.map((v) => v.id);

test("catalogue card links to the model page", async ({ page }) => {
  await page.goto(`/evs?brandId=${brand.id}`);
  await page.getByRole("link", { name: model.name }).click();
  await expect(page).toHaveURL(base);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(model.name);
});

test("model page lists published variants only, with an honest empty gallery", async ({
  page,
}) => {
  await page.goto(base);
  await expect(page).toHaveTitle(`${model.name} · EVONE`);
  const variants = page.getByRole("region", { name: "Variants" }).or(
    page.locator("section", {
      has: page.getByRole("heading", { name: "Variants" }),
    }),
  );
  await expect(variants.getByRole("link", { name: full.name })).toBeVisible();
  await expect(variants.getByRole("link", { name: bare.name })).toBeVisible();
  await expect(page.getByText(draft.name)).toHaveCount(0);
  await expect(variants).toContainText("40.5 kWh battery · 1,200 km (MIDC)");
  await expect(variants).toContainText("Battery not stated · Range not stated");
  await expect(
    page.getByRole("figure", { name: `Photos of ${model.name}` }),
  ).toContainText("No photos yet");
  await expect(page.getByRole("img")).toHaveCount(0);
  expect(await axe(page)).toEqual([]);
});

test("variant page shows units, test standard, and the reviewed source and date for each value", async ({
  page,
}) => {
  await page.goto(`${base}/${full.slug}`);
  await expect(page).toHaveTitle(`${model.name} ${full.name} · EVONE`);
  const specs = page.locator("dl");
  const row = (label: string) =>
    specs.locator("div", { has: page.locator("dt", { hasText: label }) });
  await expect(row("Battery capacity").locator("dd")).toContainText("40.5 kWh");
  await expect(row("Battery capacity")).toContainText(
    "“40.5 kWh usable”, effective 1 Jan 2026 · checked 20 Oct 2026",
  );
  await expect(row("Claimed range")).toContainText("1,200 km");
  await expect(row("Claimed range")).toContainText(
    "Test standard: MIDC: Modified Indian Driving Cycle",
  );
  await expect(
    row("Claimed range").getByRole("link", { name: /example\.com/ }),
  ).toHaveAttribute("href", `https://example.com/${run}/claimed_range`);
  await expect(row("Claimed range")).toContainText(
    "(Regulator or test agency) states",
  );
  await expect(row("Motor power")).toContainText("100 kW");
  await expect(row("Motor power")).not.toContainText("rumour");
  await expect(row("AC charging")).toContainText("7.2 kW");
  for (const label of ["DC fast charging", "Warranty"]) {
    await expect(row(label).locator("dd")).toHaveText("Not stated");
    await expect(row(label).getByRole("link")).toHaveCount(0);
  }
  await expect(
    page.getByText("Most recently checked 20 Oct 2026"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(await axe(page)).toEqual([]);
});

test("a variant with no stated specs shows every value as Not stated", async ({
  page,
}) => {
  await page.goto(`${base}/${bare.slug}`);
  await expect(page.locator("dl dd")).toHaveText(Array(6).fill("Not stated"));
  await expect(page.locator("dl").getByRole("link")).toHaveCount(0);
});

test("breadcrumbs lead back up the hierarchy", async ({ page }) => {
  await page.goto(`${base}/${full.slug}`);
  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText(full.name);
  await crumbs.getByRole("link", { name: model.name }).click();
  await expect(page).toHaveURL(base);
});

test("unknown, draft or wrongly nested pages return 404", async ({ page }) => {
  for (const path of [
    `${base}/${draft.slug}`,
    `${base}/no-such-variant`,
    `/evs/${brand.slug}/no-such-model`,
    `/evs/no-such-brand/${model.slug}`,
    `/evs/demo-motors/${model.slug}`,
  ]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
  }
});
