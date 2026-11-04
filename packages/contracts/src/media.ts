import { z } from "zod";
import { component } from "./registry.js";
import { dataEnvelope } from "./common.js";

export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
export const MediaUploadRequest = component(
  "MediaUploadRequest",
  z.strictObject({
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().min(1).max(MAX_MEDIA_BYTES),
  }),
);
export type MediaUploadRequest = z.infer<typeof MediaUploadRequest>;
export const MediaPathParams = z.strictObject({ id: z.uuid() });
export const MediaCompleteRequest = component(
  "MediaCompleteRequest",
  z.strictObject({}),
);
export const MediaUploadResponse = dataEnvelope(
  "MediaUploadResponse",
  z.strictObject({
    id: z.uuid(),
    uploadUrl: z.url(),
    expiresAt: z.iso.datetime(),
    headers: z.strictObject({
      "Content-Type": z.enum(["image/jpeg", "image/png", "image/webp"]),
    }),
  }),
);
export const MediaCompleteResponse = dataEnvelope(
  "MediaCompleteResponse",
  z.strictObject({
    id: z.uuid(),
    status: z.literal("READY"),
  }),
);
export const MediaReadResponse = dataEnvelope(
  "MediaReadResponse",
  z.strictObject({
    readUrl: z.url(),
    expiresInSeconds: z.literal(60),
  }),
);
