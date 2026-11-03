import { z } from "zod";
import { schemaRegistry } from "./registry.js";
import { defaultErrorResponse, routes } from "./routes.js";

export const API_BASE_PATH = "/api/v1";
const ref = (id: string) => `#/components/schemas/${id}`;

function refFor(schema: z.ZodType): { $ref: string } {
  const meta = schemaRegistry.get(schema);
  if (!meta) throw new Error("Route schema is not registered as a component.");
  return { $ref: ref(meta.id) };
}

/** OpenAPI 3.1 document generated from the Zod contracts. Deterministic. */
export function buildOpenApiDocument(): Record<string, unknown> {
  const generated = z.toJSONSchema(schemaRegistry, { uri: ref }) as {
    schemas: Record<string, Record<string, unknown>>;
  };
  const schemas: Record<string, unknown> = {};
  for (const id of Object.keys(generated.schemas).sort()) {
    // Per-component $schema/$id are redundant inside an OpenAPI document.
    const component = { ...generated.schemas[id] };
    delete component.$schema;
    delete component.$id;
    schemas[id] = component;
  }

  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of [...routes].sort((a, b) =>
    a.path.localeCompare(b.path),
  )) {
    const responses: Record<string, unknown> = {};
    for (const [status, response] of Object.entries(route.responses)) {
      responses[status] = {
        description: response.description,
        content: { "application/json": { schema: refFor(response.schema) } },
      };
    }
    responses.default = {
      description: defaultErrorResponse.description,
      content: {
        "application/json": { schema: refFor(defaultErrorResponse.schema) },
      },
    };
    paths[route.path] = {
      ...paths[route.path],
      [route.method]: {
        operationId: route.operationId,
        summary: route.summary,
        tags: [route.tag],
        responses,
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "EVONE API",
      version: "1.0.0",
      description:
        "Generated from @evone/contracts. Do not edit openapi.json by hand.",
    },
    servers: [{ url: API_BASE_PATH }],
    paths,
    components: { schemas },
  };
}
