import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import type { DataEnvelope } from "../common/envelope.js";
import { requestIdOf } from "../common/request-id.js";
import { HealthService } from "./health.service.js";
import type { ReadinessReport } from "./readiness.js";

@Controller("health")
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  /** Liveness: the process is up and the event loop answers. No dependencies. */
  @Get("live")
  live(@Req() req: Request, @Res() res: Response): void {
    res.setHeader("Cache-Control", "no-store");
    const body: DataEnvelope<{ status: "ok" }> = {
      data: { status: "ok" },
      meta: { requestId: requestIdOf(req) },
    };
    res.status(200).json(body);
  }

  /** Readiness: 200 only when every dependency is up and not shutting down. */
  @Get("ready")
  async ready(@Req() req: Request, @Res() res: Response): Promise<void> {
    const report = await this.health.readiness();
    res.setHeader("Cache-Control", "no-store");
    const body: DataEnvelope<ReadinessReport & { draining: boolean }> = {
      data: { ...report, draining: this.health.isDraining() },
      meta: { requestId: requestIdOf(req) },
    };
    res.status(report.status === "ready" ? 200 : 503).json(body);
  }
}
