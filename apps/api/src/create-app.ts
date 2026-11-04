import "reflect-metadata";
import { type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule, type AppOptions } from "./app.module.js";
import { EnvelopeExceptionFilter } from "./common/http-exception.filter.js";
import { httpTelemetry } from "./observability/http.js";
import { requestIdMiddleware } from "./common/request-id.js";

export const API_PREFIX = "api/v1";

export async function createApp(
  options: AppOptions,
): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.register(options),
    {
      logger: false,
      abortOnError: false,
    },
  );
  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(httpTelemetry);
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new EnvelopeExceptionFilter());
  app.enableShutdownHooks();
  return app;
}
