"use client";
import { useRef, useState } from "react";
import { Button, TextField, SelectField } from "@evone/ui";
import { CatalogueDocument, VehicleType } from "@evone/contracts";
import {
  emptyDocument,
  emptyVariant,
  documentFromForm,
} from "@/lib/catalogue-editor/form";
import { VariantFields } from "./variant-fields";

export function DraftForm({
  document = emptyDocument(),
  disabled,
  busy,
  onSave,
  onDirty,
}: {
  document?: CatalogueDocument;
  disabled: boolean;
  busy: boolean;
  onSave: (document: CatalogueDocument) => Promise<void>;
  onDirty: () => void;
}) {
  const [variants, setVariants] = useState(document.variants);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const summary = useRef<HTMLDivElement>(null);
  return (
    <form
      onChange={onDirty}
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        const input = documentFromForm(
          new FormData(event.currentTarget),
          variants.length,
        );
        const parsed = CatalogueDocument.safeParse(input);
        if (!parsed.success) {
          const fields: Record<string, string> = {};
          for (const issue of parsed.error.issues) {
            const path = [...issue.path];
            if (
              path[0] === "variants" &&
              typeof path[1] === "number" &&
              path[2] === "sources" &&
              typeof path[3] === "number"
            ) {
              const doc = input as {
                variants: { sources: { fieldName: string }[] }[];
              };
              path[3] =
                doc.variants[path[1]]?.sources[path[3]]?.fieldName ?? path[3];
            }
            fields[path.join(".")] = issue.message;
          }
          setErrors(fields);
          requestAnimationFrame(() => summary.current?.focus());
          return;
        }
        setErrors({});
        await onSave(parsed.data);
      }}
      className="space-y-8"
    >
      {Object.keys(errors).length > 0 ? (
        <div
          ref={summary}
          tabIndex={-1}
          role="alert"
          className="rounded-card border border-danger bg-paper p-5"
        >
          <h2 className="font-semibold">Check the highlighted fields</h2>
          <ul className="mt-2 list-inside list-disc text-sm">
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>
                {field}: {message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <fieldset disabled={disabled || busy} className="space-y-8">
        <fieldset className="grid gap-6 sm:grid-cols-2">
          <legend className="mb-5 font-display text-xl font-semibold">
            Brand and model
          </legend>
          <TextField
            label="Brand name"
            name="brand.name"
            defaultValue={document.brand.name}
            required
            maxLength={120}
            error={errors["brand.name"]}
          />
          <TextField
            label="Brand slug"
            name="brand.slug"
            defaultValue={document.brand.slug}
            required
            maxLength={120}
            error={errors["brand.slug"]}
          />
          <TextField
            label="Model name"
            name="model.name"
            defaultValue={document.model.name}
            required
            maxLength={120}
            error={errors["model.name"]}
          />
          <TextField
            label="Model slug"
            name="model.slug"
            defaultValue={document.model.slug}
            required
            maxLength={120}
            error={errors["model.slug"]}
          />
          <SelectField
            label="Vehicle type"
            name="model.vehicleType"
            defaultValue={document.model.vehicleType}
          >
            {VehicleType.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </SelectField>
          <p className="text-sm text-secondary sm:col-span-2">
            Availability and release date stay unknown in this local workflow;
            model-level provenance is not collected here.
          </p>
        </fieldset>
        {variants.map((variant, index) => (
          <VariantFields
            key={index}
            variant={variant}
            index={index}
            errors={errors}
          />
        ))}
        {!disabled ? (
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={busy} loadingLabel="Saving draft…">
              Save draft
            </Button>
            <Button
              variant="secondary"
              disabled={variants.length >= 5}
              onClick={() => {
                setVariants([...variants, emptyVariant()]);
                onDirty();
              }}
            >
              Add variant
            </Button>
            {variants.length > 1 ? (
              <Button
                variant="ghost"
                onClick={() => {
                  if (
                    window.confirm(
                      "Remove the last variant? Its unsaved values will be discarded.",
                    )
                  ) {
                    setVariants(variants.slice(0, -1));
                    onDirty();
                  }
                }}
              >
                Remove last variant
              </Button>
            ) : null}
          </div>
        ) : null}
      </fieldset>
    </form>
  );
}
