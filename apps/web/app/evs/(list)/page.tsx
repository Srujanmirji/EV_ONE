import { buttonClasses, EmptyState, ErrorState } from "@evone/ui";
import Link from "next/link";
import { FilterForm } from "@/components/catalogue/filter-form";
import { FilterSheet } from "@/components/catalogue/filter-sheet";
import { ModelCard } from "@/components/catalogue/model-card";
import {
  catalogueHref,
  loadCatalogue,
  type SearchParams,
} from "@/lib/catalogue";
import { sectionFor } from "@/lib/site";
import { sectionMetadata } from "@/lib/site-metadata";

const section = sectionFor("/evs");
export const metadata = sectionMetadata(section);
// Reads the URL and live API data on every request.
export const dynamic = "force-dynamic";

export default async function EvsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const result = await loadCatalogue(await searchParams);

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
            title="The catalogue is unavailable right now"
            action={
              <Link href="/evs" className={buttonClasses("primary")}>
                Try again
              </Link>
            }
          >
            We could not load electric vehicles. Please try again in a moment.
          </ErrorState>
        ) : result.kind === "invalid-filters" ? (
          <ErrorState
            title="These filters are not valid"
            action={
              <Link href="/evs" className={buttonClasses("primary")}>
                Clear filters
              </Link>
            }
          >
            The link may be outdated or incomplete. Clear the filters to see all
            models.
          </ErrorState>
        ) : (
          <Catalogue result={result} />
        )}
      </div>
    </main>
  );
}

function Catalogue({
  result,
}: {
  result: Extract<Awaited<ReturnType<typeof loadCatalogue>>, { kind: "ok" }>;
}) {
  const { brands, models, filters, nextCursor } = result;
  const activeCount = (filters.brandId ? 1 : 0) + (filters.vehicleType ? 1 : 0);
  const filtered = activeCount > 0;
  const form = (prefix: string) => (
    <FilterForm brands={brands} filters={filters} idPrefix={prefix} />
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside aria-labelledby="filters-heading" className="hidden lg:block">
        <h2
          id="filters-heading"
          className="mb-5 font-display text-lg font-semibold"
        >
          Filters
        </h2>
        {form("desktop")}
      </aside>

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p aria-live="polite" className="text-secondary">
            {models.length === 0
              ? "No models to show"
              : `Showing ${models.length} ${models.length === 1 ? "model" : "models"}${filters.cursor ? " (later page)" : ""}`}
          </p>
          <FilterSheet activeCount={activeCount}>{form("mobile")}</FilterSheet>
        </div>

        {models.length === 0 ? (
          filtered ? (
            <EmptyState
              title="No models match these filters"
              action={
                <Link href="/evs" className={buttonClasses("secondary")}>
                  Clear filters
                </Link>
              }
            >
              Try a different brand or vehicle type.
            </EmptyState>
          ) : (
            <EmptyState title="No models have been published yet">
              Models appear here once their specifications are sourced and
              reviewed.
            </EmptyState>
          )
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {models.map((model) => (
              <li key={model.id}>
                <ModelCard model={model} />
              </li>
            ))}
          </ul>
        )}

        {nextCursor || filters.cursor ? (
          <nav aria-label="Pagination" className="flex flex-wrap gap-3">
            {filters.cursor ? (
              <Link
                href={catalogueHref({ ...filters, cursor: undefined })}
                className={buttonClasses("secondary")}
              >
                Back to first page
              </Link>
            ) : null}
            {nextCursor ? (
              <Link
                href={catalogueHref({ ...filters, cursor: nextCursor })}
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
