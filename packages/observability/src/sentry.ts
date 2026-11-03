import * as Sentry from "@sentry/node";
import { redact } from "./redact.js";

export interface ErrorTrackingOptions {
  /** Without a DSN error tracking is off (local, CI, or not yet configured). */
  dsn?: string;
  environment: string;
  service: string;
  release?: string;
  /** Tests inject a transport that captures envelopes instead of sending. */
  transport?: Parameters<typeof Sentry.init>[0] extends infer O
    ? O extends { transport?: infer T }
      ? T
      : never
    : never;
}

/**
 * Sentry with privacy defaults: no default PII, no request bodies, cookies
 * or headers, no performance tracing by default, and every event and
 * breadcrumb run through `redact` before it leaves the process.
 */
export function initErrorTracking(options: ErrorTrackingOptions): boolean {
  if (!options.dsn) return false;
  Sentry.init({
    dsn: options.dsn,
    environment: options.environment,
    release: options.release,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    initialScope: { tags: { service: options.service } },
    ...(options.transport ? { transport: options.transport } : {}),
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
        if (event.request.url)
          event.request.url = event.request.url.split("?")[0];
        delete event.request.query_string;
      }
      delete event.user;
      return redact(event);
    },
    beforeBreadcrumb(breadcrumb) {
      return redact(breadcrumb);
    },
  });
  return true;
}

export function captureError(
  error: unknown,
  tags: Record<string, string> = {},
): void {
  if (!Sentry.isInitialized()) return;
  Sentry.withScope((scope) => {
    scope.setTags(tags);
    Sentry.captureException(error);
  });
}

/** An operator alert with identifiers only (no payloads). */
export function captureAlert(
  message: string,
  tags: Record<string, string> = {},
): void {
  if (!Sentry.isInitialized()) return;
  Sentry.withScope((scope) => {
    scope.setTags(tags);
    scope.setLevel("error");
    scope.setFingerprint([message, ...Object.values(tags).slice(0, 2)]);
    Sentry.captureMessage(message);
  });
}

export const flushErrorTracking = (timeoutMs = 2000) => Sentry.flush(timeoutMs);
export { Sentry };
