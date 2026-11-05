import { z } from "zod";
import { component } from "./registry.js";
import { dataEnvelope } from "./common.js";
import {
  VehicleType,
  RangeStandard,
  SourceKind,
  SpecField,
} from "./catalogue.js";

const name = z.string().trim().min(1).max(120);
const slug = z
  .string()
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const decimal = (max: number) =>
  z.number().positive().max(max).multipleOf(0.01).nullable();
export const CatalogueDocument = component(
  "CatalogueDocument",
  z
    .strictObject({
      brand: z.strictObject({ name, slug }),
      model: z.strictObject({
        name,
        slug,
        vehicleType: VehicleType,
        availability: z.literal("UNKNOWN"),
        releaseDate: z.null(),
      }),
      variants: z
        .array(
          z.strictObject({
            name,
            slug,
            specs: z.strictObject({
              batteryKwh: decimal(9999.99),
              claimedRange: z
                .strictObject({
                  km: z.int().positive().max(2147483647),
                  standard: RangeStandard,
                })
                .nullable(),
              motorKw: decimal(9999.99),
              chargingAcKw: decimal(999.99),
              chargingDcKw: decimal(9999.99),
              warrantyText: z.string().trim().min(1).max(2000).nullable(),
            }),
            sources: z
              .array(
                z.strictObject({
                  fieldName: SpecField,
                  valueText: z.string().trim().min(1).max(500),
                  sourceUrl: z
                    .url({ protocol: /^https$/ })
                    .max(2048)
                    .refine((value) => {
                      try {
                        const url = new URL(value);
                        return !url.username && !url.password;
                      } catch {
                        return false;
                      }
                    }),
                  sourceKind: SourceKind,
                  effectiveAt: z.iso.date().nullable(),
                }),
              )
              .max(6),
          }),
        )
        .min(1)
        .max(5),
    })
    .superRefine((doc, ctx) => {
      const seen = new Set<string>();
      doc.variants.forEach((variant, index) => {
        if (seen.has(variant.slug))
          ctx.addIssue({
            code: "custom",
            path: ["variants", index, "slug"],
            message: "Use a distinct variant slug",
          });
        seen.add(variant.slug);
        const fields = new Set<string>();
        variant.sources.forEach((source, i) => {
          if (fields.has(source.fieldName))
            ctx.addIssue({
              code: "custom",
              path: ["variants", index, "sources", i, "fieldName"],
              message: "One citation per spec",
            });
          fields.add(source.fieldName);
        });
      });
    }),
);
export type CatalogueDocument = z.infer<typeof CatalogueDocument>;

/** Drafts can omit citations; submission and approval require coverage. */
export function missingCatalogueSources(doc: CatalogueDocument): string[] {
  return doc.variants.flatMap((variant, index) => {
    const specs = variant.specs;
    const fields: Record<z.infer<typeof SpecField>, unknown> = {
      BATTERY_KWH: specs.batteryKwh,
      CLAIMED_RANGE: specs.claimedRange,
      MOTOR_KW: specs.motorKw,
      CHARGING_AC_KW: specs.chargingAcKw,
      CHARGING_DC_KW: specs.chargingDcKw,
      WARRANTY: specs.warrantyText,
    };
    return Object.entries(fields)
      .filter(
        ([field, value]) =>
          value !== null &&
          !variant.sources.some((source) => source.fieldName === field),
      )
      .map(([field]) => `Variant ${index + 1}: ${field}`);
  });
}
export const CatalogueDraftCreate = component(
  "CatalogueDraftCreate",
  z.strictObject({ document: CatalogueDocument }),
);
export const CatalogueDraftSave = component(
  "CatalogueDraftSave",
  z.strictObject({ version: z.int().positive(), document: CatalogueDocument }),
);
export const CatalogueDraftSubmit = component(
  "CatalogueDraftSubmit",
  z.strictObject({ version: z.int().positive() }),
);
export const CatalogueDraftReview = component(
  "CatalogueDraftReview",
  z
    .strictObject({
      version: z.int().positive(),
      decision: z.enum(["APPROVE", "REJECT"]),
      reason: z.string().trim().min(10).max(500).optional(),
      reviewedSources: z.boolean(),
    })
    .superRefine((input, ctx) => {
      if (input.decision === "APPROVE" && !input.reviewedSources)
        ctx.addIssue({
          code: "custom",
          path: ["reviewedSources"],
          message: "Review the cited sources before approval",
        });
      if (input.decision === "REJECT" && !input.reason)
        ctx.addIssue({
          code: "custom",
          path: ["reason"],
          message: "Explain what needs to change (at least 10 characters)",
        });
    }),
);
export const CatalogueDraftParams = z.strictObject({ id: z.uuid() });
export const CatalogueDraftQuery = z.strictObject({
  cursor: z.uuid().optional(),
});
export const CatalogueDraftStatus = component(
  "CatalogueDraftStatus",
  z.enum(["DRAFT", "IN_REVIEW", "REJECTED", "PUBLISHED"]),
);
export const CatalogueDraftView = component(
  "CatalogueDraftView",
  z.strictObject({
    id: z.uuid(),
    version: z.int().positive(),
    updatedAt: z.iso.datetime(),
    lastActorId: z.uuid(),
    status: CatalogueDraftStatus,
    document: CatalogueDocument,
    reviewReason: z.string().nullable(),
    modelId: z.uuid().nullable(),
    isOwner: z.boolean(),
    canReview: z.boolean(),
  }),
);
export const CatalogueDraftResponse = dataEnvelope(
  "CatalogueDraftResponse",
  CatalogueDraftView,
);
export type CatalogueDraftView = z.infer<typeof CatalogueDraftView>;
export const CatalogueDraftListResponse = dataEnvelope(
  "CatalogueDraftListResponse",
  z.strictObject({
    role: z.enum(["EDITOR", "ADMIN"]),
    items: z.array(
      z.strictObject({
        id: z.uuid(),
        name: z.string(),
        version: z.int().positive(),
        status: CatalogueDraftStatus,
      }),
    ),
    nextCursor: z.uuid().nullable(),
  }),
);

export type CatalogueDraftResponse = z.infer<typeof CatalogueDraftResponse>;
export type CatalogueDraftListResponse = z.infer<
  typeof CatalogueDraftListResponse
>;
