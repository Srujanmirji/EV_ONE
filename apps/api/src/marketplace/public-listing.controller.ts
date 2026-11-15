import {
  type PublicListingDetailResponse,
  PublicListingListQuery,
  type PublicListingListResponse,
  PublicListingPathParams,
} from "@evone/contracts";
import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { requestIdOf } from "../common/request-id.js";
import { parseRequest } from "../common/validation.js";
import {
  decodeListingCursor,
  encodeListingCursor,
  validateListingRanges,
} from "./listing-cursor.js";
import {
  PublicListingRepository,
  cursorFromRow,
  toPublicListingDetail,
  toPublicListingSummary,
} from "./public-listing.repository.js";

@Controller()
export class PublicListingController {
  constructor(
    @Inject(PublicListingRepository)
    private readonly repo: PublicListingRepository,
  ) {}

  @Get("listings")
  async list(
    @Query() query: unknown,
    @Req() req: Request,
  ): Promise<PublicListingListResponse> {
    const parsed = parseRequest(PublicListingListQuery, query);
    validateListingRanges(parsed);
    const after = parsed.cursor
      ? decodeListingCursor(parsed.cursor, parsed.sort)
      : undefined;
    const rows = await this.repo.listListings(parsed, after);
    const page = rows.slice(0, parsed.limit);
    const last = page.at(-1);
    const hasMore = rows.length > parsed.limit;
    return {
      data: page.map(toPublicListingSummary),
      page: {
        hasMore,
        nextCursor:
          hasMore && last
            ? encodeListingCursor(cursorFromRow(parsed.sort, last))
            : null,
      },
      meta: { requestId: requestIdOf(req) },
    };
  }

  @Get("used-evs/:slug")
  async get(
    @Param() params: unknown,
    @Req() req: Request,
  ): Promise<PublicListingDetailResponse> {
    const { slug } = parseRequest(PublicListingPathParams, params);
    const row = await this.repo.findListingBySlug(slug);
    if (!row) throw new NotFoundException("Listing not found");
    return {
      data: toPublicListingDetail(row),
      meta: { requestId: requestIdOf(req) },
    };
  }
}
