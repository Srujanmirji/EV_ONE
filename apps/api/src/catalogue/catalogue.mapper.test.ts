import { VariantSpecs } from "@evone/contracts";
import { describe, expect, it } from "vitest";
import { toSources, toSpecs, type VariantRow } from "./catalogue.mapper.js";

const decimal = (v: string) => ({ toString: () => v });
const base: VariantRow = {
  id: "3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c",
  slug: "s",
  name: "n",
  isDemo: false,
  batteryKwh: null,
  claimedRangeKm: null,
  rangeStandard: null,
  motorKw: null,
  chargingAcKw: null,
  chargingDcKw: null,
  warrantyText: null,
};

describe("toSpecs", () => {
  it("keeps unknown specs as null, never zero", () => {
    const specs = toSpecs(base);
    expect(Object.values(specs).every((v) => v === null)).toBe(true);
    expect(() => VariantSpecs.parse(specs)).not.toThrow();
  });

  it("converts decimals exactly and pairs range with its standard", () => {
    const specs = toSpecs({
      ...base,
      batteryKwh: decimal("40.50"),
      claimedRangeKm: 400,
      rangeStandard: "MIDC",
      chargingAcKw: decimal("7.20"),
    });
    expect(specs.batteryKwh).toBe(40.5);
    expect(specs.chargingAcKw).toBe(7.2);
    expect(specs.claimedRange).toEqual({ km: 400, standard: "MIDC" });
  });

  it("never exposes a range without its standard", () => {
    expect(toSpecs({ ...base, claimedRangeKm: 400 }).claimedRange).toBeNull();
  });
});

describe("toSources", () => {
  it("drops unreviewed sources and formats dates", () => {
    const reviewed = new Date("2026-11-03T10:00:00Z");
    const out = toSources([
      {
        fieldName: "BATTERY_KWH",
        valueText: "40.5 kWh",
        sourceUrl: "https://example.com/a",
        sourceKind: "OEM",
        effectiveAt: new Date("2026-01-01T00:00:00Z"),
        reviewedAt: reviewed,
      },
      {
        fieldName: "MOTOR_KW",
        valueText: "draft",
        sourceUrl: "https://example.com/b",
        sourceKind: "PRESS",
        effectiveAt: null,
        reviewedAt: null,
      },
    ]);
    expect(out).toEqual([
      {
        fieldName: "BATTERY_KWH",
        valueText: "40.5 kWh",
        sourceUrl: "https://example.com/a",
        sourceKind: "OEM",
        effectiveAt: "2026-01-01",
        reviewedAt: "2026-11-03T10:00:00.000Z",
      },
    ]);
  });
});
