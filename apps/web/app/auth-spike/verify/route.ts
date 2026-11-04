import { authSpikeConfig } from "../../../lib/auth-spike/config";
import { verifySpikeToken } from "../../../lib/auth-spike/verify";

export async function POST(request: Request) {
  const state = authSpikeConfig();
  const headers = { "Cache-Control": "no-store" };
  if (state.kind === "disabled")
    return new Response(null, { status: 404, headers });
  if (state.kind === "unconfigured")
    return Response.json({ verified: false }, { status: 503, headers });
  if (request.headers.get("Origin") !== state.config.origin) {
    return Response.json({ verified: false }, { status: 403, headers });
  }
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  const verified =
    Boolean(token) && (await verifySpikeToken(token, state.config));
  return Response.json({ verified }, { status: verified ? 200 : 401, headers });
}
