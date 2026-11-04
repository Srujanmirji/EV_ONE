import { SavingsCalculator } from "@/components/calculator/calculator";
import { sectionFor } from "@/lib/site";
import { sectionMetadata } from "@/lib/site-metadata";

const section = sectionFor("/calculator");
export const metadata = sectionMetadata(section);

export default function CalculatorPage() {
  return (
    <main id="main" tabIndex={-1} className="flex-1">
      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-content px-4 py-12 sm:px-8 sm:py-16">
          <h1 className="max-w-3xl font-display text-4xl font-semibold text-balance sm:text-5xl">
            {section.title}
          </h1>
          <p className="mt-5 max-w-prose text-lg text-secondary">
            Compare petrol or diesel costs with EV electricity costs, using the
            numbers that fit your driving.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-content px-4 py-10 sm:px-8 sm:py-14">
        <SavingsCalculator />
      </div>
    </main>
  );
}
