import { z } from "zod";
import { dataEnvelope } from "./common.js";
import { component } from "./registry.js";

export const LiveStatus = component(
  "LiveStatus",
  z.strictObject({ status: z.literal("ok") }),
);

export const ReadinessCheckResult = component(
  "ReadinessCheckResult",
  z.strictObject({
    name: z.string(),
    status: z.enum(["up", "down"]),
  }),
  "Dependency name and state only; failure reasons stay server-side.",
);

export const ReadinessReport = component(
  "ReadinessReport",
  z.strictObject({
    status: z.enum(["ready", "not_ready"]),
    checks: z.array(ReadinessCheckResult),
    draining: z.boolean(),
  }),
);

export const LiveResponse = dataEnvelope("LiveResponse", LiveStatus);
export const ReadinessResponse = dataEnvelope(
  "ReadinessResponse",
  ReadinessReport,
);

export type LiveResponse = z.infer<typeof LiveResponse>;
export type ReadinessReport = z.infer<typeof ReadinessReport>;
export type ReadinessResponse = z.infer<typeof ReadinessResponse>;
