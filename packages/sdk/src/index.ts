import createClient, { type Client, type ClientOptions } from "openapi-fetch";
import type { components, paths } from "./schema.js";

export type { components, paths } from "./schema.js";
export type Schemas = components["schemas"];

export interface EvoneClientOptions extends Omit<ClientOptions, "baseUrl"> {
  /** API origin, e.g. `http://127.0.0.1:4000`. `/api/v1` is appended. */
  origin: string;
}

/**
 * Typed client for the EVONE API, generated from @evone/contracts'
 * openapi.json. Paths, parameters and response bodies are checked at compile
 * time; responses are not re-validated at runtime.
 */
export function createEvoneClient({
  origin,
  ...options
}: EvoneClientOptions): Client<paths> {
  return createClient<paths>({
    baseUrl: `${origin.replace(/\/+$/, "")}/api/v1`,
    ...options,
  });
}
