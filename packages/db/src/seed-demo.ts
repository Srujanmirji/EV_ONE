import type { DbClient } from "./index.js";

/**
 * Fictional, clearly labelled catalogue data for local development and
 * demos (PROJECT_SETUP "Demo data boundary"). Every name starts with
 * "DEMO", every row has is_demo = true, and every source points at
 * example.com (RFC 2606). Never real manufacturers or real specs.
 */
export const DEMO_REVIEWER_ID = "00000000-0000-4000-8000-00000000d3e0";
const DEMO_SOURCE = "https://example.com/evone-demo-spec-sheet";

interface DemoVariant {
  slug: string;
  name: string;
  published: boolean;
  specs: {
    batteryKwh?: string;
    claimedRangeKm?: number;
    rangeStandard?: "MIDC" | "IDC";
    motorKw?: string;
    chargingAcKw?: string;
    chargingDcKw?: string;
    warrantyText?: string;
  };
}

const models: {
  slug: string;
  name: string;
  vehicleType: "SCOOTER" | "CAR";
  variants: DemoVariant[];
}[] = [
  {
    slug: "volt-scooter",
    name: "DEMO Volt Scooter (fictional)",
    vehicleType: "SCOOTER",
    variants: [
      {
        slug: "standard",
        name: "DEMO Standard",
        published: true,
        specs: {
          batteryKwh: "3.00",
          claimedRangeKm: 120,
          rangeStandard: "IDC",
          motorKw: "4.50",
          chargingAcKw: "0.75",
          warrantyText: "DEMO: 3 years battery (fictional)",
        },
      },
      // Unknown specs stay NULL; a draft needs no sources.
      {
        slug: "prototype",
        name: "DEMO Prototype",
        published: false,
        specs: {},
      },
    ],
  },
  {
    slug: "urban-hatch",
    name: "DEMO Urban Hatch (fictional)",
    vehicleType: "CAR",
    variants: [
      {
        slug: "long-range",
        name: "DEMO Long Range",
        published: true,
        specs: {
          batteryKwh: "40.50",
          claimedRangeKm: 400,
          rangeStandard: "MIDC",
          motorKw: "100.00",
          chargingAcKw: "7.20",
          chargingDcKw: "50.00",
        },
      },
    ],
  },
];

const FIELD_OF = {
  batteryKwh: "BATTERY_KWH",
  claimedRangeKm: "CLAIMED_RANGE",
  motorKw: "MOTOR_KW",
  chargingAcKw: "CHARGING_AC_KW",
  chargingDcKw: "CHARGING_DC_KW",
  warrantyText: "WARRANTY",
} as const;

/** Idempotent: re-running converges on the same rows. */
export async function seedDemoCatalogue(
  db: DbClient,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  if (env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to seed demo catalogue data with NODE_ENV=production.",
    );
  }
  await db.$transaction(async (tx) => {
    const brand = await tx.brand.upsert({
      where: { slug: "demo-motors" },
      update: {},
      create: {
        slug: "demo-motors",
        name: "DEMO Motors (fictional)",
        isDemo: true,
      },
    });
    for (const m of models) {
      const model = await tx.evModel.upsert({
        where: { brandId_slug: { brandId: brand.id, slug: m.slug } },
        update: {},
        create: {
          brandId: brand.id,
          slug: m.slug,
          name: m.name,
          vehicleType: m.vehicleType,
          availabilityStatus: "UNKNOWN",
          isDemo: true,
        },
      });
      for (const v of m.variants) {
        const variant = await tx.evVariant.upsert({
          where: { modelId_slug: { modelId: model.id, slug: v.slug } },
          update: {},
          create: {
            modelId: model.id,
            slug: v.slug,
            name: v.name,
            isDemo: true,
            ...v.specs,
          },
        });
        await tx.specSource.deleteMany({ where: { variantId: variant.id } });
        for (const [key, value] of Object.entries(v.specs)) {
          if (key === "rangeStandard" || value === undefined) continue;
          const shown =
            key === "claimedRangeKm"
              ? `${value} km (${v.specs.rangeStandard})`
              : String(value);
          await tx.specSource.create({
            data: {
              variantId: variant.id,
              fieldName: FIELD_OF[key as keyof typeof FIELD_OF],
              valueText: `DEMO ${shown}`,
              sourceUrl: `${DEMO_SOURCE}/${m.slug}/${v.slug}`,
              sourceKind: "OTHER",
              reviewedAt: new Date("2026-11-03T00:00:00Z"),
              reviewerId: DEMO_REVIEWER_ID,
            },
          });
        }
      }
    }
    // Publish parents before children (the database enforces the order).
    await tx.brand.update({
      where: { id: brand.id },
      data: { status: "PUBLISHED" },
    });
    for (const m of models) {
      const model = await tx.evModel.update({
        where: { brandId_slug: { brandId: brand.id, slug: m.slug } },
        data: { status: "PUBLISHED" },
      });
      for (const v of m.variants.filter((x) => x.published)) {
        await tx.evVariant.update({
          where: { modelId_slug: { modelId: model.id, slug: v.slug } },
          data: { status: "PUBLISHED" },
        });
      }
    }
  });
}
