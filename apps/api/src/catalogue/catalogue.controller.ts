import {
  type BrandListResponse,
  CompareQuery,
  type CompareResponse,
  type ModelDetailResponse,
  ModelListQuery,
  type ModelListResponse,
  ModelPathParams,
  type VariantDetailResponse,
  VariantPathParams,
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
  toModelSummary,
  toVariantDetail,
  toVariantSummary,
} from "./catalogue.mapper.js";
import { CatalogueRepository } from "./catalogue.repository.js";
import { decodeCursor, encodeCursor } from "./cursor.js";

@Controller()
export class CatalogueController {
  constructor(
    @Inject(CatalogueRepository) private readonly repo: CatalogueRepository,
  ) {}

  @Get("brands")
  async listBrands(@Req() req: Request): Promise<BrandListResponse> {
    const brands = await this.repo.listBrands();
    return {
      data: brands.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        isDemo: b.isDemo,
        vehicleTypes: b.models.map((m) => m.vehicleType).sort(),
      })),
      meta: { requestId: requestIdOf(req) },
    };
  }

  @Get("models")
  async listModels(
    @Query() query: unknown,
    @Req() req: Request,
  ): Promise<ModelListResponse> {
    const { limit, cursor, brandId, vehicleType } = parseRequest(
      ModelListQuery,
      query,
    );
    const after = cursor ? decodeCursor(cursor) : undefined;
    const rows = await this.repo.listModels(
      { brandId, vehicleType },
      limit,
      after,
    );
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    const hasMore = rows.length > limit;
    return {
      data: page.map(toModelSummary),
      page: {
        hasMore,
        nextCursor:
          hasMore && last ? encodeCursor({ n: last.name, i: last.id }) : null,
      },
      meta: { requestId: requestIdOf(req) },
    };
  }

  @Get("brands/:brandSlug/models/:modelSlug")
  async getModel(
    @Param() params: unknown,
    @Req() req: Request,
  ): Promise<ModelDetailResponse> {
    const { brandSlug, modelSlug } = parseRequest(ModelPathParams, params);
    const model = await this.repo.findModel(brandSlug, modelSlug);
    if (!model) throw new NotFoundException("Model not found");
    return {
      data: {
        ...toModelSummary(model),
        variants: model.variants.map(toVariantSummary),
      },
      meta: { requestId: requestIdOf(req) },
    };
  }

  @Get("variants/:id")
  async getVariant(
    @Param() params: unknown,
    @Req() req: Request,
  ): Promise<VariantDetailResponse> {
    const { id } = parseRequest(VariantPathParams, params);
    const variant = await this.repo.findVariant(id);
    if (!variant) throw new NotFoundException("Variant not found");
    return {
      data: toVariantDetail(variant),
      meta: { requestId: requestIdOf(req) },
    };
  }

  @Get("compare")
  async compare(
    @Query() query: unknown,
    @Req() req: Request,
  ): Promise<CompareResponse> {
    const { variantIds } = parseRequest(CompareQuery, query);
    const found = await this.repo.findVariants(variantIds);
    const byId = new Map(found.map((v) => [v.id.toLowerCase(), v]));
    const ordered = variantIds.map((id) => byId.get(id.toLowerCase()));
    // All-or-nothing, and indistinguishable from "does not exist".
    if (ordered.some((v) => v === undefined))
      throw new NotFoundException("Variant not found");
    return {
      data: ordered.map((v) => toVariantDetail(v!)),
      meta: { requestId: requestIdOf(req) },
    };
  }
}
