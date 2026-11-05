import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it, vi } from "vitest";
import { QueueEvents } from "bullmq";
import {
  connectionOptions,
  createFoundationQueue,
  FOUNDATION_QUEUE,
  PROBE_EVENT,
  WORKER_HEARTBEAT_KEY,
} from "../src/queue/foundation.js";

const url = process.env.REDIS_URL;
if (!url) throw new Error("Worker e2e needs REDIS_URL (isolated test Redis).");
const entry = fileURLToPath(new URL("../dist/worker.js", import.meta.url));
let child: ChildProcess | undefined;
afterEach(() => {
  if (child?.exitCode === null) child.kill("SIGKILL");
  child = undefined;
});

function start(REDIS_URL: string) {
  const proc = spawn(process.execPath, [entry], {
    env: { PATH: process.env.PATH ?? "", REDIS_URL, WORKER_HEALTH_PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child = proc;
  let output = "";
  proc.stdout.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  proc.stderr.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  return { proc, output: () => output };
}

it("starts the built Nest worker, processes a real job, and stops on SIGTERM", async () => {
  const { proc, output } = start(url);
  const queue = createFoundationQueue(url);
  const events = new QueueEvents(FOUNDATION_QUEUE, {
    connection: connectionOptions(url),
  });
  events.on("error", () => {});
  let jobId: string | undefined;
  try {
    await queue.waitUntilReady();
    await events.waitUntilReady();
    const eventId = randomUUID();
    jobId = randomUUID();
    const job = await queue.add(PROBE_EVENT, { eventId }, { jobId });
    await expect(job.waitUntilFinished(events, 10000)).resolves.toEqual({
      eventId,
    });
    expect(output()).toContain("worker.ready");
    const readyLine = output()
      .split("\n")
      .find((line) => line.includes('"worker.ready"'));
    const { port } = JSON.parse(readyLine!) as { port: number };
    const ready = await fetch(`http://127.0.0.1:${port}/health/ready`);
    expect(ready.status).toBe(200);
    const redis = await queue.getBackend().client;
    expect(await redis.get(WORKER_HEARTBEAT_KEY)).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    );
    const exited = once(proc, "exit");
    proc.kill("SIGTERM");
    const [code, signal] = (await exited) as [number | null, string | null];
    expect(code === 0 || signal === "SIGTERM").toBe(true);
    expect(output()).toContain("worker.stopped");
  } finally {
    if (jobId) await (await queue.getJob(jobId))?.remove();
    await events.close();
    await queue.close();
  }
});

it("answers liveness and rejects readiness before Redis has ever connected", async () => {
  // A fixed listener lets the probe be checked before worker.ready is emitted.
  const { createServer } = await import("node:net");
  const reservation = createServer();
  await new Promise<void>((resolve) =>
    reservation.listen(0, "127.0.0.1", resolve),
  );
  const address = reservation.address();
  if (!address || typeof address === "string") throw new Error("No port");
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  const proc = spawn(process.execPath, [entry], {
    env: {
      PATH: process.env.PATH ?? "",
      REDIS_URL: "redis://127.0.0.1:1",
      WORKER_HEALTH_PORT: String(address.port),
    },
    stdio: "ignore",
  });
  child = proc;
  await vi.waitFor(
    async () => {
      expect(
        (await fetch(`http://127.0.0.1:${address.port}/health/live`)).status,
      ).toBe(200);
    },
    { timeout: 10000 },
  );
  expect(
    (await fetch(`http://127.0.0.1:${address.port}/health/ready`)).status,
  ).toBe(503);
});

it("rejects invalid Redis configuration without printing secrets", async () => {
  const secret = "https://user:secret_should_not_be_logged@example.com";
  const { proc, output } = start(secret);
  const [code] = (await once(proc, "exit")) as [number | null];
  expect(code).toBe(1);
  expect(output()).toContain("worker.start_failed");
  expect(output()).not.toContain("secret_should_not_be_logged");
});
