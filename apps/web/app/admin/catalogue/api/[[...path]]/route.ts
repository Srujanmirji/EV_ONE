import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { catalogueEditorConfig } from "@/lib/catalogue-editor/config";

export const dynamic = "force-dynamic";
function failure(status: number, message: string) {
  return Response.json(
    {
      error: {
        code:
          status === 401
            ? "UNAUTHENTICATED"
            : status === 403
              ? "FORBIDDEN"
              : status === 404
                ? "NOT_FOUND"
                : status === 503
                  ? "SERVICE_UNAVAILABLE"
                  : "BAD_REQUEST",
        message,
      },
      meta: { requestId: randomUUID() },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 401 ? { "WWW-Authenticate": "Bearer" } : {}),
      },
    },
  );
}
async function gateway(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const config = catalogueEditorConfig();
  if (config.kind === "disabled") return failure(404, "Not found");
  if (config.kind !== "ready")
    return failure(503, "Catalogue sign-in is not configured");
  const path = (await params).path?.join("/") ?? "";
  if (!/^drafts(?:\/[a-fA-F0-9-]{36}(?:\/(?:submit|review))?)?$/.test(path))
    return failure(404, "Not found");
  if (
    req.headers.get("origin") &&
    req.headers.get("origin") !== config.config.origin
  )
    return failure(403, "Origin not allowed");
  const authorization = req.headers.get("authorization") ?? "";
  if (
    !/^Bearer [A-Za-z0-9_.-]+$/.test(authorization) ||
    authorization.length > 8200
  )
    return failure(401, "Sign in before continuing");
  try {
    const origin = new URL(process.env.API_BASE_URL ?? "");
    if (
      origin.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname) ||
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== "/"
    )
      return failure(503, "Local catalogue API is not configured");
    let body: string | undefined;
    if (req.method !== "GET") {
      if (!req.headers.get("content-type")?.startsWith("application/json"))
        return failure(400, "JSON body required");
      const reader = req.body?.getReader();
      if (!reader) return failure(400, "JSON body required");
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > 131072) {
            await reader.cancel();
            return failure(413, "Draft is too large");
          }
          chunks.push(chunk.value);
        }
      } finally {
        reader.releaseLock();
      }
      body = Buffer.concat(chunks).toString("utf8");
    }
    const upstream = await fetch(
      `${origin.origin}/api/v1/admin/catalogue/${path}${new URL(req.url).search}`,
      {
        method: req.method,
        headers: {
          Authorization: authorization,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      },
    );
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...(upstream.status === 401 ? { "WWW-Authenticate": "Bearer" } : {}),
      },
    });
  } catch {
    return failure(503, "Catalogue API is unavailable. Retry shortly.");
  }
}
export { gateway as GET, gateway as POST, gateway as PATCH };
