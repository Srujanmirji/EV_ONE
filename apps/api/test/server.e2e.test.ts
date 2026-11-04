import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { createEvoneClient } from "@evone/sdk";
import { afterEach, describe, expect, it } from "vitest";

const entry = fileURLToPath(new URL("../dist/main.js", import.meta.url));
// A migrated database, e.g. from infra/docker/docker-compose.yml.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "API e2e tests need DATABASE_URL pointing at a migrated database.",
  );
}
const unreachableDatabase = "postgresql://evone:unused@127.0.0.1:1/evone";
let child: ChildProcess | undefined;

interface Body {
  data: { status?: string; checks?: unknown; draining?: boolean };
  error: { code: string; message: string };
  meta: { requestId: string };
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      srv.close(() =>
        typeof address === "object" && address
          ? resolve(address.port)
          : reject(new Error("no port")),
      );
    });
  });
}

function run(env: Record<string, string>) {
  const proc = spawn(process.execPath, [entry], {
    env: {
      REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
      PATH: process.env.PATH ?? "",
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  proc.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
  proc.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
  return { proc, output: () => ({ stdout, stderr }) };
}

async function waitForLive(base: string): Promise<void> {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${base}/api/v1/health/live`)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("API did not become live");
}

afterEach(() => {
  if (child && child.exitCode === null) child.kill("SIGKILL");
  child = undefined;
});

describe("built API process", () => {
  it("starts, answers liveness and readiness, and shuts down gracefully on SIGTERM", async () => {
    const port = await freePort();
    const { proc, output } = run({
      NODE_ENV: "production",
      API_PORT: String(port),
      DATABASE_URL: databaseUrl,
    });
    child = proc;
    const base = `http://127.0.0.1:${port}`;
    await waitForLive(base);

    // Through the generated SDK: proves it matches the real server.
    const api = createEvoneClient({ origin: base });
    const live = await api.GET("/health/live");
    expect(live.response.status).toBe(200);
    expect(live.data?.data.status).toBe("ok");
    const ready = await api.GET("/health/ready");
    expect(ready.response.status).toBe(200);
    expect(ready.data?.data).toEqual({
      status: "ready",
      checks: [
        { name: "database", status: "up" },
        { name: "redis", status: "up" },
      ],
      draining: false,
    });
    expect(ready.data?.meta.requestId).toBe(
      ready.response.headers.get("x-request-id"),
    );

    proc.kill("SIGTERM");
    // NestJS runs its shutdown hooks, then re-raises the signal, so the
    // process ends by SIGTERM rather than exit code 0.
    const [code, signal] = (await once(proc, "exit")) as [
      number | null,
      string | null,
    ];
    expect(code === 0 || signal === "SIGTERM").toBe(true);
    expect(output().stdout).toContain('"event":"api.stopped"');
  });

  it("stays live but not ready when the database is unreachable", async () => {
    const port = await freePort();
    const { proc } = run({
      NODE_ENV: "production",
      API_PORT: String(port),
      DATABASE_URL: unreachableDatabase,
      API_READINESS_TIMEOUT_MS: "1000",
    });
    child = proc;
    const base = `http://127.0.0.1:${port}`;
    await waitForLive(base);
    const ready = await fetch(`${base}/api/v1/health/ready`);
    expect(ready.status).toBe(503);
    const text = await ready.text();
    expect(text).not.toContain("127.0.0.1:1");
    expect((JSON.parse(text) as Body).data.checks).toEqual([
      { name: "database", status: "down" },
      { name: "redis", status: "up" },
    ]);
  });

  it("reports Redis down without exposing its connection details", async () => {
    const port = await freePort();
    const { proc } = run({
      NODE_ENV: "production",
      API_PORT: String(port),
      DATABASE_URL: unreachableDatabase,
      REDIS_URL: "redis://user:do_not_print@127.0.0.1:1/0",
      API_READINESS_TIMEOUT_MS: "500",
    });
    child = proc;
    const base = `http://127.0.0.1:${port}`;
    await waitForLive(base);
    const ready = await fetch(`${base}/api/v1/health/ready`);
    expect(ready.status).toBe(503);
    const text = await ready.text();
    expect(text).not.toContain("do_not_print");
    expect(text).not.toContain("127.0.0.1:1");
    expect((JSON.parse(text) as Body).data.checks).toContainEqual({
      name: "redis",
      status: "down",
    });
  });

  it("refuses to start without DATABASE_URL", async () => {
    const { proc, output } = run({});
    child = proc;
    const [code] = (await once(proc, "exit")) as [number | null];
    expect(code).toBe(1);
    expect(output().stderr).toContain("DATABASE_URL");
  });

  it("refuses to start on invalid config and does not print the value", async () => {
    const secretLooking = "sk_live_should_never_be_printed";
    const { proc, output } = run({
      API_PORT: secretLooking,
      DATABASE_URL: databaseUrl,
    });
    child = proc;
    const [code] = (await once(proc, "exit")) as [number | null];
    expect(code).toBe(1);
    const { stdout, stderr } = output();
    expect(JSON.parse(stderr) as unknown).toMatchObject({
      event: "api.start_failed",
      configKeys: ["API_PORT"],
    });
    expect(stderr).toContain("API_PORT");
    expect(stdout + stderr).not.toContain(secretLooking);
  });
});
