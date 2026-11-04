import { generateKeyPairSync } from "node:crypto";
import { request as httpRequest } from "node:http";
import type { INestApplication } from "@nestjs/common";
import { ErrorEnvelope, SessionResponse } from "@evone/contracts";
import { createEvoneClient } from "@evone/sdk";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { authEnv, authToken } from "../../test/auth-fixture.js";
import { createApp } from "../create-app.js";
import { loadConfig, ConfigError } from "../config/env.js";
import { verifyActor } from "./verify.js";

const baseEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://unused@127.0.0.1:1/unused",
  REDIS_URL: "redis://127.0.0.1:1",
};
const config = loadConfig({ ...baseEnv, ...authEnv });

describe("local Clerk configuration", () => {
  it("defaults to disabled with no key or provider access", () => {
    expect(loadConfig(baseEnv).auth).toEqual({ mode: "disabled" });
  });
  it.each([
    { NODE_ENV: "production" },
    { API_HOST: "0.0.0.0" },
    { API_HOST: "public.example" },
    { AUTH_ISSUER: "https://untrusted.example" },
    { AUTH_ISSUER: "not-a-url" },
    { AUTH_AUTHORIZED_PARTY: "not-a-url" },
    { AUTH_ISSUER: "https://evone-local.clerk.accounts.dev/path" },
    { AUTH_AUTHORIZED_PARTY: "https://remote.example" },
    { AUTH_AUTHORIZED_PARTY: "http://localhost:3000/path" },
    { AUTH_AUDIENCE: "" },
    { AUTH_JWT_KEY: "not-a-public-key" },
    { AUTH_MODE: "clerk" },
  ])("refuses invalid or production config %j", (override) => {
    expect(() => loadConfig({ ...baseEnv, ...authEnv, ...override })).toThrow(
      ConfigError,
    );
  });
  it("refuses missing keys without printing supplied values", () => {
    const invalid = {
      ...baseEnv,
      ...authEnv,
      AUTH_JWT_KEY: "synthetic-must-not-appear",
    };
    try {
      loadConfig(invalid);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).invalidKeys).toContain("AUTH_JWT_KEY");
      expect((error as Error).message).not.toContain(invalid.AUTH_JWT_KEY);
    }
  });
  it("refuses wrong RSA modulus and private PEM keys", () => {
    const keys = generateKeyPairSync("rsa", { modulusLength: 1024 });
    for (const key of [
      keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
      keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    ]) {
      expect(() =>
        loadConfig({ ...baseEnv, ...authEnv, AUTH_JWT_KEY: key }),
      ).toThrow(ConfigError);
    }
  });
});

describe("protected session HTTP contract", () => {
  let app: INestApplication;
  let disabled: INestApplication;
  let origin: string;
  let disabledOrigin: string;
  beforeAll(async () => {
    app = await createApp({ config, db: {} as never });
    disabled = await createApp({
      config: loadConfig(baseEnv),
      db: {} as never,
    });
    await app.listen(0, "127.0.0.1");
    await disabled.listen(0, "127.0.0.1");
    origin = await app.getUrl();
    disabledOrigin = await disabled.getUrl();
  });
  afterAll(async () => {
    await app.close();
    await disabled.close();
  });
  async function session(token?: string, target = origin) {
    return fetch(`${target}/api/v1/auth/session`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
  it("accepts actual SDK bearer requests and returns no identity or permissions", async () => {
    const client = createEvoneClient({ origin });
    const requestId = "6c59d74c-a13c-4bc8-8e0d-4a6b1b6a65c4";
    const result = await client.GET("/auth/session", {
      headers: {
        Authorization: `Bearer ${authToken({ email: "synthetic@example.invalid", roles: ["ADMIN"] })}`,
        "X-Request-ID": requestId,
      },
    });
    expect(result.response.status).toBe(200);
    expect(SessionResponse.parse(result.data)).toEqual({
      data: { authenticated: true },
      meta: { requestId },
    });
    expect(result.response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("extracts only the verified actor, ignoring roles and metadata", async () => {
    const actor = await verifyActor(
      authToken({ roles: ["ADMIN"], email: "synthetic@example.invalid" }),
      config.auth,
    );
    expect(actor).toEqual({
      subject: "user_local_synthetic",
      issuer: authEnv.AUTH_ISSUER,
    });
    expect(Object.isFrozen(actor)).toBe(true);
  });
  it("denies a valid token when auth is disabled", async () => {
    expect((await session(authToken(), disabledOrigin)).status).toBe(401);
  });
  it("never accepts cookies or query parameters as bearer credentials", async () => {
    const response = await fetch(
      `${origin}/api/v1/auth/session?token=${encodeURIComponent(authToken())}`,
      { headers: { Cookie: `__session=${authToken()}` } },
    );
    expect(response.status).toBe(401);
  });
  it.each([undefined, "malformed", "x".repeat(8193)])(
    "rejects absent/malformed/oversize tokens without exposing input",
    async (bearer) => {
      const response = await session(bearer);
      expect(response.status).toBe(401);
      expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(ErrorEnvelope.parse(await response.json()).error).toEqual({
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      });
    },
  );
  it.each([
    { exp: 1 },
    { exp: undefined },
    { exp: -1e20 },
    { exp: 1e20 },
    { nbf: Math.floor(Date.now() / 1000) + 3600 },
    { nbf: 1e20 },
    { iat: Math.floor(Date.now() / 1000) + 3600 },
    { iat: 1e20 },
    { iss: "https://untrusted.example" },
    { aud: "wrong" },
    { aud: undefined },
    { aud: [authEnv.AUTH_AUDIENCE, 123] },
    { azp: "https://untrusted.example" },
    { azp: undefined },
    { sub: "" },
    { sub: "   " },
  ])("rejects invalid signed claims %j", async (claims) => {
    expect((await session(authToken(claims))).status).toBe(401);
  });
  it("rejects tampering, wrong algorithm and a different pinned public key", async () => {
    const parts = authToken().split(".");
    parts[1] = Buffer.from(JSON.stringify({ sub: "tampered" })).toString(
      "base64url",
    );
    expect((await session(parts.join("."))).status).toBe(401);
    expect((await session(authToken({}, "RS512"))).status).toBe(401);
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const otherConfig = loadConfig({
      ...baseEnv,
      ...authEnv,
      AUTH_JWT_KEY: other.publicKey
        .export({ type: "spki", format: "pem" })
        .toString(),
    });
    expect(await verifyActor(authToken(), otherConfig.auth)).toBeNull();
  });
  it("rejects duplicate Authorization headers", async () => {
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const request = httpRequest(
        `${origin}/api/v1/auth/session`,
        {
          headers: {
            Authorization: [`Bearer ${authToken()}`, `Bearer ${authToken()}`],
          },
        },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      );
      request.on("error", reject);
      request.end();
    });
    expect(status).toBe(401);
  });
  it("keeps health and calculator public, including when auth is disabled", async () => {
    expect((await fetch(`${disabledOrigin}/api/v1/health/live`)).status).toBe(
      200,
    );
    const response = await fetch(
      `${disabledOrigin}/api/v1/calculators/ev-savings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyKm: 1000,
          fuelPriceInrPerLitre: 100,
          iceKmPerLitre: 15,
          evKwhPerKm: 0.15,
          electricityInrPerKwh: 8,
        }),
      },
    );
    expect(response.status).toBe(200);
  });
  it("does not log bearer tokens, subject or private claims", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const bearer = authToken({ email: "synthetic-private@example.invalid" });
      await session(bearer);
      await session(authToken({ aud: "wrong" }));
      const output = JSON.stringify(log.mock.calls);
      expect(output).not.toContain(bearer);
      expect(output).not.toContain("user_local_synthetic");
      expect(output).not.toContain("synthetic-private@example.invalid");
      expect(output).toContain("http.completed");
    } finally {
      log.mockRestore();
    }
  });
});
