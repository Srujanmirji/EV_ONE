import type {
  ModelSummary,
  PublicListingSort,
  PublicListingSummary,
  SpecSummary,
} from "@evone/contracts";

export const VEHICLE_TYPE_LABEL: Record<ModelSummary["vehicleType"], string> = {
  SCOOTER: "Scooter",
  MOTORCYCLE: "Motorcycle",
  CAR: "Car",
  THREE_WHEELER: "Three-wheeler",
};

export const SELLER_TYPE_LABEL: Record<
  PublicListingSummary["sellerType"],
  string
> = {
  INDIVIDUAL_OWNER: "Individual seller",
};

export const LISTING_SORT_LABEL: Record<PublicListingSort, string> = {
  PRICE_ASC: "Price: low to high",
  PRICE_DESC: "Price: high to low",
  YEAR_DESC: "Year: newest first",
  ODOMETER_ASC: "Kilometres: lowest first",
};

export const AVAILABILITY_LABEL: Record<ModelSummary["availability"], string> =
  {
    ON_SALE: "On sale",
    UPCOMING: "Upcoming",
    DISCONTINUED: "Discontinued",
    UNKNOWN: "Availability not confirmed",
  };

type Standard = SpecSummary["claimedRanges"][number]["standard"];

/** Full names so the abbreviation is never the only explanation. */
export const RANGE_STANDARD_NAME: Record<Standard, string> = {
  MIDC: "Modified Indian Driving Cycle",
  IDC: "Indian Driving Cycle",
  WLTP: "Worldwide Harmonised Light Vehicles Test Procedure",
  NEDC: "New European Driving Cycle",
  EPA: "US EPA test cycle",
  OEM_UNSPECIFIED: "Manufacturer claim; test cycle not stated",
};

const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export function formatSpan(min: number, max: number, unit: string): string {
  return min === max
    ? `${number.format(min)} ${unit}`
    : `${number.format(min)}–${number.format(max)} ${unit}`;
}

export function formatReviewDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatInrFromPaise(paise: string): string {
  const totalPaise = BigInt(paise);
  const rupees = Number(totalPaise) / 100;
  return totalPaise % 100n === 0n
    ? inrWhole.format(rupees)
    : inrPaise.format(rupees);
}

export function formatKilometres(km: number): string {
  return `${number.format(km)} km`;
}

export function formatOwnership(count: number): string {
  if (count === 1) return "1st owner";
  if (count === 2) return "2nd owner";
  if (count === 3) return "3rd owner";
  return `${count}th owner`;
}
