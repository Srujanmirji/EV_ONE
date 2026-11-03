import type { INestApplication } from "@nestjs/common";
import { ErrorEnvelope, routes } from "@evone/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "./config/env.js";
import { API_PREFIX, createApp } from "./create-app.js";
import type { ReadinessCheck } from "./health/readiness.js";

// Contract tests: what the API serves must match @evone/contracts exactly.
// A served-but-undocumented route, a documented-but-missing route, or a body
// with an undocumented field fails here.

let app: INestApplication;
let base: string;
let dependencyUp = true;
const dependency: ReadinessCheck = {
  name: "database",
  check: () =>
    dependencyUp ? Promise.resolve() : Promise.reject(new Error("down")),
};

beforeAll(async () => {
  app = await createApp({
    config: loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://unused@127.0.0.1:1/x",
    }),
    readinessChecks: [dependency],
  });
  await app.listen(0, "127.0.0.1");
  base = `${await app.getUrl()}/${API_PREFIX}`;
});

afterAll(async () => {
  await app.close();
});

interface Layer {
  route?: { path: string; methods: Record<string, boolean> };
}

function servedRoutes(): string[] {
  // Express 5 keeps its route table on `router.stack`; read-only use.
  const express = app.getHttpAdapter().getInstance() as unknown as {
    router: { stack: Layer[] };
  };
  return express.router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route!.methods).map(
        (method) => `${method} ${layer.route!.path}`,
      ),
    )
    .sort();
}

describe("API contract", () => {
  it("serves exactly the documented routes", () => {
    const documented = routes
      .map(
        (r) =>
          `${r.method} /${API_PREFIX}${r.path.replace(/\{(\w+)\}/g, ":$1")}`,
      )
      .sort();
    expect(servedRoutes()).toEqual(documented);
  });

  for (const route of routes) {
    for (const [status, response] of Object.entries(route.responses)) {
      it(`${route.operationId} ${status} matches its schema`, async () => {
        // Readiness 503 needs a failing dependency; everything else is healthy.
        dependencyUp = status !== "503";
        const res = await fetch(`${base}${route.path}`, {
          method: route.method.toUpperCase(),
        });
        expect(res.status).toBe(Number(status));
        const body: unknown = await res.json();
        expect(() => response.schema.parse(body)).not.toThrow();
        dependencyUp = true;
      });
    }
  }

  it("errors use the contract error envelope", async () => {
    const res = await fetch(`${base}/no-such-route`);
    expect(res.status).toBe(404);
    const body: unknown = await res.json();
    expect(() => ErrorEnvelope.parse(body)).not.toThrow();
  });
});
