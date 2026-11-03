import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

// One model with four published variants (A/B share MIDC, C uses WLTP,
// E has nothing stated) and one draft (D).
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const run = `c${randomBytes(4).toString("hex")}`;
const REVIEWER = "00000000-0000-4000-8000-00000000d3e0";
const brand = { id: randomUUID(), slug: `${run}-brand` };
const model = { id: randomUUID(), slug: `${run}-model`, name: `Cmp ${run}` };
const v = (name: string) => ({
  id: randomUUID(),
  slug: `${run}-${name.toLowerCase()}`,
  name,
});
const A = v("Alpha");
const B = v("Bravo");
const C = v("Charlie");
const E = v("Echo");
const D = v("Delta");
const page = (x: { slug: string }) =>
  `/evs/${brand.slug}/${model.slug}/${x.slug}`;
const href = (...xs: { id: string }[]) =>
  `/compare?ids=${xs.map((x) => x.id).join(",")}`;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await db.connect();
  await db.query("BEGIN");
  await db.query(
    `INSERT INTO brands (id, slug, name, status, updated_at) VALUES ($1,$2,'Cmp brand','PUBLISHED',now())`,
    [brand.id, brand.slug],
  );
  await db.query(
    `INSERT INTO ev_models (id, brand_id, slug, name, vehicle_type, status, updated_at) VALUES ($1,$2,$3,$4,'CAR','PUBLISHED',now())`,
    [model.id, brand.id, model.slug, model.name],
  );
  const insert = async (
    x: typeof A,
    status: string,
    battery: number | null,
    km: number | null,
    std: string | null,
    motor: number | null,
  ) => {
    await db.query(
      `INSERT INTO ev_variants (id, model_id, slug, name, battery_kwh, claimed_range_km, range_standard, motor_kw, status, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())`,
      [x.id, model.id, x.slug, x.name, battery, km, std, motor, status],
    );
    const fields: [string, unknown][] = [
      ["BATTERY_KWH", battery],
      ["CLAIMED_RANGE", km],
      ["MOTOR_KW", motor],
    ];
    for (const [field, value] of fields) {
      if (value === null) continue;
      await db.query(
        `INSERT INTO spec_sources (id, variant_id, field_name, value_text, source_url, source_kind, reviewed_at, reviewer_id)
         VALUES ($1,$2,$3,'as stated','https://example.com/s','OEM','2026-10-20T00:00:00Z',$4)`,
        [randomUUID(), x.id, field, REVIEWER],
      );
    }
  };
  await insert(A, "PUBLISHED", 30, 300, "MIDC", null);
  await insert(B, "PUBLISHED", 40, 300, "MIDC", null);
  await insert(C, "PUBLISHED", 40, 350, "WLTP", 90);
  await insert(E, "PUBLISHED", null, null, null, null);
  await insert(D, "DRAFT", 50, null, null, null);
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

const axe = async (p: Page) =>
  (
    await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()
  ).violations.map((x) => x.id);
const table = (p: Page) =>
  p.getByRole("region", { name: /Specifications of/ }).getByRole("table");
const cellText = async (p: Page, row: string) =>
  (
    await table(p)
      .getByRole("row")
      .filter({ has: p.getByRole("rowheader", { name: row }) })
      .getByRole("cell")
      .allInnerTexts()
  ).map((t) => t.trim());

test("builds a comparison from variant pages, in the order chosen", async ({
  page: p,
}) => {
  await p.goto(page(B));
  await p.getByRole("button", { name: `Add ${B.name} to comparison` }).click();
  await expect(p.getByText("Add one more variant to compare.")).toBeVisible();
  await p.goto(page(A));
  await p.getByRole("button", { name: `Add ${A.name} to comparison` }).click();
  await p.getByRole("link", { name: "Compare 2 variants" }).click();
  await expect(p).toHaveURL(new RegExp(`ids=${B.id}(%2C|,)${A.id}`));
  const headers = await table(p).getByRole("columnheader").allInnerTexts();
  expect(headers[1]).toContain(`${model.name} ${B.name}`);
  expect(headers[2]).toContain(`${model.name} ${A.name}`);
  expect((await cellText(p, "Battery capacity"))[0]).toContain("40 kWh");
  expect((await cellText(p, "Battery capacity"))[1]).toContain("30 kWh");
  expect((await cellText(p, "Battery capacity"))[0]).toContain(
    "Checked 20 Oct 2026",
  );
  expect(await axe(p)).toEqual([]);
});

test("unknown values show a dash read as 'Not stated'", async ({ page: p }) => {
  await p.goto(href(A, E));
  const cells = table(p)
    .getByRole("row")
    .filter({ has: p.getByRole("rowheader", { name: "Battery capacity" }) })
    .getByRole("cell");
  await expect(cells.nth(1)).toHaveText("—Not stated");
  await expect(cells.nth(1).locator('[aria-hidden="true"]')).toHaveText("—");
});

test("'Show only differences' keeps only rows that differ and is shareable", async ({
  page: p,
}) => {
  await p.goto(href(A, B));
  await p.getByRole("link", { name: "Show only differences" }).click();
  await expect(p).toHaveURL(/diff=1/);
  await expect(table(p).getByRole("rowheader")).toHaveText([
    "Battery capacity",
  ]);
  await expect(
    p.getByRole("link", { name: "Show only differences" }),
  ).toHaveCount(0);
  await p.getByRole("link", { name: "Show all specifications" }).click();
  await expect(table(p).getByRole("rowheader")).toHaveCount(6);
});

test("flags ranges measured under different test standards", async ({
  page: p,
}) => {
  await p.goto(href(A, B));
  await expect(p.getByRole("note")).toHaveCount(0);
  await p.goto(href(A, C));
  await expect(p.getByRole("note")).toContainText(
    "Ranges are not directly comparable",
  );
  expect((await cellText(p, "Claimed range"))[0]).toContain(
    "MIDC: Modified Indian Driving Cycle",
  );
  expect((await cellText(p, "Claimed range"))[1]).toContain(
    "WLTP: Worldwide Harmonised",
  );
});

test("removes a column when comparing three", async ({ page: p }) => {
  await p.goto(href(A, B, C));
  await expect(table(p).getByRole("columnheader")).toHaveCount(4);
  await p.getByRole("link", { name: `Remove ${model.name} ${B.name}` }).click();
  await expect(p).toHaveURL(new RegExp(`ids=${A.id}(%2C|,)${C.id}`));
  await expect(table(p).getByRole("columnheader")).toHaveCount(3);
  // With two left, removing is not offered (a comparison needs two).
  await expect(p.getByRole("link", { name: /^Remove/ })).toHaveCount(0);
});

test("caps the tray at three", async ({ page: p }) => {
  for (const x of [A, B, C]) {
    await p.goto(page(x));
    await p
      .getByRole("button", { name: `Add ${x.name} to comparison` })
      .click();
  }
  await p.goto(page(E));
  await expect(
    p.getByRole("button", { name: "Comparison is full (3)" }),
  ).toBeDisabled();
  await expect(
    p.getByRole("link", { name: "Compare 3 variants" }),
  ).toBeVisible();
});

test("explains every state that is not a comparison", async ({ page: p }) => {
  const main = p.getByRole("main");
  await p.goto("/compare");
  await expect(main.getByRole("status")).toContainText(
    "Choose variants to compare",
  );
  await p.goto(href(A));
  await expect(main.getByRole("status")).toContainText("Add one more variant");
  await p.goto(`/compare?ids=${A.id},${A.id}`);
  await expect(main.getByRole("alert")).toContainText(
    "This comparison link is not valid",
  );
  await p.goto(`/compare?ids=${A.id},nope`);
  await expect(main.getByRole("alert")).toContainText(
    "This comparison link is not valid",
  );
  await p.goto(href(A, D));
  await expect(main.getByRole("alert")).toContainText("not available");
  expect(await axe(p)).toEqual([]);
});

test("stays usable on small screens: the table scrolls, the page does not", async ({
  page: p,
}) => {
  await p.goto(href(A, B, C));
  const region = p.getByRole("region", { name: /Specifications of/ });
  await expect(region).toHaveAttribute("tabindex", "0");
  expect(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  if ((p.viewportSize()?.width ?? 0) < 640) {
    expect(await region.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
      true,
    );
    // Row labels stay visible while scrolling sideways.
    await region.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    const label = table(p).getByRole("rowheader", { name: "Battery capacity" });
    const [labelBox, regionBox] = [
      await label.boundingBox(),
      await region.boundingBox(),
    ];
    expect(labelBox!.x).toBeLessThanOrEqual(regionBox!.x + 2);
  }
  expect(await axe(p)).toEqual([]);
});
