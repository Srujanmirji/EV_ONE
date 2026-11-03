import type { z } from "zod";
import {
  BrandListResponse,
  ModelDetailResponse,
  ModelListQuery,
  ModelListResponse,
  ModelPathParams,
  VariantDetailResponse,
  VariantPathParams,
} from "./catalogue.js";
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
];

/** Shared by every route: unknown paths and unexpected failures. */
export const defaultErrorResponse: RouteResponse = {
  description: "Error in the contract error envelope.",
  schema: ErrorEnvelope,
};
