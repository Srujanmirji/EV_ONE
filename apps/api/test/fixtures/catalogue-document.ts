import type { CatalogueDocument } from "@evone/contracts";
/** Fictional test data only; example.com is a reserved documentation domain. */
export function catalogueDocument(suffix: string): CatalogueDocument {
  return {
    brand: { name: `DEMO Editor ${suffix}`, slug: `demo-editor-${suffix}` },
    model: {
      name: `DEMO Model ${suffix}`,
      slug: `demo-model-${suffix}`,
      vehicleType: "SCOOTER",
      availability: "UNKNOWN",
      releaseDate: null,
    },
    variants: [
      {
        name: "DEMO Variant",
        slug: "demo-variant",
        specs: {
          batteryKwh: 2,
          claimedRange: null,
          motorKw: null,
          chargingAcKw: null,
          chargingDcKw: null,
          warrantyText: null,
        },
        sources: [
          {
            fieldName: "BATTERY_KWH",
            valueText: "Fictional test battery: 2 kWh",
            sourceUrl: "https://example.com/synthetic-battery",
            sourceKind: "OTHER",
            effectiveAt: null,
          },
        ],
      },
    ],
  };
}
