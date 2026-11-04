import type { INestApplication } from "@nestjs/common";
import { ErrorEnvelope, SavingsResponse } from "@evone/contracts";
import { createEvoneClient } from "@evone/sdk";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createApp } from "../create-app.js";
import { loadConfig } from "../config/env.js";

let app: INestApplication;
let origin: string;
const input = {
  monthlyKm: 1000,
  fuelPriceInrPerLitre: 100,
  iceKmPerLitre: 15,
  evKwhPerKm: 0.15,
  electricityInrPerKwh: 8,
  purchasePriceDeltaPaise: 20000000,
};

beforeEach(async () => {
  app = await createApp({
    config: loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://unused@127.0.0.1:1/unused",
      REDIS_URL: "redis://127.0.0.1:1",
    }),
    // The estimate must not need database persistence or credentials.
    db: {} as never,
  });
  await app.listen(0, "127.0.0.1");
  origin = await app.getUrl();
});
afterEach(async () => {
  await app.close();
});

it("serves a typed SDK POST with a matching request id without database access", async () => {
  const client = createEvoneClient({ origin });
  const requestId = "6c59d74c-a13c-4bc8-8e0d-4a6b1b6a65c4";
  const response = await client.POST("/calculators/ev-savings", {
    body: input,
    headers: { "X-Request-ID": requestId },
  });
  expect(response.response.status).toBe(200);
  expect(SavingsResponse.safeParse(response.data).success).toBe(true);
  expect(response.data?.data.annualEnergySavingsPaise).toBe(6560000);
  expect(response.data?.data.estimatedPaybackMonths).toBe(37);
  expect(response.data?.meta.requestId).toBe(requestId);
  expect(response.response.headers.get("X-Request-ID")).toBe(requestId);
});

it.each([
  {},
  { ...input, iceKmPerLitre: 0 },
  { ...input, monthlyKm: "1000" },
  { ...input, extra: true },
  { ...input, fuelPriceInrPerLitre: 100.00000000000001 },
])(
  "returns structured validation errors for invalid JSON input",
  async (body) => {
    const response = await fetch(`${origin}/api/v1/calculators/ev-savings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(400);
    const parsed: unknown = await response.json();
    expect(ErrorEnvelope.safeParse(parsed).success).toBe(true);
    expect(parsed).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        fields: expect.any(Object) as unknown,
      },
    });
  },
);

it("rejects malformed JSON without a 500", async () => {
  const response = await fetch(`${origin}/api/v1/calculators/ev-savings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  expect(response.status).toBe(400);
  expect(ErrorEnvelope.safeParse(await response.json()).success).toBe(true);
});
