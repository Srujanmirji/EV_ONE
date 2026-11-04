import type { SavingsRequest, SavingsResult } from "@evone/contracts";

const SCALE = 1000000n;
const scaled = (value: number) => BigInt(value.toFixed(6).replace(".", ""));

/** Nearest integer, with exact halves rounded away from zero. */
function rounded(numerator: bigint, denominator: bigint): number {
  const absolute = numerator < 0n ? -numerator : numerator;
  const result = (2n * absolute + denominator) / (2n * denominator);
  return Number(numerator < 0n ? -result : result);
}

/** Call only with SavingsRequest-validated inputs; all arithmetic stays rational until output. */
export function calculateSavings(input: SavingsRequest): SavingsResult {
  const km = scaled(input.monthlyKm);
  const fuel = scaled(input.fuelPriceInrPerLitre);
  const mileage = scaled(input.iceKmPerLitre);
  const energy = scaled(input.evKwhPerKm);
  const tariff = scaled(input.electricityInrPerKwh);
  const iceNumerator = km * fuel * 100n;
  const iceDenominator = mileage * SCALE;
  const evNumerator = km * energy * tariff * 100n;
  const evDenominator = SCALE ** 3n;
  const denominator = mileage * evDenominator;
  const savings = iceNumerator * SCALE ** 2n - evNumerator * mileage;

  let estimatedPaybackMonths: number | null = null;
  const premium = input.purchasePriceDeltaPaise;
  if (premium === 0) estimatedPaybackMonths = 0;
  else if (premium !== undefined && premium > 0 && savings > 0n) {
    const months = (BigInt(premium) * denominator + savings - 1n) / savings;
    if (months <= BigInt(Number.MAX_SAFE_INTEGER))
      estimatedPaybackMonths = Number(months);
  }

  return {
    iceMonthlyCostPaise: rounded(iceNumerator, iceDenominator),
    evMonthlyCostPaise: rounded(evNumerator, evDenominator),
    iceAnnualCostPaise: rounded(iceNumerator * 12n, iceDenominator),
    evAnnualCostPaise: rounded(evNumerator * 12n, evDenominator),
    monthlyEnergySavingsPaise: rounded(savings, denominator),
    annualEnergySavingsPaise: rounded(savings * 12n, denominator),
    estimatedPaybackMonths,
    exclusions: ["maintenance", "depreciation", "charging losses", "finance"],
  };
}
