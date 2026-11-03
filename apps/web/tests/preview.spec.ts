import { expect, test } from "@playwright/test";

test("preview renders honestly, fits the viewport and supports keyboard entry", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("EVONE — Preview");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Everything EV.",
  );
  await expect(page.getByRole("contentinfo")).toContainText(
    "Vehicle discovery and transactions are not available yet.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  expect(await skip.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    "solid",
  );
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.getByRole("main").blur();
  await page.screenshot({
    path: testInfo.outputPath("preview.png"),
    fullPage: true,
  });
});

test("unknown routes return 404 with a keyboard-accessible recovery link", async ({
  page,
}) => {
  const response = await page.goto("/missing-page");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.keyboard.press("Tab");
  const home = page.getByRole("link", { name: "Return to preview" });
  await expect(home).toBeFocused();
  await expect(home).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/");
});
