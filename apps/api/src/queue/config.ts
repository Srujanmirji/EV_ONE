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

export function loadWorkerConfig(env: NodeJS.ProcessEnv): string {
  const result = redisUrl.safeParse(env.REDIS_URL);
  if (!result.success)
    throw new Error("Invalid worker configuration: REDIS_URL");
  return result.data;
}
