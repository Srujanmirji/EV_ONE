import type { Redis } from "@evone/queue";
import type { Handlers } from "./worker.js";

export const LAST_PING_KEY = "evone:worker:last-ping";

/** Production handlers. Each must be idempotent (at-least-once delivery). */
export function createHandlers(redis: Redis): Handlers {
  return {
    "system.ping.v1": async ({ sentAt }) => {
      // Idempotent: replaying the same ping writes the same value.
      await redis.set(LAST_PING_KEY, sentAt);
    },
  };
}
