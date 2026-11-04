import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { PermissionGuard } from "./permission.guard.js";
import type { AccessResponse, SessionResponse } from "@evone/contracts";
import { requestIdOf } from "../common/request-id.js";
import { ClerkGuard } from "./clerk.guard.js";

@Controller("auth")
export class IdentityController {
  @Get("access/:scope/:scopeId")
  @UseGuards(ClerkGuard, PermissionGuard)
  access(@Req() req: Request): AccessResponse {
    return {
      data: { authorized: true },
      meta: { requestId: requestIdOf(req) },
    };
  }

  @Get("session")
  @UseGuards(ClerkGuard)
  session(@Req() req: Request): SessionResponse {
    return {
      data: { authenticated: true },
      meta: { requestId: requestIdOf(req) },
    };
  }
}
