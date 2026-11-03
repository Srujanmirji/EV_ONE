import type { SpecSourceView, VariantSpecs } from "@evone/contracts";
import { RANGE_STANDARD_NAME } from "./format";

type Field = SpecSourceView["fieldName"];

export interface SpecRow {
  field: Field;
  label: string;
  /** Formatted value with unit, or null when unknown. */
  value: string | null;
  /** Extra context, e.g. the range test standard in full. */
  note: string | null;
  /** Only the sources for this exact field. */
  sources: SpecSourceView[];
}

const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const withUnit = (value: number | null, unit: string) =>
  value === null ? null : `${number.format(value)} ${unit}`;

/**
 * One place that decides labels, units and which sources belong to which
 * value, in display order. Units follow DATABASE.md: kWh, km, kW.
 */
export function specRows(
  specs: VariantSpecs,
  sources: SpecSourceView[],
): SpecRow[] {
  const forField = (field: Field) =>
    sources.filter((s) => s.fieldName === field);
  const range = specs.claimedRange;
  const rows: Omit<SpecRow, "sources">[] = [
    {
      field: "BATTERY_KWH",
      label: "Battery capacity",
      value: withUnit(specs.batteryKwh, "kWh"),
      note: null,
    },
    {
      field: "CLAIMED_RANGE",
      label: "Claimed range",
      value: range ? `${number.format(range.km)} km` : null,
      note: range
        ? range.standard === "OEM_UNSPECIFIED"
          ? RANGE_STANDARD_NAME.OEM_UNSPECIFIED
          : `${range.standard}: ${RANGE_STANDARD_NAME[range.standard]}`
        : null,
    },
    {
      field: "MOTOR_KW",
      label: "Motor power",
      value: withUnit(specs.motorKw, "kW"),
      note: null,
    },
    {
      field: "CHARGING_AC_KW",
      label: "AC charging",
      value: withUnit(specs.chargingAcKw, "kW"),
      note: null,
    },
    {
      field: "CHARGING_DC_KW",
      label: "DC fast charging",
      value: withUnit(specs.chargingDcKw, "kW"),
      note: null,
    },
    {
      field: "WARRANTY",
      label: "Warranty",
      value: specs.warrantyText,
      note: null,
    },
  ];
  // A source is only shown next to a stated value.
  return rows.map((row) => ({
    ...row,
    sources: row.value === null ? [] : forField(row.field),
  }));
}

export const SOURCE_KIND_LABEL: Record<SpecSourceView["sourceKind"], string> = {
  OEM: "Manufacturer",
  REGULATOR: "Regulator or test agency",
  PRESS: "Press",
  DEALER: "Dealer",
  OTHER: "Other",
};
