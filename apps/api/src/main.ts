import { createDbClient } from "@evone/db";
import { ConfigError, loadConfig } from "./config/env.js";
import { createApp } from "./create-app.js";
import { DatabaseReadinessCheck } from "./database/database.check.js";
import { createFoundationQueue } from "./queue/foundation.js";
import { RedisReadinessCheck } from "./queue/redis.check.js";

async function main(): Promise<void> {
  const config = loadConfig(process.env);
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
  console.log(
    `EVONE API listening on http://${config.API_HOST}:${config.API_PORT}`,
  );
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
