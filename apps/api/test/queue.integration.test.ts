import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { QueueEvents, type Worker } from "bullmq";
import {
  connectionOptions,
  createFoundationQueue,
  createFoundationWorker,
  FOUNDATION_QUEUE,
  processProbe,
  PROBE_EVENT,
  WORKER_HEARTBEAT_KEY,
} from "../src/queue/foundation.js";
import { RedisReadinessCheck } from "../src/queue/redis.check.js";

const url = process.env.REDIS_URL;
if (!url)
  throw new Error(
    "Queue integration tests need REDIS_URL (isolated test Redis).",
  );
const queue = createFoundationQueue(url);
const events = new QueueEvents(FOUNDATION_QUEUE, {
  connection: connectionOptions(url),
});
events.on("error", () => {});
let worker: Worker | undefined;
const ids: string[] = [];

// Remove only this suite's jobs; never flush a shared Redis/database.
afterEach(async () => {
  await worker?.close();
  worker = undefined;
  for (const id of ids.splice(0)) await (await queue.getJob(id))?.remove();
  vi.restoreAllMocks();
});
afterAll(async () => {
  await events.close();
  await queue.close();
});

async function add(
  data: unknown = { eventId: randomUUID() },
  jobId: string = randomUUID(),
) {
  await queue.waitUntilReady();
  await events.waitUntilReady();
  ids.push(jobId);
  return queue.add(PROBE_EVENT, data, { jobId });
}

describe("BullMQ against real Redis", () => {
  it("rejects readiness promptly when Redis has never connected", async () => {
    const unavailable = createFoundationQueue("redis://127.0.0.1:1/0");
    try {
      const started = Date.now();
      await expect(
        new RedisReadinessCheck(unavailable).check(),
      ).rejects.toThrow();
      expect(Date.now() - started).toBeLessThan(5000);
    } finally {
      await unavailable.close();
    }
  });
  it("recovers a transient failure using configured retries and backoff", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let calls = 0;
    worker = createFoundationWorker(url, (job) => {
      calls++;
      if (calls === 1) throw new Error("temporary dependency outage");
      return Promise.resolve(processProbe(job));
    });
    const data = { eventId: randomUUID() };
    const job = await add(data);
    await expect(job.waitUntilFinished(events, 10000)).resolves.toEqual(data);
    expect(calls).toBe(2);
    expect((await queue.getJob(job.id!))?.attemptsMade).toBe(2);
    expect(
      errors.mock.calls.map(([line]) => JSON.parse(String(line)) as unknown),
    ).toEqual([
      expect.objectContaining({
        event: "worker.job_retrying",
        level: "warn",
        attempts: 1,
        eventId: data.eventId,
      }),
    ]);
    await expect(
      new RedisReadinessCheck(queue).check(),
    ).resolves.toBeUndefined();
  });

  it("retains exhausted jobs for inspection after exactly three attempts", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    worker = createFoundationWorker(url, () =>
      Promise.reject(new Error("dependency unavailable")),
    );
    const job = await add();
    await expect(job.waitUntilFinished(events, 10000)).rejects.toThrow(
      "dependency unavailable",
    );
    const failed = await queue.getJob(job.id!);
    expect(await failed?.getState()).toBe("failed");
    expect(failed?.attemptsMade).toBe(3);
    await vi.waitFor(() => expect(errors.mock.calls).toHaveLength(3));
    expect(
      errors.mock.calls.map(([line]) => JSON.parse(String(line)) as unknown),
    ).toEqual([
      expect.objectContaining({ event: "worker.job_retrying", attempts: 1 }),
      expect.objectContaining({ event: "worker.job_retrying", attempts: 2 }),
      expect.objectContaining({
        event: "worker.job_failed",
        level: "error",
        attempts: 3,
      }),
    ]);
    expect(JSON.stringify(errors.mock.calls)).not.toContain(
      "dependency unavailable",
    );
  });

  it("rejects malformed payloads without retries", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const redis = await queue.getBackend().client;
    const before = await redis.get(WORKER_HEARTBEAT_KEY);
    worker = createFoundationWorker(url);
    const job = await add({ unexpected: "field" });
    await expect(job.waitUntilFinished(events, 10000)).rejects.toThrow(
      "Unsupported foundation event",
    );
    expect((await queue.getJob(job.id!))?.attemptsMade).toBe(1);
    await vi.waitFor(() => expect(errors.mock.calls).toHaveLength(1));
    expect(JSON.parse(String(errors.mock.calls[0]?.[0]))).toMatchObject({
      event: "worker.job_failed",
      attempts: 1,
    });
    expect(await redis.get(WORKER_HEARTBEAT_KEY)).toBe(before);
  });

  it("persists the time a valid probe is handled without retaining its payload", async () => {
    worker = createFoundationWorker(url);
    const started = Date.now();
    const data = { eventId: randomUUID() };
    const job = await add(data, "last-probe-at");
    await job.waitUntilFinished(events, 10000);
    const redis = await queue.getBackend().client;
    const heartbeat = await redis.get(WORKER_HEARTBEAT_KEY);
    expect(Date.parse(heartbeat!)).toBeGreaterThanOrEqual(started);
    expect(Date.parse(heartbeat!)).toBeLessThanOrEqual(Date.now());
    expect(heartbeat).not.toContain(data.eventId);
  });

  it("retries a failed heartbeat write without leaking Redis errors", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    worker = createFoundationWorker(url);
    const redis = await worker.getBackend().client;
    const write = vi
      .spyOn(redis, "set")
      .mockRejectedValueOnce(new Error("private-redis-error"));
    const job = await add();
    await job.waitUntilFinished(events, 10000);
    expect(write).toHaveBeenCalledTimes(2);
    expect((await queue.getJob(job.id!))?.attemptsMade).toBe(2);
    expect(JSON.stringify(errors.mock.calls)).toContain("worker.job_retrying");
    expect(JSON.stringify(errors.mock.calls)).not.toContain(
      "private-redis-error",
    );
    expect(JSON.stringify(errors.mock.calls)).not.toContain(
      "worker.job_failed",
    );
  });

  it("waits for an in-flight handler during shutdown", async () => {
    let release!: () => void;
    let started!: () => void;
    const active = new Promise<void>((resolve) => {
      started = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    worker = createFoundationWorker(url, async (job) => {
      started();
      await gate;
      return processProbe(job);
    });
    const job = await add();
    await active;
    let stopped = false;
    const closing = worker.close().then(() => {
      stopped = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(stopped).toBe(false);
    release();
    await closing;
    expect(stopped).toBe(true);
    expect(await job.getState()).toBe("completed");
    worker = undefined;
  });
});
