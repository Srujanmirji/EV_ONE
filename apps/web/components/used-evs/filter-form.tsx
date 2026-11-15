import type { BrandSummary } from "@evone/contracts";
import { Button, buttonClasses, SelectField, TextField } from "@evone/ui";
import Link from "next/link";
import { LISTING_SORT_LABEL, VEHICLE_TYPE_LABEL } from "@/lib/format";
import type { UsedEvFilters } from "@/lib/used-evs";

/**
 * Plain GET form wrapped in a <search> landmark: filters and sort persist in
 * the URL (shareable, back-button safe) and work without client JavaScript.
 * Submitting resets cursor pagination to page 1.
 */
export function UsedEvFilterForm({
  brands,
  filters,
  idPrefix,
}: {
  brands: BrandSummary[];
  filters: UsedEvFilters;
  idPrefix: string;
}) {
  return (
    <search
      aria-label={`${idPrefix === "desktop" ? "Desktop" : "Mobile"} listing filters`}
    >
      <form action="/used-evs" method="get" className="flex flex-col gap-5">
        {filters.modelSlug ? (
          <input type="hidden" name="modelSlug" value={filters.modelSlug} />
        ) : null}
        {filters.minPriceInr ? (
          <input type="hidden" name="minPriceInr" value={filters.minPriceInr} />
        ) : filters.minPricePaise ? (
          <input
            type="hidden"
            name="minPricePaise"
            value={filters.minPricePaise}
          />
        ) : null}
        {filters.maxYear !== undefined ? (
          <input type="hidden" name="maxYear" value={filters.maxYear} />
        ) : null}

        <SelectField
          id={`${idPrefix}-sort`}
          name="sort"
          label="Sort by"
          defaultValue={filters.sort}
        >
          {Object.entries(LISTING_SORT_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>

        <SelectField
          id={`${idPrefix}-brand`}
          name="brandSlug"
          label="Brand"
          defaultValue={filters.brandSlug ?? ""}
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          id={`${idPrefix}-type`}
          name="vehicleType"
          label="Vehicle type"
          defaultValue={filters.vehicleType ?? ""}
        >
          <option value="">All types</option>
          {Object.entries(VEHICLE_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>

        <TextField
          id={`${idPrefix}-city`}
          name="city"
          label="City"
          hint="Exact city name, e.g. Bengaluru or Pune."
          defaultValue={filters.city ?? ""}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <TextField
          id={`${idPrefix}-max-price`}
          name="maxPriceInr"
          label="Max price (₹)"
          hint="Whole rupees, e.g. 950000."
          inputMode="numeric"
          defaultValue={filters.maxPriceInr ?? ""}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <TextField
          id={`${idPrefix}-min-year`}
          name="minYear"
          label="Min model year"
          inputMode="numeric"
          defaultValue={filters.minYear?.toString() ?? ""}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <TextField
          id={`${idPrefix}-max-odo`}
          name="maxOdometerKm"
          label="Max kilometres"
          inputMode="numeric"
          defaultValue={filters.maxOdometerKm?.toString() ?? ""}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <div className="flex flex-wrap gap-3">
          <Button type="submit">Apply filters</Button>
          <Link href="/used-evs" className={buttonClasses("secondary")}>
            Clear
          </Link>
        </div>
      </form>
    </search>
  );
}
