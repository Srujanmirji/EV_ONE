import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import type { Request } from "express";
import {
  MediaUploadRequest,
  MediaCompleteRequest,
  MediaPathParams,
} from "@evone/contracts";
import { ClerkGuard } from "../identity/clerk.guard.js";
import { parseRequest } from "../common/validation.js";
import { requestIdOf } from "../common/request-id.js";
import { MediaService } from "./media.service.js";

@Controller("media")
@UseGuards(ClerkGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Post("presign")
  @HttpCode(200)
  upload(@Req() req: Request, @Body() body: unknown) {
    const input = parseRequest(MediaUploadRequest, body);
    return this.media.run(
      req.authenticatedActor!,
      "MEDIA_UPLOAD",
      requestIdOf(req),
      undefined,
      input,
    );
  }
  @Post(":id/complete")
  @HttpCode(200)
  complete(
    @Req() req: Request,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    const { id } = parseRequest(MediaPathParams, params);
    parseRequest(MediaCompleteRequest, body);
    return this.media.run(
      req.authenticatedActor!,
      "MEDIA_COMPLETE",
      requestIdOf(req),
      id,
    );
  }
  @Get(":id/read-url")
  read(@Req() req: Request, @Param() params: unknown) {
    const { id } = parseRequest(MediaPathParams, params);
    return this.media.run(
      req.authenticatedActor!,
      "MEDIA_READ",
      requestIdOf(req),
      id,
    );
  }
}
