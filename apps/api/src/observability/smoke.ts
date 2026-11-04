import {
  initTelemetry,
  reportError,
  closeTelemetry,
  logEvent,
} from "./telemetry.js";

async function main(): Promise<number> {
  if (!process.env.SENTRY_DSN) throw new Error("SENTRY_DSN is required");
  initTelemetry(process.env);
  reportError("telemetry.test");
  return (await closeTelemetry()) ? 0 : 1;
}
main()
  .then((code) => process.exit(code))
  .catch(() => {
    logEvent("error", "telemetry.delivery_failed");
    process.exit(1);
  });
