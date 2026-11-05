import { afterEach, expect, it, vi } from "vitest";
import type { Worker } from "bullmq";
import { createWorkerHealthServer } from "./worker-health.js";

const readHeartbeat = vi.fn<() => Promise<string>>();
let running = true;
let paused = false;
let connectionStatus = "ready";
let blockingStatus = "ready";
let rawBlockingStatus = "ready";
let rawStatus = "ready";
const worker = {
  toKey: (key: string) => `test:${key}`,
  isRunning: () => running,
  isPaused: () => paused,
  getBackend: () => ({
    connection: { status: connectionStatus },
    blockingConnection: { status: blockingStatus },
    client: Promise.resolve({
      get: readHeartbeat,
      get status() {
        return rawStatus;
      },
    }),
    blockingClient: Promise.resolve({
      get status() {
        return rawBlockingStatus;
      },
    }),
  }),
} as unknown as Worker;
let server: ReturnType<typeof createWorkerHealthServer> | undefined;

afterEach(async () => {
  if (server)
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = undefined;
  running = true;
  paused = false;
  connectionStatus = "ready";
  blockingStatus = "ready";
  rawBlockingStatus = "ready";
  rawStatus = "ready";
  readHeartbeat.mockReset();
});

async function start() {
  readHeartbeat.mockResolvedValue("PONG");
  server = createWorkerHealthServer(worker);
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing port");
  return (path: string) => fetch(`http://127.0.0.1:${address.port}${path}`);
}

it("reports readiness only while consuming and returns no connection details", async () => {
  const get = await start();
  expect((await get("/health/live")).status).toBe(200);
  const ready = await get("/health/ready");
  expect(ready.status).toBe(200);
  expect(ready.headers.get("cache-control")).toBe("no-store");
  expect(await ready.json()).toEqual({ status: "ready", draining: false });
  for (const state of [
    "paused",
    "stopped",
    "disconnected",
    "consumer-disconnected",
    "consumer-reconnecting",
    "main-reconnecting",
  ]) {
    paused = state === "paused";
    running = state !== "stopped";
    connectionStatus = state === "disconnected" ? "reconnecting" : "ready";
    blockingStatus =
      state === "consumer-disconnected" ? "reconnecting" : "ready";
    rawBlockingStatus =
      state === "consumer-reconnecting" ? "reconnecting" : "ready";
    rawStatus = state === "main-reconnecting" ? "reconnecting" : "ready";
    expect((await get("/health/ready")).status).toBe(503);
    expect((await get("/health/live")).status).toBe(200);
  }
});

it("becomes unready during drain, including a probe already in flight", async () => {
  const get = await start();
  let release!: (value: string) => void;
  readHeartbeat.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const response = get("/health/ready");
  await vi.waitFor(() => expect(readHeartbeat).toHaveBeenCalledOnce());
  server!.setDraining();
  release("PONG");
  expect((await response).status).toBe(503);
  expect(await (await get("/health/ready")).json()).toEqual({
    status: "not_ready",
    draining: true,
  });
});

it("bounds Redis failures and hangs while liveness remains independent", async () => {
  const get = await start();
  readHeartbeat.mockRejectedValue(new Error("private-redis-credentials"));
  const rejected = await get("/health/ready");
  expect(rejected.status).toBe(503);
  expect(await rejected.text()).not.toContain("private-redis-credentials");
  readHeartbeat.mockImplementation(() => new Promise(() => {}));
  const started = Date.now();
  expect((await get("/health/ready")).status).toBe(503);
  expect(Date.now() - started).toBeLessThan(3500);
  expect((await get("/health/live")).status).toBe(200);
  expect((await get("/health/ready?secret=value")).status).toBe(404);
});

it("rejects readiness if the consumer connection drops during its Redis read", async () => {
  const get = await start();
  readHeartbeat.mockImplementation(() => {
    rawBlockingStatus = "reconnecting";
    return Promise.resolve("timestamp");
  });
  expect((await get("/health/ready")).status).toBe(503);
});
