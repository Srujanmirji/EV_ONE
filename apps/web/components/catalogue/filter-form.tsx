import type { BrandSummary } from "@evone/contracts";
import { Button, buttonClasses, SelectField } from "@evone/ui";
import Link from "next/link";
import type { CatalogueFilters } from "@/lib/catalogue";
import { VEHICLE_TYPE_LABEL } from "@/lib/format";

/**
 * Plain GET form: filters live in the URL (shareable, back-button safe) and
 * work without JavaScript. Choosing filters resets pagination.
 */
export function FilterForm({
  brands,
  filters,
  idPrefix,
}: {
  brands: BrandSummary[];
  filters: CatalogueFilters;
  idPrefix: string;
}) {
  return (
    <form action="/evs" method="get" className="flex flex-col gap-5">
      <SelectField
        id={`${idPrefix}-brand`}
        name="brandId"
        label="Brand"
        defaultValue={filters.brandId ?? ""}
      >
        <option value="">All brands</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
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
      <div className="flex flex-wrap gap-3">
        <Button type="submit">Apply filters</Button>
        <Link href="/evs" className={buttonClasses("secondary")}>
          Clear
        </Link>
      </div>
    </form>
  );
}
