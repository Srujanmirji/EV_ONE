import { z } from "zod";

const endpoint = z.url().refine((value) => {
  try {
    const url = new URL(value);
    return (
      value === url.origin &&
      ((url.protocol === "https:" &&
        /^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(url.hostname)) ||
        (url.protocol === "http:" &&
          ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
});

export const mediaEnvSchema = z
  .discriminatedUnion("MEDIA_MODE", [
    z.object({
      MEDIA_MODE: z.literal("disabled"),
      LOCAL_LISTING_PREVIEWS: z.literal("false").default("false"),
    }),
    z.object({
      MEDIA_MODE: z.literal("r2-local"),
      NODE_ENV: z.enum(["development", "test"]),
      API_HOST: z.enum(["127.0.0.1", "localhost", "::1"]),
      AUTH_MODE: z.literal("clerk-local"),
      MEDIA_ENDPOINT: endpoint,
      LOCAL_LISTING_PREVIEWS: z.enum(["false", "true"]).default("false"),
      MEDIA_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
      MEDIA_ACCESS_KEY_ID: z.string().min(1).max(128),
      MEDIA_SECRET_ACCESS_KEY: z.string().min(1).max(256),
    }),
  ])
  .refine(
    (value) =>
      value.LOCAL_LISTING_PREVIEWS !== "true" ||
      (value.MEDIA_MODE === "r2-local" &&
        value.MEDIA_ENDPOINT.startsWith("http://")),
    { path: ["LOCAL_LISTING_PREVIEWS"] },
  )
  .transform((value) =>
    value.MEDIA_MODE === "disabled"
      ? { mode: "disabled" as const }
      : {
          mode: "r2-local" as const,
          endpoint: value.MEDIA_ENDPOINT,
          listingPreviews: value.LOCAL_LISTING_PREVIEWS === "true",
          bucket: value.MEDIA_BUCKET,
          accessKeyId: value.MEDIA_ACCESS_KEY_ID,
          secretAccessKey: value.MEDIA_SECRET_ACCESS_KEY,
        },
  );
export type MediaConfig = z.infer<typeof mediaEnvSchema>;
