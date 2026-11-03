import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDbClient, type DbClient } from "../src/index.js";
import { DEMO_REVIEWER_ID, seedDemoCatalogue } from "../src/seed-demo.js";

// Runs against a migrated database (DATABASE_URL). Every row uses a unique
// slug prefix and is removed afterwards, so the suite is re-runnable.
const url = process.env.DATABASE_URL;
if (!url)
  throw new Error("Catalogue integration tests need DATABASE_URL (migrated).");

const db: DbClient = createDbClient(url);
const run = `t${randomBytes(4).toString("hex")}`;
const reviewed = { reviewedAt: new Date(), reviewerId: DEMO_REVIEWER_ID };
let counter = 0;
const slug = (base: string) => `${run}-${base}-${++counter}`;

async function publishedParents() {
  const brand = await db.brand.create({
    data: { slug: slug("brand"), name: "Test brand" },
  });
  const model = await db.evModel.create({
    data: {
      brandId: brand.id,
      slug: slug("model"),
      name: "Test model",
      vehicleType: "CAR",
    },
  });
  await db.brand.update({
    where: { id: brand.id },
    data: { status: "PUBLISHED" },
  });
  await db.evModel.update({
    where: { id: model.id },
    data: { status: "PUBLISHED" },
  });
  return { brand, model };
}

async function draftVariant(
  modelId: string,
  specs: Record<string, unknown> = {},
) {
  return db.evVariant.create({
    data: { modelId, slug: slug("variant"), name: "Test variant", ...specs },
  });
}

function source(
  variantId: string,
  fieldName: "BATTERY_KWH" | "CLAIMED_RANGE",
  extra = {},
) {
  return db.specSource.create({
    data: {
      variantId,
      fieldName,
      valueText: "as stated by source",
      sourceUrl: "https://example.com/spec",
      sourceKind: "OEM",
      ...extra,
    },
  });
}

const publish = (id: string) =>
  db.evVariant.update({ where: { id }, data: { status: "PUBLISHED" } });

beforeAll(async () => {
  await db.$queryRaw`SELECT 1`;
});

afterAll(async () => {
  const prefix = `${run}-%`;
  await db.$executeRaw`UPDATE ev_variants SET status = 'ARCHIVED' WHERE slug LIKE ${prefix}`;
  await db.$executeRaw`DELETE FROM ev_variants WHERE slug LIKE ${prefix}`;
  await db.$executeRaw`UPDATE ev_models SET status = 'ARCHIVED' WHERE slug LIKE ${prefix}`;
  await db.$executeRaw`DELETE FROM ev_models WHERE slug LIKE ${prefix}`;
  await db.$executeRaw`UPDATE brands SET status = 'ARCHIVED' WHERE slug LIKE ${prefix}`;
  await db.$executeRaw`DELETE FROM brands WHERE slug LIKE ${prefix}`;
  await db.$disconnect();
});

describe("publishing requires reviewed sources", () => {
  it("refuses to publish a stated spec with no source", async () => {
    const { model } = await publishedParents();
    const v = await draftVariant(model.id, { batteryKwh: "30.00" });
    await expect(publish(v.id)).rejects.toThrow(
      /no reviewed source for BATTERY_KWH/,
    );
  });

  it("refuses an unreviewed source", async () => {
    const { model } = await publishedParents();
    const v = await draftVariant(model.id, { batteryKwh: "30.00" });
    await source(v.id, "BATTERY_KWH");
    await expect(publish(v.id)).rejects.toThrow(/BATTERY_KWH/);
  });

  it("publishes once every stated spec has a reviewed source", async () => {
    const { model } = await publishedParents();
    const v = await draftVariant(model.id, {
      batteryKwh: "30.00",
      claimedRangeKm: 300,
      rangeStandard: "MIDC",
    });
    await source(v.id, "BATTERY_KWH", reviewed);
    await expect(publish(v.id)).rejects.toThrow(/CLAIMED_RANGE/);
    await source(v.id, "CLAIMED_RANGE", reviewed);
    await expect(publish(v.id)).resolves.toMatchObject({ status: "PUBLISHED" });
  });

  it("allows unknown (NULL) specs without sources", async () => {
    const { model } = await publishedParents();
    const v = await draftVariant(model.id);
    await expect(publish(v.id)).resolves.toMatchObject({ status: "PUBLISHED" });
  });

  it("adds sources and publishes in one transaction (deferred check)", async () => {
    const { model } = await publishedParents();
    const v = await draftVariant(model.id, { batteryKwh: "12.00" });
    await db.$transaction(async (tx) => {
      await tx.evVariant.update({
        where: { id: v.id },
        data: { status: "PUBLISHED" },
      });
      await tx.specSource.create({
        data: {
          variantId: v.id,
          fieldName: "BATTERY_KWH",
          valueText: "12 kWh",
          sourceUrl: "https://example.com/spec",
          sourceKind: "OEM",
          ...reviewed,
        },
      });
    });
    const after = await db.evVariant.findUniqueOrThrow({ where: { id: v.id } });
    expect(after.status).toBe("PUBLISHED");
  });

  it("allows publish-then-revert in one transaction", async () => {
    const { model } = await publishedParents();
    const v = await draftVariant(model.id, { batteryKwh: "12.00" });
    await db.$transaction(async (tx) => {
      await tx.evVariant.update({
        where: { id: v.id },
        data: { status: "PUBLISHED" },
      });
      await tx.evVariant.update({
        where: { id: v.id },
        data: { status: "DRAFT" },
      });
    });
    expect(
      (await db.evVariant.findUniqueOrThrow({ where: { id: v.id } })).status,
    ).toBe("DRAFT");
  });
});

describe("published data stays sourced", () => {
  async function publishedVariant() {
    const { model, brand } = await publishedParents();
    const v = await draftVariant(model.id, { batteryKwh: "30.00" });
    const s = await source(v.id, "BATTERY_KWH", reviewed);
    await publish(v.id);
    return { brand, model, v, s };
  }

  it("blocks deleting the only source of a published spec", async () => {
    const { s } = await publishedVariant();
    await expect(db.specSource.delete({ where: { id: s.id } })).rejects.toThrow(
      /BATTERY_KWH/,
    );
  });

  it("blocks un-reviewing the only source of a published spec", async () => {
    const { s } = await publishedVariant();
    await expect(
      db.specSource.update({
        where: { id: s.id },
        data: { reviewedAt: null, reviewerId: null },
      }),
    ).rejects.toThrow(/BATTERY_KWH/);
  });

  it("blocks stating a new spec on a published variant without a source", async () => {
    const { v } = await publishedVariant();
    await expect(
      db.evVariant.update({ where: { id: v.id }, data: { motorKw: "50.00" } }),
    ).rejects.toThrow(/MOTOR_KW/);
  });

  it("blocks deleting a published variant", async () => {
    const { v } = await publishedVariant();
    await expect(db.evVariant.delete({ where: { id: v.id } })).rejects.toThrow(
      /archive it/,
    );
  });

  it("blocks unpublishing a model or brand with published children", async () => {
    const { brand, model } = await publishedVariant();
    await expect(
      db.evModel.update({ where: { id: model.id }, data: { status: "DRAFT" } }),
    ).rejects.toThrow(/published variants/);
    await expect(
      db.brand.update({ where: { id: brand.id }, data: { status: "DRAFT" } }),
    ).rejects.toThrow(/published models/);
  });

  it("refuses to publish a variant under an unpublished model", async () => {
    const brand = await db.brand.create({
      data: { slug: slug("brand"), name: "Draft brand" },
    });
    const model = await db.evModel.create({
      data: {
        brandId: brand.id,
        slug: slug("model"),
        name: "Draft model",
        vehicleType: "SCOOTER",
      },
    });
    const v = await draftVariant(model.id);
    await expect(publish(v.id)).rejects.toThrow(
      /model and brand must be published/,
    );
  });
});

describe("value rules", () => {
  it("rejects a range without its test standard, and the reverse", async () => {
    const { model } = await publishedParents();
    await expect(
      draftVariant(model.id, { claimedRangeKm: 300 }),
    ).rejects.toThrow(/ev_variants_range_has_standard/);
    await expect(
      draftVariant(model.id, { rangeStandard: "WLTP" }),
    ).rejects.toThrow(/ev_variants_range_has_standard/);
  });

  it("rejects non-positive units", async () => {
    const { model } = await publishedParents();
    await expect(draftVariant(model.id, { batteryKwh: "0" })).rejects.toThrow(
      /battery_kwh_positive/,
    );
    await expect(
      draftVariant(model.id, { chargingDcKw: "-5" }),
    ).rejects.toThrow(/charging_dc_kw_positive/);
  });

  it("rejects non-https sources and half-recorded reviews", async () => {
    const { model } = await publishedParents();
    const v = await draftVariant(model.id, { batteryKwh: "10.00" });
    await expect(
      source(v.id, "BATTERY_KWH", { sourceUrl: "http://example.com/spec" }),
    ).rejects.toThrow(/spec_sources_url_https/);
    await expect(
      source(v.id, "BATTERY_KWH", { reviewedAt: new Date() }),
    ).rejects.toThrow(/spec_sources_review_complete/);
  });

  it("rejects malformed and duplicate slugs", async () => {
    await expect(
      db.brand.create({ data: { slug: "Bad Slug", name: "x" } }),
    ).rejects.toThrow(/brands_slug_format/);
    const { model } = await publishedParents();
    const v = await draftVariant(model.id);
    await expect(
      db.evVariant.create({
        data: { modelId: model.id, slug: v.slug, name: "dup" },
      }),
    ).rejects.toThrow();
  });
});

describe("demo seed", () => {
  it("refuses production", async () => {
    await expect(
      seedDemoCatalogue(db, { NODE_ENV: "production" }),
    ).rejects.toThrow(/production/);
  });

  it("is idempotent, labelled and passes the publish rules", async () => {
    await seedDemoCatalogue(db, { NODE_ENV: "test" });
    await seedDemoCatalogue(db, { NODE_ENV: "test" });
    const brand = await db.brand.findUniqueOrThrow({
      where: { slug: "demo-motors" },
      include: {
        models: { include: { variants: { include: { sources: true } } } },
      },
    });
    expect(brand.isDemo).toBe(true);
    const variants = brand.models.flatMap((m) => m.variants);
    expect(variants).toHaveLength(3);
    for (const m of brand.models)
      expect(m.name).toMatch(/^DEMO .*\(fictional\)$/);
    for (const v of variants) {
      expect(v.isDemo).toBe(true);
      expect(v.name).toMatch(/^DEMO /);
      for (const s of v.sources)
        expect(s.sourceUrl).toMatch(/^https:\/\/example\.com\//);
    }
    expect(variants.filter((v) => v.status === "PUBLISHED")).toHaveLength(2);
    const unsourced = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM ev_variant_unsourced_specs u
      JOIN ev_variants v ON v.id = u.variant_id WHERE v.status = 'PUBLISHED'`;
    expect(unsourced[0]?.n).toBe(0);
  });
});
