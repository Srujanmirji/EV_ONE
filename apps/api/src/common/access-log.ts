import type { Logger } from "@evone/observability";
import type { NextFunction, Request, Response } from "express";
import { requestIdOf } from "./request-id.js";

/**
 * One line per request: method, path WITHOUT the query string (queries can
 * carry personal data), status, duration and request id. Never headers or
 * bodies. Health probes log at debug to keep logs readable.
 */
export function accessLog(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const started = process.hrtime.bigint();
    res.on("finish", () => {
      const fields = {
        requestId: requestIdOf(req),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Number((process.hrtime.bigint() - started) / 1_000_000n),
      };
      if (req.path.includes("/health/")) logger.debug("http.request", fields);
      else logger.info("http.request", fields);
    });
    next();
  };
}
