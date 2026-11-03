import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const REQUEST_ID_HEADER = "X-Request-ID";
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

declare module "express" {
  interface Request {
    requestId?: string;
  }
}

/**
 * Accepts a caller's X-Request-ID only when it is a UUID (so arbitrary text
 * never reaches logs or headers), otherwise issues a fresh one.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const inbound = req.header(REQUEST_ID_HEADER);
  const id =
    inbound && UUID.test(inbound) ? inbound.toLowerCase() : randomUUID();
  req.requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}

export function requestIdOf(req: Request): string {
  return req.requestId ?? randomUUID();
}
