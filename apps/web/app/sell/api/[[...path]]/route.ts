import type { NextRequest } from "next/server";
import { sellConfig } from "@/lib/sell/config";
import { forwardPrivateJson } from "@/lib/private-api-gateway";
export const dynamic = "force-dynamic";
async function gateway(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const config = sellConfig();
  if (config.kind !== "ready")
    return Response.json(
      {
        error: {
          code:
            config.kind === "disabled" ? "NOT_FOUND" : "SERVICE_UNAVAILABLE",
          message: "Seller sign-in is unavailable",
        },
        meta: { requestId: crypto.randomUUID() },
      },
      {
        status: config.kind === "disabled" ? 404 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  const path = (await params).path?.join("/") ?? "";
  const allowed =
    /^(?:seller\/listings|listings(?:\/[a-fA-F0-9-]{36}(?:\/submit|\/media(?:\/[a-fA-F0-9-]{36})?)?)?|media\/(?:presign|[a-fA-F0-9-]{36}\/(?:complete|read-url))|brands(?:\/[a-z0-9-]+\/models\/[a-z0-9-]+)?|models)$/;
  if (!allowed.test(path))
    return Response.json(
      {
        error: { code: "NOT_FOUND", message: "Not found" },
        meta: { requestId: crypto.randomUUID() },
      },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  return forwardPrivateJson(req, path, config.config.origin);
}
export { gateway as GET, gateway as POST, gateway as PATCH, gateway as DELETE };
