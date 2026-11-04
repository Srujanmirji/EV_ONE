import { installFatalHandlers } from "./observability/fatal.js";
import "reflect-metadata";
import {
  initTelemetry,
  closeTelemetry,
  logEvent,
  reportError,
} from "./observability/telemetry.js";
import { Module, type OnApplicationShutdown } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { loadWorkerConfig } from "./queue/config.js";
import { createFoundationWorker } from "./queue/foundation.js";

@Module({})
class WorkerModule implements OnApplicationShutdown {
  readonly worker = createFoundationWorker(loadWorkerConfig(process.env));

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.worker.close();
      logEvent("info", "worker.stopped");
    } catch {
      reportError("worker.shutdown_failed");
      process.exitCode = 1;
    } finally {
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
  await app.get(WorkerModule).worker.waitUntilReady();
  logEvent("info", "worker.ready");
}

main().catch(async () => {
  reportError("worker.start_failed");
  await closeTelemetry();
  process.exit(1);
});
