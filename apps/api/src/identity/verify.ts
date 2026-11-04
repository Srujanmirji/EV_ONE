import { verifyToken } from "@clerk/backend";
import { decodeJwt } from "@clerk/backend/jwt";
import type { AuthConfig } from "./config.js";

export interface AuthenticatedActor {
  readonly subject: string;
  readonly issuer: string;
}
function numericDate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    Number.isFinite(new Date(value * 1000).getTime())
  );
}
export async function verifyActor(
  token: string,
  config: AuthConfig,
): Promise<AuthenticatedActor | null> {
  if (config.mode === "disabled" || token.length > 8192) return null;
  try {
    if (decodeJwt(token).header.alg !== "RS256") return null;
    const claims = await verifyToken(token, {
      jwtKey: config.jwtKey,
      issuer: config.issuer,
      audience: config.audience,
      authorizedParties: [config.authorizedParty],
      clockSkewInMs: 0,
    });
    const now = Date.now() / 1000;
    // The SDK permits absent audience/empty subject and extreme NumericDates.
    if (
      typeof claims.sub !== "string" ||
      !claims.sub.trim() ||
      claims.sub.length > 256 ||
      !(
        claims.aud === config.audience ||
        (Array.isArray(claims.aud) &&
          claims.aud.every(
            (value) => typeof value === "string" && value.length > 0,
          ) &&
          claims.aud.includes(config.audience))
      ) ||
      !numericDate(claims.exp) ||
      claims.exp <= now ||
      (claims.nbf !== undefined &&
        (!numericDate(claims.nbf) || claims.nbf > now)) ||
      (claims.iat !== undefined &&
        (!numericDate(claims.iat) || claims.iat > now))
    )
      return null;
    return Object.freeze({ subject: claims.sub, issuer: config.issuer });
  } catch {
    return null;
  }
}
