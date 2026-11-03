import { afterEach, describe, expect, it, vi } from "vitest";
import {
  catalogueHref,
  loadCatalogue,
  PAGE_SIZE,
  parseFilters,
} from "./catalogue";

const meta = { requestId: "3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c" };
const brandId = "6b1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c";
const brands = {
  data: [
    { id: brandId, slug: "b", name: "B", isDemo: false, vehicleTypes: ["CAR"] },
  ],
  meta,
};
const models = { data: [], page: { nextCursor: null, hasMore: false }, meta };

function fakeApi(routes: Record<string, () => Response>) {
  const seen: string[] = [];
  const fetchImpl = (input: Request) => {
    const url = new URL(input.url);
    seen.push(url.pathname + url.search);
    const handler = routes[url.pathname.replace("/api/v1", "")];
    return Promise.resolve(
      handler ? handler() : new Response("{}", { status: 404 }),
    );
  };
  return { fetch: fetchImpl as unknown as typeof fetch, seen };
}

afterEach(() => vi.restoreAllMocks());

describe("parseFilters", () => {
  it("keeps only known, valid filters", () => {
    expect(
      parseFilters({ brandId, vehicleType: "CAR", utm_source: "x" }),
    ).toEqual({
      brandId,
      vehicleType: "CAR",
      cursor: undefined,
    });
  });

  it("treats empty form values as no filter", () => {
    expect(parseFilters({ brandId: "", vehicleType: "" })).toEqual({
      brandId: undefined,
      vehicleType: undefined,
      cursor: undefined,
    });
  });

  it("rejects hand-edited invalid values", () => {
    expect(parseFilters({ vehicleType: "TRUCK" })).toBeNull();
    expect(parseFilters({ brandId: "not-a-uuid" })).toBeNull();
  });
});

describe("loadCatalogue", () => {
  it("passes filters and page size to the API", async () => {
    const api = fakeApi({
      "/brands": () => Response.json(brands),
      "/models": () => Response.json(models),
    });
    const result = await loadCatalogue(
      { brandId, vehicleType: "CAR" },
      { apiOrigin: "http://api.test", fetch: api.fetch },
    );
    expect(result.kind).toBe("ok");
    expect(api.seen).toContain(
      `/api/v1/models?brandId=${brandId}&vehicleType=CAR&limit=${PAGE_SIZE}`,
    );
  });

  it("reports invalid filters without calling /models", async () => {
    const api = fakeApi({ "/brands": () => Response.json(brands) });
    const result = await loadCatalogue(
      { vehicleType: "TRUCK" },
      { apiOrigin: "http://api.test", fetch: api.fetch },
    );
    expect(result.kind).toBe("invalid-filters");
    expect(api.seen.some((p) => p.startsWith("/api/v1/models"))).toBe(false);
  });

  it("treats an API 400 (e.g. expired cursor) as invalid filters", async () => {
    const api = fakeApi({
      "/brands": () => Response.json(brands),
      "/models": () =>
        Response.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "x",
              fields: { cursor: "bad" },
            },
            meta,
          },
          { status: 400 },
        ),
    });
    const result = await loadCatalogue(
      { cursor: "abc" },
      { apiOrigin: "http://api.test", fetch: api.fetch },
    );
    expect(result.kind).toBe("invalid-filters");
  });

  it("becomes unavailable when the API fails or is unreachable, without throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const down = fakeApi({
      "/brands": () => new Response("oops", { status: 503 }),
    });
    expect(
      (
        await loadCatalogue(
          {},
          { apiOrigin: "http://api.test", fetch: down.fetch },
        )
      ).kind,
    ).toBe("unavailable");
    const unreachable = (() =>
      Promise.reject(new TypeError("fetch failed"))) as unknown as typeof fetch;
    expect(
      (
        await loadCatalogue(
          {},
          { apiOrigin: "http://api.test", fetch: unreachable },
        )
      ).kind,
    ).toBe("unavailable");
  });

  it("is unavailable when API_BASE_URL is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("API_BASE_URL", "");
    expect((await loadCatalogue({})).kind).toBe("unavailable");
    vi.unstubAllEnvs();
  });
});

describe("catalogueHref", () => {
  it("keeps filters and cursor in the URL", () => {
    expect(catalogueHref({ brandId, vehicleType: "CAR", cursor: "c1" })).toBe(
      `/evs?brandId=${brandId}&vehicleType=CAR&cursor=c1`,
    );
    expect(catalogueHref({})).toBe("/evs");
  });
});
