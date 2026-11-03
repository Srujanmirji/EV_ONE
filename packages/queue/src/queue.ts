import { type JobsOptions, Queue } from "bullmq";
import type { Redis } from "ioredis";
import {
  EventKey,
  type EventName,
  type EventPayload,
  eventSchemas,
} from "./events.js";

export const EVENTS_QUEUE = "evone-events";

/**
 * At-least-once delivery: up to 5 attempts with exponential backoff
 * (1s, 2s, 4s, 8s). Failed jobs are kept for inspection (dead letters);
 * completed ones are trimmed.
 */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: false,
} satisfies JobsOptions;

export interface ProducerOptions {
  connection: Redis;
  /** Redis key prefix; tests use a unique one for isolation. */
  prefix?: string;
  jobOptions?: Partial<JobsOptions>;
}

export function createProducer({
  connection,
  prefix,
  jobOptions,
}: ProducerOptions) {
  const queue = new Queue(EVENTS_QUEUE, {
    connection,
    ...(prefix ? { prefix } : {}),
    defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, ...jobOptions },
  });

  return {
    queue,
    /** Validates, then enqueues once per key. Returns the job id. */
    async enqueue<N extends EventName>(
      name: N,
      payload: EventPayload<N>,
      key: string,
    ): Promise<string> {
      const jobId = EventKey.parse(key);
      const data = eventSchemas[name].parse(payload);
      const job = await queue.add(name, data, { jobId });
      return job.id ?? jobId;
    },
    close: () => queue.close(),
  };
}
