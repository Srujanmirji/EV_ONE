import { expect, type Page, test } from "@playwright/test";
import { primaryNav, sections } from "../lib/site";

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

for (const section of sections) {
  test(`${section.href} renders an honest, indexed-off section page`, async ({
    page,
  }) => {
    const errors = trackErrors(page);
    const response = await page.goto(section.href);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(`${section.title} · EVONE`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      section.title,
    );
    if (!section.live) {
      await expect(page.getByRole("status")).toContainText(
        section.availability,
      );
    }
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      section.description,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${section.href}$`),
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("footer links every section", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  for (const section of sections) {
    await expect(
      footer.getByRole("link", { name: section.label, exact: true }),
    ).toHaveAttribute("href", section.href);
  }
});

test("desktop header navigates and marks the current page", async ({
  page,
}) => {
  test.skip(!isDesktop(page), "desktop navigation only");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const section of primaryNav) {
    await expect(
      nav.getByRole("link", { name: section.label, exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
  await nav.getByRole("link", { name: "Explore EVs" }).click();
  await expect(page).toHaveURL("/evs");
  await expect(nav.getByRole("link", { name: "Explore EVs" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("link", { name: "Used EVs" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("mobile menu opens, closes on Escape with focus restored, and closes after navigating", async ({
  page,
}) => {
  test.skip(isDesktop(page), "collapsed navigation only");
  await page.goto("/");
  const button = page.getByRole("button", { name: "Menu" });
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();

  await button.click();
  const close = page.getByRole("button", { name: "Close" });
  await expect(close).toHaveAttribute("aria-expanded", "true");
  const menu = page.getByRole("navigation", { name: "Main" });
  for (const section of primaryNav) {
    await expect(
      menu.getByRole("link", { name: section.label, exact: true }),
    ).toBeVisible();
  }

  // Move focus into the menu: Escape must bring it back to the toggle, not
  // strand it on a link that is about to be hidden.
  await page.keyboard.press("Tab");
  await expect(menu.getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();

  await page.getByRole("button", { name: "Menu" }).click();
  await menu.getByRole("link", { name: "Charging", exact: true }).click();
  await expect(page).toHaveURL("/charging");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("robots.txt blocks crawling and sitemap.xml lists every section", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \//);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const section of sections)
    expect(sitemap).toContain(`${section.href}</loc>`);
});
