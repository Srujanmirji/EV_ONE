import { Redis } from "ioredis";

/**
 * Redis connection for BullMQ. Workers require `maxRetriesPerRequest: null`
 * so blocking commands are not abandoned during a Redis hiccup.
 */
export function createRedisConnection(url: string): Redis {
  return new Redis(url, { maxRetriesPerRequest: null, enableReadyCheck: true });
}

export type { Redis };
