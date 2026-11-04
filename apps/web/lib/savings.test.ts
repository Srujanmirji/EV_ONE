import { describe, expect, it, vi } from "vitest";
import {
  exampleSavingsValues,
  formatPaise,
  type SavingsFormValues,
} from "./savings-form";
import { estimateSavings, parseSavingsForm } from "./savings";

const form = (overrides: Partial<SavingsFormValues> = {}) => {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    ...exampleSavingsValues,
    ...overrides,
  }))
    data.set(key, value ?? "");
  return data;
};
const result = {
  iceMonthlyCostPaise: 666667,
  evMonthlyCostPaise: 120000,
  iceAnnualCostPaise: 8000000,
  evAnnualCostPaise: 1440000,
  monthlyEnergySavingsPaise: 546667,
  annualEnergySavingsPaise: 6560000,
  estimatedPaybackMonths: 37,
  exclusions: ["maintenance", "depreciation", "charging losses", "finance"],
};

describe("calculator form and API boundary", () => {
  it("converts optional rupees to exact integer paise", () => {
    expect(
      parseSavingsForm(form({ purchasePriceDeltaInr: "100.01" })),
    ).toMatchObject({
      kind: "valid",
      input: { purchasePriceDeltaPaise: 10001 },
    });
    expect(
      parseSavingsForm(form({ purchasePriceDeltaInr: "-0.29" })),
    ).toMatchObject({ kind: "valid", input: { purchasePriceDeltaPaise: -29 } });
    const parsed = parseSavingsForm(form({ purchasePriceDeltaInr: "" }));
    expect(parsed.kind).toBe("valid");
    if (parsed.kind === "valid")
      expect(parsed.input.purchasePriceDeltaPaise).toBeUndefined();
  });
  it.each([
    { monthlyKm: "" },
    { monthlyKm: "Infinity" },
    { electricityInrPerKwh: "-1" },
    { purchasePriceDeltaInr: "10.001" },
    { purchasePriceDeltaInr: "not a number" },
  ])("rejects invalid/empty values while allowing zero", (invalid) => {
    expect(parseSavingsForm(form(invalid)).kind).toBe("invalid");
    expect(
      parseSavingsForm(form({ monthlyKm: "0", electricityInrPerKwh: "0" }))
        .kind,
    ).toBe("valid");
  });
  it("does not request an API for invalid fields", async () => {
    const fetch = vi.fn();
    expect(
      await estimateSavings(form({ iceKmPerLitre: "0" }), {
        apiOrigin: "http://api.test",
        fetch,
      }),
    ).toMatchObject({ kind: "invalid" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses the generated SDK and validates response data", async () => {
    let sent: unknown;
    const state = await estimateSavings(form(), {
      apiOrigin: "http://api.test",
      fetch: async (request) => {
        sent = await new Request(request).json();
        return Response.json({
          data: result,
          meta: { requestId: "6c59d74c-a13c-4bc8-8e0d-4a6b1b6a65c4" },
        });
      },
    });
    expect(sent).toMatchObject({ purchasePriceDeltaPaise: 20000000 });
    expect(state).toMatchObject({ kind: "success", result });
  });
  it("preserves a safe unavailable state for failure or malformed data", async () => {
    for (const fetch of [
      async () => Response.json({}, { status: 503 }),
      async () => Response.json({ data: { arbitrary: true } }),
      async () => {
        throw new Error("private backend details");
      },
    ]) {
      expect(
        await estimateSavings(form(), { apiOrigin: "http://api.test", fetch }),
      ).toEqual({ kind: "unavailable" });
    }
  });
  it("formats paise as Indian rupees without losing cents", () => {
    expect(formatPaise(546667)).toBe("₹5,466.67");
  });
});
