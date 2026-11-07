import { TextField, TextAreaField, SelectField } from "@evone/ui";
import { VehicleType } from "@evone/contracts";
import type { SellValues, SellErrors } from "@/lib/sell/values";
export function SellFields({
  step,
  values,
  change,
  errors,
  disabled,
}: {
  step: number;
  values: SellValues;
  change: (patch: Partial<SellValues>) => void;
  errors: SellErrors;
  disabled: boolean;
}) {
  const field = (
    key: keyof SellValues,
    label: string,
    hint: string,
    maxLength: number,
    inputMode: "numeric" | "decimal" | "text" = "text",
  ) => (
    <TextField
      key={key}
      label={label}
      hint={hint}
      value={values[key]}
      maxLength={maxLength}
      inputMode={inputMode}
      disabled={disabled}
      error={errors[key]}
      onChange={(event) => change({ [key]: event.target.value })}
    />
  );
  if (step === 1)
    return (
      <SelectField
        label="Vehicle type"
        value={values.vehicleType}
        disabled={disabled}
        error={errors.vehicleType}
        onChange={(event) =>
          change({ vehicleType: event.target.value, variantId: "" })
        }
      >
        <option value="">Choose a type</option>
        {VehicleType.options.map((type) => (
          <option key={type} value={type}>
            {type.replaceAll("_", " ")}
          </option>
        ))}
      </SelectField>
    );
  if (step === 3)
    return (
      <div className="grid gap-6 sm:grid-cols-2">
        {field(
          "year",
          "Model year",
          "Four-digit model year; no later than next year.",
          4,
          "numeric",
        )}
        {field(
          "odometerKm",
          "Kilometres travelled",
          "Enter the odometer reading as a whole number, including zero.",
          10,
          "numeric",
        )}
      </div>
    );
  if (step === 4)
    return (
      <div className="space-y-6">
        {field(
          "ownershipCount",
          "Number of owners",
          "Include the current owner. If unknown, resolve this before submitting.",
          2,
          "numeric",
        )}
        <TextAreaField
          label="Known condition and history"
          hint="Describe known faults and history. Do not include phone numbers, addresses, identity numbers or documents."
          value={values.conditionNotes}
          maxLength={3000}
          rows={5}
          disabled={disabled}
          error={errors.conditionNotes}
          onChange={(event) => change({ conditionNotes: event.target.value })}
        />
      </div>
    );
  if (step === 6)
    return field(
      "priceInr",
      "Asking price (₹)",
      "Rupees, with at most two decimal places. Vehicle purchases happen off-platform.",
      20,
      "decimal",
    );
  if (step === 7)
    return field(
      "city",
      "Vehicle city",
      "City only. Do not enter a street address or phone number.",
      120,
    );
  return null;
}
