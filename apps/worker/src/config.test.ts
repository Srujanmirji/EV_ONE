import { describe, expect, it } from "vitest";
import { loadWorkerConfig, WorkerConfigError } from "./config.js";

describe("loadWorkerConfig", () => {
  it("requires a redis URL and applies defaults", () => {
    expect(
      loadWorkerConfig({ REDIS_URL: "redis://127.0.0.1:6379" }),
    ).toMatchObject({
      WORKER_CONCURRENCY: 5,
      WORKER_HEALTH_PORT: 4010,
    });
    expect(() => loadWorkerConfig({})).toThrow(WorkerConfigError);
  });

  it("accepts TLS URLs and rejects others without echoing them", () => {
    expect(
      loadWorkerConfig({ REDIS_URL: "rediss://user:pw@host:6380" }).REDIS_URL,
    ).toMatch(/^rediss/);
    try {
      loadWorkerConfig({ REDIS_URL: "http://user:hunter2@host" });
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toContain("REDIS_URL");
      expect((error as Error).message).not.toContain("hunter2");
    }
  });

  it("bounds concurrency", () => {
    expect(() =>
      loadWorkerConfig({ REDIS_URL: "redis://h", WORKER_CONCURRENCY: "0" }),
    ).toThrow();
    expect(() =>
      loadWorkerConfig({ REDIS_URL: "redis://h", WORKER_CONCURRENCY: "51" }),
    ).toThrow();
  });
});
