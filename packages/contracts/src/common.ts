import { z } from "zod";
import { component } from "./registry.js";

/** API_CONTRACT.md: every response carries the request id in `meta`. */
export const Meta = component(
  "Meta",
  z.strictObject({ requestId: z.uuid() }),
  "Per-response metadata. requestId equals the X-Request-ID header.",
);

export const ErrorCode = component(
  "ErrorCode",
  z.enum([
    "BAD_REQUEST",
    "UNAUTHENTICATED",
    "FORBIDDEN",
    "NOT_FOUND",
    "METHOD_NOT_ALLOWED",
    "CONFLICT",
    "VALIDATION_ERROR",
    "RATE_LIMITED",
    "SERVICE_UNAVAILABLE",
    "INTERNAL_ERROR",
    "ERROR",
  ]),
);

export const ErrorEnvelope = component(
  "ErrorEnvelope",
  z.strictObject({
    error: z.strictObject({
      code: ErrorCode,
      message: z.string(),
      fields: z.record(z.string(), z.string()).optional(),
    }),
    meta: Meta,
  }),
  "Every non-2xx response. 5xx messages are generic by design.",
);
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

/** Builds and registers `{ data: T, meta }` under the given component id. */
export function dataEnvelope<T extends z.ZodType>(id: string, data: T) {
  return component(id, z.strictObject({ data, meta: Meta }));
}
