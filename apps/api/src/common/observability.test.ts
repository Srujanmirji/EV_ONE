import { createLogger } from "@evone/observability";
import type { INestApplication } from "@nestjs/common";
import { Controller, Get, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterEach, describe, expect, it } from "vitest";
import { accessLog } from "./access-log.js";
import { EnvelopeExceptionFilter } from "./http-exception.filter.js";
import { requestIdMiddleware } from "./request-id.js";

@Controller()
class ProbeController {
  @Get("ok")
  ok() {
    return { ok: true };
  }

  @Get("boom")
  boom(): never {
    throw new Error(
      "db failed for asha@example.in via postgresql://u:pw@db/evone",
    );
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

let app: INestApplication | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function start() {
  const lines: Record<string, unknown>[] = [];
  const reported: { error: unknown; tags: Record<string, string> }[] = [];
  const logger = createLogger({
    service: "api",
    level: "debug",
    write: (l) => lines.push(JSON.parse(l) as Record<string, unknown>),
  });
  app = await NestFactory.create(ProbeModule, { logger: false });
  app.use(requestIdMiddleware);
  app.use(accessLog(logger));
  app.useGlobalFilters(
    new EnvelopeExceptionFilter(logger, (error, tags) =>
      reported.push({ error, tags }),
    ),
  );
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl();
  return { lines, reported, get: (p: string) => fetch(`${base}${p}`) };
}

describe("request logging and error reporting", () => {
  it("logs one access line per request with request id and no query string", async () => {
    const t = await start();
    const res = await t.get("/ok?email=asha@example.in&phone=9876543210");
    const access = t.lines.find((l) => l.event === "http.request");
    expect(access).toMatchObject({
      method: "GET",
      path: "/ok",
      status: 200,
      requestId: res.headers.get("x-request-id"),
    });
    expect(typeof access?.durationMs).toBe("number");
    expect(JSON.stringify(t.lines)).not.toMatch(/asha|9876543210/);
  });

  it("logs and reports 5xx with the request id but without personal data", async () => {
    const t = await start();
    const res = await t.get("/boom");
    expect(res.status).toBe(500);
    const body = (await res.json()) as {
      error: { message: string };
      meta: { requestId: string };
    };
    expect(body.error.message).toBe("Something went wrong");
    const errorLine = t.lines.find((l) => l.event === "http.error");
    expect(errorLine).toMatchObject({
      requestId: body.meta.requestId,
      status: 500,
      error: "Error",
    });
    expect(JSON.stringify(t.lines)).not.toMatch(/asha|u:pw/);
    expect(t.reported).toHaveLength(1);
    expect(t.reported[0]?.tags).toEqual({
      requestId: body.meta.requestId,
      route: "GET /boom",
    });
  });

  it("does not report expected 4xx errors", async () => {
    const t = await start();
    expect((await t.get("/missing")).status).toBe(404);
    expect(t.reported).toEqual([]);
    expect(t.lines.find((l) => l.event === "http.request")).toMatchObject({
      status: 404,
    });
  });
});
