import { formatReviewDate } from "@/lib/format";
import { SOURCE_KIND_LABEL, type SpecRow } from "@/lib/specs";

/**
 * Specifications as a definition list (stacks cleanly on phones). Every
 * stated value shows the source(s) it came from with review date; unknown
 * values say so and show no source.
 */
export function SpecList({
  rows,
  unknownLabel = "Not stated",
}: {
  rows: SpecRow[];
  unknownLabel?: string;
}) {
  return (
    <dl className="@container divide-y divide-line rounded-card border border-line bg-paper">
      {rows.map((row) => (
        <div
          key={row.field}
          className="grid gap-2 p-5 @xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6 sm:p-6"
        >
          <dt className="font-semibold">{row.label}</dt>
          <dd className="flex min-w-0 flex-col gap-2 wrap-anywhere">
            {row.value === null ? (
              <span className="text-secondary">{unknownLabel}</span>
            ) : (
              <>
                <span className="font-display text-lg font-semibold">
                  {row.value}
                </span>
                {row.note ? (
                  <span className="text-sm text-secondary">
                    Test standard: {row.note}
                  </span>
                ) : null}
                <ul
                  className="flex flex-col gap-1 text-sm text-secondary"
                  aria-label={`Sources for ${row.label}`}
                >
                  {row.sources.map((s) => (
                    <li key={`${s.sourceUrl}-${s.reviewedAt}`}>
                      Source:{" "}
                      <a
                        href={s.sourceUrl}
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center text-ink underline underline-offset-4"
                      >
                        {new URL(s.sourceUrl).hostname}
                        <span className="sr-only">, external site</span>
                      </a>{" "}
                      ({SOURCE_KIND_LABEL[s.sourceKind]}) states “{s.valueText}”
                      {s.effectiveAt
                        ? `, effective ${formatReviewDate(s.effectiveAt)}`
                        : ""}{" "}
                      · checked {formatReviewDate(s.reviewedAt)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
