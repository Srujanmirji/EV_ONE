import { CompareQuery, type VariantDetail } from "@evone/contracts";
import { createEvoneClient } from "@evone/sdk";
import { type SearchParams } from "./catalogue";
import { specRows, type SpecRow } from "./specs";

export const MAX_COMPARE = 3;

export type CompareResult =
  | { kind: "need-more"; ids: string[] }
  | { kind: "invalid" }
  | { kind: "not-found"; ids: string[] }
  | { kind: "unavailable" }
  | { kind: "ok"; ids: string[]; variants: VariantDetail[] };

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

/** `?ids=a,b,c` → trimmed, non-empty ids (validation happens in loadComparison). */
export function idsFrom(params: SearchParams): string[] {
  return (first(params.ids) ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function compareHref(ids: string[], diff = false): string {
  const query = new URLSearchParams();
  if (ids.length > 0) query.set("ids", ids.join(","));
  if (diff) query.set("diff", "1");
  const qs = query.toString();
  return qs ? `/compare?${qs}` : "/compare";
}

export async function loadComparison(
  ids: string[],
  options: { apiOrigin?: string; fetch?: typeof fetch } = {},
): Promise<CompareResult> {
  if (ids.length < 2) return { kind: "need-more", ids };
  const parsed = CompareQuery.safeParse({ variantIds: ids.join(",") });
  if (!parsed.success) return { kind: "invalid" };
  const origin = options.apiOrigin ?? process.env.API_BASE_URL;
  if (!origin) {
    console.error("compare: API_BASE_URL is not set");
    return { kind: "unavailable" };
  }
  const api = createEvoneClient({
    origin,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  try {
    const res = await api.GET("/compare", {
      params: { query: { variantIds: ids.join(",") } },
    });
    if (res.data) return { kind: "ok", ids, variants: res.data.data };
    if (res.response.status === 404) return { kind: "not-found", ids };
    if (res.response.status === 400) return { kind: "invalid" };
    return { kind: "unavailable" };
  } catch (error) {
    console.error(
      "compare: API request failed",
      error instanceof Error ? error.message : error,
    );
    return { kind: "unavailable" };
  }
}

export interface CompareRow {
  field: SpecRow["field"];
  label: string;
  cells: {
    value: string | null;
    note: string | null;
    checked: string | null;
  }[];
  /** True when stated values differ, or some are known and some are not. */
  differs: boolean;
}

export interface Comparison {
  rows: CompareRow[];
  /** Claimed ranges measured under different test standards. */
  mixedRangeStandards: boolean;
}

/** Same labels, units and source rules as the variant page (lib/specs). */
export function buildComparison(variants: VariantDetail[]): Comparison {
  const perVariant = variants.map((v) => specRows(v.specs, v.sources));
  const rows = perVariant[0]!.map((row, i) => {
    const cells = perVariant.map((rowsOfVariant) => {
      const r = rowsOfVariant[i]!;
      const checked =
        r.sources
          .map((s) => s.reviewedAt)
          .sort()
          .at(-1) ?? null;
      return { value: r.value, note: r.note, checked };
    });
    const shown = cells.map((c) => `${c.value ?? ""}|${c.note ?? ""}`);
    return {
      field: row.field,
      label: row.label,
      cells,
      differs: new Set(shown).size > 1,
    };
  });
  const standards = new Set(
    variants
      .map((v) => v.specs.claimedRange?.standard)
      .filter((s): s is NonNullable<typeof s> => !!s),
  );
  return { rows, mixedRangeStandards: standards.size > 1 };
}
