import { TextField, SelectField } from "@evone/ui";
import { SpecField, RangeStandard, SourceKind } from "@evone/contracts";
import type { CatalogueDocument } from "@evone/contracts";
import { specFields, specLabels } from "@/lib/catalogue-editor/form";

export function VariantFields({
  variant,
  index,
  errors,
}: {
  variant: CatalogueDocument["variants"][number];
  index: number;
  errors: Record<string, string>;
}) {
  const base = `variants.${index}`;
  const error = (path: string) => errors[`${base}.${path}`];
  return (
    <fieldset className="space-y-6 border-t border-line pt-6">
      <legend className="pr-4 font-display text-xl font-semibold">
        Variant {index + 1}
      </legend>
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Variant name"
          name={`${base}.name`}
          defaultValue={variant.name}
          maxLength={120}
          required
          error={error("name")}
        />
        <TextField
          label="Variant slug"
          hint="Lowercase words separated by hyphens."
          name={`${base}.slug`}
          defaultValue={variant.slug}
          maxLength={120}
          required
          error={error("slug")}
        />
        {specFields.map((spec) => (
          <TextField
            key={spec.key}
            label={spec.label}
            name={`${base}.specs.${spec.key}`}
            type="number"
            min={0.01}
            step="0.01"
            max={spec.max}
            defaultValue={variant.specs[spec.key] ?? ""}
            error={error(`specs.${spec.key}`)}
          />
        ))}
        <TextField
          label="Claimed range (km)"
          name={`${base}.specs.claimedRange.km`}
          type="number"
          min={1}
          step="1"
          max={2147483647}
          defaultValue={variant.specs.claimedRange?.km ?? ""}
          error={error("specs.claimedRange.km")}
        />
        <SelectField
          label="Range test standard"
          name={`${base}.specs.claimedRange.standard`}
          defaultValue={
            variant.specs.claimedRange?.standard ?? "OEM_UNSPECIFIED"
          }
          error={error("specs.claimedRange.standard")}
        >
          {RangeStandard.options.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </SelectField>
      </div>
      <TextField
        label="Warranty wording"
        name={`${base}.specs.warrantyText`}
        defaultValue={variant.specs.warrantyText ?? ""}
        maxLength={2000}
        error={error("specs.warrantyText")}
      />
      <p className="text-sm text-secondary">
        Leave unknown specifications empty. Every stated value needs a citation
        before submission.
      </p>
      {SpecField.options.map((field) => {
        const source = variant.sources.find((item) => item.fieldName === field);
        const key = `${base}.sources.${field}`;
        return (
          <details
            key={field}
            open={source ? true : undefined}
            className="border-t border-line py-2"
          >
            <summary className="min-h-11 cursor-pointer py-3 font-semibold">
              {specLabels[field]} citation
            </summary>
            <div className="mt-4 grid gap-5 pb-4 sm:grid-cols-2">
              {source ? (
                <a
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block min-h-11 break-all py-3 text-sm underline underline-offset-4 sm:col-span-2"
                >
                  Open {specLabels[field]} source: {source.sourceUrl} (new tab)
                </a>
              ) : null}
              <TextField
                label={`${specLabels[field]} source URL`}
                type="url"
                name={`${key}.sourceUrl`}
                defaultValue={source?.sourceUrl ?? ""}
                maxLength={2048}
                hint="HTTPS; no credentials in the URL."
                error={errors[`${key}.sourceUrl`]}
              />
              <TextField
                label={`${specLabels[field]} cited wording`}
                name={`${key}.valueText`}
                defaultValue={source?.valueText ?? ""}
                maxLength={500}
                error={errors[`${key}.valueText`]}
              />
              <SelectField
                label={`${specLabels[field]} source type`}
                name={`${key}.sourceKind`}
                defaultValue={source?.sourceKind ?? "OTHER"}
              >
                {SourceKind.options.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </SelectField>
              <TextField
                label={`${specLabels[field]} effective date`}
                type="date"
                name={`${key}.effectiveAt`}
                defaultValue={source?.effectiveAt ?? ""}
                error={errors[`${key}.effectiveAt`]}
              />
            </div>
          </details>
        );
      })}
    </fieldset>
  );
}
