import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const wcag = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test("calculator submits real estimates and stays usable by keyboard", async ({
  page,
}, info) => {
  await page.goto("/calculator");
  await expect(
    page.getByRole("heading", { name: "Build your energy estimate" }),
  ).toBeVisible();
  const example = page.getByRole("button", {
    name: "Load illustrative example",
  });
  await example.focus();
  await page.keyboard.press("Enter");
  for (const label of [
    "Monthly driving",
    "Petrol / diesel price",
    "Petrol / diesel efficiency",
    "EV energy use",
    "Blended electricity tariff",
    "EV purchase premium",
  ]) {
    await page.keyboard.press("Tab");
    const control = page.getByLabel(
      new RegExp(`^${label.replaceAll("/", "\\/").replaceAll("(", "\\(")}`),
    );
    await expect(control).toBeFocused();
    expect(
      await control.evaluate((el) => getComputedStyle(el).outlineStyle),
    ).not.toBe("none");
  }
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Calculate estimate", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  const results = page.getByRole("region", { name: "Calculation results" });
  await expect(results).toContainText("₹65,600.00");
  await expect(results).toContainText("37 months");
  await expect(results).toContainText("₹5,466.67");
  await expect(results).toBeFocused();
  expect(
    (await new AxeBuilder({ page }).withTags(wcag).analyze()).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await results.evaluate((el) => el.getBoundingClientRect().top),
  ).toBeGreaterThanOrEqual(72);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("calculator-success.png"),
    fullPage: true,
  });
  await page.getByLabel(/^Monthly driving/).fill("2000");
  await expect(results).toContainText("Your values have changed");
  await expect(results).not.toContainText("₹65,600.00");
});

test("calculator exposes field errors and keeps the input values", async ({
  page,
}) => {
  await page.goto("/calculator");
  await page
    .getByRole("button", { name: "Calculate estimate", exact: true })
    .click();
  const km = page.getByLabel(/^Monthly driving/);
  await expect(km).toHaveAttribute("aria-invalid", "true");
  await expect(km).toBeFocused();
  await expect(
    page
      .getByRole("region", { name: "Calculation results" })
      .getByRole("alert"),
  ).toContainText("Check your inputs");
  await page.getByRole("button", { name: "Load illustrative example" }).click();
  await page.getByLabel(/^Petrol \/ diesel efficiency/).fill("0");
  await page
    .getByRole("button", { name: "Calculate estimate", exact: true })
    .click();
  await expect(page.getByLabel(/^Petrol \/ diesel efficiency/)).toBeFocused();
  await expect(km).toHaveValue("1000");
  expect(
    (await new AxeBuilder({ page }).withTags(wcag).analyze()).violations,
  ).toEqual([]);
});

test("calculator handles negative savings and zero driving honestly", async ({
  page,
}) => {
  await page.goto("/calculator");
  await page.getByRole("button", { name: "Load illustrative example" }).click();
  await page.getByLabel(/^Blended electricity/).fill("100");
  await page
    .getByRole("button", { name: "Calculate estimate", exact: true })
    .click();
  await expect(page.getByText("Additional energy cost per year")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Calculation results" }),
  ).toContainText("₹1,00,000.00");
  await page.getByLabel(/^Monthly driving/).fill("0");
  await page
    .getByRole("button", { name: "Calculate estimate", exact: true })
    .click();
  await expect(
    page.getByText("No driving entered. Both energy costs are zero."),
  ).toBeVisible();
});

test("calculator shows pending state and recovers from a connection error", async ({
  page,
}) => {
  await page.goto("/calculator");
  await page.getByRole("button", { name: "Load illustrative example" }).click();
  await page.route("**/calculator", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.abort("connectionfailed");
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Calculate estimate", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Calculating…" }),
  ).toHaveAttribute("aria-busy", "true");
  await expect(
    page.getByRole("status", { name: "Calculating energy estimate" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Calculation results" })
      .getByRole("alert"),
  ).toContainText("The estimate is unavailable");
  await expect(page.getByLabel(/^Monthly driving/)).toHaveValue("1000");
  await page.unroute("**/calculator");
  await page
    .getByRole("button", { name: "Calculate estimate", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Calculation results" }),
  ).toContainText("₹65,600.00");
});
