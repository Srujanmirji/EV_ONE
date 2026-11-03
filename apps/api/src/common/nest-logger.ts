import type { LoggerService } from "@nestjs/common";
import type { Logger } from "@evone/observability";

/** Routes NestJS framework messages through the redacting JSON logger. */
export class NestLoggerAdapter implements LoggerService {
  constructor(private readonly logger: Logger) {}
  log(message: unknown, context?: string) {
    this.logger.info("nest.log", { detail: String(message), context });
  }
  warn(message: unknown, context?: string) {
    this.logger.warn("nest.warn", { detail: String(message), context });
  }
  error(message: unknown, stackOrContext?: string) {
    this.logger.error("nest.error", {
      detail: String(message),
      context: stackOrContext,
    });
  }
  debug(message: unknown, context?: string) {
    this.logger.debug("nest.debug", { detail: String(message), context });
  }
  verbose(message: unknown, context?: string) {
    this.logger.debug("nest.verbose", { detail: String(message), context });
  }
}
