"use client";
import { useEffect, useState } from "react";
import {
  BrandListResponse,
  ModelListResponse,
  ModelDetailResponse,
} from "@evone/contracts";
import type { ModelSummary, ModelDetail } from "@evone/contracts";
import { SelectField, Button } from "@evone/ui";
import type { SellerListing } from "@evone/contracts";
import type { SellerRequest } from "@/lib/sell/request";
import type { SellValues } from "@/lib/sell/values";
export function VehiclePicker({
  listing,
  values,
  change,
  request,
  error,
}: {
  listing: SellerListing;
  values: SellValues;
  change: (patch: Partial<SellValues>) => void;
  request: SellerRequest;
  error?: string;
}) {
  const [brands, setBrands] = useState<
      ReturnType<typeof BrandListResponse.parse>["data"]
    >([]),
    [models, setModels] = useState<ModelSummary[]>([]),
    [model, setModel] = useState<ModelDetail | null>(null),
    [brandId, setBrandId] = useState(listing.canonical?.brandId ?? ""),
    [slug, setSlug] = useState(listing.canonical?.modelSlug ?? ""),
    [next, setNext] = useState<string | null>(null),
    [failed, setFailed] = useState(false),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void request("/brands")
      .then((data) => {
        if (active) setBrands(BrandListResponse.parse(data).data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [request, retry]);
  useEffect(() => {
    let active = true;
    if (!brandId) return;
    void request(
      `/models?brandId=${brandId}&vehicleType=${values.vehicleType}&limit=50`,
    )
      .then((data) => {
        const result = ModelListResponse.parse(data);
        if (active) {
          setModels(result.data);
          setNext(result.page.nextCursor);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [brandId, values.vehicleType, request, retry]);
  useEffect(() => {
    let active = true;
    const brand = brands.find((item) => item.id === brandId);
    if (!brand || !slug) return;
    void request(`/brands/${brand.slug}/models/${slug}`)
      .then((data) => {
        if (active) {
          setModel(ModelDetailResponse.parse(data).data);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [brands, brandId, slug, request, retry]);
  return (
    <div className="space-y-6">
      <p className="text-secondary">
        Choose a published canonical variant. Demo catalogue entries remain
        labelled as demo data.
      </p>
      {failed ? (
        <div role="alert">
          <p>Catalogue choices could not load.</p>
          <Button
            variant="secondary"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry catalogue
          </Button>
        </div>
      ) : null}
      <SelectField
        label="Brand"
        value={brandId}
        onChange={(event) => {
          setBrandId(event.target.value);
          setSlug("");
          setModel(null);
          setModels([]);
          change({ variantId: "" });
        }}
      >
        <option value="">Choose a brand</option>
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
            {brand.isDemo ? " · Demo" : ""}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Model"
        value={slug}
        disabled={!brandId}
        onChange={(event) => {
          setSlug(event.target.value);
          setModel(null);
          change({ variantId: "" });
        }}
      >
        <option value="">Choose a model</option>
        {listing.canonical?.modelSlug === slug &&
        !models.some((item) => item.slug === slug) ? (
          <option value={slug}>{listing.canonical.model}</option>
        ) : null}
        {models.map((item) => (
          <option key={item.id} value={item.slug}>
            {item.name}
            {item.isDemo ? " · Demo" : ""}
          </option>
        ))}
      </SelectField>
      {next ? (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const result = ModelListResponse.parse(
                await request(
                  `/models?brandId=${brandId}&vehicleType=${values.vehicleType}&limit=50&cursor=${encodeURIComponent(next)}`,
                ),
              );
              setModels((previous) => [...previous, ...result.data]);
              setNext(result.page.nextCursor);
            } catch {
              setFailed(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          More models
        </Button>
      ) : null}
      <SelectField
        label="Variant"
        value={values.variantId}
        disabled={!model}
        error={error}
        onChange={(event) => change({ variantId: event.target.value })}
      >
        <option value="">Choose a variant</option>
        {model?.variants.map((variant) => (
          <option key={variant.id} value={variant.id}>
            {variant.name}
          </option>
        ))}
      </SelectField>
      {brandId && !models.length && !failed ? (
        <p role="status" className="text-secondary">
          Models are loading, or no published models match this type.
        </p>
      ) : null}
    </div>
  );
}
