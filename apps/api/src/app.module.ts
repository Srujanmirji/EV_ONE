import {
  type DynamicModule,
  Global,
  Logger,
  Module,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { API_CONFIG } from "./config/config.token.js";
import type { ApiConfig } from "./config/env.js";
import { HealthModule } from "./health/health.module.js";
import { READINESS_CHECKS, type ReadinessCheck } from "./health/readiness.js";

export interface AppOptions {
  config: ApiConfig;
  readinessChecks?: ReadinessCheck[];
}

@Global()
@Module({})
class CoreModule {
  static register({ config, readinessChecks = [] }: AppOptions): DynamicModule {
    return {
      module: CoreModule,
      providers: [
        { provide: API_CONFIG, useValue: config },
        { provide: READINESS_CHECKS, useValue: readinessChecks },
      ],
      exports: [API_CONFIG, READINESS_CHECKS],
    };
  }
}

@Module({})
export class AppModule implements OnApplicationShutdown {
  private readonly logger = new Logger("EVONE API");

  /** Runs after in-flight requests close; proves shutdown was graceful. */
  onApplicationShutdown(signal?: string): void {
    this.logger.log(`Stopped gracefully${signal ? ` on ${signal}` : ""}`);
  }

  static register(options: AppOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [CoreModule.register(options), HealthModule],
    };
  }
}
