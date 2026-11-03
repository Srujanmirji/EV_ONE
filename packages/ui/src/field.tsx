"use client";

import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useId,
} from "react";
import { cn } from "./cn";

interface FieldChrome {
  label: string;
  /** Persistent help shown under the label. */
  hint?: string;
  /** Validation message; also sets aria-invalid. */
  error?: string;
}

const control =
  "min-h-12 w-full rounded-field border bg-paper px-4 text-base text-ink placeholder:text-secondary " +
  "aria-invalid:border-danger disabled:bg-mist disabled:text-secondary";

function useFieldIds(id?: string) {
  const generated = useId();
  const base = id ?? generated;
  return { id: base, hint: `${base}-hint`, error: `${base}-error` };
}

function describedBy(
  ids: { hint: string; error: string },
  hint?: string,
  error?: string,
) {
  return (
    [hint ? ids.hint : null, error ? ids.error : null]
      .filter(Boolean)
      .join(" ") || undefined
  );
}

function Chrome({
  ids,
  label,
  hint,
  error,
  required,
  children,
}: FieldChrome & {
  ids: ReturnType<typeof useFieldIds>;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={ids.id} className="text-sm font-semibold">
        {label}
        {required ? (
          <span className="font-normal text-secondary"> (required)</span>
        ) : null}
      </label>
      {hint ? (
        <p id={ids.hint} className="text-sm text-secondary">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={ids.error} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type TextFieldProps = FieldChrome &
  Omit<InputHTMLAttributes<HTMLInputElement>, "children">;

export function TextField({
  label,
  hint,
  error,
  id,
  required,
  className,
  ...props
}: TextFieldProps) {
  const ids = useFieldIds(id);
  return (
    <Chrome
      ids={ids}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <input
        id={ids.id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, hint, error)}
        className={cn(
          control,
          error ? "border-danger" : "border-line",
          className,
        )}
        {...props}
      />
    </Chrome>
  );
}

export type SelectFieldProps = FieldChrome &
  SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode };

export function SelectField({
  label,
  hint,
  error,
  id,
  required,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const ids = useFieldIds(id);
  return (
    <Chrome
      ids={ids}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <select
        id={ids.id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, hint, error)}
        className={cn(
          control,
          "appearance-auto",
          error ? "border-danger" : "border-line",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </Chrome>
  );
}

export type CheckboxProps = Omit<FieldChrome, "label"> & {
  /** Visible label text; unchecked by default (consent must be opt-in). */
  label: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children">;

export function Checkbox({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: CheckboxProps) {
  const ids = useFieldIds(id);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <input
          id={ids.id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, hint, error)}
          className={cn("mt-0.5 size-6 shrink-0 accent-ink", className)}
          {...props}
        />
        <label htmlFor={ids.id} className="text-base">
          {label}
        </label>
      </div>
      {hint ? (
        <p id={ids.hint} className="pl-9 text-sm text-secondary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={ids.error} className="pl-9 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
