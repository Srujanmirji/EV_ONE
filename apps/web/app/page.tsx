import Link from "next/link";
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
          Each area is being built and opens when it is ready. Nothing below is
          available to use yet.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="flex h-full min-h-11 flex-col gap-2 rounded-3xl border border-line bg-paper p-6 transition-colors hover:border-ink motion-reduce:transition-none"
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
    </main>
  );
}
