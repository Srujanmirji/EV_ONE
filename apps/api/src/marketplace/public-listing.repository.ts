import {
  publicListingPreviewPath,
  type PublicListingDetail,
  type PublicListingListQuery,
  type PublicListingSort,
  type PublicListingSummary,
} from "@evone/contracts";
import type { DbClient } from "@evone/db";
import { Inject, Injectable } from "@nestjs/common";
import {
  type SourceRow,
  type VariantRow,
  toSources,
  toSpecs,
} from "../catalogue/catalogue.mapper.js";
import { API_CONFIG } from "../config/config.token.js";
import type { ApiConfig } from "../config/env.js";
import { DB_CLIENT } from "../database/database.token.js";
import type { ListingCursor } from "./listing-cursor.js";

const variantSelect = {
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
  model: {
    select: {
      slug: true,
      name: true,
      vehicleType: true,
      brand: { select: { slug: true, name: true } },
    },
  },
} as const;

const summarySelect = {
  id: true,
  slug: true,
  year: true,
  odometerKm: true,
  city: true,
  askingPricePaise: true,
  ownershipCount: true,
  isDemo: true,
  publishedAt: true,
  _count: { select: { media: true } },
  variant: { select: variantSelect },
} as const;

const previewAssetSelect = {
  id: true,
  status: true,
  objectKey: true,
} as const;

function previewKey(asset: {
  id: string;
  status: string;
  objectKey: string | null;
}) {
  if (asset.status !== "READY" || !asset.objectKey) return null;
  const prefix = `ready/${asset.id}/`;
  return asset.objectKey.startsWith(prefix) &&
    /^[a-f0-9-]{36}\.webp$/.test(asset.objectKey.slice(prefix.length))
    ? asset.objectKey
    : null;
}

const detailSelect = {
  ...summarySelect,
  conditionNotes: true,
  media: {
    orderBy: { position: "asc" as const },
    select: {
      id: true,
      position: true,
      alt: true,
      asset: { select: previewAssetSelect },
    },
  },
  variant: {
    select: {
      ...variantSelect,
      sources: {
        where: { reviewedAt: { not: null } },
        orderBy: [
          { fieldName: "asc" as const },
          { reviewedAt: "desc" as const },
        ],
        select: {
          fieldName: true,
          valueText: true,
          sourceUrl: true,
          sourceKind: true,
          effectiveAt: true,
          reviewedAt: true,
        },
      },
    },
  },
};

interface SummaryRow {
  id: string;
  slug: string;
  year: number | null;
  odometerKm: number | null;
  city: string | null;
  askingPricePaise: bigint | null;
  ownershipCount: number | null;
  isDemo: boolean;
  publishedAt: Date | null;
  _count: { media: number };
  variant:
    | (VariantRow & {
        model: {
          slug: string;
          name: string;
          vehicleType: PublicListingSummary["vehicle"]["model"]["vehicleType"];
          brand: { slug: string; name: string };
        };
      })
    | null;
}

interface DetailRow extends SummaryRow {
  conditionNotes: string | null;
  media: {
    id: string;
    position: number;
    alt: string;
    asset: Parameters<typeof previewKey>[0];
  }[];
  variant:
    | (NonNullable<SummaryRow["variant"]> & {
        sources: SourceRow[];
      })
    | null;
}

export function toPublicListingSummary(row: SummaryRow): PublicListingSummary {
  const v = row.variant!;
  return {
    id: row.id,
    slug: row.slug,
    year: row.year!,
    odometerKm: row.odometerKm!,
    city: row.city!,
    askingPricePaise: row.askingPricePaise!.toString(),
    ownershipCount: row.ownershipCount!,
    isDemo: row.isDemo,
    publishedAt: row.publishedAt!.toISOString(),
    sellerType: "INDIVIDUAL_OWNER",
    photoCount: row._count.media,
    vehicle: {
      brand: v.model.brand,
      model: {
        slug: v.model.slug,
        name: v.model.name,
        vehicleType: v.model.vehicleType,
      },
      variant: {
        id: v.id,
        slug: v.slug,
        name: v.name,
        specs: toSpecs(v),
      },
    },
  };
}

export function toPublicListingDetail(
  row: DetailRow,
  previews: boolean,
): PublicListingDetail {
  return {
    ...toPublicListingSummary(row),
    conditionNotes: row.conditionNotes!,
    media: row.media.map(({ id, position, alt, asset }) => ({
      id,
      position,
      alt,
      ...(previews && row.isDemo && previewKey(asset)
        ? { previewPath: publicListingPreviewPath(row.slug, id) }
        : {}),
    })),
    sources: toSources(row.variant!.sources),
  };
}

function orderByFor(sort: PublicListingSort) {
  switch (sort) {
    case "PRICE_ASC":
      return [{ askingPricePaise: "asc" as const }, { id: "asc" as const }];
    case "PRICE_DESC":
      return [{ askingPricePaise: "desc" as const }, { id: "asc" as const }];
    case "YEAR_DESC":
      return [{ year: "desc" as const }, { id: "asc" as const }];
    case "ODOMETER_ASC":
      return [{ odometerKm: "asc" as const }, { id: "asc" as const }];
  }
}

function keysetWhere(after: ListingCursor) {
  switch (after.s) {
    case "PRICE_ASC": {
      const price = BigInt(after.p);
      return {
        OR: [
          { askingPricePaise: { gt: price } },
          { askingPricePaise: price, id: { gt: after.i } },
        ],
      };
    }
    case "PRICE_DESC": {
      const price = BigInt(after.p);
      return {
        OR: [
          { askingPricePaise: { lt: price } },
          { askingPricePaise: price, id: { gt: after.i } },
        ],
      };
    }
    case "YEAR_DESC":
      return {
        OR: [{ year: { lt: after.y } }, { year: after.y, id: { gt: after.i } }],
      };
    case "ODOMETER_ASC":
      return {
        OR: [
          { odometerKm: { gt: after.k } },
          { odometerKm: after.k, id: { gt: after.i } },
        ],
      };
  }
}

export function cursorFromRow(
  sort: PublicListingSort,
  row: SummaryRow,
): ListingCursor {
  switch (sort) {
    case "PRICE_ASC":
    case "PRICE_DESC":
      return {
        s: sort,
        p: row.askingPricePaise!.toString(),
        i: row.id,
      };
    case "YEAR_DESC":
      return { s: "YEAR_DESC", y: row.year!, i: row.id };
    case "ODOMETER_ASC":
      return { s: "ODOMETER_ASC", k: row.odometerKm!, i: row.id };
  }
}

@Injectable()
export class PublicListingRepository {
  private readonly includeDemo: boolean;
  readonly previewsEnabled: boolean;

  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    @Inject(API_CONFIG) config: ApiConfig,
  ) {
    this.includeDemo = config.NODE_ENV !== "production";
    this.previewsEnabled =
      this.includeDemo &&
      config.media.mode === "r2-local" &&
      config.media.listingPreviews;
  }

  private get visibleCatalogue() {
    return {
      status: "PUBLISHED" as const,
      ...(this.includeDemo ? {} : { isDemo: false }),
    };
  }

  private activeSeller(now: Date) {
    return {
      status: "ACTIVE" as const,
      roles: {
        some: {
          active: true,
          scopeType: "GLOBAL" as const,
          scopeId: null,
          role: { in: ["USER" as const, "ADMIN" as const] },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      },
    };
  }

  listListings(filter: PublicListingListQuery, after?: ListingCursor) {
    const now = new Date();
    return this.db.listing.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
        ...(this.includeDemo ? {} : { isDemo: false }),
        seller: this.activeSeller(now),
        variant: {
          ...this.visibleCatalogue,
          model: {
            ...this.visibleCatalogue,
            ...(filter.vehicleType ? { vehicleType: filter.vehicleType } : {}),
            ...(filter.modelSlug ? { slug: filter.modelSlug } : {}),
            brand: {
              ...this.visibleCatalogue,
              ...(filter.brandSlug ? { slug: filter.brandSlug } : {}),
            },
          },
        },
        ...(filter.city
          ? {
              city: {
                equals: filter.city.trim(),
                mode: "insensitive" as const,
              },
            }
          : {}),
        ...(filter.minPricePaise !== undefined ||
        filter.maxPricePaise !== undefined
          ? {
              askingPricePaise: {
                ...(filter.minPricePaise !== undefined
                  ? { gte: BigInt(filter.minPricePaise) }
                  : {}),
                ...(filter.maxPricePaise !== undefined
                  ? { lte: BigInt(filter.maxPricePaise) }
                  : {}),
              },
            }
          : {}),
        ...(filter.minYear !== undefined || filter.maxYear !== undefined
          ? {
              year: {
                ...(filter.minYear !== undefined
                  ? { gte: filter.minYear }
                  : {}),
                ...(filter.maxYear !== undefined
                  ? { lte: filter.maxYear }
                  : {}),
              },
            }
          : {}),
        ...(filter.maxOdometerKm !== undefined
          ? { odometerKm: { lte: filter.maxOdometerKm } }
          : {}),
        ...(after ? keysetWhere(after) : {}),
      },
      orderBy: orderByFor(filter.sort),
      take: filter.limit + 1,
      select: summarySelect,
    });
  }

  private visibleListing(slug: string) {
    return {
      slug,
      status: "PUBLISHED" as const,
      publishedAt: { not: null },
      ...(this.includeDemo ? {} : { isDemo: false }),
      seller: this.activeSeller(new Date()),
      variant: {
        ...this.visibleCatalogue,
        model: {
          ...this.visibleCatalogue,
          brand: this.visibleCatalogue,
        },
      },
    };
  }

  findListingBySlug(slug: string) {
    return this.db.listing.findFirst({
      where: this.visibleListing(slug),
      select: detailSelect,
    });
  }

  async findPreviewKey(slug: string, photoId: string) {
    if (!this.previewsEnabled) return null;

    const photo = await this.db.listingMedia.findFirst({
      where: {
        id: photoId,
        listing: { ...this.visibleListing(slug), isDemo: true },
      },
      select: { asset: { select: previewAssetSelect } },
    });
    return photo ? previewKey(photo.asset) : null;
  }
}
