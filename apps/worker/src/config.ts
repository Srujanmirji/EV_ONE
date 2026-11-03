import { z } from "zod";

export const workerEnv = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  /** redis:// or rediss:// (TLS). May contain a password: never log it. */
  REDIS_URL: z
    .string()
    .regex(/^rediss?:\/\/\S+$/, "must be a redis:// or rediss:// URL"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
  WORKER_HEALTH_HOST: z.string().min(1).default("127.0.0.1"),
  WORKER_HEALTH_PORT: z.coerce.number().int().min(1).max(65535).default(4010),
  /** Error tracking and dead-letter alerts; off when unset. */
  SENTRY_DSN: z.url({ protocol: /^https$/ }).optional(),
  APP_RELEASE: z.string().max(100).optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type WorkerConfig = z.infer<typeof workerEnv>;

export class WorkerConfigError extends Error {
  constructor(details: string[]) {
    super(
      `Invalid worker configuration:\n${details.map((d) => `  - ${d}`).join("\n")}`,
    );
    this.name = "WorkerConfigError";
  }
}

/** Names invalid keys and rules, never values (secrets may be malformed). */
export function loadWorkerConfig(env: NodeJS.ProcessEnv): WorkerConfig {
  const result = workerEnv.safeParse(env);
  if (result.success) return result.data;
  throw new WorkerConfigError(
    result.error.issues.map((i) => `${i.path.join(".")}: ${i.code}`),
  );
}
