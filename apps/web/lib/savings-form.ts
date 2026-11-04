import type { SavingsRequest, SavingsResult } from "@evone/contracts";

export const savingsFields = [
  {
    key: "monthlyKm",
    label: "Monthly driving (km)",
    hint: "0–20,000 km per month.",
    min: 0,
    max: 20000,
  },
  {
    key: "fuelPriceInrPerLitre",
    label: "Petrol / diesel price (₹/L)",
    hint: "Enter your fuel price, from ₹1 to ₹500/L.",
    min: 1,
    max: 500,
  },
  {
    key: "iceKmPerLitre",
    label: "Petrol / diesel efficiency (km/L)",
    hint: "Use your actual mileage, from 1 to 100 km/L.",
    min: 1,
    max: 100,
  },
  {
    key: "evKwhPerKm",
    label: "EV energy use (kWh/km)",
    hint: "0.15 kWh/km equals 15 kWh/100 km. Range: 0.01–1.",
    min: 0.01,
    max: 1,
  },
  {
    key: "electricityInrPerKwh",
    label: "Blended electricity tariff (₹/kWh)",
    hint: "Use your home/public average, from ₹0 to ₹100/kWh.",
    min: 0,
    max: 100,
  },
  {
    key: "purchasePriceDeltaInr",
    label: "EV purchase premium (₹, optional)",
    hint: "EV price minus petrol / diesel price. Use a negative amount if the EV is cheaper.",
    min: -10000000,
    max: 10000000,
  },
] as const;
export type SavingsFormKey = (typeof savingsFields)[number]["key"];
export type SavingsFormValues = Record<SavingsFormKey, string>;
export const emptySavingsValues: SavingsFormValues = {
  monthlyKm: "",
  fuelPriceInrPerLitre: "",
  iceKmPerLitre: "",
  evKwhPerKm: "",
  electricityInrPerKwh: "",
  purchasePriceDeltaInr: "",
};
export const exampleSavingsValues: SavingsFormValues = {
  monthlyKm: "1000",
  fuelPriceInrPerLitre: "100",
  iceKmPerLitre: "15",
  evKwhPerKm: "0.15",
  electricityInrPerKwh: "8",
  purchasePriceDeltaInr: "200000",
};
export type SavingsState =
  | { kind: "empty" }
  | { kind: "invalid"; fields: Partial<Record<SavingsFormKey, string>> }
  | { kind: "unavailable" }
  | { kind: "success"; input: SavingsRequest; result: SavingsResult };

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const formatPaise = (paise: number) => rupees.format(paise / 100);
