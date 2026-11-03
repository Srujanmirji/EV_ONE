import {
  BrandListResponse,
  ErrorEnvelope,
  ModelDetailResponse,
  ModelListResponse,
  VariantDetailResponse,
} from "@evone/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanup,
  db,
  model,
  publishedBrand,
  run,
  startApi,
  variant,
} from "./support.js";

let api: Awaited<ReturnType<typeof startApi>>;
let prod: Awaited<ReturnType<typeof startApi>>;

beforeAll(async () => {
  api = await startApi("test");
  prod = await startApi("production");
});

afterAll(async () => {
  await api.app.close();
  await prod.app.close();
  await cleanup();
  await db.$disconnect();
});

const json = async <T>(res: Response, schema: { parse: (v: unknown) => T }) =>
  schema.parse(await res.json());

describe("GET /models pagination", () => {
  it("walks every published model exactly once, ordered by (name, id), across pages", async () => {
    const brand = await publishedBrand();
    // Duplicate names prove the id tiebreak: no skips, no repeats.
    const names = ["Bravo", "Alpha", "Same", "Same", "Charlie"];
    for (const name of names) await model(brand.id, { name });
    await model(brand.id, { name: "Hidden draft", publish: false });

    const seen: { name: string; id: string }[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const qs: string = `?brandId=${brand.id}&limit=2${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await api.get(`/models${qs}`);
      expect(res.status).toBe(200);
      const body = await json(res, ModelListResponse);
      expect(body.data.length).toBeLessThanOrEqual(2);
      seen.push(...body.data.map((m) => ({ name: m.name, id: m.id })));
      expect(body.page.hasMore).toBe(body.page.nextCursor !== null);
      cursor = body.page.nextCursor;
      pages += 1;
    } while (cursor && pages < 10);

    expect(pages).toBe(3);
    expect(seen.map((m) => m.name)).not.toContain("Hidden draft");
    expect(new Set(seen.map((m) => m.id)).size).toBe(5);
    const sorted = [...seen].sort((a, b) =>
      a.name === b.name ? (a.id < b.id ? -1 : 1) : a.name < b.name ? -1 : 1,
    );
    expect(seen).toEqual(sorted);
  });

  it("defaults to 20 and filters by vehicle type", async () => {
    const brand = await publishedBrand();
    for (let i = 0; i < 22; i++)
      await model(brand.id, { name: `Car ${String(i).padStart(2, "0")}` });
    await model(brand.id, { name: "A scooter", vehicleType: "SCOOTER" });
    const first = await json(
      await api.get(`/models?brandId=${brand.id}`),
      ModelListResponse,
    );
    expect(first.data).toHaveLength(20);
    expect(first.page.hasMore).toBe(true);
    const scooters = await json(
      await api.get(`/models?brandId=${brand.id}&vehicleType=SCOOTER`),
      ModelListResponse,
    );
    expect(scooters.data.map((m) => m.name)).toEqual(["A scooter"]);
    expect(scooters.page).toEqual({ hasMore: false, nextCursor: null });
  });

  it.each([
    ["limit above 50", "?limit=51", "limit"],
    ["limit zero", "?limit=0", "limit"],
    ["tampered cursor", "?cursor=bm90LWEtY3Vyc29y", "cursor"],
    ["bad brandId", "?brandId=nope", "brandId"],
    ["unknown vehicle type", "?vehicleType=TRUCK", "vehicleType"],
    ["unknown parameter", "?sort=price", "sort"],
  ])("rejects %s with VALIDATION_ERROR", async (_label, qs, field) => {
    const res = await api.get(`/models${qs}`);
    expect(res.status).toBe(400);
    const body = await json(res, ErrorEnvelope);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(body.error.fields ?? {})).toContain(field);
  });
});

describe("published-only", () => {
  it("hides unpublished models, variants and brands everywhere", async () => {
    const brand = await publishedBrand();
    const live = await model(brand.id, { name: "Live" });
    const draftModel = await model(brand.id, { name: "Draft", publish: false });
    const shown = await variant(live.id);
    const hidden = await variant(live.id, { publish: false });

    const detail = await json(
      await api.get(`/brands/${brand.slug}/models/${live.slug}`),
      ModelDetailResponse,
    );
    expect(detail.data.variants.map((v) => v.id)).toEqual([shown.id]);
    expect(
      (await api.get(`/brands/${brand.slug}/models/${draftModel.slug}`)).status,
    ).toBe(404);
    expect((await api.get(`/variants/${hidden.id}`)).status).toBe(404);

    const draftBrand = await db.brand.create({
      data: { slug: `${run}-draftbrand`, name: "Draft brand" },
    });
    const brands = await json(await api.get("/brands"), BrandListResponse);
    expect(brands.data.map((b) => b.id)).toContain(brand.id);
    expect(brands.data.map((b) => b.id)).not.toContain(draftBrand.id);
  });

  it("does not list a published brand with no published models", async () => {
    const empty = await publishedBrand();
    const brands = await json(await api.get("/brands"), BrandListResponse);
    expect(brands.data.map((b) => b.id)).not.toContain(empty.id);
  });

  it("does not resolve a model under another brand's slug", async () => {
    const a = await publishedBrand();
    const b = await publishedBrand();
    const m = await model(a.id);
    await model(b.id);
    expect((await api.get(`/brands/${b.slug}/models/${m.slug}`)).status).toBe(
      404,
    );
  });
});

describe("variant provenance", () => {
  it("returns specs with range+standard and only reviewed sources", async () => {
    const brand = await publishedBrand();
    const m = await model(brand.id);
    const v = await variant(m.id);
    const body = await json(
      await api.get(`/variants/${v.id}`),
      VariantDetailResponse,
    );
    expect(body.data.specs).toEqual({
      batteryKwh: 30.5,
      claimedRange: { km: 315, standard: "MIDC" },
      motorKw: null,
      chargingAcKw: null,
      chargingDcKw: null,
      warrantyText: null,
    });
    expect(body.data.sources.map((s) => s.fieldName).sort()).toEqual([
      "BATTERY_KWH",
      "CLAIMED_RANGE",
    ]);
    expect(JSON.stringify(body)).not.toContain("draft");
    expect(JSON.stringify(body)).not.toContain("reviewerId");
    expect(body.data.model.brand.slug).toBe(brand.slug);
  });

  it("400s a malformed id and 404s an unknown one", async () => {
    expect((await api.get("/variants/not-a-uuid")).status).toBe(400);
    expect(
      (await api.get("/variants/3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c")).status,
    ).toBe(404);
  });
});

describe("demo data", () => {
  it("is visible and labelled outside production, absent in production", async () => {
    const demo = await publishedBrand({ isDemo: true });
    const m = await model(demo.id, { isDemo: true });
    const v = await variant(m.id, { isDemo: true });

    const dev = await json(
      await api.get(`/models?brandId=${demo.id}`),
      ModelListResponse,
    );
    expect(dev.data.map((x) => x.isDemo)).toEqual([true]);

    const prodBrands = await json(await prod.get("/brands"), BrandListResponse);
    expect(prodBrands.data.every((b) => !b.isDemo)).toBe(true);
    const prodModels = await json(
      await prod.get(`/models?brandId=${demo.id}`),
      ModelListResponse,
    );
    expect(prodModels.data).toEqual([]);
    expect(
      (await prod.get(`/brands/${demo.slug}/models/${m.slug}`)).status,
    ).toBe(404);
    expect((await prod.get(`/variants/${v.id}`)).status).toBe(404);
  });
});
