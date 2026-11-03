import {
  captureAlert,
  flushErrorTracking,
  initErrorTracking,
} from "@evone/observability";
import { loadConfig } from "./config/env.js";

/**
 * EV-019 acceptance: sends one test alert to the configured Sentry project.
 * Usage: SENTRY_DSN=… DATABASE_URL=… pnpm --filter @evone/api sentry:test
 * Then confirm "sentry.test_alert" arrived and that its tags hold no PII.
 */
const config = loadConfig(process.env);
if (
  !initErrorTracking({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    service: "api",
    release: config.APP_RELEASE,
  })
) {
  console.error("SENTRY_DSN is not set; nothing was sent.");
  process.exit(1);
}
captureAlert("sentry.test_alert", {
  source: "sentry:test",
  sentAt: new Date().toISOString(),
});
const delivered = await flushErrorTracking(5000);
console.log(
  delivered
    ? "Test alert sent. Check the Sentry project."
    : "Timed out sending the test alert.",
);
process.exit(delivered ? 0 : 1);
