import { describe, expect, it } from "vitest";
import { loadWorkerConfig } from "./config.js";
import { connectionOptions, processProbe, PROBE_EVENT } from "./foundation.js";

const eventId = "c057fe2b-9b31-4b3b-8cac-e974f9a6ed68";

describe("foundation configuration and handler", () => {
  it("defaults worker health to a private listener and accepts an ephemeral test port", () => {
    expect(loadWorkerConfig({ REDIS_URL: "redis://127.0.0.1:6379" })).toEqual({
      REDIS_URL: "redis://127.0.0.1:6379",
      WORKER_HEALTH_HOST: "127.0.0.1",
      WORKER_HEALTH_PORT: 4010,
    });
    expect(
      loadWorkerConfig({
        REDIS_URL: "redis://127.0.0.1:6379",
        WORKER_HEALTH_PORT: "0",
      }).WORKER_HEALTH_PORT,
    ).toBe(0);
  });

  it.each([
    ["WORKER_HEALTH_PORT", "65536"],
    ["WORKER_HEALTH_PORT", "-1"],
    ["WORKER_HEALTH_PORT", "private-value"],
    ["WORKER_HEALTH_HOST", "private-value"],
  ])("rejects invalid %s without exposing its value", (key, value) => {
    expect(() =>
      loadWorkerConfig({ REDIS_URL: "redis://127.0.0.1:6379", [key]: value }),
    ).toThrow(`Invalid worker configuration: ${key}`);
  });
  it("passes IPv6 hosts without URL brackets to Redis", () => {
    expect(connectionOptions("redis://[::1]:6379/0").host).toBe("::1");
  });
  it("accepts TLS, credentials and a database number", () => {
    expect(
      connectionOptions("rediss://user:p%40ss@cache.example:6380/2"),
    ).toEqual({
      host: "cache.example",
      port: 6380,
      username: "user",
      password: "p@ss",
      db: 2,
      tls: {},
      connectTimeout: 2000,
    });
  });

  it.each([
    undefined,
    "not-url",
    "https://cache.example",
    "redis://cache.example/nope",
    "redis://cache.example/0?password=secret",
    "redis://cache.example/0#secret",
  ])("rejects invalid Redis configuration without echoing it", (REDIS_URL) => {
    expect(() => loadWorkerConfig({ REDIS_URL })).toThrow(
      "Invalid worker configuration: REDIS_URL",
    );
  });

  it("handles a validated probe repeatedly without side effects", () => {
    const job = { name: PROBE_EVENT, data: { eventId } };
    expect(processProbe(job)).toEqual({ eventId });
    expect(processProbe(job)).toEqual({ eventId });
  });

  it.each([
    { name: "finance.lead.consented.v1", data: { eventId } },
    { name: PROBE_EVENT, data: { eventId, phone: "not-accepted" } },
    { name: PROBE_EVENT, data: { eventId: "invalid" } },
  ])(
    "rejects unsupported or malformed jobs without retaining their payload in the error",
    (job) => {
      expect(() => processProbe(job)).toThrow("Unsupported foundation event");
    },
  );
});
