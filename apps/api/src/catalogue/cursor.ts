import { z } from "zod";
import { RequestValidationError } from "../common/validation.js";

/**
 * Opaque keyset cursor for models ordered by (name, id). Text and UUID
 * compare exactly, unlike timestamps, whose microseconds a JS Date drops.
 */
const Payload = z.strictObject({ n: z.string(), i: z.uuid() });
export type ModelCursor = z.infer<typeof Payload>;

export function encodeCursor(cursor: ModelCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(raw: string): ModelCursor {
  try {
    return Payload.parse(
      JSON.parse(Buffer.from(raw, "base64url").toString("utf8")),
    );
  } catch {
    throw new RequestValidationError({ cursor: "Invalid or expired cursor" });
  }
}
