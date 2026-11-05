import { it, expect } from "vitest";
import {
  CatalogueDocument,
  CatalogueDraftReview,
  missingCatalogueSources,
} from "./catalogue-editor.js";
const document = {
  brand: { name: "DEMO Brand", slug: "demo-brand" },
  model: {
    name: "DEMO Model",
    slug: "demo-model",
    vehicleType: "SCOOTER",
    availability: "UNKNOWN",
    releaseDate: null,
  },
  variants: [
    {
      name: "DEMO Variant",
      slug: "demo-variant",
      specs: {
        batteryKwh: 2,
        claimedRange: null,
        motorKw: null,
        chargingAcKw: null,
        chargingDcKw: null,
        warrantyText: null,
      },
      sources: [],
    },
  ],
};
it("allows incomplete citation coverage only while drafting", () => {
  const draft = CatalogueDocument.parse(document);
  expect(missingCatalogueSources(draft)).toEqual(["Variant 1: BATTERY_KWH"]);
  draft.variants[0]!.specs.batteryKwh = null;
  expect(missingCatalogueSources(draft)).toEqual([]);
});
it("rejects unknown fields, duplicate slugs, invalid units and credential URLs", () => {
  const invalid = [
    { ...document, reviewerId: "caller" },
    { ...document, variants: [document.variants[0], document.variants[0]] },
    {
      ...document,
      variants: [
        {
          ...document.variants[0],
          specs: { ...document.variants[0]!.specs, batteryKwh: 0 },
        },
      ],
    },
    {
      ...document,
      variants: [
        {
          ...document.variants[0],
          sources: [
            {
              fieldName: "BATTERY_KWH",
              valueText: "test",
              sourceUrl: "https://name:secret@example.com",
              sourceKind: "OTHER",
              effectiveAt: null,
            },
          ],
        },
      ],
    },
  ];
  for (const input of invalid)
    expect(CatalogueDocument.safeParse(input).success).toBe(false);
});
it("requires explicit source review and meaningful rejection reason", () => {
  expect(
    CatalogueDraftReview.safeParse({
      version: 1,
      decision: "APPROVE",
      reviewedSources: false,
    }).success,
  ).toBe(false);
  expect(
    CatalogueDraftReview.safeParse({
      version: 1,
      decision: "REJECT",
      reviewedSources: false,
      reason: "no",
    }).success,
  ).toBe(false);
  expect(
    CatalogueDraftReview.safeParse({
      version: 1,
      decision: "APPROVE",
      reviewedSources: true,
    }).success,
  ).toBe(true);
});

it("does not accept unsourced availability or release dates", () => {
  expect(
    CatalogueDocument.safeParse({
      ...document,
      model: {
        ...document.model,
        availability: "UPCOMING",
        releaseDate: "2027-01-01",
      },
    }).success,
  ).toBe(false);
});
