import { buttonClasses, Card, cn, Gallery } from "@evone/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/catalogue/breadcrumbs";
import { SpecList } from "@/components/catalogue/spec-list";
import { CatalogueUnavailable } from "@/components/catalogue/unavailable";
import { AddToCompare } from "@/components/compare/add-to-compare";
import { ListingCard } from "@/components/used-evs/listing-card";
import { variantHref } from "@/lib/catalogue";
import {
  formatInrFromPaise,
  formatKilometres,
  formatOwnership,
  formatReviewDate,
  SELLER_TYPE_LABEL,
  VEHICLE_TYPE_LABEL,
} from "@/lib/format";
import { specRows } from "@/lib/specs";
import { usedEvDetailHref, usedEvsHref } from "@/lib/used-evs";

import styles from "./detail.module.css";
import { readListing } from "./listing";

type Params = Promise<{ slug: string }>;
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await readListing(slug);
  if (result.kind !== "ok") {
    return {
      title: "Used electric vehicle",
      robots: { index: false, follow: false },
    };
  }
  const { listing } = result.data;
  const { brand, model, variant } = listing.vehicle;
  return {
    title: `${listing.year} ${model.name} ${variant.name} in ${listing.city}`,
    description: `Used ${listing.year} ${brand.name} ${model.name} ${variant.name} in ${listing.city} (${formatKilometres(listing.odometerKm)}, ${formatOwnership(listing.ownershipCount)}) — asking ${formatInrFromPaise(listing.askingPricePaise)}. Enquiry only on EVONE.`,
    alternates: { canonical: usedEvDetailHref(listing.slug) },
    robots: { index: false, follow: false },
  };
}

export default async function UsedEvDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const result = await readListing(slug);
  if (result.kind === "not-found") notFound();
  if (result.kind === "unavailable") {
    return <CatalogueUnavailable retryHref={usedEvDetailHref(slug)} />;
  }

  const { listing } = result.data;
  const related = await result.data.related;
  const { brand, model, variant } = listing.vehicle;
  const rows = specRows(variant.specs, listing.sources);
  const reviewed = listing.sources
    .map((s) => s.reviewedAt)
    .sort()
    .at(-1);

  const title = `${listing.year} ${model.name} ${variant.name}`;
  const price = BigInt(listing.askingPricePaise);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: title,
    brand: { "@type": "Brand", name: brand.name },
    model: model.name,
    vehicleModelDate: String(listing.year),
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: listing.odometerKm,
      unitCode: "KMT",
    },
    offers: {
      "@type": "Offer",
      price: `${price / 100n}.${String(price % 100n).padStart(2, "0")}`,
      priceCurrency: "INR",
      itemCondition: "https://schema.org/UsedCondition",
    },
  };

  return (
    <main id="main" tabIndex={-1} className={cn("flex-1", styles.detail)}>
      {!listing.isDemo ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      <section className="bg-graphite text-paper">
        <div className="mx-auto flex w-full max-w-content flex-col gap-3 px-4 py-6 sm:px-8 sm:py-8">
          <Breadcrumbs
            items={[
              { href: "/used-evs", label: "Used EVs" },
              {
                href: usedEvsHref({ brandSlug: brand.slug, sort: "PRICE_ASC" }),
                label: brand.name,
              },
              { label: "Listing details" },
            ]}
          />
          <h1 className="font-display text-4xl font-semibold text-balance sm:text-5xl">
            {listing.year} {model.name}{" "}
            <span className="text-titanium">{variant.name}</span>
          </h1>
          <p className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-glass-line px-3 py-1">
              {VEHICLE_TYPE_LABEL[model.vehicleType]}
            </span>
            <span className="rounded-full border border-glass-line px-3 py-1">
              Enquiry only
            </span>
            {listing.isDemo ? (
              <span className="rounded-full bg-paper px-3 py-1 font-semibold text-ink">
                Demo data
              </span>
            ) : null}
          </p>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-content items-start gap-8 px-4 py-10 sm:px-8 sm:py-14 min-[769px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] min-[769px]:grid-rows-[auto_1fr]">
        <div className="flex flex-col gap-4">
          <Gallery
            images={[]}
            label={`Photos of ${listing.year} ${model.name} ${variant.name}`}
            emptyText="Photos are unavailable online."
          />
          {listing.media.length > 0 ? (
            <Card className="flex flex-col gap-3 p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold">
                Seller photo descriptions ({listing.media.length})
              </h2>
              <ol className="flex flex-col gap-2 text-sm text-secondary">
                {listing.media.map((photo) => (
                  <li key={photo.id}>
                    <span className="font-semibold text-ink">
                      Photo {photo.position + 1}:
                    </span>{" "}
                    {photo.alt}
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}
        </div>

        <aside
          aria-label="Pricing, seller summary and enquiry"
          className="flex flex-col gap-6 min-[769px]:col-start-2 min-[769px]:row-start-1 min-[769px]:row-span-2"
        >
          <Card className="flex flex-col gap-5 p-6">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-secondary">Asking price</p>
              <p className="font-display text-3xl font-semibold text-ink sm:text-4xl">
                {formatInrFromPaise(listing.askingPricePaise)}
              </p>
              <p className="text-sm text-secondary">
                Vehicle sale is arranged off-platform.
              </p>
            </div>

            <p className="text-sm text-secondary">
              Seller-declared vehicle details
            </p>
            <dl className="grid grid-cols-2 gap-4 border-y border-line py-4 text-base">
              <div>
                <dt className="text-sm text-secondary">Model year</dt>
                <dd className="font-semibold">{listing.year}</dd>
              </div>
              <div>
                <dt className="text-sm text-secondary">Driven</dt>
                <dd className="font-semibold">
                  {formatKilometres(listing.odometerKm)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-secondary">Ownership</dt>
                <dd className="font-semibold">
                  {formatOwnership(listing.ownershipCount)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-secondary">City</dt>
                <dd className="font-semibold">{listing.city}</dd>
              </div>
            </dl>

            <p className="text-sm text-secondary">
              Published{" "}
              <time dateTime={listing.publishedAt}>
                {formatReviewDate(listing.publishedAt)}
              </time>
            </p>
            <div className="flex flex-col gap-3">
              <div className="hidden min-[769px]:block">
                <a
                  href="#enquire"
                  className={buttonClasses("primary", "md", "w-full")}
                >
                  Enquire
                </a>
              </div>
              <Link href="/calculator" className={buttonClasses("secondary")}>
                Estimate running costs
              </Link>
            </div>
          </Card>

          <div
            role="region"
            aria-label="Quick enquiry action"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] min-[769px]:hidden"
          >
            <div className="mx-auto flex max-w-content items-center justify-between gap-4">
              <div>
                <p className="font-display text-lg font-semibold text-ink">
                  {formatInrFromPaise(listing.askingPricePaise)}
                </p>
                <p className="text-xs text-secondary">Enquiry only</p>
              </div>
              <a href="#enquire" className={buttonClasses("primary")}>
                Enquire
              </a>
            </div>
          </div>

          <section
            id="enquire"
            aria-labelledby="enquire-heading"
            tabIndex={-1}
            className="scroll-mt-24"
          >
            <Card className="flex flex-col gap-4 p-6">
              <h2
                id="enquire-heading"
                className="font-display text-xl font-semibold"
              >
                Contact & enquiry
              </h2>
              <p className="text-sm font-semibold">
                {SELLER_TYPE_LABEL[listing.sellerType]} · {listing.city}
              </p>
              <p className="text-sm text-secondary">
                Online enquiries are currently unavailable.
              </p>
            </Card>
          </section>
        </aside>
        <div className="flex min-w-0 flex-col gap-10">
          <section
            aria-labelledby="condition-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="condition-heading"
              className="font-display text-2xl font-semibold"
            >
              Condition & seller notes
            </h2>
            <Card className="flex flex-col gap-4 p-5 sm:p-6">
              <p className="whitespace-pre-line text-base text-ink">
                {listing.conditionNotes || "—"}
              </p>
              <p className="border-t border-line pt-4 text-sm text-secondary">
                Seller-declared condition.
              </p>
            </Card>
          </section>

          <section
            aria-labelledby="specs-heading"
            className="flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2
                id="specs-heading"
                className="font-display text-2xl font-semibold"
              >
                Canonical specifications
              </h2>
              <Link
                href={variantHref({ brand, slug: model.slug }, variant.slug)}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline underline-offset-4"
              >
                View {model.name} {variant.name} in EV catalogue
              </Link>
            </div>
            <p className="max-w-prose text-secondary">
              Catalogue specifications for the {brand.name} {model.name}{" "}
              {variant.name}. Figures describe the variant as sold.
              {reviewed
                ? ` Most recently checked ${formatReviewDate(reviewed)}.`
                : ""}{" "}
              Actual range and battery condition depend on age, usage and
              maintenance.
            </p>
            <AddToCompare variantId={variant.id} variantName={variant.name} />
            <SpecList rows={rows} unknownLabel="—" />
          </section>
        </div>
      </div>

      {related.length > 0 ? (
        <section
          aria-labelledby="related-heading"
          className="border-t border-line bg-mist/50"
        >
          <div className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-10 sm:px-8 sm:py-14">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2
                id="related-heading"
                className="font-display text-2xl font-semibold"
              >
                More used EVs
              </h2>
              <Link
                href="/used-evs"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline underline-offset-4"
              >
                Browse all used EVs
              </Link>
            </div>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <li key={item.id}>
                  <ListingCard listing={item} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </main>
  );
}
