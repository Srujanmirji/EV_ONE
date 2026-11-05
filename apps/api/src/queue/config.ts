import { z } from "zod";

export const redisUrl = z.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    ["redis:", "rediss:"].includes(url.protocol) &&
    Boolean(url.hostname) &&
    !url.search &&
    !url.hash &&
    /^\/(\d+)?$/.test(url.pathname || "/")
  );
}, "must be a redis:// or rediss:// URL with an optional database number");

const workerConfig = z.object({
  REDIS_URL: redisUrl,
  WORKER_HEALTH_HOST: z.union([z.ipv4(), z.ipv6()]).default("127.0.0.1"),
  WORKER_HEALTH_PORT: z.coerce.number().int().min(0).max(65535).default(4010),
});

export function loadWorkerConfig(env: NodeJS.ProcessEnv) {
  const result = workerConfig.safeParse(env);
  if (!result.success)
    throw new Error(
      `Invalid worker configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
    );
  return result.data;
}
