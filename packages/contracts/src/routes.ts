import {
  ListingCreateRequest,
  ListingSaveRequest,
  ListingSubmitRequest,
  ListingAttachRequest,
  ListingPhotoEditRequest,
  ListingPhotoDeleteRequest,
  ListingParams,
  ListingPhotoParams,
  SellerListQuery,
  SellerListingResponse,
  SellerListingListResponse,
} from "./listings.js";
import {
  CatalogueDraftCreate,
  CatalogueDraftSave,
  CatalogueDraftSubmit,
  CatalogueDraftReview,
  CatalogueDraftParams,
  CatalogueDraftQuery,
  CatalogueDraftResponse,
  CatalogueDraftListResponse,
} from "./catalogue-editor.js";
import {
  MediaUploadRequest,
  MediaUploadResponse,
  MediaCompleteRequest,
  MediaCompleteResponse,
  MediaReadResponse,
  MediaPathParams,
} from "./media.js";
import type { z } from "zod";
import {
  BrandListResponse,
  CompareQuery,
  CompareResponse,
  ModelDetailResponse,
  ModelListQuery,
  ModelListResponse,
  ModelPathParams,
  VariantDetailResponse,
  VariantPathParams,
} from "./catalogue.js";
import {
  AccessPathParams,
  AccessResponse,
  SessionResponse,
} from "./identity.js";
import { SavingsRequest, SavingsResponse } from "./savings.js";
import { ErrorEnvelope } from "./common.js";
import { LiveResponse, ReadinessResponse } from "./health.js";

export interface RouteResponse {
  description: string;
  schema: z.ZodType;
}

export interface RouteContract {
  operationId: string;
  method: "get" | "post" | "put" | "patch" | "delete";
  /** Path below the API base `/api/v1`, OpenAPI style (`/things/{id}`). */
  path: string;
  summary: string;
  tag: string;
  /** Validated query string; each property becomes an OpenAPI parameter. */
  query?: z.ZodObject;
  /** Validated path parameters, named as in `path`. */
  params?: z.ZodObject;
  /** Validated JSON request body. */
  body?: z.ZodObject;
  bearerAuth?: true;
  responses: Record<number, RouteResponse>;
}

const badRequest: RouteResponse = {
  description: "Invalid parameters (VALIDATION_ERROR).",
  schema: ErrorEnvelope,
};
const notFound: RouteResponse = {
  description: "Not found or not published.",
  schema: ErrorEnvelope,
};

/**
 * Every implemented endpoint. The API's contract test fails if a route is
 * served but missing here, or listed here but not served.
 */
export const routes: RouteContract[] = [
  ...[
    {
      operationId: "listOwnListings",
      method: "get" as const,
      path: "/seller/listings",
      query: SellerListQuery,
      schema: SellerListingListResponse,
    },
    {
      operationId: "createListingDraft",
      method: "post" as const,
      path: "/listings",
      body: ListingCreateRequest,
      schema: SellerListingResponse,
    },
    {
      operationId: "getOwnListing",
      method: "get" as const,
      path: "/listings/{id}",
      params: ListingParams,
      schema: SellerListingResponse,
    },
    {
      operationId: "saveListingDraft",
      method: "patch" as const,
      path: "/listings/{id}",
      params: ListingParams,
      body: ListingSaveRequest,
      schema: SellerListingResponse,
    },
    {
      operationId: "submitListingDraft",
      method: "post" as const,
      path: "/listings/{id}/submit",
      params: ListingParams,
      body: ListingSubmitRequest,
      schema: SellerListingResponse,
    },
    {
      operationId: "attachListingPhoto",
      method: "post" as const,
      path: "/listings/{id}/media",
      params: ListingParams,
      body: ListingAttachRequest,
      schema: SellerListingResponse,
    },
    {
      operationId: "editListingPhoto",
      method: "patch" as const,
      path: "/listings/{id}/media/{photoId}",
      params: ListingPhotoParams,
      body: ListingPhotoEditRequest,
      schema: SellerListingResponse,
    },
    {
      operationId: "removeListingPhoto",
      method: "delete" as const,
      path: "/listings/{id}/media/{photoId}",
      params: ListingPhotoParams,
      body: ListingPhotoDeleteRequest,
      schema: SellerListingResponse,
    },
  ].map(({ schema, ...route }): RouteContract => {
    const responses: Record<number, RouteResponse> = {
      200: { description: "Private seller operation succeeded.", schema },
      400: badRequest,
      401: { description: "Authentication required.", schema: ErrorEnvelope },
      403: {
        description: "Active individual seller permission required.",
        schema: ErrorEnvelope,
      },
      503: {
        description: "Database/audit unavailable.",
        schema: ErrorEnvelope,
      },
    };
    if (route.params) responses[404] = notFound;
    if (route.params && route.body)
      responses[409] = {
        description: "Stale revision, frozen state or reference conflict.",
        schema: ErrorEnvelope,
      };
    return {
      ...route,
      summary:
        "Local-only owner listing draft workflow; no public listing reads.",
      tag: "seller-listings",
      bearerAuth: true,
      responses,
    };
  }),

  ...[
    {
      operationId: "listCatalogueDrafts",
      method: "get" as const,
      path: "/admin/catalogue/drafts",
      query: CatalogueDraftQuery,
      schema: CatalogueDraftListResponse,
    },
    {
      operationId: "createCatalogueDraft",
      method: "post" as const,
      path: "/admin/catalogue/drafts",
      body: CatalogueDraftCreate,
      schema: CatalogueDraftResponse,
    },
    {
      operationId: "getCatalogueDraft",
      method: "get" as const,
      path: "/admin/catalogue/drafts/{id}",
      params: CatalogueDraftParams,
      schema: CatalogueDraftResponse,
    },
    {
      operationId: "saveCatalogueDraft",
      method: "patch" as const,
      path: "/admin/catalogue/drafts/{id}",
      params: CatalogueDraftParams,
      body: CatalogueDraftSave,
      schema: CatalogueDraftResponse,
    },
    {
      operationId: "submitCatalogueDraft",
      method: "post" as const,
      path: "/admin/catalogue/drafts/{id}/submit",
      params: CatalogueDraftParams,
      body: CatalogueDraftSubmit,
      schema: CatalogueDraftResponse,
    },
    {
      operationId: "reviewCatalogueDraft",
      method: "post" as const,
      path: "/admin/catalogue/drafts/{id}/review",
      params: CatalogueDraftParams,
      body: CatalogueDraftReview,
      schema: CatalogueDraftResponse,
    },
  ].map(({ schema, ...route }): RouteContract => {
    const responses: Record<number, RouteResponse> = {
      200: { description: "Local catalogue operation succeeded.", schema },
      400: badRequest,
      401: { description: "Authentication required.", schema: ErrorEnvelope },
      403: {
        description: "Catalogue role or separate admin review required.",
        schema: ErrorEnvelope,
      },
      503: {
        description: "Database/audit unavailable.",
        schema: ErrorEnvelope,
      },
    };
    if (route.params) responses[404] = notFound;
    if (route.body && route.params)
      responses[409] = {
        description: "Revision, state or publication slug conflict.",
        schema: ErrorEnvelope,
      };
    return {
      ...route,
      summary: "Local-only catalogue draft/review workflow.",
      tag: "catalogue-editor",
      bearerAuth: true,
      responses,
    };
  }),

  ...[
    {
      operationId: "presignMediaUpload",
      method: "post" as const,
      path: "/media/presign",
      body: MediaUploadRequest,
      schema: MediaUploadResponse,
    },
    {
      operationId: "completeMediaUpload",
      method: "post" as const,
      path: "/media/{id}/complete",
      body: MediaCompleteRequest,
      params: MediaPathParams,
      schema: MediaCompleteResponse,
    },
    {
      operationId: "getMediaReadUrl",
      method: "get" as const,
      path: "/media/{id}/read-url",
      params: MediaPathParams,
      schema: MediaReadResponse,
    },
  ].map(({ schema, ...route }): RouteContract => {
    const responses: Record<number, RouteResponse> = {
      200: { description: "Private media operation succeeded.", schema },
      400: badRequest,
      401: { description: "Authentication required.", schema: ErrorEnvelope },
      403: {
        description: "Active personal upload grant required.",
        schema: ErrorEnvelope,
      },
      503: {
        description: "Media disabled or dependency unavailable.",
        schema: ErrorEnvelope,
      },
    };
    if (route.params) responses[404] = notFound;
    return {
      ...route,
      tag: "media",
      summary: "Local-only private media; production disabled.",
      bearerAuth: true,
      responses,
    };
  }),

  {
    operationId: "checkResourceAccess",
    method: "get",
    path: "/auth/access/{scope}/{scopeId}",
    tag: "identity",
    summary:
      "Local-only scoped authorization probe; no business permissions are granted.",
    params: AccessPathParams,
    bearerAuth: true,
    responses: {
      200: {
        description: "Authorized for this exact scope.",
        schema: AccessResponse,
      },
      400: badRequest,
      401: {
        description: "Missing or invalid authentication.",
        schema: ErrorEnvelope,
      },
      403: {
        description:
          "Unknown/suspended actor, missing grant or scope mismatch.",
        schema: ErrorEnvelope,
      },
    },
  },
  {
    operationId: "getAuthSession",
    method: "get",
    path: "/auth/session",
    tag: "identity",
    summary:
      "Local-only authenticated session probe; production auth remains disabled.",
    bearerAuth: true,
    responses: {
      200: {
        description: "Bearer verified; no profile or permissions granted.",
        schema: SessionResponse,
      },
      401: {
        description:
          "Authentication disabled, missing or invalid bearer token.",
        schema: ErrorEnvelope,
      },
    },
  },
  {
    operationId: "calculateEvSavings",
    method: "post",
    path: "/calculators/ev-savings",
    summary:
      "Energy-only savings estimate, exact arithmetic with final paise rounding.",
    tag: "calculators",
    body: SavingsRequest,
    responses: {
      200: {
        description: "Costs, savings and optional simple payback estimate.",
        schema: SavingsResponse,
      },
      400: badRequest,
    },
  },
  {
    operationId: "getLiveness",
    method: "get",
    path: "/health/live",
    summary:
      "Liveness probe. The process answers; no dependencies are checked.",
    tag: "health",
    responses: {
      200: { description: "Process is alive.", schema: LiveResponse },
    },
  },
  {
    operationId: "getReadiness",
    method: "get",
    path: "/health/ready",
    summary:
      "Readiness probe. 200 only when every dependency is up and the API is not shutting down.",
    tag: "health",
    responses: {
      200: {
        description: "Ready to serve traffic.",
        schema: ReadinessResponse,
      },
      503: {
        description: "A dependency is down or shutdown has begun.",
        schema: ReadinessResponse,
      },
    },
  },
  {
    operationId: "listBrands",
    method: "get",
    path: "/brands",
    summary:
      "Published brands that have at least one published model, with their vehicle types.",
    tag: "catalogue",
    responses: {
      200: {
        description: "Brands ordered by name.",
        schema: BrandListResponse,
      },
    },
  },
  {
    operationId: "listModels",
    method: "get",
    path: "/models",
    summary: "Published models, ordered by name then id, cursor-paginated.",
    tag: "catalogue",
    query: ModelListQuery,
    responses: {
      200: { description: "A page of models.", schema: ModelListResponse },
      400: badRequest,
    },
  },
  {
    operationId: "getModel",
    method: "get",
    path: "/brands/{brandSlug}/models/{modelSlug}",
    summary:
      "A published model with its published variants. Model slugs are unique per brand.",
    tag: "catalogue",
    params: ModelPathParams,
    responses: {
      200: { description: "Model with variants.", schema: ModelDetailResponse },
      404: notFound,
    },
  },
  {
    operationId: "getVariant",
    method: "get",
    path: "/variants/{id}",
    summary:
      "A published variant's specs with the reviewed source behind each stated value.",
    tag: "catalogue",
    params: VariantPathParams,
    responses: {
      200: {
        description: "Variant with provenance.",
        schema: VariantDetailResponse,
      },
      400: badRequest,
      404: notFound,
    },
  },
  {
    operationId: "compareVariants",
    method: "get",
    path: "/compare",
    summary:
      "2–3 published variants with specs and reviewed sources, in the requested order. 404 if any is not published.",
    tag: "catalogue",
    query: CompareQuery,
    responses: {
      200: {
        description: "Variants in requested order.",
        schema: CompareResponse,
      },
      400: badRequest,
      404: notFound,
    },
  },
];

/** Shared by every route: unknown paths and unexpected failures. */
export const defaultErrorResponse: RouteResponse = {
  description: "Error in the contract error envelope.",
  schema: ErrorEnvelope,
};
