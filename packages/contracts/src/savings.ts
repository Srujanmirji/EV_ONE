import { z } from "zod";
import { component } from "./registry.js";
import { dataEnvelope } from "./common.js";

const decimal = (min: number, max: number) =>
  z
    .number()
    .min(min)
    .max(max)
    .multipleOf(0.000001)
    .refine(
      (value) => Number(value.toFixed(6)) === value,
      "Use at most six decimal places",
    );

export const SavingsRequest = component(
  "SavingsRequest",
  z.strictObject({
    monthlyKm: decimal(0, 20000),
    fuelPriceInrPerLitre: decimal(1, 500),
    iceKmPerLitre: decimal(1, 100),
    evKwhPerKm: decimal(0.01, 1),
    electricityInrPerKwh: decimal(0, 100),
    purchasePriceDeltaPaise: z
      .int()
      .min(-1000000000)
      .max(1000000000)
      .optional(),
  }),
  "Energy-only estimate inputs, with at most six decimal places. Electricity is the user's blended tariff; no charging loss is assumed. Purchase delta is EV minus ICE price in integer paise.",
);
export type SavingsRequest = z.infer<typeof SavingsRequest>;

export const SavingsResult = component(
  "SavingsResult",
  z.strictObject({
    iceMonthlyCostPaise: z.int().nonnegative(),
    evMonthlyCostPaise: z.int().nonnegative(),
    iceAnnualCostPaise: z.int().nonnegative(),
    evAnnualCostPaise: z.int().nonnegative(),
    monthlyEnergySavingsPaise: z.int(),
    annualEnergySavingsPaise: z.int(),
    estimatedPaybackMonths: z.int().nonnegative().nullable(),
    exclusions: z.tuple([
      z.literal("maintenance"),
      z.literal("depreciation"),
      z.literal("charging losses"),
      z.literal("finance"),
    ]),
  }),
  "Amounts round independently to nearest paise, half away from zero, from exact arithmetic. Payback uses unrounded savings; null when no estimate applies or its month count exceeds the safe-integer limit. Estimates are not guarantees.",
);
export type SavingsResult = z.infer<typeof SavingsResult>;
export const SavingsResponse = dataEnvelope("SavingsResponse", SavingsResult);
export type SavingsResponse = z.infer<typeof SavingsResponse>;
