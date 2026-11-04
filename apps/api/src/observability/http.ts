import { performance } from "node:perf_hooks";
import type { Request, Response, NextFunction } from "express";
import { requestIdOf } from "../common/request-id.js";
import { logEvent, safeFields, type TelemetryFields } from "./telemetry.js";

export function requestFields(req: Request): TelemetryFields {
  const route = (req.route as { path?: unknown } | undefined)?.path;
  const method = [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ].includes(req.method)
    ? req.method
    : "OTHER";
  return safeFields({
    requestId: requestIdOf(req),
    method,
    // Express's matched template excludes query strings and concrete path parameters.
    ...(typeof route === "string" ? { route } : {}),
  });
}

export function httpTelemetry(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = performance.now();
  res.once("close", () => {
    logEvent(
      res.writableFinished ? "info" : "warn",
      res.writableFinished ? "http.completed" : "http.aborted",
      {
        ...requestFields(req),
        status: res.statusCode,
        durationMs: Math.round((performance.now() - start) * 100) / 100,
      },
    );
  });
  next();
}
