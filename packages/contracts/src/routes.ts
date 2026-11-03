import type { z } from "zod";
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
  responses: Record<number, RouteResponse>;
}

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
];

/** Shared by every route: unknown paths and unexpected failures. */
export const defaultErrorResponse: RouteResponse = {
  description: "Error in the contract error envelope.",
  schema: ErrorEnvelope,
};
