import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { ErrorEnvelope } from "@evone/contracts";
import { requestFields } from "../observability/http.js";
import { reportError } from "../observability/telemetry.js";
import { requestIdOf } from "./request-id.js";
import { RequestValidationError } from "./validation.js";

type ErrorCode = ErrorEnvelope["error"]["code"];

const CODES: Record<number, ErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  409: "CONFLICT",
  422: "VALIDATION_ERROR",
  429: "RATE_LIMITED",
  503: "SERVICE_UNAVAILABLE",
};

/**
 * Renders every failure in the API_CONTRACT error envelope. Unexpected errors
 * become a generic 500 so stack traces and internals never reach clients.
 */
@Catch()
export class EnvelopeExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= 500)
      reportError("http.failed", { ...requestFields(req), status });
    const code = CODES[status] ?? (status >= 500 ? "INTERNAL_ERROR" : "ERROR");
    const message =
      isHttp && status < 500
        ? exception.message
        : status === 503
          ? "Service unavailable"
          : "Something went wrong";

    if (exception instanceof RequestValidationError) {
      const invalid: ErrorEnvelope = {
        error: { code: "VALIDATION_ERROR", message, fields: exception.fields },
        meta: { requestId: requestIdOf(req) },
      };
      res.status(status).json(invalid);
      return;
    }
    const body: ErrorEnvelope = {
      error: { code, message },
      meta: { requestId: requestIdOf(req) },
    };
    res.status(status).json(body);
  }
}
