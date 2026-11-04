import { createPublicKey } from "node:crypto";
import { z } from "zod";

const localOrigin = z.url().refine((value) => {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      value === url.origin
    );
  } catch {
    return false;
  }
});
const issuer = z.url().refine((value) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".clerk.accounts.dev") &&
      value === url.origin
    );
  } catch {
    return false;
  }
});
const publicKey = z.string().refine((value) => {
  try {
    const key = createPublicKey(value);
    return (
      value.startsWith("-----BEGIN PUBLIC KEY-----") &&
      key.asymmetricKeyType === "rsa" &&
      key.asymmetricKeyDetails?.modulusLength === 2048 &&
      key.asymmetricKeyDetails?.publicExponent === 65537n
    );
  } catch {
    return false;
  }
});

export const authEnvSchema = z
  .discriminatedUnion("AUTH_MODE", [
    z.object({ AUTH_MODE: z.literal("disabled") }),
    z.object({
      AUTH_MODE: z.literal("clerk-local"),
      NODE_ENV: z.enum(["development", "test"]),
      API_HOST: z.enum(["127.0.0.1", "localhost", "::1"]),
      AUTH_ISSUER: issuer,
      AUTH_AUDIENCE: z.string().trim().min(1).max(256),
      AUTH_AUTHORIZED_PARTY: localOrigin,
      AUTH_JWT_KEY: publicKey,
    }),
  ])
  .transform((value) =>
    value.AUTH_MODE === "disabled"
      ? { mode: "disabled" as const }
      : {
          mode: "clerk-local" as const,
          issuer: value.AUTH_ISSUER,
          audience: value.AUTH_AUDIENCE,
          authorizedParty: value.AUTH_AUTHORIZED_PARTY,
          jwtKey: value.AUTH_JWT_KEY,
        },
  );
export type AuthConfig = z.infer<typeof authEnvSchema>;
