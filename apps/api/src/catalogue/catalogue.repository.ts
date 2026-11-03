import type { DbClient } from "@evone/db";
import { Inject, Injectable } from "@nestjs/common";
import { API_CONFIG } from "../config/config.token.js";
import type { ApiConfig } from "../config/env.js";
import { DB_CLIENT } from "../database/database.token.js";
import type { ModelCursor } from "./cursor.js";

const variantSpecs = {
  id: true,
  slug: true,
  name: true,
  isDemo: true,
  batteryKwh: true,
  claimedRangeKm: true,
  rangeStandard: true,
  motorKw: true,
  chargingAcKw: true,
  chargingDcKw: true,
  warrantyText: true,
} as const;

/** Published variants' specs and reviewed-source dates, for SpecSummary. */
const summaryVariants = (visible: object) => ({
  where: visible,
  select: {
    batteryKwh: true,
    claimedRangeKm: true,
    rangeStandard: true,
    sources: {
      where: { reviewedAt: { not: null } },
      select: { reviewedAt: true },
    },
  },
});

/** Variant specs plus model context and reviewed sources (provenance). */
const variantDetailSelect = {
  ...variantSpecs,
  model: {
    select: {
      slug: true,
      name: true,
      vehicleType: true,
      brand: { select: { slug: true, name: true } },
    },
  },
  sources: {
    where: { reviewedAt: { not: null } },
    orderBy: [{ fieldName: "asc" as const }, { reviewedAt: "desc" as const }],
    select: {
      fieldName: true,
      valueText: true,
      sourceUrl: true,
      sourceKind: true,
      effectiveAt: true,
      reviewedAt: true,
    },
  },
};

const modelFields = {
  id: true,
  slug: true,
  name: true,
  vehicleType: true,
  availabilityStatus: true,
  releaseDate: true,
  isDemo: true,
  brand: { select: { slug: true, name: true } },
} as const;

/**
 * All public catalogue reads. Every query is restricted to PUBLISHED rows
 * at every level, and to non-demo rows in production; there is no method
 * that returns unpublished data.
 */
@Injectable()
export class CatalogueRepository {
  private readonly includeDemo: boolean;

  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    @Inject(API_CONFIG) config: ApiConfig,
  ) {
    this.includeDemo = config.NODE_ENV !== "production";
  }

  private get visible() {
    return {
      status: "PUBLISHED" as const,
      ...(this.includeDemo ? {} : { isDemo: false }),
    };
  }

  listBrands() {
    return this.db.brand.findMany({
      where: { ...this.visible, models: { some: this.visible } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        isDemo: true,
        models: {
          where: this.visible,
          select: { vehicleType: true },
          distinct: ["vehicleType"],
        },
      },
    });
  }

  listModels(
    filter: { brandId?: string; vehicleType?: string },
    limit: number,
    after?: ModelCursor,
  ) {
    return this.db.evModel.findMany({
      where: {
        ...this.visible,
        brand: this.visible,
        ...(filter.brandId ? { brandId: filter.brandId } : {}),
        ...(filter.vehicleType
          ? { vehicleType: filter.vehicleType as never }
          : {}),
        ...(after
          ? {
              OR: [
                { name: { gt: after.n } },
                { name: after.n, id: { gt: after.i } },
              ],
            }
          : {}),
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: limit + 1,
      select: { ...modelFields, variants: summaryVariants(this.visible) },
    });
  }

  findModel(brandSlug: string, modelSlug: string) {
    return this.db.evModel.findFirst({
      where: {
        ...this.visible,
        slug: modelSlug,
        brand: { ...this.visible, slug: brandSlug },
      },
      select: {
        ...modelFields,
        variants: {
          where: this.visible,
          orderBy: [{ name: "asc" }, { id: "asc" }],
          select: {
            ...variantSpecs,
            sources: {
              where: { reviewedAt: { not: null } },
              select: { reviewedAt: true },
            },
          },
        },
      },
    });
  }

  findVariant(id: string) {
    return this.db.evVariant.findFirst({
      where: {
        ...this.visible,
        id,
        model: { ...this.visible, brand: this.visible },
      },
      select: variantDetailSelect,
    });
  }

  /** Published variants among `ids`; order not guaranteed. */
  findVariants(ids: string[]) {
    return this.db.evVariant.findMany({
      where: {
        ...this.visible,
        id: { in: ids },
        model: { ...this.visible, brand: this.visible },
      },
      select: variantDetailSelect,
    });
  }
}
