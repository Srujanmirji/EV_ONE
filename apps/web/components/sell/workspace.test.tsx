// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import type { SellerListing } from "@evone/contracts";
import { SellerApiError } from "@/lib/sell/request";
import type { SellerRequest } from "@/lib/sell/request";
import { SellWorkspace } from "./workspace";

const id = "27b7105e-4772-4827-b8a8-04b481e98d10";
const variantId = "27b7105e-4772-4827-b8a8-04b481e98d11";
const brandId = "27b7105e-4772-4827-b8a8-04b481e98d12";
const modelId = "27b7105e-4772-4827-b8a8-04b481e98d13";
const photoId = "27b7105e-4772-4827-b8a8-04b481e98d14";
const assetId = "27b7105e-4772-4827-b8a8-04b481e98d15";

function blankListing(): SellerListing {
  return {
    id,
    slug: `demo-${id}`,
    version: 1,
    status: "DRAFT",
    updatedAt: "2026-11-05T08:00:00.000Z",
    fields: {
      preferredVehicleType: null,
      variantId: null,
      year: null,
      odometerKm: null,
      city: null,
      askingPricePaise: null,
      ownershipCount: null,
      conditionNotes: null,
    },
    canonical: null,
    media: [],
    reviewReason: null,
  };
}

function completeListing(): SellerListing {
  return {
    id,
    slug: `demo-${id}`,
    version: 2,
    status: "DRAFT",
    updatedAt: "2026-11-05T08:00:00.000Z",
    fields: {
      preferredVehicleType: "SCOOTER",
      variantId,
      year: 2024,
      odometerKm: 1200,
      city: "DEMO City",
      askingPricePaise: "12500000",
      ownershipCount: 1,
      conditionNotes: "DEMO synthetic condition; no personal information.",
    },
    canonical: {
      brand: "DEMO Brand",
      brandId,
      brandSlug: "demo-brand",
      model: "DEMO Scooter",
      modelId,
      modelSlug: "demo-scooter",
      variant: "DEMO Standard",
      vehicleType: "SCOOTER",
    },
    media: [
      {
        id: photoId,
        mediaAssetId: assetId,
        position: 0,
        alt: "DEMO scooter side profile",
      },
    ],
    reviewReason: null,
  };
}

const envelope = (data: unknown) => ({ data, meta: { requestId: id } });
const list = (items: SellerListing[]) =>
  envelope({
    items: items.map((item) => ({
      id: item.id,
      status: item.status,
      version: item.version,
      label: item.canonical
        ? `${item.canonical.model} · ${item.canonical.variant}`
        : null,
      updatedAt: item.updatedAt,
    })),
    nextCursor: null,
  });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("shows actionable initial failure and retries to the empty draft state", async () => {
  const request = vi
    .fn<SellerRequest>()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(list([]));
  render(<SellWorkspace request={request} />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Retry drafts" }));
  await screen.findByText("No drafts yet");
});

it("validates step 1, preserves values on save conflict and reloads the saved draft", async () => {
  const initial = blankListing();
  const saved: SellerListing = {
    ...initial,
    version: 2,
    fields: { ...initial.fields, preferredVehicleType: "CAR" },
  };
  const request = vi
    .fn<SellerRequest>()
    .mockImplementation((path, method = "GET") => {
      if (path === "/seller/listings") return Promise.resolve(list([]));
      if (path === "/listings" && method === "POST")
        return Promise.resolve(envelope(initial));
      if (path === `/listings/${id}` && method === "PATCH")
        return Promise.reject(
          new SellerApiError(
            409,
            "This draft changed. Reload the saved revision before continuing.",
          ),
        );
      return Promise.resolve(envelope(saved));
    });
  render(<SellWorkspace request={request} />);
  await screen.findByText("No drafts yet");
  fireEvent.click(screen.getByRole("button", { name: "Start a draft" }));
  await screen.findByRole("heading", { name: "Vehicle type" });

  fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
  expect(
    await screen.findAllByText("Choose the vehicle type."),
  ).not.toHaveLength(0);

  fireEvent.change(screen.getByLabelText("Vehicle type"), {
    target: { value: "SCOOTER" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
  await screen.findByText(
    "This draft changed. Reload the saved revision before continuing.",
  );
  expect(
    (screen.getByLabelText("Vehicle type") as HTMLSelectElement).value,
  ).toBe("SCOOTER");

  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Reload saved draft" }));
  await screen.findByRole("heading", { name: "Model & variant" });
  fireEvent.click(screen.getByRole("button", { name: "1. Vehicle type" }));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Vehicle type") as HTMLSelectElement).value,
    ).toBe("CAR"),
  );
});

it("requires revision-bound seller declaration, renders private preview and submits for moderation", async () => {
  const ready = completeListing();
  const submitted: SellerListing = {
    ...ready,
    version: 3,
    status: "PENDING_REVIEW",
  };
  const request = vi
    .fn<SellerRequest>()
    .mockImplementation((path, method = "GET") => {
      if (path === "/seller/listings") return Promise.resolve(list([ready]));
      if (path === `/media/${assetId}/read-url`)
        return Promise.resolve(
          envelope({
            readUrl: "http://127.0.0.1:4100/synthetic-preview.webp",
            expiresInSeconds: 60,
          }),
        );
      if (path === `/listings/${id}/submit` && method === "POST")
        return Promise.resolve(envelope(submitted));
      return Promise.resolve(envelope(ready));
    });
  render(<SellWorkspace request={request} />);
  fireEvent.click(await screen.findByRole("button", { name: "Open draft" }));
  await screen.findByRole("heading", { name: "Seller & privacy" });

  fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
  expect(
    await screen.findAllByText(
      "Confirm the seller declaration before continuing.",
    ),
  ).not.toHaveLength(0);

  fireEvent.click(
    screen.getByLabelText(/I am authorized to offer this vehicle/),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
  await screen.findByText("Private preview · Demo data");
  expect(
    (
      await screen.findByRole("img", { name: "DEMO scooter side profile" })
    ).getAttribute("referrerpolicy"),
  ).toBe("no-referrer");

  fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
  await screen.findByRole("heading", { name: "Submit" });
  fireEvent.click(
    screen.getByRole("button", { name: "Submit for moderation" }),
  );
  await screen.findByText(
    "Submitted for moderation. Editing is paused until a decision.",
  );
  expect(request).toHaveBeenCalledWith(`/listings/${id}/submit`, "POST", {
    version: 2,
    sellerDeclaration: true,
  });
});
