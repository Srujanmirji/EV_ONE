import type { INestApplication } from "@nestjs/common";
import { ErrorEnvelope, routes } from "@evone/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { API_PREFIX, createApp } from "../src/create-app.js";
import type { ReadinessCheck } from "../src/health/readiness.js";
import {
  cleanup,
  databaseUrl,
  db,
  model,
  publishedBrand,
  variant,
} from "./support.js";

// Contract tests: what the API serves must match @evone/contracts exactly.
// Fails on a served-but-undocumented route, a documented-but-missing route,
// a documented status with no request below, or a body that does not parse.

let app: INestApplication;
let base: string;
let dependencyUp = true;
const dependency: ReadinessCheck = {
  name: "database",
  check: () =>
    dependencyUp ? Promise.resolve() : Promise.reject(new Error("down")),
};

/** One concrete request per documented (operationId, status). */
let requests: Record<string, Record<string, string>> = {};

beforeAll(async () => {
  app = await createApp({
    config: loadConfig({ NODE_ENV: "test", DATABASE_URL: databaseUrl }),
    db,
    readinessChecks: [dependency],
  });
  await app.listen(0, "127.0.0.1");
  base = `${await app.getUrl()}/${API_PREFIX}`;

  const brand = await publishedBrand();
  const m = await model(brand.id);
  const v = await variant(m.id);
  requests = {
    getLiveness: { 200: "/health/live" },
    getReadiness: { 200: "/health/ready", 503: "/health/ready" },
    listBrands: { 200: "/brands" },
    listModels: {
      200: `/models?brandId=${brand.id}&limit=1`,
      400: "/models?limit=500",
    },
    getModel: {
      200: `/brands/${brand.slug}/models/${m.slug}`,
      404: `/brands/${brand.slug}/models/no-such-model`,
    },
    getVariant: {
      200: `/variants/${v.id}`,
      400: "/variants/not-a-uuid",
      404: "/variants/3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c",
    },
  };
});

afterAll(async () => {
  await app.close();
  await cleanup();
  await db.$disconnect();
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

  it("has a request for every documented response", () => {
    for (const route of routes) {
      for (const status of Object.keys(route.responses)) {
        expect(
          requests[route.operationId]?.[status],
          `${route.operationId} ${status}`,
        ).toBeDefined();
      }
    }
  });

  for (const route of routes) {
    for (const [status, response] of Object.entries(route.responses)) {
      it(`${route.operationId} ${status} matches its schema`, async () => {
        dependencyUp = !(
          route.operationId === "getReadiness" && status === "503"
        );
        const res = await fetch(
          `${base}${requests[route.operationId]![status]}`,
          {
            method: route.method.toUpperCase(),
          },
        );
        dependencyUp = true;
        expect(res.status).toBe(Number(status));
        const body: unknown = await res.json();
        const parsed = response.schema.safeParse(body);
        expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
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
