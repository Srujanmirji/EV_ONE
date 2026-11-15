import { describe, expect, it } from "vitest";
import {
  formatInrFromPaise,
  formatKilometres,
  formatOwnership,
} from "./format";
import {
  activeUsedEvFilterCount,
  loadUsedEvs,
  parseUsedEvFilters,
  usedEvDetailHref,
  usedEvsHref,
} from "./used-evs";

describe("parseUsedEvFilters and URL helpers", () => {
  it("parses valid URL parameters, converts whole rupees to paise, and ignores blank form inputs", () => {
    const parsed = parseUsedEvFilters({
      brandSlug: "demo-motors",
      vehicleType: "CAR",
      city: "  DEMO Pune ",
      maxPriceInr: "950000",
      minYear: "2022",
      maxOdometerKm: "20000",
      sort: "YEAR_DESC",
      cursor: "",
    });
    expect(parsed).toEqual({
      brandSlug: "demo-motors",
      modelSlug: undefined,
      vehicleType: "CAR",
      city: "DEMO Pune",
      minPricePaise: undefined,
      maxPricePaise: "95000000",
      minPriceInr: undefined,
      maxPriceInr: "950000",
      minYear: 2022,
      maxYear: undefined,
      maxOdometerKm: 20000,
      sort: "YEAR_DESC",
      cursor: undefined,
    });
    expect(activeUsedEvFilterCount(parsed!)).toBe(6);
    expect(usedEvsHref(parsed!)).toBe(
      "/used-evs?brandSlug=demo-motors&vehicleType=CAR&city=DEMO+Pune&maxPriceInr=950000&minYear=2022&maxOdometerKm=20000&sort=YEAR_DESC",
    );
    expect(usedEvDetailHref("demo-listing-123")).toBe(
      "/used-evs/demo-listing-123",
    );
  });

  it("rejects invalid parameters, inverted ranges, and unknown query keys", () => {
    for (const bad of [
      { vehicleType: "TRUCK" },
      { brandSlug: "BAD_SLUG!" },
      { maxPriceInr: "0" },
      { minPriceInr: "100000", minPricePaise: "10000000" },
      { minPriceInr: "900000", maxPriceInr: "500000" },
      { minYear: "2025", maxYear: "2021" },
      { maxOdometerKm: "-5" },
      { sort: "RANDOM" },
      { unexpected: "1" },
    ]) {
      expect(parseUsedEvFilters(bad)).toBeNull();
    }
  });
});

describe("marketplace formatters", () => {
  it("formats paise as INR currency, kilometres, and ownership ordinals", () => {
    expect(formatInrFromPaise("95000000")).toBe("₹9,50,000");
    expect(formatInrFromPaise("123456")).toBe("₹1,234.56");
    expect(formatKilometres(14200)).toBe("14,200 km");
    expect(formatOwnership(1)).toBe("1st owner");
    expect(formatOwnership(2)).toBe("2nd owner");
    expect(formatOwnership(3)).toBe("3rd owner");
    expect(formatOwnership(4)).toBe("4th owner");
  });
});

describe("loadUsedEvs", () => {
  const brandsPayload = {
    data: [
      {
        id: "7f088e6e-32fd-4086-af08-0aef72dabef2",
        slug: "demo-motors",
        name: "DEMO Motors",
        vehicleTypes: ["CAR"],
        isDemo: true,
      },
    ],
  };

  const listingsPayload = {
    data: [
      {
        id: "1a088e6e-32fd-4086-af08-0aef72dabef2",
        slug: "demo-listing-1",
        year: 2024,
        odometerKm: 12000,
        city: "DEMO Pune",
        askingPricePaise: "90000000",
        ownershipCount: 1,
        isDemo: true,
        publishedAt: "2026-11-15T06:00:00.000Z",
        sellerType: "INDIVIDUAL_OWNER",
        photoCount: 2,
        vehicle: {
          brand: { slug: "demo-motors", name: "DEMO Motors" },
          model: {
            slug: "demo-hatch",
            name: "DEMO Hatch",
            vehicleType: "CAR",
          },
          variant: {
            id: "2b088e6e-32fd-4086-af08-0aef72dabef2",
            slug: "demo-lr",
            name: "LR",
            specs: {
              batteryKwh: 40.5,
              claimedRange: { km: 400, standard: "MIDC" },
              motorKw: null,
              chargingAcKw: null,
              chargingDcKw: null,
              warrantyText: null,
            },
          },
        },
      },
    ],
    page: { nextCursor: null, hasMore: false },
  };

  it("returns ok with brands and listings from the SDK", async () => {
    const fakeFetch: typeof fetch = async (input) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url.endsWith("/brands")) {
        return new Response(JSON.stringify(brandsPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(listingsPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const result = await loadUsedEvs(
      { city: "DEMO Pune" },
      { apiOrigin: "http://127.0.0.1:4000", fetch: fakeFetch },
    );
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.listings).toHaveLength(1);
      expect(result.filters.city).toBe("DEMO Pune");
    }
  });

  it("maps 400 cursor responses to invalid-filters and missing API_BASE_URL to unavailable", async () => {
    const unavailable = await loadUsedEvs({}, { apiOrigin: "" });
    expect(unavailable).toEqual({ kind: "unavailable" });

    const badCursorFetch: typeof fetch = async (input) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url.endsWith("/brands")) {
        return new Response(JSON.stringify(brandsPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request",
            requestId: "7f088e6e-32fd-4086-af08-0aef72dabef2",
            fields: { cursor: "Invalid or expired cursor" },
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    };
    const invalid = await loadUsedEvs(
      { cursor: "expired-cursor" },
      { apiOrigin: "http://127.0.0.1:4000", fetch: badCursorFetch },
    );
    expect(invalid.kind).toBe("invalid-filters");
  });
});
