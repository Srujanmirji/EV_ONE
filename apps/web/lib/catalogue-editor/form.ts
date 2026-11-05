import type { CatalogueDocument } from "@evone/contracts";
import { SpecField } from "@evone/contracts";

export const specFields = [
  {
    key: "batteryKwh",
    field: "BATTERY_KWH",
    label: "Battery (kWh)",
    max: 9999.99,
  },
  {
    key: "motorKw",
    field: "MOTOR_KW",
    label: "Motor output (kW)",
    max: 9999.99,
  },
  {
    key: "chargingAcKw",
    field: "CHARGING_AC_KW",
    label: "AC charging (kW)",
    max: 999.99,
  },
  {
    key: "chargingDcKw",
    field: "CHARGING_DC_KW",
    label: "DC charging (kW)",
    max: 9999.99,
  },
] as const;
export const specLabels: Record<string, string> = {
  BATTERY_KWH: "Battery",
  CLAIMED_RANGE: "Claimed range",
  MOTOR_KW: "Motor output",
  CHARGING_AC_KW: "AC charging",
  CHARGING_DC_KW: "DC charging",
  WARRANTY: "Warranty",
};
export function emptyVariant(): CatalogueDocument["variants"][number] {
  return {
    name: "",
    slug: "",
    specs: {
      batteryKwh: null,
      claimedRange: null,
      motorKw: null,
      chargingAcKw: null,
      chargingDcKw: null,
      warrantyText: null,
    },
    sources: [],
  };
}
export function emptyDocument(): CatalogueDocument {
  return {
    brand: { name: "", slug: "" },
    model: {
      name: "",
      slug: "",
      vehicleType: "SCOOTER",
      availability: "UNKNOWN",
      releaseDate: null,
    },
    variants: [emptyVariant()],
  };
}
/** Keep empty specs null; malformed numbers reach Zod as NaN, never guessed zero. */
export function documentFromForm(form: FormData, count: number): unknown {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const number = (key: string) => (text(key) === "" ? null : Number(text(key)));
  return {
    brand: { name: text("brand.name"), slug: text("brand.slug") },
    model: {
      name: text("model.name"),
      slug: text("model.slug"),
      vehicleType: text("model.vehicleType"),
      availability: "UNKNOWN",
      releaseDate: null,
    },
    variants: Array.from({ length: count }, (_, index) => {
      const base = `variants.${index}`;
      const range = number(`${base}.specs.claimedRange.km`);
      return {
        name: text(`${base}.name`),
        slug: text(`${base}.slug`),
        specs: {
          ...Object.fromEntries(
            specFields.map((spec) => [
              spec.key,
              number(`${base}.specs.${spec.key}`),
            ]),
          ),
          claimedRange:
            range === null
              ? null
              : {
                  km: range,
                  standard: text(`${base}.specs.claimedRange.standard`),
                },
          warrantyText: text(`${base}.specs.warrantyText`) || null,
        },
        sources: SpecField.options.flatMap((field) => {
          const key = `${base}.sources.${field}`;
          const url = text(`${key}.sourceUrl`),
            valueText = text(`${key}.valueText`),
            effectiveAt = text(`${key}.effectiveAt`);
          return url || valueText || effectiveAt
            ? [
                {
                  fieldName: field,
                  sourceUrl: url,
                  valueText,
                  sourceKind: text(`${key}.sourceKind`),
                  effectiveAt: effectiveAt || null,
                },
              ]
            : [];
        }),
      };
    }),
  };
}
