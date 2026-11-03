import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { sections } from "../lib/site";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return result.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
}

for (const path of [
  "/",
  "/ui-kit",
  "/no-such-page",
  ...sections.map((s) => s.href),
]) {
  test(`${path} has no WCAG 2.2 AA violations (axe)`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    expect(await axe(page)).toEqual([]);
  });
}

test("ui-kit is not indexed and not in the sitemap", async ({
  page,
  request,
}) => {
  await page.goto("/ui-kit");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    "/ui-kit",
  );
});

test("modal traps focus, closes on Escape and backdrop, and restores focus", async ({
  page,
}) => {
  await page.goto("/ui-kit");
  const opener = page.getByRole("button", { name: "Open example dialog" });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Example dialog" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription(/Focus stays inside/);
  expect(await axe(page)).toEqual([]);

  // Tabbing many times never leaves the dialog.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((d) => d.contains(document.activeElement)),
    ).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();

  await opener.click();
  await expect(dialog).toBeVisible();
  // Click the backdrop (outside the panel, inside the viewport).
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();

  await opener.click();
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog).toBeHidden();
});

test("form shows linked errors, focuses the first invalid field, then succeeds", async ({
  page,
}) => {
  await page.goto("/ui-kit");
  await page.getByRole("button", { name: "Check form" }).click();
  const city = page.getByLabel(/^City/);
  await expect(city).toBeFocused();
  await expect(city).toHaveAttribute("aria-invalid", "true");
  await expect(city).toHaveAccessibleDescription(/Enter the city/);
  await expect(page.getByLabel(/^Vehicle type/)).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(await axe(page)).toEqual([]);

  await city.fill("Hubballi");
  await page.getByLabel(/^Vehicle type/).selectOption("CAR");
  await page.getByRole("button", { name: "Check form" }).click();
  await expect(page.getByRole("button", { name: "Checking…" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(
    page.getByText("Form is valid. Nothing was sent."),
  ).toBeVisible();
  await expect(city).not.toHaveAttribute("aria-invalid");
});
