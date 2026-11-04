import Link from "next/link";
import { buttonClasses } from "@evone/ui";
import { sections } from "@/lib/site";

export default function HomePage() {
  return (
    <main id="main" tabIndex={-1} className="flex-1">
      <section className="bg-graphite text-paper">
        <div className="mx-auto w-full max-w-content px-4 py-24 sm:px-8 sm:py-32">
          <p className="text-sm font-semibold tracking-widest text-titanium uppercase">
            Early preview
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-display font-semibold text-balance">
            Everything EV.
            <br />
            One considered experience.
          </h1>
          <p className="mt-8 max-w-prose text-base text-titanium sm:text-lg">
            A place to discover electric vehicles and make informed ownership
            decisions. Built for India.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="ecosystem-heading"
        className="mx-auto w-full max-w-content px-4 py-14 sm:px-8 sm:py-24"
      >
        <h2
          id="ecosystem-heading"
          className="font-display text-3xl font-semibold"
        >
          What EVONE will cover
        </h2>
        <p className="mt-3 max-w-prose text-secondary">
          Explore the EV catalogue and estimate energy costs today. Marketplace
          and other ownership services are still being built.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="flex h-full min-h-11 flex-col gap-2 rounded-card border border-line bg-paper p-6 transition-colors hover:border-ink motion-reduce:transition-none"
              >
                <span className="font-display text-lg font-semibold">
                  {section.label}
                </span>
                <span className="text-sm text-secondary">
                  {section.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <div className="mx-auto w-full max-w-content px-4 pb-14 sm:px-8 sm:pb-24">
        <section
          aria-labelledby="savings-heading"
          className="grid gap-8 rounded-card bg-graphite p-6 text-paper sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16"
        >
          <div>
            <h2
              id="savings-heading"
              className="max-w-2xl font-display text-3xl font-semibold text-balance sm:text-4xl"
            >
              What could your driving cost on electricity?
            </h2>
            <p className="mt-4 max-w-prose text-base text-titanium">
              Compare petrol or diesel with electricity using your own driving,
              efficiency and energy prices.
            </p>
            <p className="mt-3 max-w-prose text-sm text-titanium">
              An estimate, not a guarantee. Excludes maintenance, depreciation,
              charging losses and finance.
            </p>
          </div>
          <Link
            href="/calculator"
            className={buttonClasses(
              "secondary",
              "lg",
              "justify-self-start focus-visible:outline-paper",
            )}
          >
            Estimate my energy costs
          </Link>
        </section>
      </div>
    </main>
  );
}
