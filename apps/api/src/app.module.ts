import {
  type DynamicModule,
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { API_CONFIG } from "./config/config.token.js";
import type { Logger as EvoneLogger } from "@evone/observability";
import type { ErrorReporter } from "./common/http-exception.filter.js";
import type { ApiConfig } from "./config/env.js";
import type { DbClient } from "@evone/db";
import { CatalogueModule } from "./catalogue/catalogue.module.js";
import { DB_CLIENT } from "./database/database.token.js";
import { HealthModule } from "./health/health.module.js";
import { READINESS_CHECKS, type ReadinessCheck } from "./health/readiness.js";

export interface AppOptions {
  config: ApiConfig;
  /** Redacting JSON logger; silent when omitted (unit tests). */
  logger?: EvoneLogger;
  /** Sends unexpected (5xx) errors to error tracking. */
  reportError?: ErrorReporter;
  db: DbClient;
  readinessChecks?: ReadinessCheck[];
  /** Run after the HTTP server stops, e.g. closing database pools. */
  shutdownHooks?: (() => Promise<void>)[];
}

const SHUTDOWN_HOOKS = Symbol("SHUTDOWN_HOOKS");

@Global()
@Module({})
class CoreModule {
  static register({
    config,
    db,
    readinessChecks = [],
    shutdownHooks = [],
  }: AppOptions): DynamicModule {
    return {
      module: CoreModule,
      providers: [
        { provide: API_CONFIG, useValue: config },
        { provide: DB_CLIENT, useValue: db },
        { provide: READINESS_CHECKS, useValue: readinessChecks },
        { provide: SHUTDOWN_HOOKS, useValue: shutdownHooks },
      ],
      exports: [API_CONFIG, DB_CLIENT, READINESS_CHECKS, SHUTDOWN_HOOKS],
    };
  }
}

@Module({})
export class AppModule implements OnApplicationShutdown {
  private readonly logger = new Logger("EVONE API");

  constructor(
    @Inject(SHUTDOWN_HOOKS)
    private readonly shutdownHooks: (() => Promise<void>)[],
  ) {}

  /** Runs after in-flight requests close; proves shutdown was graceful. */
  async onApplicationShutdown(signal?: string): Promise<void> {
    const results = await Promise.allSettled(
      this.shutdownHooks.map((hook) => hook()),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) this.logger.error(`${failed} shutdown hook(s) failed`);
    this.logger.log(`Stopped gracefully${signal ? ` on ${signal}` : ""}`);
  }

  static register(options: AppOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [CoreModule.register(options), HealthModule, CatalogueModule],
    };
  }
}
