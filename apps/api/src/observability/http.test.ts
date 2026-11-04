import type { INestApplication } from "@nestjs/common";
import { afterEach, expect, it, vi } from "vitest";
import { createApp } from "../create-app.js";
import { loadConfig } from "../config/env.js";

let app: INestApplication | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.restoreAllMocks();
});

it("correlates concurrent responses/errors with IDs and excludes request PII from logs", async () => {
  const logs: string[] = [];
  vi.spyOn(console, "log").mockImplementation((line: unknown) => {
    logs.push(String(line));
  });
  vi.spyOn(console, "error").mockImplementation((line: unknown) => {
    logs.push(String(line));
  });
  app = await createApp({
    config: loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://unused@127.0.0.1:1/unused",
      REDIS_URL: "redis://127.0.0.1:1",
    }),
    // No DB needed: public catalogue request intentionally raises a 500.
    db: {} as never,
  });
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl();
  const ids = [
    "6c59d74c-a13c-4bc8-8e0d-4a6b1b6a65c4",
    "03d5c2e6-3cb0-4330-8130-e2aa64015d0d",
  ];
  const responses = await Promise.all(
    ids.map((id) =>
      fetch(`${base}/api/v1/brands`, {
        headers: {
          "X-Request-ID": id,
          authorization: "Bearer should_not_log",
          cookie: "should_not_log",
        },
      }),
    ),
  );
  for (let i = 0; i < responses.length; i++) {
    const res = responses[i]!;
    expect(res.status).toBe(500);
    expect(res.headers.get("X-Request-ID")).toBe(ids[i]);
    expect(await res.json()).toMatchObject({ meta: { requestId: ids[i] } });
  }
  await fetch(`${base}/api/v1/unknown/should_not_log?email=should_not_log`, {
    headers: { "X-Request-ID": "should_not_log" },
  });
  expect(logs.join("\n")).not.toContain("should_not_log");
  for (const id of ids) {
    expect(
      logs.some((line) => line.includes(id) && line.includes("http.failed")),
    ).toBe(true);
    expect(
      logs.some((line) => line.includes(id) && line.includes("http.completed")),
    ).toBe(true);
  }
  expect(logs.map((line) => JSON.parse(line) as unknown)).toContainEqual(
    expect.objectContaining({ route: "/api/v1/brands", status: 500 }),
  );
});
