import { it, expect } from "vitest";
import { loadConfig, ConfigError } from "../config/env.js";
import { authEnv } from "../../test/auth-fixture.js";
const env = {
  ...authEnv,
  NODE_ENV: "test",
  DATABASE_URL: "postgres://local:local@127.0.0.1/local",
  REDIS_URL: "redis://127.0.0.1:6379",
  MEDIA_MODE: "r2-local",
  MEDIA_ENDPOINT: "http://127.0.0.1:9000",
  MEDIA_BUCKET: "local-media",
  MEDIA_ACCESS_KEY_ID: "synthetic-key",
  MEDIA_SECRET_ACCESS_KEY: "synthetic-secret",
};
it("media is disabled by default and enabled only on a local authenticated API", () => {
  expect(loadConfig({ ...env, MEDIA_MODE: undefined }).media.mode).toBe(
    "disabled",
  );
  expect(loadConfig(env).media.mode).toBe("r2-local");
  for (const patch of [
    { NODE_ENV: "production" },
    { API_HOST: "0.0.0.0" },
    { AUTH_MODE: "disabled" },
    { MEDIA_ENDPOINT: "https://attacker.example" },
    { MEDIA_ENDPOINT: "not-a-url" },
    { MEDIA_ENDPOINT: "http://127.0.0.1:9000/path" },
    { MEDIA_SECRET_ACCESS_KEY: "" },
  ])
    expect(() => loadConfig({ ...env, ...patch })).toThrow(ConfigError);
});
it("configuration errors never contain secrets", () => {
  expect(() =>
    loadConfig({ ...env, MEDIA_ENDPOINT: "https://secret-value.example" }),
  ).toThrow(/MEDIA_ENDPOINT/);
  try {
    loadConfig({ ...env, MEDIA_ENDPOINT: "https://secret-value.example" });
  } catch (error) {
    expect(String(error)).not.toContain("secret-value");
  }
});
