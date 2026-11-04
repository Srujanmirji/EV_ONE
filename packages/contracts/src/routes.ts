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
