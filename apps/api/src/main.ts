import { installFatalHandlers } from "./observability/fatal.js";
import {
  initTelemetry,
  closeTelemetry,
  reportError,
  logEvent,
  safeFields,
} from "./observability/telemetry.js";
import { createDbClient } from "@evone/db";
import { ConfigError, loadConfig } from "./config/env.js";
import { createApp } from "./create-app.js";
import { DatabaseReadinessCheck } from "./database/database.check.js";
import { createFoundationQueue } from "./queue/foundation.js";
import { RedisReadinessCheck } from "./queue/redis.check.js";

installFatalHandlers();

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  initTelemetry(process.env);
  // Prisma connects lazily: startup does not wait for the database, and
  // readiness reports it down until it answers.
  const db = createDbClient(config.DATABASE_URL);
  const queue = createFoundationQueue(config.REDIS_URL);
  const app = await createApp({
    config,
    db,
    readinessChecks: [
      new DatabaseReadinessCheck(db),
      new RedisReadinessCheck(queue),
    ],
    shutdownHooks: [() => db.$disconnect(), () => queue.close()],
  });
  await app.listen(config.API_PORT, config.API_HOST);
  logEvent("info", "api.started");
}

main().catch(async (error: unknown) => {
  reportError(
    "api.start_failed",
    error instanceof ConfigError
      ? safeFields({ configKeys: error.invalidKeys })
      : {},
  );
  await closeTelemetry();
  process.exit(1);
});
