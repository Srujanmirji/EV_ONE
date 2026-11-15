import { test, expect } from "@playwright/test";

test("sell wizard and private seller gateway stay disabled in production while /sell shows the honest section page", async ({
  page,
  request,
}) => {
  const response = await page.goto("/sell");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Sell your EV" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your private drafts" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start a draft" })).toHaveCount(
    0,
  );

  const listApi = await request.get("/sell/api/seller/listings", {
    headers: { Authorization: "Bearer synthetic.invalid.token" },
  });
  expect(listApi.status()).toBe(404);
  expect(listApi.headers()["cache-control"]).toBe("no-store");

  const createApi = await request.post("/sell/api/listings", {
    headers: {
      Authorization: "Bearer synthetic.invalid.token",
      "Content-Type": "application/json",
    },
    data: {},
  });
  expect(createApi.status()).toBe(404);
  expect(createApi.headers()["cache-control"]).toBe("no-store");
});
