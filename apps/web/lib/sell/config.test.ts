import { it, expect } from "vitest";
import type { SellerListing } from "@evone/contracts";
import { sellConfig } from "./config";
import {
  listingValues,
  paiseToInput,
  parseSellValues,
  priceToPaise,
  resumeStep,
  stepErrors,
} from "./values";

const sampleListing: SellerListing = {
  id: "27b7105e-4772-4827-b8a8-04b481e98d10",
  slug: "demo-27b7105e-4772-4827-b8a8-04b481e98d10",
  version: 1,
  status: "DRAFT",
  updatedAt: "2026-11-05T08:00:00.000Z",
  fields: {
    preferredVehicleType: "SCOOTER",
    variantId: "27b7105e-4772-4827-b8a8-04b481e98d11",
    year: 2024,
    odometerKm: 1200,
    city: "DEMO City",
    askingPricePaise: "12500050",
    ownershipCount: 1,
    conditionNotes: "DEMO synthetic condition; no personal information.",
  },
  canonical: {
    brand: "DEMO Brand",
    brandId: "27b7105e-4772-4827-b8a8-04b481e98d12",
    brandSlug: "demo-brand",
    model: "DEMO Model",
    modelId: "27b7105e-4772-4827-b8a8-04b481e98d13",
    modelSlug: "demo-model",
    variant: "DEMO Variant",
    vehicleType: "SCOOTER",
  },
  media: [
    {
      id: "27b7105e-4772-4827-b8a8-04b481e98d14",
      mediaAssetId: "27b7105e-4772-4827-b8a8-04b481e98d15",
      position: 0,
      alt: "DEMO scooter side profile",
    },
  ],
  reviewReason: null,
};

it("requires explicit opt-in and stays disabled in production", () => {
  expect(sellConfig({ NODE_ENV: "development" }).kind).toBe("disabled");
  expect(
    sellConfig({
      NODE_ENV: "production",
      LOCAL_SELL_ENABLED: "true",
      AUTH_SPIKE_ENABLED: "true",
    }).kind,
  ).toBe("disabled");
  expect(
    sellConfig({
      NODE_ENV: "development",
      LOCAL_SELL_ENABLED: "true",
      AUTH_SPIKE_ENABLED: "true",
    }).kind,
  ).toBe("unconfigured");
});

it("converts exact INR paise strings and validates step boundaries", () => {
  expect(paiseToInput(null)).toBe("");
  expect(paiseToInput("12500050")).toBe("125000.50");
  expect(priceToPaise("125000.5")).toBe("12500050");
  expect(priceToPaise("125000.555")).toBe("invalid");

  const values = listingValues(sampleListing);
  expect(parseSellValues(values)).toEqual({
    fields: sampleListing.fields,
    errors: {},
  });
  expect(
    parseSellValues({ ...values, year: "2100", priceInr: "0" }).fields,
  ).toBeNull();
  expect(stepErrors(7, values, sampleListing, false).city).toContain(
    "Confirm the seller declaration",
  );
  expect(stepErrors(7, values, sampleListing, true)).toEqual({});
  expect(resumeStep(sampleListing)).toBe(7);
  expect(
    resumeStep({
      ...sampleListing,
      media: [],
    }),
  ).toBe(5);
});
