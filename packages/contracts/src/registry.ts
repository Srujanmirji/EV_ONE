import { z } from "zod";

/**
 * Schemas registered here become named OpenAPI components
 * (`#/components/schemas/<id>`). Register every schema a route exposes.
 */
export const schemaRegistry = z.registry<{
  id: string;
  description?: string;
}>();

export function component<T extends z.ZodType>(
  id: string,
  schema: T,
  description?: string,
): T {
  schemaRegistry.add(schema, description ? { id, description } : { id });
  return schema;
}
