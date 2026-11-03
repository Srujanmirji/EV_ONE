import { createDbClient } from "@evone/db";
import {
  captureError,
  createLogger,
  flushErrorTracking,
  initErrorTracking,
} from "@evone/observability";
import { ConfigError, loadConfig } from "./config/env.js";
import { createApp } from "./create-app.js";
import { DatabaseReadinessCheck } from "./database/database.check.js";

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  // Prisma connects lazily: startup does not wait for the database, and
  // readiness reports it down until it answers.
  const logger = createLogger({ service: "api", level: config.LOG_LEVEL });
  const tracking = initErrorTracking({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    service: "api",
    release: config.APP_RELEASE,
  });
  const db = createDbClient(config.DATABASE_URL);
  const app = await createApp({
    config,
    db,
    readinessChecks: [new DatabaseReadinessCheck(db)],
    shutdownHooks: [
      () => db.$disconnect(),
      () => flushErrorTracking().then(() => undefined),
    ],
    logger,
    reportError: captureError,
  });
  await app.listen(config.API_PORT, config.API_HOST);
  logger.info("api.started", {
    host: config.API_HOST,
    port: config.API_PORT,
    errorTracking: tracking,
  });
}

main().catch((error: unknown) => {
  if (error instanceof ConfigError) {
    console.error(error.message);
  } else {
    // Print only the error name and message: driver errors can embed hosts.
    const { name, message } =
      error instanceof Error
        ? error
        : { name: "Error", message: String(error) };
    console.error(`EVONE API failed to start: ${name}: ${message}`);
  }
  process.exit(1);
});
