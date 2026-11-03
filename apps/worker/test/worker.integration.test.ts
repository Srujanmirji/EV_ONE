import { randomBytes } from "node:crypto";
import { once } from "node:events";
import {
  createProducer,
  createRedisConnection,
  type Redis,
} from "@evone/queue";
import { type Job, QueueEvents } from "bullmq";
import { afterEach, describe, expect, it } from "vitest";
import { createHandlers, LAST_PING_KEY } from "../src/handlers.js";
import { createHealthServer } from "../src/health.js";
import type { LogFields, Logger } from "@evone/observability";
import {
  createEventWorker,
  type DeadLetter,
  type Handlers,
} from "../src/worker.js";

const url = process.env.REDIS_URL;
if (!url) throw new Error("Worker integration tests need REDIS_URL.");

const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!();
});

/** Isolated producer + worker + event stream under a fresh key prefix. */
async function setup(handlers: Handlers, opts: { attempts?: number } = {}) {
  const prefix = `test-${randomBytes(5).toString("hex")}`;
  const conn = (): Redis => {
    const c = createRedisConnection(url!);
    cleanups.push(() => c.quit());
    return c;
  };
  const logs: { level: string; event: string; fields: LogFields }[] = [];
  const record =
    (level: string) =>
    (event: string, fields: LogFields = {}): void =>
      void logs.push({ level, event, fields });
  const logger: Logger = {
    debug: record("debug"),
    info: record("info"),
    warn: record("warn"),
    error: record("error"),
    child: () => logger,
  };
  const dead: DeadLetter[] = [];
  // Fast backoff keeps the retry tests quick; the policy shape is the same.
  const producer = createProducer({
    connection: conn(),
    prefix,
    jobOptions: {
      attempts: opts.attempts ?? 5,
      backoff: { type: "exponential", delay: 20 },
    },
  });
  const worker = createEventWorker({
    connection: conn(),
    handlers,
    logger,
    prefix,
    onDeadLetter: (d) => void dead.push(d),
  });
  const events = new QueueEvents("evone-events", {
    connection: conn(),
    prefix,
  });
  await Promise.all([worker.waitUntilReady(), events.waitUntilReady()]);
  cleanups.push(
    () => events.close(),
    () => worker.close(),
    () => producer.close(),
  );
  return { producer, worker, events, logs, dead, prefix };
}

const pingAt = "2026-11-03T12:00:00.000Z";
const done = (
  events: QueueEvents,
  jobId: string,
  which: "completed" | "failed",
) =>
  new Promise<void>((resolve) => {
    const on = ({ jobId: id }: { jobId: string }) => {
      if (id === jobId) {
        events.off(which, on);
        resolve();
      }
    };
    events.on(which, on);
  });

describe("event worker against Redis", () => {
  it("handles a queued test event once", async () => {
    const seen: string[] = [];
    const t = await setup({
      "system.ping.v1": async (p) => void seen.push(p.sentAt),
    });
    const finished = done(t.events, "ping-1", "completed");
    await t.producer.enqueue("system.ping.v1", { sentAt: pingAt }, "ping-1");
    await finished;
    expect(seen).toEqual([pingAt]);
  });

  it("retries a failing handler with backoff until it succeeds", async () => {
    let calls = 0;
    const t = await setup({
      "system.ping.v1": async () => {
        calls += 1;
        if (calls < 3) throw new Error("transient provider error");
      },
    });
    const finished = done(t.events, "flaky-1", "completed");
    await t.producer.enqueue("system.ping.v1", { sentAt: pingAt }, "flaky-1");
    await finished;
    const job = (await t.producer.queue.getJob("flaky-1")) as Job;
    expect(calls).toBe(3);
    expect(job.attemptsMade).toBe(3);
    expect(t.logs.filter((l) => l.event === "job.retrying")).toHaveLength(2);
    expect(t.dead).toEqual([]);
  });

  it("dead-letters after the last attempt and logs no payload", async () => {
    const t = await setup(
      {
        "system.ping.v1": async () =>
          Promise.reject(new Error(`boom with secret ${pingAt}`)),
      },
      { attempts: 3 },
    );
    const failed = new Promise<void>((resolve) => {
      const check = () => (t.dead.length ? resolve() : setTimeout(check, 20));
      check();
    });
    await t.producer.enqueue(
      "system.ping.v1",
      { sentAt: pingAt },
      "always-fails",
    );
    await failed;
    expect(t.dead).toEqual([
      {
        jobId: "always-fails",
        name: "system.ping.v1",
        attemptsMade: 3,
        reason: "exhausted",
      },
    ]);
    expect(await t.producer.queue.getJobState("always-fails")).toBe("failed");
    expect(JSON.stringify(t.logs)).not.toContain(pingAt);
  });

  it("rejects an invalid payload immediately without retrying", async () => {
    let calls = 0;
    const t = await setup({ "system.ping.v1": async () => void (calls += 1) });
    const failed = done(t.events, "bad-1", "failed");
    // Bypass the producer's validation to simulate a corrupt/old message.
    await t.producer.queue.add(
      "system.ping.v1",
      { sentAt: "not-a-date" },
      { jobId: "bad-1" },
    );
    await failed;
    const job = (await t.producer.queue.getJob("bad-1")) as Job;
    expect(calls).toBe(0);
    expect(job.attemptsMade).toBe(1);
    expect(t.dead.map((d) => d.reason)).toEqual(["rejected"]);
  });

  it("runs an event key once even if enqueued twice (idempotent)", async () => {
    let calls = 0;
    const t = await setup({ "system.ping.v1": async () => void (calls += 1) });
    const finished = done(t.events, "dup-1", "completed");
    const [a, b] = await Promise.all([
      t.producer.enqueue("system.ping.v1", { sentAt: pingAt }, "dup-1"),
      t.producer.enqueue("system.ping.v1", { sentAt: pingAt }, "dup-1"),
    ]);
    await finished;
    await new Promise((r) => setTimeout(r, 200));
    expect([a, b]).toEqual(["dup-1", "dup-1"]);
    expect(calls).toBe(1);
  });

  it("validates before enqueueing", async () => {
    const t = await setup({ "system.ping.v1": async () => undefined });
    await expect(
      t.producer.enqueue("system.ping.v1", { sentAt: "nope" }, "x"),
    ).rejects.toThrow();
    await expect(
      t.producer.enqueue("system.ping.v1", { sentAt: pingAt }, "has:colon"),
    ).rejects.toThrow();
  });

  it("finishes the job in progress before closing", async () => {
    let release!: () => void;
    let finished = false;
    const t = await setup({
      "system.ping.v1": () =>
        new Promise<void>((resolve) => {
          release = () => {
            finished = true;
            resolve();
          };
        }),
    });
    const active = new Promise<void>((resolve) =>
      t.worker.once("active", () => resolve()),
    );
    await t.producer.enqueue("system.ping.v1", { sentAt: pingAt }, "slow-1");
    await active;
    const closing = t.worker.close();
    setTimeout(() => release(), 100);
    await closing;
    expect(finished).toBe(true);
  });

  it("the production ping handler records the heartbeat", async () => {
    const redis = createRedisConnection(url);
    cleanups.push(() => redis.quit());
    const t = await setup(createHandlers(redis));
    const finished = done(t.events, "hb-1", "completed");
    await t.producer.enqueue("system.ping.v1", { sentAt: pingAt }, "hb-1");
    await finished;
    expect(await redis.get(LAST_PING_KEY)).toBe(pingAt);
  });

  it("health: ready while running, not ready once draining", async () => {
    const redis = createRedisConnection(url);
    cleanups.push(() => redis.quit());
    const t = await setup({ "system.ping.v1": async () => undefined });
    const server = createHealthServer(redis, t.worker);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    cleanups.push(() => new Promise((r) => server.close(r)));
    const port = (server.address() as { port: number }).port;
    const get = (p: string) => fetch(`http://127.0.0.1:${port}${p}`);
    expect((await get("/health/live")).status).toBe(200);
    expect((await get("/health/ready")).status).toBe(200);
    server.setDraining();
    expect((await get("/health/ready")).status).toBe(503);
  });
});
