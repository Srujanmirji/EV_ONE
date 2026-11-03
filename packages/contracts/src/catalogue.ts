import { z } from "zod";
import { Meta, dataEnvelope } from "./common.js";
import { component } from "./registry.js";

// Mirrors the database enums (packages/db, EV-021).
export const VehicleType = component(
  "VehicleType",
  z.enum(["SCOOTER", "MOTORCYCLE", "CAR", "THREE_WHEELER"]),
);
export const ModelAvailability = component(
  "ModelAvailability",
  z.enum(["ON_SALE", "UPCOMING", "DISCONTINUED", "UNKNOWN"]),
);
export const RangeStandard = component(
  "RangeStandard",
  z.enum(["MIDC", "IDC", "WLTP", "NEDC", "EPA", "OEM_UNSPECIFIED"]),
  "Test cycle. Ranges from different standards are not comparable.",
);
export const SpecField = component(
  "SpecField",
  z.enum([
    "BATTERY_KWH",
    "CLAIMED_RANGE",
    "MOTOR_KW",
    "CHARGING_AC_KW",
    "CHARGING_DC_KW",
    "WARRANTY",
  ]),
);
export const SourceKind = component(
  "SourceKind",
  z.enum(["OEM", "REGULATOR", "PRESS", "DEALER", "OTHER"]),
);

/** Range is only ever exposed together with its test standard. */
export const ClaimedRange = component(
  "ClaimedRange",
  z.strictObject({ km: z.int().positive(), standard: RangeStandard }),
);

export const VariantSpecs = component(
  "VariantSpecs",
  z.strictObject({
    batteryKwh: z.number().positive().nullable(),
    claimedRange: ClaimedRange.nullable(),
    motorKw: z.number().positive().nullable(),
    chargingAcKw: z.number().positive().nullable(),
    chargingDcKw: z.number().positive().nullable(),
    warrantyText: z.string().nullable(),
  }),
  "null means unknown, never zero. Every non-null value has a reviewed source.",
);

export const SpecSourceView = component(
  "SpecSourceView",
  z.strictObject({
    fieldName: SpecField,
    valueText: z.string(),
    sourceUrl: z.url({ protocol: /^https$/ }),
    sourceKind: SourceKind,
    effectiveAt: z.iso.date().nullable(),
    reviewedAt: z.iso.datetime(),
  }),
);

export const BrandRef = component(
  "BrandRef",
  z.strictObject({ slug: z.string(), name: z.string() }),
);

export const BrandSummary = component(
  "BrandSummary",
  z.strictObject({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    isDemo: z.boolean(),
    vehicleTypes: z.array(VehicleType),
  }),
  "A published brand with at least one published model.",
);

export const NumberRange = component(
  "NumberRange",
  z.strictObject({ min: z.number().positive(), max: z.number().positive() }),
);

export const RangeByStandard = component(
  "RangeByStandard",
  z.strictObject({
    standard: RangeStandard,
    minKm: z.int().positive(),
    maxKm: z.int().positive(),
  }),
  "Claimed range across variants, never merged across test standards.",
);

export const SpecSummary = component(
  "SpecSummary",
  z.strictObject({
    variantCount: z.int().nonnegative(),
    batteryKwh: NumberRange.nullable(),
    claimedRanges: z.array(RangeByStandard),
    reviewedSourceCount: z.int().nonnegative(),
    lastReviewedAt: z.iso.datetime().nullable(),
  }),
  "Across the model's published variants. Every stated figure has a reviewed source.",
);

export const ModelSummary = component(
  "ModelSummary",
  z.strictObject({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    vehicleType: VehicleType,
    availability: ModelAvailability,
    releaseDate: z.iso.date().nullable(),
    isDemo: z.boolean(),
    brand: BrandRef,
    specSummary: SpecSummary,
  }),
);

export const VariantSummary = component(
  "VariantSummary",
  z.strictObject({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    isDemo: z.boolean(),
    specs: VariantSpecs,
  }),
);

export const ModelDetail = component(
  "ModelDetail",
  z.strictObject({
    ...ModelSummary.shape,
    variants: z.array(VariantSummary),
  }),
);

export const VariantDetail = component(
  "VariantDetail",
  z.strictObject({
    ...VariantSummary.shape,
    model: z.strictObject({
      slug: z.string(),
      name: z.string(),
      vehicleType: VehicleType,
      brand: BrandRef,
    }),
    sources: z.array(SpecSourceView),
  }),
);

export const PageInfo = component(
  "PageInfo",
  z.strictObject({ nextCursor: z.string().nullable(), hasMore: z.boolean() }),
);

export const BrandListResponse = dataEnvelope(
  "BrandListResponse",
  z.array(BrandSummary),
);
export const ModelDetailResponse = dataEnvelope(
  "ModelDetailResponse",
  ModelDetail,
);
export const VariantDetailResponse = dataEnvelope(
  "VariantDetailResponse",
  VariantDetail,
);
export const ModelListResponse = component(
  "ModelListResponse",
  z.strictObject({ data: z.array(ModelSummary), page: PageInfo, meta: Meta }),
);

// Request parameters. Query values arrive as strings.
export const ModelListQuery = z.strictObject({
  brandId: z.uuid().optional(),
  vehicleType: VehicleType.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(512).optional(),
});
export const ModelPathParams = z.strictObject({
  brandSlug: z.string().max(100),
  modelSlug: z.string().max(100),
});
export const VariantPathParams = z.strictObject({ id: z.uuid() });

export type BrandSummary = z.infer<typeof BrandSummary>;
export type ModelSummary = z.infer<typeof ModelSummary>;
export type SpecSummary = z.infer<typeof SpecSummary>;
export type ModelDetail = z.infer<typeof ModelDetail>;
export type VariantSummary = z.infer<typeof VariantSummary>;
export type VariantDetail = z.infer<typeof VariantDetail>;
export type VariantSpecs = z.infer<typeof VariantSpecs>;
export type SpecSourceView = z.infer<typeof SpecSourceView>;
export type ModelListQuery = z.infer<typeof ModelListQuery>;
export type ModelListResponse = z.infer<typeof ModelListResponse>;
export type BrandListResponse = z.infer<typeof BrandListResponse>;
export type ModelDetailResponse = z.infer<typeof ModelDetailResponse>;
export type VariantDetailResponse = z.infer<typeof VariantDetailResponse>;
