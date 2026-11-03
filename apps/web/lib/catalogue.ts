import {
  type BrandSummary,
  ModelListQuery,
  type ModelSummary,
} from "@evone/contracts";
import { createEvoneClient } from "@evone/sdk";

export const PAGE_SIZE = 12;

export type SearchParams = Record<string, string | string[] | undefined>;

export interface CatalogueFilters {
  brandId?: string;
  vehicleType?: ModelSummary["vehicleType"];
  cursor?: string;
}

export type CatalogueResult =
  | {
      kind: "ok";
      filters: CatalogueFilters;
      brands: BrandSummary[];
      models: ModelSummary[];
      nextCursor: string | null;
    }
  | { kind: "invalid-filters"; brands: BrandSummary[] }
  | { kind: "unavailable" };

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Reads only the filters the catalogue understands from the URL and
 * validates them with the API's own contract, so a hand-edited URL shows a
 * clear message instead of an API error.
 */
export function parseFilters(params: SearchParams): CatalogueFilters | null {
  const raw = {
    brandId: first(params.brandId) || undefined,
    vehicleType: first(params.vehicleType) || undefined,
    cursor: first(params.cursor) || undefined,
  };
  const parsed = ModelListQuery.safeParse({ ...raw, limit: PAGE_SIZE });
  if (!parsed.success) return null;
  const { brandId, vehicleType, cursor } = parsed.data;
  return { brandId, vehicleType, cursor };
}

/**
 * Server-side catalogue fetch through the generated SDK. Never throws: an
 * unreachable or failing API becomes `unavailable` (no internals shown).
 */
export async function loadCatalogue(
  params: SearchParams,
  options: { apiOrigin?: string; fetch?: typeof fetch } = {},
): Promise<CatalogueResult> {
  const origin = options.apiOrigin ?? process.env.API_BASE_URL;
  if (!origin) {
    console.error("catalogue: API_BASE_URL is not set");
    return { kind: "unavailable" };
  }
  const api = createEvoneClient({
    origin,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  try {
    const brands = await api.GET("/brands");
    if (!brands.data) return { kind: "unavailable" };
    const filters = parseFilters(params);
    if (!filters) return { kind: "invalid-filters", brands: brands.data.data };

    const models = await api.GET("/models", {
      params: { query: { ...filters, limit: PAGE_SIZE } },
    });
    if (models.response.status === 400) {
      // e.g. an expired cursor: same recovery as a bad filter.
      return { kind: "invalid-filters", brands: brands.data.data };
    }
    if (!models.data) return { kind: "unavailable" };
    return {
      kind: "ok",
      filters,
      brands: brands.data.data,
      models: models.data.data,
      nextCursor: models.data.page.nextCursor,
    };
  } catch (error) {
    console.error(
      "catalogue: API request failed",
      error instanceof Error ? error.message : error,
    );
    return { kind: "unavailable" };
  }
}

/** Builds a /evs URL that keeps the active filters. */
export function catalogueHref(filters: CatalogueFilters): string {
  const query = new URLSearchParams();
  if (filters.brandId) query.set("brandId", filters.brandId);
  if (filters.vehicleType) query.set("vehicleType", filters.vehicleType);
  if (filters.cursor) query.set("cursor", filters.cursor);
  const qs = query.toString();
  return qs ? `/evs?${qs}` : "/evs";
}
