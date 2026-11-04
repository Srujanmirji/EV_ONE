import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import type { SessionResponse } from "@evone/contracts";
import { requestIdOf } from "../common/request-id.js";
import { ClerkGuard } from "./clerk.guard.js";

@Controller("auth")
export class IdentityController {
  @Get("session")
  @UseGuards(ClerkGuard)
  session(@Req() req: Request): SessionResponse {
    return {
      data: { authenticated: true },
      meta: { requestId: requestIdOf(req) },
    };
  }
}
