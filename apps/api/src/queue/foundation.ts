import { Queue, Worker, UnrecoverableError, type Job } from "bullmq";
import { reportError, logEvent } from "../observability/telemetry.js";
import { z } from "zod";
import { redisUrl } from "./config.js";

export const FOUNDATION_QUEUE = "evone-foundation";
export const WORKER_HEARTBEAT_KEY = "evone:worker:last-probe-at";
export const PROBE_EVENT = "foundation.probe.v1";
const probe = z.strictObject({ eventId: z.uuid() });

export function connectionOptions(value: string) {
  const url = new URL(redisUrl.parse(value));
  return {
    host: url.hostname.replace(/^\[|\]$/g, ""),
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: Number(url.pathname.slice(1) || 0),
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
    connectTimeout: 2000,
  };
}

// shortcut: enqueue only after readiness passes; revisit when BullMQ supports initial-connection fail-fast.
export function createFoundationQueue(url: string) {
  const queue = new Queue(FOUNDATION_QUEUE, {
    connection: {
      ...connectionOptions(url),
      maxRetriesPerRequest: 1,
      commandTimeout: 2000,
      enableOfflineQueue: false,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 100 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  });
  queue.on("error", () => reportError("queue.connection_failed"));
  return queue;
}

/** The foundation probe has no side effects, so repeated delivery is safe. */
export function processProbe(job: Pick<Job<unknown>, "name" | "data">) {
  const payload = probe.safeParse(job.data);
  if (job.name !== PROBE_EVENT || !payload.success) {
    throw new UnrecoverableError("Unsupported foundation event");
  }
  return { eventId: payload.data.eventId };
}

export function createFoundationWorker(
  url: string,
  processor: (job: Job<unknown>) => Promise<unknown> = (job) =>
    Promise.resolve(processProbe(job)),
) {
  const worker = new Worker(
    FOUNDATION_QUEUE,
    async (job) => {
      const result = await processor(job);
      const redis = await worker.getBackend().client;
      await redis.set(WORKER_HEARTBEAT_KEY, new Date().toISOString());
      return result;
    },
    {
      connection: { ...connectionOptions(url), maxRetriesPerRequest: null },
      concurrency: 1,
    },
  );
  // Never log Redis errors or job payloads: they may contain credentials/PII.
  worker.on("error", () => reportError("worker.connection_failed"));
  worker.on("failed", (job) => {
    if (!job) return;
    const payload = probe.safeParse(job.data);
    const fields = {
      attempts: job.attemptsMade,
      ...(payload.success ? { eventId: payload.data.eventId } : {}),
    };
    // BullMQ sets finishedOn only when the failure is terminal, including rejection.
    if (job.finishedOn !== undefined) reportError("worker.job_failed", fields);
    else logEvent("warn", "worker.job_retrying", fields);
  });
  worker.on("completed", () => logEvent("info", "worker.job_completed"));
  return worker;
}
