import type { INestApplication } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../config/env.js";
import { createApp } from "../create-app.js";
import { HealthService } from "./health.service.js";
import type { ReadinessCheck } from "./readiness.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
let app: INestApplication | undefined;

interface Body {
  data: { status?: string; checks?: unknown; draining?: boolean };
  error: { code: string; message: string };
  meta: { requestId: string };
}
const readJson = async (res: Response): Promise<Body> =>
  (await res.json()) as Body;

async function start(
  readinessChecks: ReadinessCheck[] = [],
  timeoutMs = "2000",
) {
  app = await createApp({
    config: loadConfig({
      NODE_ENV: "test",
      API_READINESS_TIMEOUT_MS: timeoutMs,
      DATABASE_URL: "postgresql://unused@127.0.0.1:1/unused",
    }),
    readinessChecks,
  });
  await app.listen(0, "127.0.0.1");
  const url = await app.getUrl();
  return (path: string, init?: RequestInit) =>
    fetch(`${url}/api/v1${path}`, init);
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const up: ReadinessCheck = { name: "database", check: () => Promise.resolve() };
const down: ReadinessCheck = {
  name: "redis",
  check: () => Promise.reject(new Error("ECONNREFUSED 10.0.0.5:6379")),
};

describe("GET /api/v1/health/live", () => {
  it("returns 200 in the data envelope with a request id", async () => {
    const get = await start([down]);
    const res = await get("/health/live");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-powered-by")).toBeNull();
    const body = await readJson(res);
    expect(body.data).toEqual({ status: "ok" });
    expect(body.meta.requestId).toMatch(UUID);
    expect(res.headers.get("x-request-id")).toBe(body.meta.requestId);
  });

  it("echoes a valid inbound X-Request-ID and replaces an invalid one", async () => {
    const get = await start();
    const id = "3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c";
    const echoed = await get("/health/live", {
      headers: { "X-Request-ID": id },
    });
    expect(echoed.headers.get("x-request-id")).toBe(id);

    const injected = await get("/health/live", {
      headers: { "X-Request-ID": "<script>alert(1)</script>" },
    });
    expect(injected.headers.get("x-request-id")).toMatch(UUID);
  });
});

describe("GET /api/v1/health/ready", () => {
  it("is ready when no dependencies are registered", async () => {
    const get = await start();
    const res = await get("/health/ready");
    expect(res.status).toBe(200);
    expect((await readJson(res)).data).toEqual({
      status: "ready",
      checks: [],
      draining: false,
    });
  });

  it("is ready when every dependency is up", async () => {
    const get = await start([up]);
    const res = await get("/health/ready");
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.checks).toEqual([
      { name: "database", status: "up" },
    ]);
  });

  it("returns 503 when a dependency is down, without leaking the reason", async () => {
    const get = await start([up, down]);
    const res = await get("/health/ready");
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(text).not.toContain("ECONNREFUSED");
    expect(text).not.toContain("10.0.0.5");
    expect((JSON.parse(text) as Body).data).toEqual({
      status: "not_ready",
      checks: [
        { name: "database", status: "up" },
        { name: "redis", status: "down" },
      ],
      draining: false,
    });
  });

  it("treats a hung dependency as down after the timeout", async () => {
    const hung: ReadinessCheck = {
      name: "slow",
      check: () => new Promise(() => {}),
    };
    const get = await start([hung], "100");
    const started = Date.now();
    const res = await get("/health/ready");
    expect(res.status).toBe(503);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("calls class-based checks with their own `this`", async () => {
    class PingCheck implements ReadinessCheck {
      readonly name = "class-based";
      private readonly client = { ping: () => Promise.resolve() };
      check(): Promise<void> {
        return this.client.ping();
      }
    }
    const get = await start([new PingCheck()]);
    expect((await get("/health/ready")).status).toBe(200);
  });

  it("treats a check that throws synchronously as down", async () => {
    const throws: ReadinessCheck = {
      name: "broken",
      check: () => {
        throw new Error("boom");
      },
    };
    const get = await start([throws]);
    expect((await get("/health/ready")).status).toBe(503);
  });

  it("reports not ready once shutdown begins", async () => {
    const get = await start([up]);
    app!.get(HealthService).beforeApplicationShutdown();
    const res = await get("/health/ready");
    expect(res.status).toBe(503);
    expect((await readJson(res)).data.draining).toBe(true);
  });
});

describe("unknown routes", () => {
  it("return 404 in the error envelope", async () => {
    const get = await start();
    const res = await get("/does-not-exist");
    expect(res.status).toBe(404);
    const body = await readJson(res);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.meta.requestId).toMatch(UUID);
  });
});
