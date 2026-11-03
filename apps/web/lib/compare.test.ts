import type { VariantDetail } from "@evone/contracts";
import { describe, expect, it } from "vitest";
import {
  buildComparison,
  compareHref,
  idsFrom,
  loadComparison,
} from "./compare";

const A = "6b1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c";
const B = "7b1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c";

const variant = (
  id: string,
  specs: Partial<VariantDetail["specs"]>,
): VariantDetail => ({
  id,
  slug: id.slice(0, 4),
  name: id.slice(0, 4),
  isDemo: false,
  specs: {
    batteryKwh: null,
    claimedRange: null,
    motorKw: null,
    chargingAcKw: null,
    chargingDcKw: null,
    warrantyText: null,
    ...specs,
  },
  model: {
    slug: "m",
    name: "M",
    vehicleType: "CAR",
    brand: { slug: "b", name: "B" },
  },
  sources: [],
});

describe("ids and links", () => {
  it("reads comma-separated ids and drops blanks", () => {
    expect(idsFrom({ ids: ` ${A}, ,${B} ` })).toEqual([A, B]);
    expect(idsFrom({})).toEqual([]);
  });

  it("builds shareable links", () => {
    expect(compareHref([A, B], true)).toBe(`/compare?ids=${A}%2C${B}&diff=1`);
    expect(compareHref([])).toBe("/compare");
  });
});

describe("loadComparison", () => {
  it("asks for more before calling the API", async () => {
    expect(
      await loadComparison([A], {
        apiOrigin: "http://x",
        fetch: () => Promise.reject(new Error("no")),
      }),
    ).toEqual({
      kind: "need-more",
      ids: [A],
    });
  });

  it("rejects duplicates and malformed ids without calling the API", async () => {
    const fail = (() =>
      Promise.reject(new Error("should not call"))) as unknown as typeof fetch;
    expect(
      (await loadComparison([A, A], { apiOrigin: "http://x", fetch: fail }))
        .kind,
    ).toBe("invalid");
    expect(
      (
        await loadComparison([A, "nope"], {
          apiOrigin: "http://x",
          fetch: fail,
        })
      ).kind,
    ).toBe("invalid");
  });
});

describe("buildComparison", () => {
  it("marks rows that differ, including known vs unknown", () => {
    const { rows } = buildComparison([
      variant(A, { batteryKwh: 30, motorKw: 50 }),
      variant(B, { batteryKwh: 30 }),
    ]);
    const byField = Object.fromEntries(rows.map((r) => [r.field, r]));
    expect(byField.BATTERY_KWH?.differs).toBe(false);
    expect(byField.MOTOR_KW?.differs).toBe(true);
    expect(byField.MOTOR_KW?.cells.map((c) => c.value)).toEqual([
      "50 kW",
      null,
    ]);
    expect(byField.WARRANTY?.differs).toBe(false);
  });

  it("flags claimed ranges measured under different test standards", () => {
    const mixed = buildComparison([
      variant(A, { claimedRange: { km: 300, standard: "MIDC" } }),
      variant(B, { claimedRange: { km: 300, standard: "WLTP" } }),
    ]);
    expect(mixed.mixedRangeStandards).toBe(true);
    // Same km but different standards is a difference, not a tie.
    expect(mixed.rows.find((r) => r.field === "CLAIMED_RANGE")?.differs).toBe(
      true,
    );
    const same = buildComparison([
      variant(A, { claimedRange: { km: 300, standard: "MIDC" } }),
      variant(B, { claimedRange: { km: 280, standard: "MIDC" } }),
    ]);
    expect(same.mixedRangeStandards).toBe(false);
  });
});
