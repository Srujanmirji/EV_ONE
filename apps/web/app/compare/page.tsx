import { buttonClasses, EmptyState, ErrorState } from "@evone/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { SyncTray } from "@/components/compare/add-to-compare";
import { type SearchParams, variantHref } from "@/lib/catalogue";
import {
  buildComparison,
  compareHref,
  idsFrom,
  loadComparison,
} from "@/lib/compare";
import { formatReviewDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Compare electric vehicles",
  description:
    "Compare 2 or 3 electric vehicle variants side by side, with sourced specifications.",
  alternates: { canonical: "/compare" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const ids = idsFrom(params);
  const diffOnly = params.diff === "1";
  const result = await loadComparison(ids);

  return (
    <main id="main" tabIndex={-1} className="flex-1">
      <section className="bg-graphite text-paper">
        <div className="mx-auto w-full max-w-content px-4 py-12 sm:px-8 sm:py-16">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">
            Compare electric vehicles
          </h1>
          <p className="mt-4 max-w-prose text-lg text-titanium">
            Up to 3 variants side by side. Every stated figure has a reviewed
            source.
          </p>
        </div>
      </section>
      <div className="mx-auto w-full max-w-content px-4 py-10 sm:px-8 sm:py-14">
        {result.kind === "need-more" ? (
          <EmptyState
            title={
              result.ids.length === 1
                ? "Add one more variant"
                : "Choose variants to compare"
            }
            action={
              <Link href="/evs" className={buttonClasses("primary")}>
                Browse EVs
              </Link>
            }
          >
            Open a variant and choose “Add to comparison”. You can compare 2 or
            3.
          </EmptyState>
        ) : result.kind === "invalid" ? (
          <ErrorState
            title="This comparison link is not valid"
            action={
              <Link href="/compare" className={buttonClasses("primary")}>
                Start again
              </Link>
            }
          >
            A comparison needs 2 or 3 different variants.
          </ErrorState>
        ) : result.kind === "not-found" ? (
          <ErrorState
            title="One or more of these variants is not available"
            action={
              <Link href="/compare" className={buttonClasses("primary")}>
                Start again
              </Link>
            }
          >
            It may have been unpublished. Choose the variants again.
          </ErrorState>
        ) : result.kind === "unavailable" ? (
          <ErrorState
            title="Comparison is unavailable right now"
            action={
              <Link
                href={compareHref(ids, diffOnly)}
                className={buttonClasses("primary")}
              >
                Try again
              </Link>
            }
          >
            We could not load these variants. Please try again in a moment.
          </ErrorState>
        ) : (
          <ComparisonTable
            ids={result.ids}
            variants={result.variants}
            diffOnly={diffOnly}
          />
        )}
      </div>
    </main>
  );
}

function ComparisonTable({
  ids,
  variants,
  diffOnly,
}: {
  ids: string[];
  variants: Awaited<ReturnType<typeof loadComparison>> extends infer R
    ? R extends { kind: "ok"; variants: infer V }
      ? V
      : never
    : never;
  diffOnly: boolean;
}) {
  const { rows, mixedRangeStandards } = buildComparison(variants);
  const visible = diffOnly ? rows.filter((r) => r.differs) : rows;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <SyncTray ids={ids} />
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={compareHref(ids, !diffOnly)}
          className={buttonClasses("secondary")}
        >
          {diffOnly ? "Show all specifications" : "Show only differences"}
        </Link>
        <Link href="/evs" className={buttonClasses("ghost")}>
          Add another from the catalogue
        </Link>
      </div>
      {mixedRangeStandards ? (
        <p
          role="note"
          className="max-w-prose rounded-card border border-line bg-mist p-4"
        >
          <strong>Ranges are not directly comparable.</strong> These variants’
          claimed ranges were measured under different test standards, which
          produce different numbers for the same vehicle.
        </p>
      ) : null}
      <p className="text-sm text-secondary sm:hidden">
        Scroll the table sideways to see every variant.
      </p>
      {/* relative: so position-absolute screen-reader text inside cells is
          clipped by this scroller instead of widening the whole page. */}
      <div
        role="region"
        aria-labelledby="compare-caption"
        tabIndex={0}
        className="relative w-full min-w-0 overflow-x-auto rounded-card border border-line bg-paper focus-visible:outline-2"
      >
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <caption id="compare-caption" className="sr-only">
            Specifications of {variants.length} variants
            {diffOnly ? ", differences only" : ""}
          </caption>
          <thead>
            <tr className="border-b border-line align-top">
              <th
                scope="col"
                className="sticky left-0 w-40 bg-paper p-4 text-sm text-secondary"
              >
                Specification
              </th>
              {variants.map((v) => (
                <th key={v.id} scope="col" className="min-w-48 p-4">
                  <span className="block text-sm font-normal text-secondary">
                    {v.model.brand.name}
                  </span>
                  <Link
                    href={variantHref(v.model, v.slug)}
                    className="font-display text-lg font-semibold underline-offset-4 hover:underline"
                  >
                    {v.model.name} {v.name}
                  </Link>
                  {v.isDemo ? (
                    <span className="mt-1 block w-fit rounded-full bg-ink px-2 py-0.5 text-xs text-paper">
                      Demo data
                    </span>
                  ) : null}
                  {ids.length > 2 ? (
                    <Link
                      href={compareHref(
                        ids.filter((id) => id !== v.id),
                        diffOnly,
                      )}
                      className="mt-2 inline-flex min-h-11 items-center text-sm font-normal underline underline-offset-4"
                    >
                      Remove
                      <span className="sr-only">
                        {" "}
                        {v.model.name} {v.name}
                      </span>
                    </Link>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={variants.length + 1}
                  className="p-6 text-secondary"
                >
                  These variants have the same stated specifications.
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr
                  key={row.field}
                  className="border-b border-line align-top last:border-b-0"
                >
                  <th
                    scope="row"
                    className="sticky left-0 bg-paper p-4 font-semibold"
                  >
                    {row.label}
                  </th>
                  {row.cells.map((cell, i) => (
                    <td key={variants[i]!.id} className="p-4">
                      {cell.value === null ? (
                        <span className="text-secondary">
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">Not stated</span>
                        </span>
                      ) : (
                        <>
                          <span className="font-semibold">{cell.value}</span>
                          {cell.note ? (
                            <span className="block text-sm text-secondary">
                              {cell.note}
                            </span>
                          ) : null}
                          {cell.checked ? (
                            <span className="block text-sm text-secondary">
                              Checked {formatReviewDate(cell.checked)}
                            </span>
                          ) : null}
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-secondary">
        “—” means the value is not stated in any reviewed source.
      </p>
    </div>
  );
}
