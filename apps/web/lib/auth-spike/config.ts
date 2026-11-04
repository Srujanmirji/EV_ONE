import { createPublicKey } from "node:crypto";

export interface AuthSpikeConfig {
  publishableKey: string;
  issuer: string;
  audience: string;
  origin: string;
  jwtKey: string;
}

export function authSpikeConfig(
  env: Record<string, string | undefined> = process.env,
):
  | { kind: "disabled" }
  | { kind: "unconfigured" }
  | { kind: "ready"; config: AuthSpikeConfig } {
  if (env.NODE_ENV !== "development" || env.AUTH_SPIKE_ENABLED !== "true") {
    return { kind: "disabled" };
  }
  try {
    const issuer = new URL(env.AUTH_SPIKE_CLERK_ISSUER ?? "");
    const origin = new URL(env.AUTH_SPIKE_ORIGIN ?? "");
    const publishableKey = env.AUTH_SPIKE_CLERK_PUBLISHABLE_KEY ?? "";
    const audience = env.AUTH_SPIKE_AUDIENCE ?? "";
    const jwtKey = env.AUTH_SPIKE_CLERK_JWT_KEY ?? "";
    const key = createPublicKey(jwtKey);
    if (
      issuer.protocol !== "https:" ||
      !issuer.hostname.endsWith(".clerk.accounts.dev") ||
      issuer.href !== `${issuer.origin}/` ||
      !["http:", "https:"].includes(origin.protocol) ||
      !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname) ||
      origin.href !== `${origin.origin}/` ||
      !publishableKey.startsWith("pk_test_") ||
      Buffer.from(publishableKey.slice(8), "base64").toString() !==
        `${issuer.hostname}$` ||
      !audience.trim() ||
      !jwtKey.startsWith("-----BEGIN PUBLIC KEY-----") ||
      key.asymmetricKeyType !== "rsa" ||
      key.asymmetricKeyDetails?.modulusLength !== 2048 ||
      key.asymmetricKeyDetails?.publicExponent !== 65537n
    ) {
      return { kind: "unconfigured" };
    }
    return {
      kind: "ready",
      config: {
        publishableKey,
        issuer: issuer.origin,
        audience,
        origin: origin.origin,
        jwtKey,
      },
    };
  } catch {
    return { kind: "unconfigured" };
  }
}
