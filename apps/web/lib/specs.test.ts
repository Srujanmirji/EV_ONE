import type { SpecSourceView, VariantSpecs } from "@evone/contracts";
import { describe, expect, it } from "vitest";
import { specRows } from "./specs";

const unknown: VariantSpecs = {
  batteryKwh: null,
  claimedRange: null,
  motorKw: null,
  chargingAcKw: null,
  chargingDcKw: null,
  warrantyText: null,
};
const source = (fieldName: SpecSourceView["fieldName"]): SpecSourceView => ({
  fieldName,
  valueText: "x",
  sourceUrl: "https://example.com/s",
  sourceKind: "OEM",
  effectiveAt: null,
  reviewedAt: "2026-11-03T10:00:00.000Z",
});

describe("specRows", () => {
  it("formats every value with its unit", () => {
    const rows = specRows(
      {
        batteryKwh: 40.5,
        claimedRange: { km: 1200, standard: "MIDC" },
        motorKw: 100,
        chargingAcKw: 7.2,
        chargingDcKw: 50,
        warrantyText: "3 years",
      },
      [],
    );
    expect(rows.map((r) => [r.label, r.value])).toEqual([
      ["Battery capacity", "40.5 kWh"],
      ["Claimed range", "1,200 km"],
      ["Motor power", "100 kW"],
      ["AC charging", "7.2 kW"],
      ["DC fast charging", "50 kW"],
      ["Warranty", "3 years"],
    ]);
    expect(rows[1]?.note).toBe("MIDC: Modified Indian Driving Cycle");
  });

  it("keeps unknown values null and never attaches sources to them", () => {
    const rows = specRows(unknown, [source("BATTERY_KWH")]);
    expect(rows.every((r) => r.value === null && r.sources.length === 0)).toBe(
      true,
    );
  });

  it("attaches each source only to its own field", () => {
    const rows = specRows({ ...unknown, batteryKwh: 30, motorKw: 50 }, [
      source("BATTERY_KWH"),
      source("MOTOR_KW"),
      source("MOTOR_KW"),
    ]);
    expect(rows.find((r) => r.field === "BATTERY_KWH")?.sources).toHaveLength(
      1,
    );
    expect(rows.find((r) => r.field === "MOTOR_KW")?.sources).toHaveLength(2);
  });
});
