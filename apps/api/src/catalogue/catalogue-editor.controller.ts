import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CatalogueDraftCreate,
  CatalogueDraftSave,
  CatalogueDraftSubmit,
  CatalogueDraftReview,
  CatalogueDraftParams,
  CatalogueDraftQuery,
} from "@evone/contracts";
import { ClerkGuard } from "../identity/clerk.guard.js";
import { parseRequest } from "../common/validation.js";
import { requestIdOf } from "../common/request-id.js";
import { CatalogueEditorService } from "./catalogue-editor.service.js";

@Controller("admin/catalogue/drafts")
@UseGuards(ClerkGuard)
export class CatalogueEditorController {
  constructor(private readonly editor: CatalogueEditorService) {}
  @Get() list(@Req() req: Request, @Query() query: unknown) {
    return this.editor.run(req.authenticatedActor!, requestIdOf(req), {
      kind: "list",
      ...parseRequest(CatalogueDraftQuery, query),
    });
  }
  @Post() @HttpCode(200) create(@Req() req: Request, @Body() body: unknown) {
    return this.editor.run(req.authenticatedActor!, requestIdOf(req), {
      kind: "create",
      ...parseRequest(CatalogueDraftCreate, body),
    });
  }
  @Get(":id") get(@Req() req: Request, @Param() params: unknown) {
    return this.editor.run(req.authenticatedActor!, requestIdOf(req), {
      kind: "get",
      ...parseRequest(CatalogueDraftParams, params),
    });
  }
  @Patch(":id") save(
    @Req() req: Request,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return this.editor.run(req.authenticatedActor!, requestIdOf(req), {
      kind: "save",
      ...parseRequest(CatalogueDraftParams, params),
      ...parseRequest(CatalogueDraftSave, body),
    });
  }
  @Post(":id/submit") @HttpCode(200) submit(
    @Req() req: Request,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return this.editor.run(req.authenticatedActor!, requestIdOf(req), {
      kind: "submit",
      ...parseRequest(CatalogueDraftParams, params),
      ...parseRequest(CatalogueDraftSubmit, body),
    });
  }
  @Post(":id/review") @HttpCode(200) review(
    @Req() req: Request,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return this.editor.run(req.authenticatedActor!, requestIdOf(req), {
      kind: "review",
      ...parseRequest(CatalogueDraftParams, params),
      ...parseRequest(CatalogueDraftReview, body),
    });
  }
}
