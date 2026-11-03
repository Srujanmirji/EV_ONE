import Link from "next/link";
import type { SiteSection } from "@/lib/site";

/**
 * Truthful placeholder for a section whose feature is not built yet
 * (UX-01: missing data shows "coming soon", never fabricated cards).
 */
export function ComingSoon({ section }: { section: SiteSection }) {
  return (
    <main id="main" tabIndex={-1} className="flex-1">
      <section className="bg-graphite text-paper">
        <div className="mx-auto w-full max-w-content px-4 py-16 sm:px-8 sm:py-24">
          <p className="text-sm font-semibold tracking-widest text-titanium uppercase">
            Not available yet
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold text-balance sm:text-5xl">
            {section.title}
          </h1>
          <p className="mt-6 max-w-prose text-lg text-titanium">
            {section.description}
          </p>
        </div>
      </section>
      <section className="mx-auto w-full max-w-content px-4 py-14 sm:px-8">
        <div
          role="status"
          className="max-w-prose rounded-3xl border border-line bg-paper p-6 sm:p-8"
        >
          <h2 className="font-display text-xl font-semibold">Status</h2>
          <p className="mt-3 text-base text-secondary">
            {section.availability}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center rounded-full border border-line px-5 font-semibold underline-offset-4 hover:underline"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
