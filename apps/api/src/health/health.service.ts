import {
  type BeforeApplicationShutdown,
  Inject,
  Injectable,
} from "@nestjs/common";
import { API_CONFIG } from "../config/config.token.js";
import type { ApiConfig } from "../config/env.js";
import {
  READINESS_CHECKS,
  type ReadinessCheck,
  type ReadinessReport,
} from "./readiness.js";

function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<void>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

@Injectable()
export class HealthService implements BeforeApplicationShutdown {
  private draining = false;

  constructor(
    @Inject(API_CONFIG) private readonly config: ApiConfig,
    @Inject(READINESS_CHECKS) private readonly checks: ReadinessCheck[],
  ) {}

  /** Stop advertising readiness as soon as shutdown begins. */
  beforeApplicationShutdown(): void {
    this.draining = true;
  }

  isDraining(): boolean {
    return this.draining;
  }

  async readiness(): Promise<ReadinessReport> {
    const results = await Promise.all(
      this.checks.map(async (dependency) => {
        const { name } = dependency;
        try {
          // Call as a method so class-based checks keep their `this`.
          await withTimeout(
            Promise.resolve().then(() => dependency.check()),
            this.config.API_READINESS_TIMEOUT_MS,
          );
          return { name, status: "up" as const };
        } catch {
          // Failure reasons stay server-side; probes only need up/down.
          return { name, status: "down" as const };
        }
      }),
    );
    const ready = !this.draining && results.every((r) => r.status === "up");
    return { status: ready ? "ready" : "not_ready", checks: results };
  }
}
