import { describe, expect, it } from "vitest";
import { SavingsRequest } from "./savings.js";

const base = {
  monthlyKm: 1000,
  fuelPriceInrPerLitre: 100,
  iceKmPerLitre: 15,
  evKwhPerKm: 0.15,
  electricityInrPerKwh: 8,
};

describe("savings trust boundary", () => {
  it.each([
    { monthlyKm: -1 },
    { monthlyKm: 20001 },
    { monthlyKm: "1000" },
    { monthlyKm: NaN },
    { monthlyKm: Infinity },
    { monthlyKm: 0.0000001 },
    { fuelPriceInrPerLitre: 100.00000000000001 },
    { fuelPriceInrPerLitre: 0 },
    { fuelPriceInrPerLitre: 501 },
    { iceKmPerLitre: 0 },
    { iceKmPerLitre: 101 },
    { evKwhPerKm: 0 },
    { evKwhPerKm: 1.01 },
    { electricityInrPerKwh: -1 },
    { electricityInrPerKwh: 101 },
    { purchasePriceDeltaPaise: 1.5 },
    { purchasePriceDeltaPaise: 1000000001 },
    { maintenanceSavings: 100 },
  ])("rejects invalid units, precision, bounds or fields: %j", (invalid) => {
    expect(SavingsRequest.safeParse({ ...base, ...invalid }).success).toBe(
      false,
    );
  });

  it("accepts zero driving/free charging, signed premium and six-decimal inputs", () => {
    expect(
      SavingsRequest.parse({
        ...base,
        monthlyKm: 0,
        electricityInrPerKwh: 0,
        purchasePriceDeltaPaise: -1000000000,
      }),
    ).toBeTruthy();
    expect(
      SavingsRequest.parse({ ...base, fuelPriceInrPerLitre: 100.000001 }),
    ).toBeTruthy();
  });
});
