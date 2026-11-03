import { Queue, Worker, UnrecoverableError, type Job } from "bullmq";
import { z } from "zod";
import { redisUrl } from "./config.js";

export const FOUNDATION_QUEUE = "evone-foundation";
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
  queue.on("error", () => console.error("EVONE queue connection error"));
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
  const worker = new Worker(FOUNDATION_QUEUE, processor, {
    connection: { ...connectionOptions(url), maxRetriesPerRequest: null },
    concurrency: 1,
  });
  // Never log Redis errors or job payloads: they may contain credentials/PII.
  worker.on("error", () => console.error("EVONE worker connection error"));
  worker.on("failed", (job) =>
    console.error(
      `EVONE worker job failed; attempts=${job?.attemptsMade ?? 0}`,
    ),
  );
  worker.on("completed", () => console.log("EVONE worker job completed"));
  return worker;
}
