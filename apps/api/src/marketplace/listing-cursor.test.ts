import {
  PublicListingDetail,
  PublicListingSummary,
  type PublicListingListQuery,
} from "@evone/contracts";
import { describe, expect, it } from "vitest";
import { RequestValidationError } from "../common/validation.js";
import {
  decodeListingCursor,
  encodeListingCursor,
  validateListingRanges,
} from "./listing-cursor.js";
import {
  cursorFromRow,
  toPublicListingDetail,
  toPublicListingSummary,
} from "./public-listing.repository.js";

const listingId = "7f088e6e-32fd-4086-af08-0aef72dabef2";
const variantId = "1a088e6e-32fd-4086-af08-0aef72dabef2";
const photoId = "2b088e6e-32fd-4086-af08-0aef72dabef2";

const sampleRow = {
  id: listingId,
  slug: "demo-listing-1a2b3c4d5e6f",
  year: 2024,
  odometerKm: 14200,
  city: "DEMO City",
  askingPricePaise: 98500000n,
  ownershipCount: 1,
  conditionNotes: "DEMO synthetic condition notes; no personal information.",
  isDemo: true,
  publishedAt: new Date("2026-11-15T06:00:00.000Z"),
  _count: { media: 2 },
  media: [{ id: photoId, position: 0, alt: "DEMO front three-quarter view" }],
  variant: {
    id: variantId,
    slug: "demo-variant-lr",
    name: "DEMO Long Range",
    isDemo: true,
    batteryKwh: "40.50",
    claimedRangeKm: 465,
    rangeStandard: "MIDC" as const,
    motorKw: "105.00",
    chargingAcKw: "7.20",
    chargingDcKw: "50.00",
    warrantyText: "8 yr / 160,000 km battery",
    model: {
      slug: "demo-compact-suv",
      name: "DEMO Compact SUV",
      vehicleType: "CAR" as const,
      brand: {
        slug: "demo-motors",
        name: "DEMO Motors",
      },
    },
    sources: [
      {
        fieldName: "BATTERY_KWH" as const,
        valueText: "40.5 kWh",
        sourceUrl: "https://example.com/spec",
        sourceKind: "OEM" as const,
        effectiveAt: new Date("2026-01-15T00:00:00.000Z"),
        reviewedAt: new Date("2026-11-03T10:00:00.000Z"),
      },
    ],
  },
};

describe("listing keyset cursor", () => {
  it.each([
    ["PRICE_ASC", { s: "PRICE_ASC", p: "98500000", i: listingId } as const],
    ["PRICE_DESC", { s: "PRICE_DESC", p: "98500000", i: listingId } as const],
    ["YEAR_DESC", { s: "YEAR_DESC", y: 2024, i: listingId } as const],
    ["ODOMETER_ASC", { s: "ODOMETER_ASC", k: 14200, i: listingId } as const],
  ] as const)("round-trips %s cursors and cursorFromRow", (sort, expected) => {
    const built = cursorFromRow(sort, sampleRow);
    expect(built).toEqual(expected);
    const encoded = encodeListingCursor(built);
    expect(decodeListingCursor(encoded, sort)).toEqual(expected);
  });

  it("rejects malformed cursors or sort mismatches with VALIDATION_ERROR on cursor", () => {
    const priceCursor = encodeListingCursor({
      s: "PRICE_ASC",
      p: "98500000",
      i: listingId,
    });
    for (const [raw, sort] of [
      ["not-valid-base64-json", "PRICE_ASC"],
      [
        Buffer.from(
          JSON.stringify({ s: "PRICE_ASC", p: "0", i: listingId }),
        ).toString("base64url"),
        "PRICE_ASC",
      ],
      [
        Buffer.from(
          JSON.stringify({ s: "YEAR_DESC", y: 1800, i: listingId }),
        ).toString("base64url"),
        "YEAR_DESC",
      ],
      [priceCursor, "PRICE_DESC"],
      [priceCursor, "YEAR_DESC"],
    ] as const) {
      expect(() => decodeListingCursor(raw, sort)).toThrowError(
        RequestValidationError,
      );
    }
  });
});

describe("validateListingRanges", () => {
  const baseQuery: PublicListingListQuery = {
    sort: "PRICE_ASC",
    limit: 20,
  };

  it("accepts valid or single-sided price and year filters", () => {
    expect(() =>
      validateListingRanges({
        ...baseQuery,
        minPricePaise: "10000000",
        maxPricePaise: "10000000",
        minYear: 2022,
        maxYear: 2024,
      }),
    ).not.toThrow();
  });

  it("rejects inverted price and year ranges with field-level errors", () => {
    try {
      validateListingRanges({
        ...baseQuery,
        minPricePaise: "50000000",
        maxPricePaise: "10000000",
        minYear: 2025,
        maxYear: 2021,
      });
      expect.unreachable("should throw RequestValidationError");
    } catch (error) {
      expect(error).toBeInstanceOf(RequestValidationError);
      expect((error as RequestValidationError).fields).toEqual({
        maxPricePaise: "Maximum price must be at least minimum price",
        maxYear: "Maximum year must be at least minimum year",
      });
    }
  });
});

describe("public listing mappers", () => {
  it("maps summary and detail payloads matching @evone/contracts without private identifiers", () => {
    const summary = PublicListingSummary.parse(
      toPublicListingSummary(sampleRow),
    );
    expect(summary).toMatchObject({
      id: listingId,
      slug: sampleRow.slug,
      year: 2024,
      odometerKm: 14200,
      city: "DEMO City",
      askingPricePaise: "98500000",
      ownershipCount: 1,
      isDemo: true,
      publishedAt: "2026-11-15T06:00:00.000Z",
      sellerType: "INDIVIDUAL_OWNER",
      photoCount: 2,
    });
    expect(summary.vehicle.variant.specs).toEqual({
      batteryKwh: 40.5,
      claimedRange: { km: 465, standard: "MIDC" },
      motorKw: 105,
      chargingAcKw: 7.2,
      chargingDcKw: 50,
      warrantyText: "8 yr / 160,000 km battery",
    });

    const detail = PublicListingDetail.parse(toPublicListingDetail(sampleRow));
    expect(detail.conditionNotes).toBe(sampleRow.conditionNotes);
    expect(detail.media).toEqual([
      { id: photoId, position: 0, alt: "DEMO front three-quarter view" },
    ]);
    expect(detail.sources).toEqual([
      {
        fieldName: "BATTERY_KWH",
        valueText: "40.5 kWh",
        sourceUrl: "https://example.com/spec",
        sourceKind: "OEM",
        effectiveAt: "2026-01-15",
        reviewedAt: "2026-11-03T10:00:00.000Z",
      },
    ]);
    const serialized = JSON.stringify(detail);
    expect(serialized).not.toContain("sellerUserId");
    expect(serialized).not.toContain("mediaAssetId");
    expect(serialized).not.toContain("objectKey");
    expect(serialized).not.toContain("reviewerId");
  });
});
