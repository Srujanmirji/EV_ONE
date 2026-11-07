import { z } from "zod";
import { component } from "./registry.js";
import { dataEnvelope } from "./common.js";
import { VehicleType } from "./catalogue.js";

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
