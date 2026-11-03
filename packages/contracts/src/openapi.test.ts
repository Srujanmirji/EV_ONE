import { describe, expect, it } from "vitest";
import { ErrorEnvelope, LiveResponse, ReadinessResponse } from "./index.js";
import { buildOpenApiDocument } from "./openapi.js";
import { routes, defaultErrorResponse } from "./routes.js";
import { schemaRegistry } from "./registry.js";

const doc = buildOpenApiDocument() as {
  openapi: string;
  paths: Record<string, Record<string, { operationId: string }>>;
  components: { schemas: Record<string, unknown> };
};

function collectRefs(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => collectRefs(n, out));
  else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string") out.push(value);
      else collectRefs(value, out);
    }
  }
  return out;
}

describe("OpenAPI document", () => {
  it("is OpenAPI 3.1 and deterministic", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(JSON.stringify(buildOpenApiDocument())).toBe(JSON.stringify(doc));
  });

  it("has an operation for every route with a unique operationId", () => {
    const ids = routes.map((r) => r.operationId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const route of routes) {
      expect(doc.paths[route.path]?.[route.method]?.operationId).toBe(
        route.operationId,
      );
    }
  });

  it("resolves every $ref to a component", () => {
    const refs = collectRefs(doc);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      const id = ref.replace("#/components/schemas/", "");
      expect(doc.components.schemas, ref).toHaveProperty(id);
    }
  });

  it("registers every schema a route exposes", () => {
    for (const route of routes) {
      for (const response of Object.values(route.responses)) {
        expect(schemaRegistry.get(response.schema)).toBeDefined();
      }
    }
    expect(schemaRegistry.get(defaultErrorResponse.schema)).toBeDefined();
  });
});

describe("contract schemas", () => {
  const meta = { requestId: "3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c" };

  it("accept valid envelopes", () => {
    expect(LiveResponse.parse({ data: { status: "ok" }, meta })).toBeTruthy();
    expect(
      ReadinessResponse.parse({
        data: {
          status: "ready",
          checks: [{ name: "database", status: "up" }],
          draining: false,
        },
        meta,
      }),
    ).toBeTruthy();
  });

  it("reject undocumented fields so drift cannot hide", () => {
    expect(() =>
      LiveResponse.parse({ data: { status: "ok", extra: 1 }, meta }),
    ).toThrow();
  });

  it("reject unknown error codes and non-UUID request ids", () => {
    expect(() =>
      ErrorEnvelope.parse({ error: { code: "TEAPOT", message: "x" }, meta }),
    ).toThrow();
    expect(() =>
      ErrorEnvelope.parse({
        error: { code: "NOT_FOUND", message: "x" },
        meta: { requestId: "1" },
      }),
    ).toThrow();
  });
});
