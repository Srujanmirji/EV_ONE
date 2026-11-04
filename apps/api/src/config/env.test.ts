import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./env.js";

const REDIS_URL = "redis://127.0.0.1:6379";
const DATABASE_URL = "postgresql://user:secret@127.0.0.1:5432/evone";

describe("loadConfig", () => {
  it("applies safe local defaults", () => {
    expect(loadConfig({ REDIS_URL, DATABASE_URL })).toEqual({
      NODE_ENV: "development",
      auth: { mode: "disabled" },
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      API_READINESS_TIMEOUT_MS: 2000,
      REDIS_URL,
      DATABASE_URL,
    });
  });

  it("rejects a malformed Redis URL through ConfigError", () => {
    expect(() => loadConfig({ DATABASE_URL, REDIS_URL: "not-url" })).toThrow(
      expect.objectContaining({ invalidKeys: ["REDIS_URL"] }) as Error,
    );
  });

  it("requires DATABASE_URL", () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
  });

  it("rejects a non-postgres DATABASE_URL without echoing it", () => {
    const bad = "mysql://user:hunter2@db/evone";
    expect(() => loadConfig({ REDIS_URL, DATABASE_URL: bad })).toThrow(
      expect.objectContaining({ invalidKeys: ["DATABASE_URL"] }) as Error,
    );
    try {
      loadConfig({ REDIS_URL, DATABASE_URL: bad });
    } catch (error) {
      expect((error as Error).message).not.toContain("hunter2");
    }
  });

  it("coerces numeric variables from strings", () => {
    const config = loadConfig({
      REDIS_URL,
      DATABASE_URL,
      API_PORT: "8080",
      NODE_ENV: "production",
    });
    expect(config.API_PORT).toBe(8080);
    expect(config.NODE_ENV).toBe("production");
  });

  it.each([
    ["API_PORT", "not-a-port"],
    ["API_PORT", "70000"],
    ["API_PORT", "0"],
    ["NODE_ENV", "staging"],
    ["API_READINESS_TIMEOUT_MS", "5"],
  ])("rejects %s=%s", (key, value) => {
    expect(() => loadConfig({ REDIS_URL, DATABASE_URL, [key]: value })).toThrow(
      ConfigError,
    );
  });

  it("names invalid keys without echoing their values", () => {
    const secretLooking = "sk_live_should_never_be_printed";
    try {
      loadConfig({
        REDIS_URL,
        DATABASE_URL,
        API_PORT: secretLooking,
        NODE_ENV: secretLooking,
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const configError = error as ConfigError;
      expect(configError.invalidKeys.sort()).toEqual(["API_PORT", "NODE_ENV"]);
      expect(configError.message).toContain("API_PORT");
      expect(configError.message).not.toContain(secretLooking);
    }
  });
});
