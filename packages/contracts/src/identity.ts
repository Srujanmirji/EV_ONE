import { z } from "zod";
import { dataEnvelope } from "./common.js";

export const SessionResponse = dataEnvelope(
  "SessionResponse",
  z.strictObject({ authenticated: z.literal(true) }),
);
export type SessionResponse = z.infer<typeof SessionResponse>;
