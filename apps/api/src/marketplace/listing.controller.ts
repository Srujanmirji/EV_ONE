import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import type { Request } from "express";
import {
  ListingCreateRequest,
  ListingSaveRequest,
  ListingSubmitRequest,
  ListingAttachRequest,
  ListingPhotoEditRequest,
  ListingPhotoDeleteRequest,
  ListingParams,
  ListingPhotoParams,
  SellerListQuery,
} from "@evone/contracts";
import { ClerkGuard } from "../identity/clerk.guard.js";
import { parseRequest } from "../common/validation.js";
import { requestIdOf } from "../common/request-id.js";
import { ListingService } from "./listing.service.js";
@Controller()
@UseGuards(ClerkGuard)
export class ListingController {
  constructor(private readonly listings: ListingService) {}
  @Get("seller/listings") list(@Req() req: Request, @Query() query: unknown) {
    return this.listings.run(req.authenticatedActor!, requestIdOf(req), {
      kind: "list",
      ...parseRequest(SellerListQuery, query),
    });
  }
  @Post("listings") @HttpCode(200) create(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    parseRequest(ListingCreateRequest, body);
    return this.listings.run(req.authenticatedActor!, requestIdOf(req), {
      kind: "create",
    });
  }
  @Get("listings/:id") get(@Req() req: Request, @Param() params: unknown) {
    return this.listings.run(req.authenticatedActor!, requestIdOf(req), {
      kind: "get",
      ...parseRequest(ListingParams, params),
    });
  }
  @Patch("listings/:id") save(
    @Req() req: Request,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return this.listings.run(req.authenticatedActor!, requestIdOf(req), {
      kind: "save",
      ...parseRequest(ListingParams, params),
      ...parseRequest(ListingSaveRequest, body),
    });
  }
  @Post("listings/:id/submit") @HttpCode(200) submit(
    @Req() req: Request,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return this.listings.run(req.authenticatedActor!, requestIdOf(req), {
      kind: "submit",
      ...parseRequest(ListingParams, params),
      ...parseRequest(ListingSubmitRequest, body),
    });
  }
  @Post("listings/:id/media") @HttpCode(200) attach(
    @Req() req: Request,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return this.listings.run(req.authenticatedActor!, requestIdOf(req), {
      kind: "attach",
      ...parseRequest(ListingParams, params),
      ...parseRequest(ListingAttachRequest, body),
    });
  }
  @Patch("listings/:id/media/:photoId") photo(
    @Req() req: Request,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return this.listings.run(req.authenticatedActor!, requestIdOf(req), {
      kind: "photo",
      ...parseRequest(ListingPhotoParams, params),
      ...parseRequest(ListingPhotoEditRequest, body),
    });
  }
  @Delete("listings/:id/media/:photoId") remove(
    @Req() req: Request,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return this.listings.run(req.authenticatedActor!, requestIdOf(req), {
      kind: "remove",
      ...parseRequest(ListingPhotoParams, params),
      ...parseRequest(ListingPhotoDeleteRequest, body),
    });
  }
}
