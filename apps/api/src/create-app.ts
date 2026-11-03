import "reflect-metadata";
import { type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule, type AppOptions } from "./app.module.js";
import { silentLogger } from "@evone/observability";
import { accessLog } from "./common/access-log.js";
import { EnvelopeExceptionFilter } from "./common/http-exception.filter.js";
import { NestLoggerAdapter } from "./common/nest-logger.js";
import { requestIdMiddleware } from "./common/request-id.js";

export const API_PREFIX = "api/v1";

export async function createApp(
  options: AppOptions,
): Promise<INestApplication> {
  const logger = options.logger ?? silentLogger;
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.register(options),
    {
      logger:
        options.config.NODE_ENV === "test"
          ? false
          : new NestLoggerAdapter(logger),
    },
  );
  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(accessLog(logger));
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(
    new EnvelopeExceptionFilter(logger, options.reportError),
  );
  app.enableShutdownHooks();
  return app;
}
