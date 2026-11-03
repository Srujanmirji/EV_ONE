import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { createProducer, createRedisConnection } from "@evone/queue";
import { afterEach, describe, expect, it } from "vitest";

const entry = fileURLToPath(new URL("../dist/main.js", import.meta.url));
const url = process.env.REDIS_URL ?? "";
if (!url) throw new Error("Worker e2e tests need REDIS_URL.");
let child: ChildProcess | undefined;

afterEach(() => {
  if (child && child.exitCode === null) child.kill("SIGKILL");
  child = undefined;
});

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const a = s.address();
      s.close(() =>
        typeof a === "object" && a
          ? resolve(a.port)
          : reject(new Error("no port")),
      );
    });
  });

function run(env: Record<string, string>) {
  const proc = spawn(process.execPath, [entry], {
    env: { PATH: process.env.PATH ?? "", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  proc.stdout.on("data", (c: Buffer) => (out += c.toString()));
  proc.stderr.on("data", (c: Buffer) => (out += c.toString()));
  return { proc, output: () => out };
}

async function until(check: () => Promise<boolean>, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check().catch(() => false)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("condition not met in time");
}

describe("built worker process", () => {
  it("consumes a queued ping, reports ready, and stops gracefully on SIGTERM", async () => {
    const port = await freePort();
    const { proc, output } = run({
      NODE_ENV: "production",
      REDIS_URL: url,
      WORKER_HEALTH_PORT: String(port),
    });
    child = proc;
    const health = (p: string) =>
      fetch(`http://127.0.0.1:${port}${p}`).then((r) => r.status);
    await until(async () => (await health("/health/ready")) === 200);

    const redis = createRedisConnection(url);
    const producer = createProducer({ connection: redis });
    const sentAt = new Date().toISOString();
    const key = `e2e-ping-${Date.now()}`;
    await producer.enqueue("system.ping.v1", { sentAt }, key);
    await until(
      async () => (await redis.get("evone:worker:last-ping")) === sentAt,
    );
    await producer.close();
    await redis.quit();

    proc.kill("SIGTERM");
    const [code] = (await once(proc, "exit")) as [number | null];
    expect(code).toBe(0);
    const lines = output()
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l) as { event: string; jobId?: string });
    expect(lines.map((l) => l.event)).toEqual(
      expect.arrayContaining([
        "worker.started",
        "job.completed",
        "worker.stopping",
        "worker.stopped",
      ]),
    );
    expect(lines.find((l) => l.event === "job.completed")?.jobId).toBe(key);
    expect(output()).not.toContain(sentAt);
  });

  it("refuses to start with invalid config and does not echo the value", async () => {
    const { proc, output } = run({ REDIS_URL: "http://user:hunter2@host" });
    child = proc;
    const [code] = (await once(proc, "exit")) as [number | null];
    expect(code).toBe(1);
    expect(output()).toContain("REDIS_URL");
    expect(output()).not.toContain("hunter2");
  });
});
