import { z } from "zod";
import { component } from "./registry.js";
import { Meta, dataEnvelope } from "./common.js";
import {
  BrandRef,
  PageInfo,
  SpecSourceView,
  VariantSpecs,
  VehicleType,
} from "./catalogue.js";

const paise = z
  .string()
  .regex(/^[1-9]\d{0,18}$/)
  .refine(
    (value) =>
      /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n,
    "Price is too large",
  );
export const ListingFields = component(
  "ListingFields",
  z.strictObject({
    preferredVehicleType: VehicleType.nullable(),
    variantId: z.uuid().nullable(),
    year: z.int().min(1900).max(2100).nullable(),
    odometerKm: z.int().min(0).max(2147483647).nullable(),
    city: z.string().trim().min(1).max(120).nullable(),
    askingPricePaise: paise.nullable(),
    ownershipCount: z.int().min(1).max(50).nullable(),
    conditionNotes: z.string().trim().min(1).max(3000).nullable(),
  }),
);
export type ListingFields = z.infer<typeof ListingFields>;
export const ListingCreateRequest = component(
  "ListingCreateRequest",
  z.strictObject({}),
);
export const ListingSaveRequest = component(
  "ListingSaveRequest",
  z.strictObject({ version: z.int().positive(), fields: ListingFields }),
);
export const ListingSubmitRequest = component(
  "ListingSubmitRequest",
  z.strictObject({
    version: z.int().positive(),
    sellerDeclaration: z.literal(true),
  }),
);
export const ListingAttachRequest = component(
  "ListingAttachRequest",
  z.strictObject({
    version: z.int().positive(),
    mediaAssetId: z.uuid(),
    alt: z.string().trim().min(1).max(300),
  }),
);
export const ListingPhotoEditRequest = component(
  "ListingPhotoEditRequest",
  z.strictObject({
    version: z.int().positive(),
    alt: z.string().trim().min(1).max(300),
  }),
);
export const ListingPhotoDeleteRequest = component(
  "ListingPhotoDeleteRequest",
  z.strictObject({ version: z.int().positive() }),
);
export const ListingParams = z.strictObject({ id: z.uuid() });
export const ListingPhotoParams = z.strictObject({
  id: z.uuid(),
  photoId: z.uuid(),
});
export const SellerListQuery = z.strictObject({ cursor: z.uuid().optional() });
export const SellerListingStatus = component(
  "SellerListingStatus",
  z.enum([
    "DRAFT",
    "PENDING_REVIEW",
    "PUBLISHED",
    "REJECTED",
    "ARCHIVED",
    "SOLD",
  ]),
);
export const SellerListing = component(
  "SellerListing",
  z.strictObject({
    id: z.uuid(),
    slug: z.string(),
    version: z.int().positive(),
    status: SellerListingStatus,
    updatedAt: z.iso.datetime(),
    fields: ListingFields,
    canonical: z
      .strictObject({
        brand: z.string(),
        brandId: z.uuid(),
        brandSlug: z.string(),
        model: z.string(),
        modelId: z.uuid(),
        modelSlug: z.string(),
        variant: z.string(),
        vehicleType: VehicleType,
      })
      .nullable(),
    media: z
      .array(
        z.strictObject({
          id: z.uuid(),
          mediaAssetId: z.uuid(),
          position: z.int().min(0).max(11),
          alt: z.string(),
        }),
      )
      .max(12),
    reviewReason: z.string().nullable(),
  }),
);
export type SellerListing = z.infer<typeof SellerListing>;
export const SellerListingResponse = dataEnvelope(
  "SellerListingResponse",
  SellerListing,
);
export type SellerListingResponse = z.infer<typeof SellerListingResponse>;
export const SellerListingListResponse = dataEnvelope(
  "SellerListingListResponse",
  z.strictObject({
    items: z.array(
      z.strictObject({
        id: z.uuid(),
        status: SellerListingStatus,
        version: z.int().positive(),
        label: z.string().nullable(),
        updatedAt: z.iso.datetime(),
      }),
    ),
    nextCursor: z.uuid().nullable(),
  }),
);
export type SellerListingListResponse = z.infer<
  typeof SellerListingListResponse
>;

export const PublicListingSort = component(
  "PublicListingSort",
  z.enum(["PRICE_ASC", "PRICE_DESC", "YEAR_DESC", "ODOMETER_ASC"]),
);
export type PublicListingSort = z.infer<typeof PublicListingSort>;

export const PublicSellerType = component(
  "PublicSellerType",
  z.enum(["INDIVIDUAL_OWNER"]),
  "Asserted seller role only; never implies identity, dealer or battery verification.",
);
export type PublicSellerType = z.infer<typeof PublicSellerType>;

export const PublicListingVehicle = component(
  "PublicListingVehicle",
  z.strictObject({
    brand: BrandRef,
    model: z.strictObject({
      slug: z.string(),
      name: z.string(),
      vehicleType: VehicleType,
    }),
    variant: z.strictObject({
      id: z.uuid(),
      slug: z.string(),
      name: z.string(),
      specs: VariantSpecs,
    }),
  }),
);
export type PublicListingVehicle = z.infer<typeof PublicListingVehicle>;

export const PublicListingSummary = component(
  "PublicListingSummary",
  z.strictObject({
    id: z.uuid(),
    slug: z.string(),
    year: z.int().min(1900).max(2100),
    odometerKm: z.int().nonnegative(),
    city: z.string(),
    askingPricePaise: paise,
    ownershipCount: z.int().positive(),
    isDemo: z.boolean(),
    publishedAt: z.iso.datetime(),
    sellerType: PublicSellerType,
    photoCount: z.int().nonnegative(),
    vehicle: PublicListingVehicle,
  }),
);
export type PublicListingSummary = z.infer<typeof PublicListingSummary>;

export const PublicListingPhoto = component(
  "PublicListingPhoto",
  z.strictObject({
    id: z.uuid(),
    position: z.int().min(0).max(11),
    alt: z.string(),
  }),
  "Reviewed attachment metadata only; private storage keys and capability URLs are excluded.",
);
export type PublicListingPhoto = z.infer<typeof PublicListingPhoto>;

export const PublicListingDetail = component(
  "PublicListingDetail",
  z.strictObject({
    ...PublicListingSummary.shape,
    conditionNotes: z.string(),
    media: z.array(PublicListingPhoto).min(1).max(12),
    sources: z.array(SpecSourceView),
  }),
);
export type PublicListingDetail = z.infer<typeof PublicListingDetail>;

export const PublicListingListResponse = component(
  "PublicListingListResponse",
  z.strictObject({
    data: z.array(PublicListingSummary),
    page: PageInfo,
    meta: Meta,
  }),
);
export type PublicListingListResponse = z.infer<
  typeof PublicListingListResponse
>;

export const PublicListingDetailResponse = dataEnvelope(
  "PublicListingDetailResponse",
  PublicListingDetail,
);
export type PublicListingDetailResponse = z.infer<
  typeof PublicListingDetailResponse
>;

export const PublicListingPathParams = z.strictObject({
  slug: z
    .string()
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
export type PublicListingPathParams = z.infer<typeof PublicListingPathParams>;

export const PublicListingListQuery = z.strictObject({
  vehicleType: VehicleType.optional(),
  brandSlug: z
    .string()
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  modelSlug: z
    .string()
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  city: z.string().min(1).max(120).regex(/\S/).optional(),
  minPricePaise: paise.optional(),
  maxPricePaise: paise.optional(),
  minYear: z.coerce.number().int().min(1900).max(2100).optional(),
  maxYear: z.coerce.number().int().min(1900).max(2100).optional(),
  maxOdometerKm: z.coerce.number().int().min(0).max(2147483647).optional(),
  sort: PublicListingSort.default("PRICE_ASC"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(512).optional(),
});
export type PublicListingListQuery = z.infer<typeof PublicListingListQuery>;
