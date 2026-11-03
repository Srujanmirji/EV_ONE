import "reflect-metadata";
import { Module, type OnApplicationShutdown } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { loadWorkerConfig } from "./queue/config.js";
import { createFoundationWorker } from "./queue/foundation.js";

@Module({})
class WorkerModule implements OnApplicationShutdown {
  readonly worker = createFoundationWorker(loadWorkerConfig(process.env));

  async onApplicationShutdown(): Promise<void> {
    await this.worker.close();
    console.log("EVONE worker stopped gracefully");
  }
}

async function main() {
  // Validate before Nest starts; invalid values must never reach its logger.
  loadWorkerConfig(process.env);
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["log", "warn", "error"],
  });
  app.enableShutdownHooks();
  await app.get(WorkerModule).worker.waitUntilReady();
  console.log("EVONE worker ready");
}

main().catch(() => {
  console.error("EVONE worker failed to start; check configuration and Redis");
  process.exit(1);
});
