import type { ModelSummary, SpecSummary } from "@evone/contracts";

export const VEHICLE_TYPE_LABEL: Record<ModelSummary["vehicleType"], string> = {
  SCOOTER: "Scooter",
  MOTORCYCLE: "Motorcycle",
  CAR: "Car",
  THREE_WHEELER: "Three-wheeler",
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
