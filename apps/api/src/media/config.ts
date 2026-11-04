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
    z.object({ MEDIA_MODE: z.literal("disabled") }),
    z.object({
      MEDIA_MODE: z.literal("r2-local"),
      NODE_ENV: z.enum(["development", "test"]),
      API_HOST: z.enum(["127.0.0.1", "localhost", "::1"]),
      AUTH_MODE: z.literal("clerk-local"),
      MEDIA_ENDPOINT: endpoint,
      MEDIA_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
      MEDIA_ACCESS_KEY_ID: z.string().min(1).max(128),
      MEDIA_SECRET_ACCESS_KEY: z.string().min(1).max(256),
    }),
  ])
  .transform((value) =>
    value.MEDIA_MODE === "disabled"
      ? { mode: "disabled" as const }
      : {
          mode: "r2-local" as const,
          endpoint: value.MEDIA_ENDPOINT,
          bucket: value.MEDIA_BUCKET,
          accessKeyId: value.MEDIA_ACCESS_KEY_ID,
          secretAccessKey: value.MEDIA_SECRET_ACCESS_KEY,
        },
  );
export type MediaConfig = z.infer<typeof mediaEnvSchema>;
