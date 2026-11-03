import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./env.js";

describe("loadConfig", () => {
  it("applies safe local defaults", () => {
    expect(loadConfig({})).toEqual({
      NODE_ENV: "development",
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      API_READINESS_TIMEOUT_MS: 2000,
    });
  });

  it("coerces numeric variables from strings", () => {
    const config = loadConfig({ API_PORT: "8080", NODE_ENV: "production" });
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
    expect(() => loadConfig({ [key]: value })).toThrow(ConfigError);
  });

  it("names invalid keys without echoing their values", () => {
    const secretLooking = "sk_live_should_never_be_printed";
    try {
      loadConfig({ API_PORT: secretLooking, NODE_ENV: secretLooking });
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
