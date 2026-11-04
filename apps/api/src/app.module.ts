import {
  type DynamicModule,
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from "@nestjs/common";
import {
  logEvent,
  reportError,
  closeTelemetry,
} from "./observability/telemetry.js";
import { API_CONFIG } from "./config/config.token.js";
import type { ApiConfig } from "./config/env.js";
import type { DbClient } from "@evone/db";
import { CalculatorsModule } from "./calculators/calculators.module.js";
import { CatalogueModule } from "./catalogue/catalogue.module.js";
import { DB_CLIENT } from "./database/database.token.js";
import { MediaModule } from "./media/media.module.js";
import { IdentityModule } from "./identity/identity.module.js";
import { HealthModule } from "./health/health.module.js";
import { READINESS_CHECKS, type ReadinessCheck } from "./health/readiness.js";

export interface AppOptions {
  config: ApiConfig;
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
  constructor(
    @Inject(SHUTDOWN_HOOKS)
    private readonly shutdownHooks: (() => Promise<void>)[],
  ) {}

  /** Runs after in-flight requests close; proves shutdown was graceful. */
  async onApplicationShutdown(): Promise<void> {
    const results = await Promise.allSettled(
      this.shutdownHooks.map((hook) => Promise.resolve().then(hook)),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) reportError("api.shutdown_failed", { failedHooks: failed });
    logEvent("info", "api.stopped");
    await closeTelemetry();
  }

  static register(options: AppOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [
        CoreModule.register(options),
        HealthModule,
        IdentityModule,
        MediaModule,
        CatalogueModule,
        CalculatorsModule,
      ],
    };
  }
}
