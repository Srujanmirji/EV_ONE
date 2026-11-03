import { describe, expect, it } from "vitest";
import { loadWorkerConfig, WorkerConfigError } from "./config.js";
import { jsonLogger } from "./log.js";

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

describe("jsonLogger", () => {
  it("writes one JSON object per line with level and event", () => {
    const lines: string[] = [];
    jsonLogger((l) => lines.push(l)).error("job.dead_letter", {
      jobId: "k1",
      attempt: 5,
    });
    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      level: "error",
      event: "job.dead_letter",
      jobId: "k1",
      attempt: 5,
    });
  });
});
