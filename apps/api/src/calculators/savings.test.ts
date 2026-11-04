import { describe, expect, it } from "vitest";
import { SavingsRequest, SavingsResult } from "@evone/contracts";
import { calculateSavings } from "./savings.js";

const base = {
  monthlyKm: 1000,
  fuelPriceInrPerLitre: 100,
  iceKmPerLitre: 15,
  evKwhPerKm: 0.15,
  electricityInrPerKwh: 8,
  purchasePriceDeltaPaise: 20000000,
};

describe("exact energy savings", () => {
  it("matches the specification's golden example and annual rounding", () => {
    expect(calculateSavings(base)).toEqual({
      iceMonthlyCostPaise: 666667,
      evMonthlyCostPaise: 120000,
      iceAnnualCostPaise: 8000000,
      evAnnualCostPaise: 1440000,
      monthlyEnergySavingsPaise: 546667,
      annualEnergySavingsPaise: 6560000,
      estimatedPaybackMonths: 37,
      exclusions: ["maintenance", "depreciation", "charging losses", "finance"],
    });
  });

  it("preserves negative savings and does not invent break-even", () => {
    const result = calculateSavings({ ...base, electricityInrPerKwh: 100 });
    expect(result.monthlyEnergySavingsPaise).toBe(-833333);
    expect(result.annualEnergySavingsPaise).toBe(-10000000);
    expect(result.estimatedPaybackMonths).toBeNull();
  });

  it("handles no driving and free charging", () => {
    expect(calculateSavings({ ...base, monthlyKm: 0 })).toMatchObject({
      iceMonthlyCostPaise: 0,
      evMonthlyCostPaise: 0,
      annualEnergySavingsPaise: 0,
      estimatedPaybackMonths: null,
    });
    expect(
      calculateSavings({ ...base, electricityInrPerKwh: 0 }),
    ).toMatchObject({
      evMonthlyCostPaise: 0,
      evAnnualCostPaise: 0,
      annualEnergySavingsPaise: 8000000,
      estimatedPaybackMonths: 30,
    });
  });

  it("distinguishes omitted, zero and negative purchase premiums", () => {
    expect(
      calculateSavings({ ...base, purchasePriceDeltaPaise: undefined })
        .estimatedPaybackMonths,
    ).toBeNull();
    expect(
      calculateSavings({ ...base, purchasePriceDeltaPaise: 0 })
        .estimatedPaybackMonths,
    ).toBe(0);
    expect(
      calculateSavings({ ...base, purchasePriceDeltaPaise: -1 })
        .estimatedPaybackMonths,
    ).toBeNull();
  });

  it("rounds positive and negative half-paise away from zero", () => {
    const small = {
      ...base,
      monthlyKm: 0.005,
      fuelPriceInrPerLitre: 1,
      iceKmPerLitre: 1,
      evKwhPerKm: 1,
      electricityInrPerKwh: 0,
    };
    expect(calculateSavings(small)).toMatchObject({
      iceMonthlyCostPaise: 1,
      monthlyEnergySavingsPaise: 1,
      annualEnergySavingsPaise: 6,
    });
    expect(
      calculateSavings({ ...small, electricityInrPerKwh: 2 }),
    ).toMatchObject({
      monthlyEnergySavingsPaise: -1,
      annualEnergySavingsPaise: -6,
    });
  });

  it("calculates payback from exact savings even when displayed savings round to zero", () => {
    const input = {
      ...base,
      monthlyKm: 0.000001,
      fuelPriceInrPerLitre: 1.000001,
      iceKmPerLitre: 100,
      evKwhPerKm: 0.01,
      electricityInrPerKwh: 1,
      purchasePriceDeltaPaise: 1,
    };
    expect(calculateSavings(input)).toMatchObject({
      monthlyEnergySavingsPaise: 0,
      estimatedPaybackMonths: 1000000000000,
    });
    expect(
      calculateSavings({ ...input, purchasePriceDeltaPaise: 1000000000 })
        .estimatedPaybackMonths,
    ).toBeNull();
  });

  it("keeps all bounded outputs within their JSON number contracts", () => {
    for (const input of [
      base,
      {
        ...base,
        monthlyKm: 20000,
        fuelPriceInrPerLitre: 500,
        iceKmPerLitre: 1,
      },
      {
        ...base,
        monthlyKm: 20000,
        fuelPriceInrPerLitre: 1,
        iceKmPerLitre: 100,
        evKwhPerKm: 1,
        electricityInrPerKwh: 100,
      },
    ]) {
      expect(() =>
        SavingsResult.parse(calculateSavings(SavingsRequest.parse(input))),
      ).not.toThrow();
    }
  });
});
