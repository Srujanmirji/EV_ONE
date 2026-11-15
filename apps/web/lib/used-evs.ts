import {
  type BrandSummary,
  PublicListingListQuery,
  type PublicListingSort,
  type PublicListingSummary,
} from "@evone/contracts";
import { createEvoneClient } from "@evone/sdk";
import type { SearchParams } from "./catalogue";

export const USED_EV_PAGE_SIZE = 12;

export interface UsedEvFilters {
  vehicleType?: PublicListingSummary["vehicle"]["model"]["vehicleType"];
  brandSlug?: string;
  modelSlug?: string;
  city?: string;
  minPricePaise?: string;
  maxPricePaise?: string;
  minPriceInr?: string;
  maxPriceInr?: string;
  minYear?: number;
  maxYear?: number;
  maxOdometerKm?: number;
  sort: PublicListingSort;
  cursor?: string;
}

export type UsedEvsResult =
  | {
      kind: "ok";
      filters: UsedEvFilters;
      brands: BrandSummary[];
      listings: PublicListingSummary[];
      nextCursor: string | null;
    }
  | { kind: "invalid-filters"; brands: BrandSummary[] }
  | { kind: "unavailable" };

const ALLOWED_KEYS = new Set([
  "vehicleType",
  "brandSlug",
  "modelSlug",
  "city",
  "minPriceInr",
  "maxPriceInr",
  "minPricePaise",
  "maxPricePaise",
  "minYear",
  "maxYear",
  "maxOdometerKm",
  "sort",
  "cursor",
]);

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() || undefined;

function resolvePriceBound(
  inrRaw: string | undefined,
  paiseRaw: string | undefined,
): { paise?: string; inr?: string } | null {
  if (inrRaw !== undefined && paiseRaw !== undefined) return null;
  if (inrRaw !== undefined) {
    if (!/^[1-9]\d{0,14}$/.test(inrRaw)) return null;
    return {
      paise: (BigInt(inrRaw) * 100n).toString(),
      inr: inrRaw,
    };
  }
  if (paiseRaw !== undefined) {
    if (!/^[1-9]\d{0,18}$/.test(paiseRaw)) return null;
    const total = BigInt(paiseRaw);
    return {
      paise: paiseRaw,
      inr: total % 100n === 0n ? (total / 100n).toString() : undefined,
    };
  }
  return {};
}

export function parseUsedEvFilters(params: SearchParams): UsedEvFilters | null {
  for (const [key, value] of Object.entries(params)) {
    if (first(value) !== undefined && !ALLOWED_KEYS.has(key)) {
      return null;
    }
  }

  const minPrice = resolvePriceBound(
    first(params.minPriceInr),
    first(params.minPricePaise),
  );
  const maxPrice = resolvePriceBound(
    first(params.maxPriceInr),
    first(params.maxPricePaise),
  );
  if (!minPrice || !maxPrice) return null;

  const parsed = PublicListingListQuery.safeParse({
    vehicleType: first(params.vehicleType),
    brandSlug: first(params.brandSlug),
    modelSlug: first(params.modelSlug),
    city: first(params.city),
    minPricePaise: minPrice.paise,
    maxPricePaise: maxPrice.paise,
    minYear: first(params.minYear),
    maxYear: first(params.maxYear),
    maxOdometerKm: first(params.maxOdometerKm),
    sort: first(params.sort),
    cursor: first(params.cursor),
    limit: USED_EV_PAGE_SIZE,
  });
  if (!parsed.success) return null;

  const d = parsed.data;
  if (
    d.minPricePaise !== undefined &&
    d.maxPricePaise !== undefined &&
    BigInt(d.minPricePaise) > BigInt(d.maxPricePaise)
  ) {
    return null;
  }
  if (
    d.minYear !== undefined &&
    d.maxYear !== undefined &&
    d.minYear > d.maxYear
  ) {
    return null;
  }

  return {
    vehicleType: d.vehicleType,
    brandSlug: d.brandSlug,
    modelSlug: d.modelSlug,
    city: d.city,
    minPricePaise: d.minPricePaise,
    maxPricePaise: d.maxPricePaise,
    minPriceInr: minPrice.inr,
    maxPriceInr: maxPrice.inr,
    minYear: d.minYear,
    maxYear: d.maxYear,
    maxOdometerKm: d.maxOdometerKm,
    sort: d.sort,
    cursor: d.cursor,
  };
}

export function activeUsedEvFilterCount(filters: UsedEvFilters): number {
  return [
    filters.vehicleType,
    filters.brandSlug,
    filters.modelSlug,
    filters.city,
    filters.minPricePaise,
    filters.maxPricePaise,
    filters.minYear,
    filters.maxYear,
    filters.maxOdometerKm,
  ].filter((value) => value !== undefined).length;
}

export function usedEvsHref(filters: Partial<UsedEvFilters>): string {
  const query = new URLSearchParams();
  if (filters.brandSlug) query.set("brandSlug", filters.brandSlug);
  if (filters.modelSlug) query.set("modelSlug", filters.modelSlug);
  if (filters.vehicleType) query.set("vehicleType", filters.vehicleType);
  if (filters.city) query.set("city", filters.city);
  if (filters.minPriceInr) {
    query.set("minPriceInr", filters.minPriceInr);
  } else if (filters.minPricePaise) {
    query.set("minPricePaise", filters.minPricePaise);
  }
  if (filters.maxPriceInr) {
    query.set("maxPriceInr", filters.maxPriceInr);
  } else if (filters.maxPricePaise) {
    query.set("maxPricePaise", filters.maxPricePaise);
  }
  if (filters.minYear !== undefined)
    query.set("minYear", String(filters.minYear));
  if (filters.maxYear !== undefined)
    query.set("maxYear", String(filters.maxYear));
  if (filters.maxOdometerKm !== undefined)
    query.set("maxOdometerKm", String(filters.maxOdometerKm));
  if (filters.sort && filters.sort !== "PRICE_ASC")
    query.set("sort", filters.sort);
  if (filters.cursor) query.set("cursor", filters.cursor);
  const qs = query.toString();
  return qs ? `/used-evs?${qs}` : "/used-evs";
}

export const usedEvDetailHref = (slug: string) => `/used-evs/${slug}`;

export async function loadUsedEvs(
  params: SearchParams,
  options: { apiOrigin?: string; fetch?: typeof fetch } = {},
): Promise<UsedEvsResult> {
  const origin = options.apiOrigin ?? process.env.API_BASE_URL;
  if (!origin) {
    console.error("used-evs: API_BASE_URL is not set");
    return { kind: "unavailable" };
  }
  const api = createEvoneClient({
    origin,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  try {
    const brands = await api.GET("/brands");
    if (!brands.data) return { kind: "unavailable" };
    const filters = parseUsedEvFilters(params);
    if (!filters) return { kind: "invalid-filters", brands: brands.data.data };

    const listings = await api.GET("/listings", {
      params: {
        query: {
          vehicleType: filters.vehicleType,
          brandSlug: filters.brandSlug,
          modelSlug: filters.modelSlug,
          city: filters.city,
          minPricePaise: filters.minPricePaise,
          maxPricePaise: filters.maxPricePaise,
          minYear: filters.minYear,
          maxYear: filters.maxYear,
          maxOdometerKm: filters.maxOdometerKm,
          sort: filters.sort,
          cursor: filters.cursor,
          limit: USED_EV_PAGE_SIZE,
        },
      },
    });
    if (listings.response.status === 400) {
      return { kind: "invalid-filters", brands: brands.data.data };
    }
    if (!listings.data) return { kind: "unavailable" };
    return {
      kind: "ok",
      filters,
      brands: brands.data.data,
      listings: listings.data.data,
      nextCursor: listings.data.page.nextCursor,
    };
  } catch (error) {
    console.error(
      "used-evs: API request failed",
      error instanceof Error ? error.message : error,
    );
    return { kind: "unavailable" };
  }
}
