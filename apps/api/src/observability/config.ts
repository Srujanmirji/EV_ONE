import { z } from "zod";

export const sentryDsn = z.string().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    (url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))) &&
    /^[a-zA-Z0-9]+$/.test(url.username) &&
    !url.password &&
    !url.search &&
    !url.hash &&
    /^\/(?:[a-zA-Z0-9_-]+\/)*\d+$/.test(url.pathname)
  );
}, "must be an HTTPS Sentry DSN (HTTP allowed only on loopback)");

export const telemetryConfigSchema = z.object({
  SENTRY_DSN: sentryDsn.optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});
