import { installFatalHandlers } from "./observability/fatal.js";
import "reflect-metadata";
import {
  initTelemetry,
  closeTelemetry,
  logEvent,
  reportError,
} from "./observability/telemetry.js";
import { once } from "node:events";
import {
  Module,
  type BeforeApplicationShutdown,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { loadWorkerConfig } from "./queue/config.js";
import { createFoundationWorker } from "./queue/foundation.js";
import { createWorkerHealthServer } from "./queue/worker-health.js";

@Module({})
class WorkerModule implements BeforeApplicationShutdown, OnApplicationShutdown {
  readonly config = loadWorkerConfig(process.env);
  readonly worker = createFoundationWorker(this.config.REDIS_URL);
  readonly health = createWorkerHealthServer(this.worker);

  beforeApplicationShutdown(): void {
    this.health.setDraining();
  }

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.worker.close();
      logEvent("info", "worker.stopped");
    } catch {
      reportError("worker.shutdown_failed");
      process.exitCode = 1;
    } finally {
      await new Promise<void>((resolve) => this.health.close(() => resolve()));
      await closeTelemetry();
    }
  }
}

installFatalHandlers();

async function main() {
  // Validate before Nest starts; invalid values must never reach its logger.
  loadWorkerConfig(process.env);
  initTelemetry(process.env);
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: false,
    abortOnError: false,
  });
  app.enableShutdownHooks();
  const module = app.get(WorkerModule);
  module.health.listen(
    module.config.WORKER_HEALTH_PORT,
    module.config.WORKER_HEALTH_HOST,
  );
  await once(module.health, "listening");
  await module.worker.waitUntilReady();
  const address = module.health.address();
  logEvent("info", "worker.ready", {
    ...(address && typeof address !== "string" ? { port: address.port } : {}),
  });
}

main().catch(async () => {
  reportError("worker.start_failed");
  await closeTelemetry();
  process.exit(1);
});
