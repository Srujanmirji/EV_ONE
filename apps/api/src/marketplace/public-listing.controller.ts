import {
  type PublicListingDetailResponse,
  PublicListingListQuery,
  type PublicListingListResponse,
  PublicListingPathParams,
  PublicListingPreviewParams,
} from "@evone/contracts";
import {
  Controller,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
  Query,
  Req,
  StreamableFile,
} from "@nestjs/common";
import type { Request } from "express";
import { requestIdOf } from "../common/request-id.js";
import { MediaStorage } from "../media/storage.js";
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
    @Inject(MediaStorage) private readonly storage: MediaStorage,
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
      data: toPublicListingDetail(row, this.repo.previewsEnabled),
      meta: { requestId: requestIdOf(req) },
    };
  }

  @Get("used-evs/:slug/photos/:photoId")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  async preview(@Param() params: unknown): Promise<StreamableFile> {
    const { slug, photoId } = parseRequest(PublicListingPreviewParams, params);
    const key = await this.repo.findPreviewKey(slug, photoId);
    if (!key) throw new NotFoundException("Photo not found");

    const bytes = await this.storage.preview(key);
    // Check again before sending bytes if listing visibility changed during storage I/O.
    if ((await this.repo.findPreviewKey(slug, photoId)) !== key)
      throw new NotFoundException("Photo not found");

    return new StreamableFile(bytes, { type: "image/webp" });
  }
}
