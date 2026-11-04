import { generateKeyPairSync, sign } from "node:crypto";

const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
export const authEnv = {
  AUTH_MODE: "clerk-local",
  AUTH_ISSUER: "https://evone-local.clerk.accounts.dev",
  AUTH_AUDIENCE: "evone-api-development",
  AUTH_AUTHORIZED_PARTY: "http://127.0.0.1:3000",
  AUTH_JWT_KEY: keys.publicKey
    .export({ type: "spki", format: "pem" })
    .toString(),
};

export function authToken(claims: Record<string, unknown> = {}, alg = "RS256") {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg, typ: "JWT", kid: "synthetic" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: "user_local_synthetic",
      iss: authEnv.AUTH_ISSUER,
      aud: authEnv.AUTH_AUDIENCE,
      azp: authEnv.AUTH_AUTHORIZED_PARTY,
      iat: now - 2,
      nbf: now - 2,
      exp: now + 60,
      ...claims,
    }),
  ).toString("base64url");
  const body = `${header}.${payload}`;
  return `${body}.${sign(alg === "RS512" ? "RSA-SHA512" : "RSA-SHA256", Buffer.from(body), keys.privateKey).toString("base64url")}`;
}
