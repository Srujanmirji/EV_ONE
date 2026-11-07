import type { NextRequest } from "next/server";
import { catalogueEditorConfig } from "@/lib/catalogue-editor/config";
import { forwardPrivateJson } from "@/lib/private-api-gateway";
export const dynamic = "force-dynamic";
async function gateway(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const config = catalogueEditorConfig();
  if (config.kind !== "ready")
    return Response.json(
      {
        error: {
          code:
            config.kind === "disabled" ? "NOT_FOUND" : "SERVICE_UNAVAILABLE",
          message: "Catalogue sign-in is unavailable",
        },
        meta: { requestId: crypto.randomUUID() },
      },
      {
        status: config.kind === "disabled" ? 404 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  const path = (await params).path?.join("/") ?? "";
  if (!/^drafts(?:\/[a-fA-F0-9-]{36}(?:\/(?:submit|review))?)?$/.test(path))
    return Response.json(
      {
        error: { code: "NOT_FOUND", message: "Not found" },
        meta: { requestId: crypto.randomUUID() },
      },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  return forwardPrivateJson(
    req,
    `admin/catalogue/${path}`,
    config.config.origin,
  );
}
export { gateway as GET, gateway as POST, gateway as PATCH };
