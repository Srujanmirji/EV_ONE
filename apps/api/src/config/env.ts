import { mediaEnvSchema, type MediaConfig } from "../media/config.js";
import { z } from "zod";
import { authEnvSchema, type AuthConfig } from "../identity/config.js";
import { sentryDsn } from "../observability/config.js";
import { redisUrl } from "../queue/config.js";

const port = z.coerce.number().int().min(1).max(65535);

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_HOST: z.string().min(1).default("127.0.0.1"),
  API_PORT: port.default(4000),
  REDIS_URL: redisUrl,
  SENTRY_DSN: sentryDsn.optional(),
  /** PostgreSQL connection string. Contains a password: never log it. */
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\/\S+$/, "must be a postgres:// URL"),
  /** Upper bound for one readiness dependency check, in milliseconds. */
  API_READINESS_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(30000)
    .default(2000),
});

export type ApiConfig = z.infer<typeof envSchema> & {
  auth: AuthConfig;
  media: MediaConfig;
};

/**
 * Raised when startup configuration is invalid. The message names the
 * offending variables and the rule they broke, never their values, so it is
 * safe to print even when a secret is malformed.
 */
export class ConfigError extends Error {
  constructor(
    readonly invalidKeys: string[],
    details: string[],
  ) {
    super(
      `Invalid API configuration:\n${details.map((d) => `  - ${d}`).join("\n")}`,
    );
    this.name = "ConfigError";
  }
}

export function loadConfig(env: NodeJS.ProcessEnv): ApiConfig {
  const result = envSchema.safeParse(env);
  const auth = authEnvSchema.safeParse({
    ...env,
    AUTH_MODE: env.AUTH_MODE ?? "disabled",
    NODE_ENV: env.NODE_ENV ?? "development",
    API_HOST: env.API_HOST ?? "127.0.0.1",
  });
  const media = mediaEnvSchema.safeParse({
    ...env,
    MEDIA_MODE: env.MEDIA_MODE ?? "disabled",
    NODE_ENV: env.NODE_ENV ?? "development",
    API_HOST: env.API_HOST ?? "127.0.0.1",
  });
  if (result.success && auth.success && media.success)
    return { ...result.data, auth: auth.data, media: media.data };
  const issues = [
    ...(result.error?.issues ?? []),
    ...(auth.error?.issues ?? []),
    ...(media.error?.issues ?? []),
  ];
  const keys = [...new Set(issues.map((i) => String(i.path[0])))];
  const details = issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.code}`,
  );
  throw new ConfigError(keys, details);
}
