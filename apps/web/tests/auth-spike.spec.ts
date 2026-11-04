import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

if (process.env.AUTH_SPIKE_LOCAL_TEST === "true") {
  test("unconfigured local auth spike is honest, accessible and makes no provider request", async ({
    page,
  }, testInfo) => {
    const providerRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).hostname.includes("clerk"))
        providerRequests.push(request.url());
    });
    const response = await page.goto("/auth-spike");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Clerk is not configured" }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText(
      "No sign-in request has been sent.",
    );
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    await expect(page.locator(":focus")).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    expect(
      await page
        .getByRole("heading", { level: 1 })
        .evaluate((element) => element.getBoundingClientRect().top),
    ).toBeGreaterThanOrEqual(69);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(providerRequests).toEqual([]);
    const result = await page.request.post("/auth-spike/verify");
    expect(result.status()).toBe(503);
    expect(await result.json()).toEqual({ verified: false });
    await page.screenshot({
      path: testInfo.outputPath("auth-spike-unconfigured.png"),
      fullPage: true,
    });
  });
} else {
  test("auth development spike is inaccessible in production", async ({
    page,
    request,
  }) => {
    expect((await page.goto("/auth-spike"))?.status()).toBe(404);
    expect((await request.post("/auth-spike/verify")).status()).toBe(404);
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
      "/auth-spike",
    );
  });
}
