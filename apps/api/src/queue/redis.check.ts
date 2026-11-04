import type { Queue } from "bullmq";
import type { ReadinessCheck } from "../health/readiness.js";

export class RedisReadinessCheck implements ReadinessCheck {
  readonly name = "redis";
  constructor(private readonly queue: Queue) {}

  async check(): Promise<void> {
    if (this.queue.getBackend().connection.status !== "ready") {
      throw new Error("Redis is not ready");
    }
    await this.queue.getJobCounts("wait");
  }
}
