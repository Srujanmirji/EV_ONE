import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import type { LiveResponse, ReadinessResponse } from "@evone/contracts";
import { requestIdOf } from "../common/request-id.js";
import { HealthService } from "./health.service.js";

@Controller("health")
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  /** Liveness: the process is up and the event loop answers. No dependencies. */
  @Get("live")
  live(@Req() req: Request, @Res() res: Response): void {
    res.setHeader("Cache-Control", "no-store");
    const body: LiveResponse = {
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
    const body: ReadinessResponse = {
      data: { ...report, draining: this.health.isDraining() },
      meta: { requestId: requestIdOf(req) },
    };
    res.status(report.status === "ready" ? 200 : 503).json(body);
  }
}
