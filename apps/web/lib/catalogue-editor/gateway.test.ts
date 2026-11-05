import { generateKeyPairSync } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { GET, POST } from "../../app/admin/catalogue/api/[[...path]]/route";
const host = "evone-local.clerk.accounts.dev";
const publicKey = generateKeyPairSync("rsa", { modulusLength: 2048 })
  .publicKey.export({ type: "spki", format: "pem" })
  .toString();
const url = "http://127.0.0.1:3000/admin/catalogue/api/drafts";
const context = { params: Promise.resolve({ path: ["drafts"] }) };
beforeEach(() => {
  for (const [key, value] of Object.entries({
    NODE_ENV: "development",
    CATALOGUE_EDITOR_ENABLED: "true",
    AUTH_SPIKE_ENABLED: "true",
    AUTH_SPIKE_CLERK_ISSUER: `https://${host}`,
    AUTH_SPIKE_CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from(`${host}$`).toString("base64")}`,
    AUTH_SPIKE_AUDIENCE: "evone-api-development",
    AUTH_SPIKE_ORIGIN: "http://127.0.0.1:3000",
    AUTH_SPIKE_CLERK_JWT_KEY: publicKey,
    API_BASE_URL: "http://127.0.0.1:4000",
  }))
    vi.stubEnv(key, value);
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ data: {}, meta: { requestId: "synthetic" } }),
      ),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("keeps production/disabled routes off", async () => {
  vi.stubEnv("NODE_ENV", "production");
  expect((await GET(new NextRequest(url), context)).status).toBe(404);
  expect(fetch).not.toHaveBeenCalled();
});
it("rejects absent bearer, cross-origin writes, remote targets and oversized bodies", async () => {
  expect((await GET(new NextRequest(url), context)).status).toBe(401);
  expect(
    (
      await POST(
        new NextRequest(url, {
          method: "POST",
          headers: {
            origin: "https://attacker.example",
            Authorization: "Bearer synthetic.token.value",
            "Content-Type": "application/json",
          },
          body: "{}",
        }),
        context,
      )
    ).status,
  ).toBe(403);
  vi.stubEnv("API_BASE_URL", "https://attacker.example");
  expect(
    (
      await GET(
        new NextRequest(url, {
          headers: { Authorization: "Bearer synthetic.token.value" },
        }),
        context,
      )
    ).status,
  ).toBe(503);
  vi.stubEnv("API_BASE_URL", "http://127.0.0.1:4000");
  expect(
    (
      await POST(
        new NextRequest(url, {
          method: "POST",
          headers: {
            Authorization: "Bearer synthetic.token.value",
            "Content-Type": "application/json",
          },
          body: "x".repeat(131073),
        }),
        context,
      )
    ).status,
  ).toBe(413);
  expect(fetch).not.toHaveBeenCalled();
});
it("forwards only explicit bearer and JSON to the fixed local API", async () => {
  const response = await POST(
    new NextRequest(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer synthetic.token.value",
        Cookie: "do-not-forward=secret",
        origin: "http://127.0.0.1:3000",
        "Content-Type": "application/json",
      },
      body: "{}",
    }),
    context,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const call = vi.mocked(fetch).mock.calls[0]!;
  expect(call[0]).toBe("http://127.0.0.1:4000/api/v1/admin/catalogue/drafts");
  expect(call[1]?.headers).toEqual({
    Authorization: "Bearer synthetic.token.value",
    "Content-Type": "application/json",
  });
  expect(call[1]?.redirect).toBe("error");
});
it("reports upstream outages without leaking error details", async () => {
  vi.mocked(fetch).mockRejectedValue(new Error("synthetic-secret"));
  const response = await GET(
    new NextRequest(url, {
      headers: { Authorization: "Bearer synthetic.token.value" },
    }),
    context,
  );
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("synthetic-secret");
});
