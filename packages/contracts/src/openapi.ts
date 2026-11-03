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

function parametersFor(
  schema: z.ZodObject | undefined,
  location: "path" | "query",
): Record<string, unknown>[] {
  if (!schema) return [];
  // "input" describes what a client sends (before defaults/coercion).
  // Registered schemas (e.g. VehicleType) come out as `#/$defs/<id>`;
  // point those at the shared OpenAPI components instead of inlining.
  const raw = z.toJSONSchema(schema, { io: "input", metadata: schemaRegistry });
  const json = JSON.parse(
    JSON.stringify(raw).replaceAll('"#/$defs/', '"#/components/schemas/'),
  ) as {
    properties?: Record<string, Record<string, unknown>>;
    required?: string[];
  };
  return Object.entries(json.properties ?? {}).map(([name, property]) => {
    const { $schema: _ignored, ...rest } = property;
    void _ignored;
    return {
      name,
      in: location,
      required: location === "path" || (json.required ?? []).includes(name),
      schema: rest,
    };
  });
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
    const parameters = [
      ...parametersFor(route.params, "path"),
      ...parametersFor(route.query, "query"),
    ];
    paths[route.path] = {
      ...paths[route.path],
      [route.method]: {
        operationId: route.operationId,
        summary: route.summary,
        tags: [route.tag],
        ...(parameters.length > 0 ? { parameters } : {}),
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
