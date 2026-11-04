import { verifyToken } from "@clerk/backend";
import { decodeJwt } from "@clerk/backend/jwt";
import type { AuthSpikeConfig } from "./config";

function numericDate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    Number.isFinite(new Date(value * 1000).getTime())
  );
}

export async function verifySpikeToken(
  token: string,
  config: AuthSpikeConfig,
): Promise<boolean> {
  try {
    if (token.length > 8192 || decodeJwt(token).header.alg !== "RS256")
      return false;
    const claims = await verifyToken(token, {
      jwtKey: config.jwtKey,
      issuer: config.issuer,
      audience: config.audience,
      authorizedParties: [config.origin],
      clockSkewInMs: 0,
    });
    const now = Date.now() / 1000;
    return (
      typeof claims.sub === "string" &&
      claims.sub.trim().length > 0 &&
      (claims.aud === config.audience ||
        (Array.isArray(claims.aud) &&
          claims.aud.every(
            (audience) => typeof audience === "string" && audience.length > 0,
          ) &&
          claims.aud.includes(config.audience))) &&
      numericDate(claims.exp) &&
      claims.exp > now &&
      (claims.nbf === undefined ||
        (numericDate(claims.nbf) && claims.nbf <= now)) &&
      (claims.iat === undefined ||
        (numericDate(claims.iat) && claims.iat <= now))
    );
  } catch {
    return false;
  }
}
