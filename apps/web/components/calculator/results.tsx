import type { SavingsRequest, SavingsResult } from "@evone/contracts";
import { formatPaise } from "@/lib/savings-form";

export function SavingsResults({
  result,
  input,
}: {
  result: SavingsResult;
  input: SavingsRequest;
}) {
  const extra = result.annualEnergySavingsPaise < 0;
  const maximum = Math.max(
    result.iceMonthlyCostPaise,
    result.evMonthlyCostPaise,
    1,
  );
  return (
    <div className="space-y-8">
      <div>
        <h2
          id="estimate-heading"
          className="font-display text-2xl font-semibold"
        >
          Your energy estimate
        </h2>
        <p className="mt-5 text-secondary">
          {extra
            ? "Additional energy cost per year"
            : "Estimated energy savings per year"}
        </p>
        <p className="mt-2 break-words font-display text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
          {formatPaise(Math.abs(result.annualEnergySavingsPaise))}
        </p>
        <p className="mt-3 text-base text-secondary">
          {formatPaise(Math.abs(result.monthlyEnergySavingsPaise))} per month{" "}
          {result.monthlyEnergySavingsPaise === 0
            ? "difference"
            : extra
              ? "more than petrol / diesel"
              : "less than petrol / diesel"}
          .
        </p>
        {input.monthlyKm === 0 ? (
          <p className="mt-3 text-base">
            No driving entered. Both energy costs are zero.
          </p>
        ) : null}
      </div>

      <figure aria-labelledby="cost-chart-caption" className="space-y-5">
        <figcaption id="cost-chart-caption" className="font-semibold">
          Monthly energy costs
        </figcaption>
        {[
          {
            name: "Petrol / diesel",
            amount: result.iceMonthlyCostPaise,
            tone: "bg-ink",
          },
          {
            name: "Electricity",
            amount: result.evMonthlyCostPaise,
            tone: "bg-secondary",
          },
        ].map((row) => (
          <div key={row.name}>
            <div className="mb-2 flex flex-wrap justify-between gap-2 text-base">
              <span>{row.name}</span>
              <span className="font-semibold tabular-nums">
                {formatPaise(row.amount)}
              </span>
            </div>
            <div
              aria-hidden="true"
              className="h-3 overflow-hidden rounded-full bg-mist"
            >
              <div
                className={row.tone}
                style={{
                  width: `${(row.amount / maximum) * 100}%`,
                  height: "100%",
                }}
              />
            </div>
          </div>
        ))}
      </figure>

      <table className="w-full border-t border-line text-left text-sm tabular-nums">
        <caption className="py-3 text-left font-semibold">
          Annual energy costs
        </caption>
        <tbody>
          <tr className="border-t border-line">
            <th scope="row" className="py-3 pr-4 font-normal">
              Petrol / diesel
            </th>
            <td className="py-3 text-right font-semibold">
              {formatPaise(result.iceAnnualCostPaise)}
            </td>
          </tr>
          <tr className="border-t border-line">
            <th scope="row" className="py-3 pr-4 font-normal">
              Electricity
            </th>
            <td className="py-3 text-right font-semibold">
              {formatPaise(result.evAnnualCostPaise)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="border-t border-line pt-6">
        <h3 className="font-semibold">Simple energy payback</h3>
        <p className="mt-2 text-base text-secondary">
          {input.purchasePriceDeltaPaise === undefined
            ? "Add an optional EV purchase premium to estimate payback."
            : input.purchasePriceDeltaPaise < 0
              ? `The EV is ${formatPaise(-input.purchasePriceDeltaPaise)} cheaper up front. No extra purchase cost to recover.`
              : input.purchasePriceDeltaPaise === 0
                ? "No extra purchase cost to recover. Ongoing energy costs still apply."
                : result.estimatedPaybackMonths === null
                  ? "No payback estimate for these values."
                  : `${result.estimatedPaybackMonths.toLocaleString("en-IN")} months to recover the premium from energy savings alone.`}
        </p>
      </div>
      <p className="text-sm text-secondary">
        An estimate, not a guarantee. Excludes maintenance, depreciation,
        charging losses and finance. Each amount rounds independently; payback
        uses unrounded savings.
      </p>
    </div>
  );
}
