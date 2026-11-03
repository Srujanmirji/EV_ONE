import {
  type EventName,
  type EventPayload,
  EVENTS_QUEUE,
  eventSchemas,
  isEventName,
  type Redis,
} from "@evone/queue";
import { type Job, UnrecoverableError, Worker } from "bullmq";
import type { Logger } from "./log.js";

export type Handlers = {
  [N in EventName]: (payload: EventPayload<N>, job: Job) => Promise<void>;
};

export interface DeadLetter {
  jobId: string;
  name: string;
  attemptsMade: number;
  /** "exhausted" after the last retry, "rejected" for unrecoverable input. */
  reason: "exhausted" | "rejected";
}

export interface EventWorkerOptions {
  connection: Redis;
  handlers: Handlers;
  logger: Logger;
  concurrency?: number;
  prefix?: string;
  /** Called once per dead letter; must not need or log the payload. */
  onDeadLetter?: (dead: DeadLetter) => void | Promise<void>;
}

/**
 * Consumes the events queue. Handlers must be idempotent: delivery is
 * at-least-once. Unknown events and invalid payloads fail immediately
 * (retrying cannot fix them); handler errors are retried with backoff.
 */
export function createEventWorker({
  connection,
  handlers,
  logger,
  concurrency = 5,
  prefix,
  onDeadLetter,
}: EventWorkerOptions): Worker {
  const worker = new Worker(
    EVENTS_QUEUE,
    async (job: Job) => {
      if (!isEventName(job.name))
        throw new UnrecoverableError(`unknown event ${job.name}`);
      const parsed = eventSchemas[job.name].safeParse(job.data);
      if (!parsed.success)
        throw new UnrecoverableError(`invalid payload for ${job.name}`);
      const handler = handlers[job.name] as (
        payload: unknown,
        job: Job,
      ) => Promise<void>;
      await handler(parsed.data, job);
    },
    { connection, concurrency, ...(prefix ? { prefix } : {}), autorun: true },
  );

  worker.on("completed", (job) => {
    logger.info("job.completed", {
      name: job.name,
      jobId: job.id,
      attempt: job.attemptsMade,
    });
  });

  worker.on("failed", (job, error) => {
    if (!job) return;
    const maxAttempts = job.opts.attempts ?? 1;
    const rejected =
      error instanceof UnrecoverableError ||
      error.name === "UnrecoverableError";
    const exhausted = job.attemptsMade >= maxAttempts;
    const fields = {
      name: job.name,
      jobId: job.id,
      attempt: job.attemptsMade,
      maxAttempts,
    };
    if (!rejected && !exhausted) {
      logger.warn("job.retrying", fields);
      return;
    }
    // Error messages can echo input; log only that it was dead-lettered.
    logger.error("job.dead_letter", {
      ...fields,
      reason: rejected ? "rejected" : "exhausted",
    });
    void Promise.resolve(
      onDeadLetter?.({
        jobId: job.id ?? "",
        name: job.name,
        attemptsMade: job.attemptsMade,
        reason: rejected ? "rejected" : "exhausted",
      }),
    ).catch(() => logger.error("dead_letter.hook_failed", { jobId: job.id }));
  });

  worker.on("error", (error) => {
    logger.error("worker.error", { message: error.message });
  });

  return worker;
}
