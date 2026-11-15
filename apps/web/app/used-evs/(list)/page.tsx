import { buttonClasses, EmptyState, ErrorState } from "@evone/ui";
import Link from "next/link";
import { FilterSheet } from "@/components/catalogue/filter-sheet";
import { UsedEvFilterForm } from "@/components/used-evs/filter-form";
import { ListingCard } from "@/components/used-evs/listing-card";
import type { SearchParams } from "@/lib/catalogue";
import { LISTING_SORT_LABEL } from "@/lib/format";
import { sectionFor } from "@/lib/site";
import { sectionMetadata } from "@/lib/site-metadata";
import {
  activeUsedEvFilterCount,
  loadUsedEvs,
  usedEvsHref,
} from "@/lib/used-evs";

const section = sectionFor("/used-evs");
export const metadata = sectionMetadata(section);
export const dynamic = "force-dynamic";

export default async function UsedEvsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const result = await loadUsedEvs(await searchParams);

  return (
    <main id="main" tabIndex={-1} className="flex-1">
      <section className="bg-graphite text-paper">
        <div className="mx-auto w-full max-w-content px-4 py-14 sm:px-8 sm:py-20">
          <h1 className="max-w-3xl font-display text-4xl font-semibold text-balance sm:text-5xl">
            {section.title}
          </h1>
          <p className="mt-6 max-w-prose text-lg text-titanium">
            {section.description}
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-content px-4 py-10 sm:px-8 sm:py-14">
        {result.kind === "unavailable" ? (
          <ErrorState
            title="Used listings are unavailable right now"
            action={
              <Link href="/used-evs" className={buttonClasses("primary")}>
                Try again
              </Link>
            }
          >
            We could not load used electric vehicles. Please try again in a
            moment.
          </ErrorState>
        ) : result.kind === "invalid-filters" ? (
          <ErrorState
            title="These filters are not valid"
            action={
              <Link href="/used-evs" className={buttonClasses("primary")}>
                Clear filters
              </Link>
            }
          >
            The link may be outdated or incomplete. Clear the filters to see all
            published listings.
          </ErrorState>
        ) : (
          <UsedEvCatalogue result={result} />
        )}
      </div>
    </main>
  );
}

function UsedEvCatalogue({
  result,
}: {
  result: Extract<Awaited<ReturnType<typeof loadUsedEvs>>, { kind: "ok" }>;
}) {
  const { brands, listings, filters, nextCursor } = result;
  const activeCount = activeUsedEvFilterCount(filters);
  const filtered = activeCount > 0;
  const form = (prefix: string) => (
    <UsedEvFilterForm brands={brands} filters={filters} idPrefix={prefix} />
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside aria-labelledby="filters-heading" className="hidden lg:block">
        <h2
          id="filters-heading"
          className="mb-5 font-display text-lg font-semibold"
        >
          Filters &amp; sort
        </h2>
        {form("desktop")}
      </aside>

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p aria-live="polite" className="text-secondary">
            {listings.length === 0
              ? "No listings to show"
              : `Showing ${listings.length} ${listings.length === 1 ? "listing" : "listings"} · ${LISTING_SORT_LABEL[filters.sort]}${filters.cursor ? " (later page)" : ""}`}
          </p>
          <FilterSheet activeCount={activeCount} title="Filter listings">
            {form("mobile")}
          </FilterSheet>
        </div>

        {listings.length === 0 ? (
          filtered ? (
            <EmptyState
              title="No listings match these filters"
              action={
                <Link href="/used-evs" className={buttonClasses("secondary")}>
                  Clear filters
                </Link>
              }
            >
              Try a different brand, vehicle type, city, price or year range.
            </EmptyState>
          ) : (
            <EmptyState title="No used listings have been published yet">
              Used EVs appear here once an owner submits a listing and a
              moderator approves it.
            </EmptyState>
          )
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <li key={listing.id}>
                <ListingCard listing={listing} />
              </li>
            ))}
          </ul>
        )}

        {nextCursor || filters.cursor ? (
          <nav aria-label="Pagination" className="flex flex-wrap gap-3">
            {filters.cursor ? (
              <Link
                href={usedEvsHref({ ...filters, cursor: undefined })}
                className={buttonClasses("secondary")}
              >
                Back to first page
              </Link>
            ) : null}
            {nextCursor ? (
              <Link
                href={usedEvsHref({ ...filters, cursor: nextCursor })}
                className={buttonClasses("primary")}
              >
                Next page
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
