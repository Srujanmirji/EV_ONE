import type { PublicListingSummary } from "@evone/contracts";
import { Card } from "@evone/ui";
import Link from "next/link";
import {
  formatInrFromPaise,
  formatKilometres,
  formatOwnership,
  formatReviewDate,
  formatSpan,
  RANGE_STANDARD_NAME,
  SELLER_TYPE_LABEL,
  VEHICLE_TYPE_LABEL,
} from "@/lib/format";
import { usedEvDetailHref } from "@/lib/used-evs";

/**
 * Evidence-grounded used EV card: shows only moderation-approved listing facts
 * and sourced canonical specs. Never invents verification badges, battery
 * health scores, or direct checkout actions.
 */
export function ListingCard({ listing }: { listing: PublicListingSummary }) {
  const { brand, model, variant } = listing.vehicle;
  const { specs } = variant;

  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-secondary">
          {brand.name} · {listing.year} · {listing.city}
        </p>
        <h2 className="font-display text-xl font-semibold">
          <Link
            href={usedEvDetailHref(listing.slug)}
            prefetch={false}
            className="underline-offset-4 hover:underline"
          >
            {model.name} {variant.name}
          </Link>
        </h2>
        <p className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-mist px-3 py-1">
            {VEHICLE_TYPE_LABEL[model.vehicleType]}
          </span>
          <span className="rounded-full bg-mist px-3 py-1">
            {SELLER_TYPE_LABEL[listing.sellerType]}
          </span>
          {listing.isDemo ? (
            <span className="rounded-full bg-ink px-3 py-1 font-semibold text-paper">
              Demo data
            </span>
          ) : null}
        </p>
      </div>

      <div className="rounded-field bg-mist px-4 py-3">
        <p className="font-display text-2xl font-semibold text-ink">
          {formatInrFromPaise(listing.askingPricePaise)}
        </p>
        <p className="text-xs text-secondary">
          Asking price · Enquiry only (sale happens off-platform)
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-base">
        <div>
          <dt className="text-sm text-secondary">Driven</dt>
          <dd>{formatKilometres(listing.odometerKm)}</dd>
        </div>
        <div>
          <dt className="text-sm text-secondary">Ownership</dt>
          <dd>{formatOwnership(listing.ownershipCount)}</dd>
        </div>
        <div>
          <dt className="text-sm text-secondary">Battery</dt>
          <dd>
            {specs.batteryKwh !== null
              ? formatSpan(specs.batteryKwh, specs.batteryKwh, "kWh")
              : "Not stated"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-secondary">Claimed range</dt>
          <dd>
            {specs.claimedRange === null ? (
              "Not stated"
            ) : (
              <>
                {formatSpan(specs.claimedRange.km, specs.claimedRange.km, "km")}{" "}
                <abbr
                  title={RANGE_STANDARD_NAME[specs.claimedRange.standard]}
                  className="text-secondary"
                >
                  (
                  {specs.claimedRange.standard === "OEM_UNSPECIFIED"
                    ? "maker claim"
                    : specs.claimedRange.standard}
                  )
                </abbr>
              </>
            )}
          </dd>
        </div>
      </dl>

      <p className="mt-auto border-t border-line pt-4 text-sm text-secondary">
        {listing.photoCount} {listing.photoCount === 1 ? "photo" : "photos"} ·
        Published {formatReviewDate(listing.publishedAt)}
      </p>
    </Card>
  );
}
