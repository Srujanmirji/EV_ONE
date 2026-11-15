import type {
  PublicListingListQuery,
  PublicListingSort,
} from "@evone/contracts";
import { z } from "zod";
import { RequestValidationError } from "../common/validation.js";

const paise = z
  .string()
  .regex(/^[1-9]\d{0,18}$/)
  .refine(
    (value) =>
      /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n,
  );

const CursorPayload = z.discriminatedUnion("s", [
  z.strictObject({
    s: z.enum(["PRICE_ASC", "PRICE_DESC"]),
    p: paise,
    i: z.uuid(),
  }),
  z.strictObject({
    s: z.literal("YEAR_DESC"),
    y: z.int().min(1900).max(2100),
    i: z.uuid(),
  }),
  z.strictObject({
    s: z.literal("ODOMETER_ASC"),
    k: z.int().min(0).max(2147483647),
    i: z.uuid(),
  }),
]);
export type ListingCursor = z.infer<typeof CursorPayload>;

export function encodeListingCursor(cursor: ListingCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeListingCursor(
  raw: string,
  expectedSort: PublicListingSort,
): ListingCursor {
  try {
    const parsed = CursorPayload.parse(
      JSON.parse(Buffer.from(raw, "base64url").toString("utf8")),
    );
    if (parsed.s !== expectedSort) {
      throw new Error("sort mismatch");
    }
    return parsed;
  } catch {
    throw new RequestValidationError({ cursor: "Invalid or expired cursor" });
  }
}

export function validateListingRanges(query: PublicListingListQuery): void {
  const fields: Record<string, string> = {};
  if (
    query.minPricePaise !== undefined &&
    query.maxPricePaise !== undefined &&
    BigInt(query.minPricePaise) > BigInt(query.maxPricePaise)
  ) {
    fields.maxPricePaise = "Maximum price must be at least minimum price";
  }
  if (
    query.minYear !== undefined &&
    query.maxYear !== undefined &&
    query.minYear > query.maxYear
  ) {
    fields.maxYear = "Maximum year must be at least minimum year";
  }
  if (Object.keys(fields).length > 0) {
    throw new RequestValidationError(fields);
  }
}
