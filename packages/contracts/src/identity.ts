import { z } from "zod";
import { dataEnvelope } from "./common.js";

export const SessionResponse = dataEnvelope(
  "SessionResponse",
  z.strictObject({ authenticated: z.literal(true) }),
);
export type SessionResponse = z.infer<typeof SessionResponse>;

export const AccessPathParams = z.strictObject({
  scope: z.enum(["account", "dealer"]),
  scopeId: z.uuid(),
});
export const AccessResponse = dataEnvelope(
  "AccessResponse",
  z.strictObject({ authorized: z.literal(true) }),
);
export type AccessResponse = z.infer<typeof AccessResponse>;
