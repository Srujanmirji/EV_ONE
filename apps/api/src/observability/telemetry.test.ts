import { createServer, type Server } from "node:http";
import { gunzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeTelemetry,
  initTelemetry,
  logEvent,
  reportError,
  safeFields,
  scrubEvent,
} from "./telemetry.js";
import { AppModule } from "../app.module.js";
import { telemetryConfigSchema } from "./config.js";

const requestId = "6c59d74c-a13c-4bc8-8e0d-4a6b1b6a65c4";
let server: Server | undefined;
afterEach(async () => {
  await closeTelemetry();
  await new Promise<void>((resolve, reject) => {
    if (!server) return resolve();
    server.close((error) => (error ? reject(error) : resolve()));
  });
  server = undefined;
  vi.restoreAllMocks();
});

async function receiver(status = 200): Promise<string[]> {
  const received: string[] = [];
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks);
      received.push(
        (req.headers["content-encoding"] === "gzip"
          ? gunzipSync(raw)
          : raw
        ).toString(),
      );
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No local port");
  initTelemetry({
    SENTRY_DSN: `http://localtest@127.0.0.1:${address.port}/1`,
    NODE_ENV: "test",
  });
  return received;
}

describe("privacy at log and transport boundaries", () => {
  it("excludes unapproved fields and rejects injected IDs/routes", () => {
    expect(
      safeFields({
        requestId,
        password: "secret",
        headers: { authorization: "token" },
        email: "hidden@example.invalid",
      }),
    ).toEqual({ requestId });
    expect(safeFields({ requestId: "injected\nline" })).toEqual({});
    expect(safeFields({ route: "/path?token=secret" })).toEqual({});
  });

  it("writes one JSON record without payload fields", () => {
    const out = vi.spyOn(console, "log").mockImplementation(() => {});
    logEvent("info", "http.completed", { requestId, status: 200 });
    const record: unknown = JSON.parse(String(out.mock.calls[0]?.[0]));
    expect(record).toMatchObject({
      event: "http.completed",
      level: "info",
      requestId,
      status: 200,
    });
    expect(out).toHaveBeenCalledTimes(1);
  });

  it("strips SDK enrichments and raw exception content", () => {
    const event = scrubEvent({
      type: undefined,
      message: "http.failed",
      event_id: "a".repeat(32),
      request: {
        url: "https://example.invalid?token=secret",
        headers: { cookie: "secret" },
      },
      user: { email: "hidden@example.invalid" },
      breadcrumbs: [{ message: "secret" }],
      exception: { values: [{ value: "secret" }] },
      extra: { password: "secret" },
      tags: { requestId, secret: "secret" },
    });
    expect(event?.tags).toEqual({ requestId });
    expect(JSON.stringify(event)).not.toContain("secret");
    expect(JSON.stringify(event)).not.toContain("example.invalid");
    expect(
      scrubEvent({ type: undefined, message: "private error message" }),
    ).toBeNull();
  });

  it.each([
    "invalid",
    "http://key@remote.example/1",
    "https://key:private@example.invalid/1",
    "https://key@example.invalid/1?token=secret",
  ])("rejects an unsafe DSN", (SENTRY_DSN) => {
    expect(telemetryConfigSchema.safeParse({ SENTRY_DSN }).success).toBe(false);
  });

  it("does not enable external reporting without a DSN", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    initTelemetry({ NODE_ENV: "test" });
    expect(reportError("telemetry.test")).toBeUndefined();
    expect(await closeTelemetry()).toBe(true);
  });

  it("sends a scrubbed alert through the real SDK to local ingestion", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const received = await receiver();
    expect(reportError("telemetry.test", { requestId })).toMatch(
      /^[a-f0-9]{32}$/,
    );
    expect(await closeTelemetry()).toBe(true);
    expect(received).toHaveLength(1);
    const parts = received[0]!.split("\n");
    const payload: unknown = JSON.parse(parts[2]!);
    expect(payload).toMatchObject({
      message: "telemetry.test",
      environment: "test",
      tags: { requestId },
    });
    expect(received[0]).not.toContain("127.0.0.1");
  });
  it("treats rejected ingestion as failed delivery", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    await receiver(403);
    reportError("telemetry.test");
    expect(await closeTelemetry()).toBe(false);
    expect(
      errors.mock.calls.some((call) =>
        String(call[0]).includes("telemetry.delivery_failed"),
      ),
    ).toBe(true);
  });

  it("treats a network refusal as failed delivery without logging connection details", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    initTelemetry({
      SENTRY_DSN: "http://localtest@127.0.0.1:1/1",
      NODE_ENV: "test",
    });
    reportError("telemetry.test");
    expect(await closeTelemetry()).toBe(false);
    expect(JSON.stringify(errors.mock.calls)).not.toContain("127.0.0.1");
  });

  it("captures cleanup failures before closing telemetry and attempts every hook", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const received = await receiver();
    let secondRan = false;
    const module = new AppModule([
      () => {
        throw new Error("private_should_not_log");
      },
      () => {
        secondRan = true;
        return Promise.resolve();
      },
    ]);
    await module.onApplicationShutdown();
    expect(secondRan).toBe(true);
    expect(received.join("\n")).toContain("api.shutdown_failed");
    expect(received.join("\n")).not.toContain("private_should_not_log");
  });
});
