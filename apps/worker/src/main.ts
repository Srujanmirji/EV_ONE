import { once } from "node:events";
import { createRedisConnection } from "@evone/queue";
import { loadWorkerConfig, WorkerConfigError } from "./config.js";
import { createHandlers } from "./handlers.js";
import { createHealthServer } from "./health.js";
import { jsonLogger } from "./log.js";
import { createEventWorker } from "./worker.js";

async function main(): Promise<void> {
  const config = loadWorkerConfig(process.env);
  const logger = jsonLogger();
  const redis = createRedisConnection(config.REDIS_URL);
  const worker = createEventWorker({
    connection: redis,
    handlers: createHandlers(redis),
    logger,
    concurrency: config.WORKER_CONCURRENCY,
    // Operator alerting (Sentry/PagerDuty) attaches here in EV-019.
    onDeadLetter: () => undefined,
  });
  const health = createHealthServer(redis, worker);
  health.listen(config.WORKER_HEALTH_PORT, config.WORKER_HEALTH_HOST);
  await once(health, "listening");
  logger.info("worker.started", {
    concurrency: config.WORKER_CONCURRENCY,
    healthPort: config.WORKER_HEALTH_PORT,
  });

  let stopping = false;
  const stop = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    health.setDraining();
    logger.info("worker.stopping", { signal });
    // Waits for jobs in progress to finish; unstarted jobs stay queued.
    await worker.close();
    await redis.quit();
    health.close();
    logger.info("worker.stopped", { signal });
    process.exit(0);
  };
  process.once("SIGTERM", () => void stop("SIGTERM"));
  process.once("SIGINT", () => void stop("SIGINT"));
}

main().catch((error: unknown) => {
  if (error instanceof WorkerConfigError) {
    console.error(error.message);
  } else {
    const { name, message } =
      error instanceof Error
        ? error
        : { name: "Error", message: String(error) };
    console.error(`EVONE worker failed to start: ${name}: ${message}`);
  }
  process.exit(1);
});
