import { test, expect } from "@playwright/test";
test("catalogue editor and gateway stay unavailable in production", async ({
  page,
  request,
}) => {
  const response = await page.goto("/admin/catalogue");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Catalogue workspace" }),
  ).toHaveCount(0);
  const api = await request.get("/admin/catalogue/api/drafts", {
    headers: { Authorization: "Bearer synthetic.invalid.token" },
  });
  expect(api.status()).toBe(404);
  expect(api.headers()["cache-control"]).toBe("no-store");
});
