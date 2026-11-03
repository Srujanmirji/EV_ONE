import { randomBytes } from "node:crypto";
import { createDbClient, type DbClient, DEMO_REVIEWER_ID } from "@evone/db";
import type { INestApplication } from "@nestjs/common";
import { loadConfig } from "../src/config/env.js";
import { API_PREFIX, createApp } from "../src/create-app.js";

export const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl)
  throw new Error("API integration tests need DATABASE_URL (migrated).");

export const db: DbClient = createDbClient(databaseUrl);
export const run = `t${randomBytes(4).toString("hex")}`;
let n = 0;
export const slug = (base: string) => `${run}-${base}-${++n}`;

export async function startApi(nodeEnv: "test" | "production" = "test") {
  const app: INestApplication = await createApp({
    config: loadConfig({ NODE_ENV: nodeEnv, DATABASE_URL: databaseUrl }),
    db,
  });
  await app.listen(0, "127.0.0.1");
  const base = `${await app.getUrl()}/${API_PREFIX}`;
  return {
    app,
    get: (path: string) => fetch(`${base}${path}`),
  };
}

const reviewed = {
  reviewedAt: new Date("2026-11-03T10:00:00Z"),
  reviewerId: DEMO_REVIEWER_ID,
};

/** A published brand whose models/variants the caller adds. */
export async function publishedBrand(
  opts: { isDemo?: boolean; name?: string } = {},
) {
  const brand = await db.brand.create({
    data: {
      slug: slug("brand"),
      name: opts.name ?? `Brand ${run}`,
      isDemo: opts.isDemo ?? false,
    },
  });
  return db.brand.update({
    where: { id: brand.id },
    data: { status: "PUBLISHED" },
  });
}

export async function model(
  brandId: string,
  opts: {
    name?: string;
    publish?: boolean;
    vehicleType?: "CAR" | "SCOOTER";
    isDemo?: boolean;
  } = {},
) {
  const m = await db.evModel.create({
    data: {
      brandId,
      slug: slug("model"),
      name: opts.name ?? `Model ${n}`,
      vehicleType: opts.vehicleType ?? "CAR",
      isDemo: opts.isDemo ?? false,
    },
  });
  return opts.publish === false
    ? m
    : db.evModel.update({ where: { id: m.id }, data: { status: "PUBLISHED" } });
}

/** Variant with a sourced battery and range; publishes unless told not to. */
export async function variant(
  modelId: string,
  opts: { publish?: boolean; isDemo?: boolean } = {},
) {
  return db.$transaction(async (tx) => {
    const v = await tx.evVariant.create({
      data: {
        modelId,
        slug: slug("variant"),
        name: `Variant ${n}`,
        isDemo: opts.isDemo ?? false,
        batteryKwh: "30.50",
        claimedRangeKm: 315,
        rangeStandard: "MIDC",
      },
    });
    await tx.specSource.createMany({
      data: [
        {
          variantId: v.id,
          fieldName: "BATTERY_KWH",
          valueText: "30.5 kWh",
          sourceUrl: "https://example.com/s",
          sourceKind: "OEM",
          ...reviewed,
        },
        {
          variantId: v.id,
          fieldName: "CLAIMED_RANGE",
          valueText: "315 km MIDC",
          sourceUrl: "https://example.com/s",
          sourceKind: "REGULATOR",
          effectiveAt: new Date("2026-01-01"),
          ...reviewed,
        },
        // An unreviewed draft source must never be exposed.
        {
          variantId: v.id,
          fieldName: "MOTOR_KW",
          valueText: "draft",
          sourceUrl: "https://example.com/draft",
          sourceKind: "PRESS",
        },
      ],
    });
    return opts.publish === false
      ? v
      : tx.evVariant.update({
          where: { id: v.id },
          data: { status: "PUBLISHED" },
        });
  });
}

export async function cleanup(): Promise<void> {
  const prefix = `${run}-%`;
  await db.$executeRaw`UPDATE ev_variants SET status = 'ARCHIVED' WHERE slug LIKE ${prefix}`;
  await db.$executeRaw`DELETE FROM ev_variants WHERE slug LIKE ${prefix}`;
  await db.$executeRaw`UPDATE ev_models SET status = 'ARCHIVED' WHERE slug LIKE ${prefix}`;
  await db.$executeRaw`DELETE FROM ev_models WHERE slug LIKE ${prefix}`;
  await db.$executeRaw`UPDATE brands SET status = 'ARCHIVED' WHERE slug LIKE ${prefix}`;
  await db.$executeRaw`DELETE FROM brands WHERE slug LIKE ${prefix}`;
}
