import "reflect-metadata";
import { type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule, type AppOptions } from "./app.module.js";
import { EnvelopeExceptionFilter } from "./common/http-exception.filter.js";
import { requestIdMiddleware } from "./common/request-id.js";

export const API_PREFIX = "api/v1";

export async function createApp(
  options: AppOptions,
): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.register(options),
    {
      logger:
        options.config.NODE_ENV === "test" ? false : ["log", "warn", "error"],
    },
  );
  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new EnvelopeExceptionFilter());
  app.enableShutdownHooks();
  return app;
}
