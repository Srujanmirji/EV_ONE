import {
  NodeClient,
  defaultStackParser,
  makeNodeTransport,
  type ErrorEvent,
} from "@sentry/node";
import { z } from "zod";
import { telemetryConfigSchema } from "./config.js";

const events = z.enum([
  "listing.operation_failed",
  "catalogue.editor_failed",
  "media.cleanup_failed",
  "media.operation_failed",
  "process.uncaught_exception",
  "process.unhandled_rejection",
  "api.started",
  "api.stopped",
  "api.start_failed",
  "api.shutdown_failed",
  "http.completed",
  "http.aborted",
  "http.failed",
  "worker.ready",
  "worker.stopped",
  "worker.shutdown_failed",
  "worker.start_failed",
  "queue.connection_failed",
  "worker.connection_failed",
  "worker.job_failed",
  "worker.job_retrying",
  "worker.job_completed",
  "telemetry.test",
  "telemetry.delivery_failed",
]);
const fieldsSchema = z.object({
  requestId: z.uuid().optional(),
  eventId: z.uuid().optional(),
  method: z
    .enum(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "OTHER"])
    .optional(),
  route: z
    .string()
    .regex(/^\/[A-Za-z0-9_/:{}.-]*$/)
    .max(200)
    .optional(),
  status: z.number().int().min(100).max(599).optional(),
  durationMs: z.number().finite().min(0).optional(),
  attempts: z.number().int().min(0).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  failedHooks: z.number().int().min(0).optional(),
  configKeys: z
    .array(
      z.enum([
        "NODE_ENV",
        "API_HOST",
        "API_PORT",
        "DATABASE_URL",
        "REDIS_URL",
        "API_READINESS_TIMEOUT_MS",
        "SENTRY_DSN",
        "MEDIA_MODE",
        "MEDIA_ENDPOINT",
        "MEDIA_BUCKET",
        "MEDIA_ACCESS_KEY_ID",
        "MEDIA_SECRET_ACCESS_KEY",
        "AUTH_MODE",
        "AUTH_ISSUER",
        "AUTH_AUDIENCE",
        "AUTH_AUTHORIZED_PARTY",
        "AUTH_JWT_KEY",
      ]),
    )
    .optional(),
});
const sentryFieldsSchema = fieldsSchema.omit({ configKeys: true });

export type TelemetryEvent = z.infer<typeof events>;
export type TelemetryFields = z.infer<typeof fieldsSchema>;
let client: NodeClient | undefined;
let deliveryFailed = false;

function markDeliveryFailed(): void {
  if (!deliveryFailed) logEvent("error", "telemetry.delivery_failed");
  deliveryFailed = true;
}

/** Drop everything outside the allowlist, including error text, headers and bodies. */
export function safeFields(fields: unknown): TelemetryFields {
  const result = fieldsSchema.safeParse(fields);
  return result.success ? result.data : {};
}

export function logEvent(
  level: "info" | "warn" | "error",
  event: TelemetryEvent,
  fields: TelemetryFields = {},
): void {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event: events.parse(event),
    ...safeFields(fields),
  });
  if (level === "info") console.log(line);
  else console.error(line);
}

/** Keep SDK enrichments, raw exceptions and request data out of transmitted events. */
export function scrubEvent(event: ErrorEvent): ErrorEvent | null {
  const kind = events.safeParse(event.message);
  if (!kind.success) return null;
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    level: "error",
    environment: z
      .enum(["development", "test", "production"])
      .optional()
      .catch(undefined)
      .parse(event.environment),
    platform: "node",
    message: kind.data,
    tags: sentryFieldsSchema.parse(safeFields(event.tags)),
    fingerprint: [kind.data, safeFields(event.tags).route ?? "process"],
  };
}

export function initTelemetry(env: NodeJS.ProcessEnv): void {
  const config = telemetryConfigSchema.safeParse(env);
  if (!config.success)
    throw new Error("Invalid telemetry configuration: SENTRY_DSN or NODE_ENV");
  if (!config.data.SENTRY_DSN) return;
  client = new NodeClient({
    dsn: config.data.SENTRY_DSN,
    environment: config.data.NODE_ENV,
    integrations: [],
    transport: (options) => {
      const transport = makeNodeTransport(options);
      return {
        async send(envelope) {
          try {
            const result = await transport.send(envelope);
            if (
              !result.statusCode ||
              result.statusCode < 200 ||
              result.statusCode >= 300
            )
              markDeliveryFailed();
            return result;
          } catch (error) {
            markDeliveryFailed();
            throw error;
          }
        },
        flush: (timeout) => transport.flush(timeout),
      };
    },
    stackParser: defaultStackParser,
    beforeSend: scrubEvent,
  });
  client.init();
}

export function reportError(
  event: TelemetryEvent,
  fields: TelemetryFields = {},
): string | undefined {
  logEvent("error", event, fields);
  // Raw messages/stacks can embed PII or credentials; correlate via route and IDs.
  return client?.captureEvent({
    level: "error",
    message: event,
    tags: sentryFieldsSchema.parse(safeFields(fields)),
  });
}

export async function closeTelemetry(): Promise<boolean> {
  const current = client;
  client = undefined;
  try {
    const flushed = current ? await current.close(2000) : true;
    if (!flushed) markDeliveryFailed();
    return flushed && !deliveryFailed;
  } catch {
    markDeliveryFailed();
    return false;
  } finally {
    deliveryFailed = false;
  }
}
