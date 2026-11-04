import { SavingsRequest, type SavingsResponse } from "@evone/contracts";
import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { requestIdOf } from "../common/request-id.js";
import { parseRequest } from "../common/validation.js";
import { calculateSavings } from "./savings.js";

@Controller("calculators")
export class CalculatorsController {
  @Post("ev-savings")
  @HttpCode(200)
  savings(@Body() body: unknown, @Req() req: Request): SavingsResponse {
    return {
      data: calculateSavings(parseRequest(SavingsRequest, body)),
      meta: { requestId: requestIdOf(req) },
    };
  }
}
