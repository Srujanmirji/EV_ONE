import { ListingFields } from "@evone/contracts";
import type { SellerListing } from "@evone/contracts";
export type SellValues = {
  vehicleType: string;
  variantId: string;
  year: string;
  odometerKm: string;
  city: string;
  priceInr: string;
  ownershipCount: string;
  conditionNotes: string;
};
export type SellErrors = Partial<Record<keyof SellValues, string>>;
export function paiseToInput(value: string | null) {
  if (value === null) return "";
  const amount = BigInt(value);
  return `${amount / 100n}.${(amount % 100n).toString().padStart(2, "0")}`;
}
export function priceToPaise(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d{1,17}(?:\.\d{0,2})?$/.test(text)) return "invalid";
  const [whole, fraction = ""] = text.split(".");
  return (BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"))).toString();
}
export function listingValues(listing: SellerListing): SellValues {
  const f = listing.fields;
  return {
    vehicleType: f.preferredVehicleType ?? "",
    variantId: f.variantId ?? "",
    year: f.year?.toString() ?? "",
    odometerKm: f.odometerKm?.toString() ?? "",
    city: f.city ?? "",
    priceInr: paiseToInput(f.askingPricePaise),
    ownershipCount: f.ownershipCount?.toString() ?? "",
    conditionNotes: f.conditionNotes ?? "",
  };
}
export function parseSellValues(values: SellValues) {
  const integer = (text: string) =>
    text.trim() === "" ? null : /^\d+$/.test(text) ? Number(text) : NaN;
  const input = {
    preferredVehicleType: values.vehicleType || null,
    variantId: values.variantId || null,
    year: integer(values.year),
    odometerKm: integer(values.odometerKm),
    city: values.city.trim() || null,
    askingPricePaise: priceToPaise(values.priceInr),
    ownershipCount: integer(values.ownershipCount),
    conditionNotes: values.conditionNotes.trim() || null,
  };
  const parsed = ListingFields.safeParse(input);
  const errors: SellErrors = {};
  const keys: Record<string, keyof SellValues> = {
    preferredVehicleType: "vehicleType",
    askingPricePaise: "priceInr",
  };
  if (!parsed.success)
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      errors[keys[field] ?? (field as keyof SellValues)] = issue.message;
    }
  if (input.year !== null && input.year > new Date().getUTCFullYear() + 1)
    errors.year =
      "Use this year or an earlier model year (next model year is allowed).";
  return {
    fields:
      parsed.success && Object.keys(errors).length === 0 ? parsed.data : null,
    errors,
  };
}
export const sellSteps = [
  "Vehicle type",
  "Model & variant",
  "Year & kilometres",
  "Condition & ownership",
  "Photos",
  "Asking price",
  "Seller & privacy",
  "Private preview",
  "Submit",
] as const;
export function stepErrors(
  step: number,
  values: SellValues,
  listing: SellerListing,
  declaration: boolean,
): SellErrors {
  const result = parseSellValues(values);
  const errors: SellErrors = { ...result.errors };
  const need = (key: keyof SellValues, message: string) => {
    if (!values[key].trim()) errors[key] = message;
  };
  if (step === 1) need("vehicleType", "Choose the vehicle type.");
  if (step === 2) {
    need("variantId", "Choose a published model and variant.");
    if (!listing.canonical && values.variantId === listing.fields.variantId)
      errors.variantId = "This variant is unavailable. Choose another.";
  }
  if (step === 3) {
    need("year", "Enter the model year.");
    need(
      "odometerKm",
      "Enter kilometres travelled, including zero if applicable.",
    );
  }
  if (step === 4) {
    need("ownershipCount", "Enter the number of owners.");
    need(
      "conditionNotes",
      "Describe the known condition without personal information.",
    );
  }
  if (step === 6) need("priceInr", "Enter the asking price in rupees.");
  if (step === 7) {
    need("city", "Enter the city only, not a street address.");
    if (!declaration)
      errors.city =
        errors.city ?? "Confirm the seller declaration before continuing.";
  }
  return errors;
}
export function resumeStep(listing: SellerListing) {
  const v = listingValues(listing);
  if (!v.vehicleType) return 1;
  if (!v.variantId || !listing.canonical) return 2;
  if (!v.year || !v.odometerKm) return 3;
  if (!v.ownershipCount || !v.conditionNotes) return 4;
  if (!listing.media.length) return 5;
  if (!v.priceInr) return 6;
  return 7;
}
