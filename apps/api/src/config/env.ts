import { z } from "zod";
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

export type ApiConfig = z.infer<typeof envSchema>;

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
  if (result.success) return result.data;
  const keys = [...new Set(result.error.issues.map((i) => String(i.path[0])))];
  const details = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.code}`,
  );
  throw new ConfigError(keys, details);
}
