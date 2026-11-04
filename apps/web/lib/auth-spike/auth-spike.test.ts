import { generateKeyPairSync, sign } from "node:crypto";
import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyToken } from "@clerk/backend";
import { POST } from "../../app/auth-spike/verify/route";
import { authSpikeConfig } from "./config";
import { verifySpikeToken } from "./verify";

const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = keys.publicKey.export({ type: "spki", format: "pem" }).toString();
const issuer = "https://evone-spike.clerk.accounts.dev";
const origin = "http://127.0.0.1:3000";
const config = {
  publishableKey: `pk_test_${Buffer.from("evone-spike.clerk.accounts.dev$").toString("base64")}`,
  issuer,
  audience: "evone-api-development",
  origin,
  jwtKey: pem,
};
const env = {
  NODE_ENV: "development",
  AUTH_SPIKE_ENABLED: "true",
  AUTH_SPIKE_CLERK_PUBLISHABLE_KEY: config.publishableKey,
  AUTH_SPIKE_CLERK_ISSUER: issuer,
  AUTH_SPIKE_AUDIENCE: config.audience,
  AUTH_SPIKE_ORIGIN: origin,
  AUTH_SPIKE_CLERK_JWT_KEY: pem,
};
function token(
  claims: Record<string, unknown> = {},
  alg = "RS256",
  kid = "first",
  signingKey = keys.privateKey,
) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg, typ: "JWT", kid })).toString(
    "base64url",
  );
  const payload = Buffer.from(
    JSON.stringify({
      sub: "user_synthetic_spike",
      iss: issuer,
      aud: config.audience,
      azp: origin,
      iat: now - 2,
      nbf: now - 2,
      exp: now + 60,
      ...claims,
    }),
  ).toString("base64url");
  const body = `${header}.${payload}`;
  return `${body}.${sign(alg === "RS512" ? "RSA-SHA512" : "RSA-SHA256", Buffer.from(body), signingKey).toString("base64url")}`;
}

afterEach(() => vi.unstubAllEnvs());

describe("Clerk development spike configuration", () => {
  it.each(["production", "test"])(
    "is disabled in %s even with complete config",
    (NODE_ENV) => {
      expect(authSpikeConfig({ ...env, NODE_ENV })).toEqual({
        kind: "disabled",
      });
    },
  );
  it("requires explicit opt-in", () => {
    expect(authSpikeConfig({ ...env, AUTH_SPIKE_ENABLED: "false" })).toEqual({
      kind: "disabled",
    });
  });
  it.each(
    Object.keys(env).filter(
      (key) => !["NODE_ENV", "AUTH_SPIKE_ENABLED"].includes(key),
    ),
  )("stays unavailable without %s", (key) => {
    expect(authSpikeConfig({ ...env, [key]: "" })).toEqual({
      kind: "unconfigured",
    });
  });
  it("accepts a consistent development instance and loopback origin", () => {
    expect(authSpikeConfig(env)).toEqual({ kind: "ready", config });
  });
  it.each([
    { AUTH_SPIKE_CLERK_ISSUER: "https://evil.example" },
    { AUTH_SPIKE_ORIGIN: "https://app.example" },
    { AUTH_SPIKE_CLERK_PUBLISHABLE_KEY: "pk_live_rejected" },
    { AUTH_SPIKE_CLERK_ISSUER: "https://another.clerk.accounts.dev" },
    { AUTH_SPIKE_ORIGIN: "http://127.0.0.1:3000/path" },
    { AUTH_SPIKE_CLERK_JWT_KEY: "not-a-public-key" },
  ])("rejects invalid or non-local configuration %j", (override) => {
    expect(authSpikeConfig({ ...env, ...override })).toEqual({
      kind: "unconfigured",
    });
  });
});

describe("actual Clerk SDK token verification", () => {
  it("accepts an ephemeral RSA token with all expected claims", async () => {
    expect(await verifySpikeToken(token(), config)).toBe(true);
  });
  it.each([
    { exp: 1 },
    { exp: undefined },
    { exp: -1e20 },
    { exp: 1e20 },
    { nbf: 1e20 },
    { iat: 1e20 },
    { sub: "   " },
    { nbf: Math.floor(Date.now() / 1000) + 3600 },
    { iat: Math.floor(Date.now() / 1000) + 3600 },
    { iss: "https://wrong.example" },
    { aud: "wrong-api" },
    { aud: [config.audience, 123] },
    { aud: undefined },
    { azp: "https://wrong.example" },
    { azp: undefined },
    { sub: "" },
  ])("rejects claims %j", async (claims) => {
    expect(await verifySpikeToken(token(claims), config)).toBe(false);
  });
  it("rejects tampering and malformed input", async () => {
    const valid = token();
    const parts = valid.split(".");
    parts[1] = Buffer.from(JSON.stringify({ sub: "user_tampered" })).toString(
      "base64url",
    );
    expect(await verifySpikeToken(parts.join("."), config)).toBe(false);
    expect(await verifySpikeToken("not-a-token", config)).toBe(false);
  });
  it("pins RS256 even when another RSA algorithm has a valid signature", async () => {
    expect(await verifySpikeToken(token({}, "RS512"), config)).toBe(false);
  });
  it("fails closed with the wrong pinned public key", async () => {
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
    expect(
      await verifySpikeToken(token(), {
        ...config,
        jwtKey: other.publicKey
          .export({ type: "spki", format: "pem" })
          .toString(),
      }),
    ).toBe(false);
  });
  it("proves SDK remote JWKS lookup, unknown-key rejection, rotation lookup and outage", async () => {
    let available = true;
    let kid = "first";
    let remoteKey = keys.publicKey;
    const requests: string[] = [];
    const server = createServer((request, response) => {
      requests.push(request.url ?? "");
      response.writeHead(available ? 200 : 503, {
        "Content-Type": "application/json",
      });
      response.end(
        JSON.stringify(
          available
            ? {
                keys: [
                  {
                    ...remoteKey.export({ format: "jwk" }),
                    kid,
                    alg: "RS256",
                    use: "sig",
                  },
                ],
              }
            : { errors: [] },
        ),
      );
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    try {
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("No local test port");
      const options = {
        issuer,
        audience: config.audience,
        authorizedParties: [origin],
        apiUrl: `http://127.0.0.1:${address.port}`,
        secretKey: "synthetic-local-only",
        skipJwksCache: true,
      };
      await expect(verifyToken(token(), options)).resolves.toMatchObject({
        sub: "user_synthetic_spike",
      });
      await expect(
        verifyToken(token({}, "RS256", "unknown"), options),
      ).rejects.toBeDefined();
      kid = "rotated";
      const rotatedKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
      remoteKey = rotatedKeys.publicKey;
      await expect(
        verifyToken(token({}, "RS256", kid, rotatedKeys.privateKey), options),
      ).resolves.toMatchObject({ sub: "user_synthetic_spike" });
      available = false;
      await expect(verifyToken(token(), options)).rejects.toBeDefined();
      expect(requests.every((path) => path === "/v1/jwks")).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  }, 15000);
});

describe("isolated development verification route", () => {
  function request(bearer = token(), requestOrigin: string | null = origin) {
    const headers = new Headers({ Authorization: `Bearer ${bearer}` });
    if (requestOrigin) headers.set("Origin", requestOrigin);
    return new Request(`${origin}/auth-spike/verify`, {
      method: "POST",
      headers,
    });
  }
  function configure() {
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  }
  it("is inaccessible in production, even if explicitly enabled", async () => {
    configure();
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(request())).status).toBe(404);
  });
  it("reports missing config without contacting Clerk", async () => {
    configure();
    vi.stubEnv("AUTH_SPIKE_CLERK_PUBLISHABLE_KEY", "");
    expect((await POST(request())).status).toBe(503);
  });
  it.each([null, "https://untrusted.example"])(
    "rejects origin %s",
    async (requestOrigin) => {
      configure();
      expect((await POST(request(token(), requestOrigin))).status).toBe(403);
    },
  );
  it("returns only verification status, with no identity/token or caching", async () => {
    configure();
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ verified: true });
  });
  it.each(["", "invalid", "x".repeat(8193)])(
    "rejects missing/malformed/oversize bearer without leaking it",
    async (bearer) => {
      configure();
      const response = await POST(request(bearer));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ verified: false });
    },
  );
});
