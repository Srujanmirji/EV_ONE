import type { ModelSummary } from "@evone/contracts";
import { Card } from "@evone/ui";
import {
  AVAILABILITY_LABEL,
  formatReviewDate,
  formatSpan,
  RANGE_STANDARD_NAME,
  VEHICLE_TYPE_LABEL,
} from "@/lib/format";

/**
 * Source-aware model card: every figure shown has a reviewed source (the
 * database enforces it), ranges always carry their test standard, unknown
 * values say so, and demo data is labelled.
 */
export function ModelCard({ model }: { model: ModelSummary }) {
  const { specSummary: s } = model;
  const hasSpecs = s.batteryKwh !== null || s.claimedRanges.length > 0;
  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-secondary">{model.brand.name}</p>
        <h2 className="font-display text-xl font-semibold">{model.name}</h2>
        <p className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-mist px-3 py-1">
            {VEHICLE_TYPE_LABEL[model.vehicleType]}
          </span>
          <span className="rounded-full bg-mist px-3 py-1">
            {AVAILABILITY_LABEL[model.availability]}
          </span>
          {model.isDemo ? (
            <span className="rounded-full bg-ink px-3 py-1 font-semibold text-paper">
              Demo data
            </span>
          ) : null}
        </p>
      </div>

      <dl className="grid gap-3 text-base">
        <div>
          <dt className="text-sm text-secondary">Battery</dt>
          <dd>
            {s.batteryKwh
              ? formatSpan(s.batteryKwh.min, s.batteryKwh.max, "kWh")
              : "Not stated"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-secondary">Claimed range</dt>
          <dd>
            {s.claimedRanges.length === 0 ? (
              "Not stated"
            ) : (
              <ul>
                {s.claimedRanges.map((r) => (
                  <li key={r.standard}>
                    {formatSpan(r.minKm, r.maxKm, "km")}{" "}
                    <abbr
                      title={RANGE_STANDARD_NAME[r.standard]}
                      className="text-secondary"
                    >
                      (
                      {r.standard === "OEM_UNSPECIFIED"
                        ? "maker claim"
                        : r.standard}
                      )
                    </abbr>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      <p className="mt-auto border-t border-line pt-4 text-sm text-secondary">
        {hasSpecs && s.lastReviewedAt
          ? `${s.variantCount} ${s.variantCount === 1 ? "variant" : "variants"} · ${s.reviewedSourceCount} reviewed ${
              s.reviewedSourceCount === 1 ? "source" : "sources"
            } · checked ${formatReviewDate(s.lastReviewedAt)}`
          : "Specifications not published yet"}
      </p>
    </Card>
  );
}
