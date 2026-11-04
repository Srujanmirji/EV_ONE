"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, EmptyState, ErrorState, Skeleton, TextField } from "@evone/ui";
import { calculateSavingsAction } from "@/app/calculator/actions";
import {
  emptySavingsValues,
  exampleSavingsValues,
  savingsFields,
  type SavingsState,
} from "@/lib/savings-form";
import { SavingsResults } from "./results";

export function SavingsCalculator() {
  const [values, setValues] = useState(emptySavingsValues);
  const [dirty, setDirty] = useState(false);
  const results = useRef<HTMLElement>(null);
  const [state, action, pending] = useActionState(
    async (previous: SavingsState, data: FormData) => {
      setDirty(false);
      let next: SavingsState;
      try {
        next = await calculateSavingsAction(previous, data);
      } catch {
        next = { kind: "unavailable" };
      }
      return next;
    },
    { kind: "empty" },
  );
  useEffect(() => {
    if (pending || state.kind === "empty") return;
    const first =
      state.kind === "invalid"
        ? savingsFields.find((field) => state.fields[field.key])
        : undefined;
    if (first) {
      const input = document.getElementById(`calc-${first.key}`);
      input?.focus({ preventScroll: true });
      input?.scrollIntoView({ block: "center" });
    } else {
      results.current?.focus({ preventScroll: true });
      results.current?.scrollIntoView({ block: "start" });
    }
  }, [state, pending]);
  const errors = state.kind === "invalid" && !dirty ? state.fields : {};

  return (
    <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
      <form action={action} noValidate aria-label="Energy savings inputs">
        <fieldset disabled={pending} className="min-w-0">
          <legend className="font-display text-2xl font-semibold">
            Your driving and energy use
          </legend>
          <p className="mt-3 max-w-prose text-base text-secondary">
            Enter your own values, or load an illustrative example. Your inputs
            are not saved.
          </p>
          <Button
            variant="secondary"
            className="mt-5"
            onClick={() => {
              setValues(exampleSavingsValues);
              setDirty(true);
            }}
          >
            Load illustrative example
          </Button>
          <div className="mt-8 grid items-end gap-6 sm:grid-cols-2">
            {savingsFields.map((field) => (
              <TextField
                key={field.key}
                id={`calc-${field.key}`}
                name={field.key}
                type="number"
                inputMode="decimal"
                step={
                  field.key === "purchasePriceDeltaInr" ? "0.01" : "0.000001"
                }
                min={field.min}
                max={field.max}
                required={field.key !== "purchasePriceDeltaInr"}
                label={field.label}
                hint={field.hint}
                error={errors[field.key]}
                value={values[field.key]}
                onChange={(event) => {
                  setValues({
                    ...values,
                    [field.key]: event.currentTarget.value,
                  });
                  setDirty(true);
                }}
              />
            ))}
          </div>
          <p className="mt-8 max-w-prose text-sm text-secondary">
            Energy only: no maintenance, depreciation, charging losses or
            finance. Your tariff should reflect your average charging cost.
            Values are estimates, not offers.
          </p>
          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full sm:w-auto"
            loading={pending}
            loadingLabel="Calculating…"
          >
            Calculate estimate
          </Button>
        </fieldset>
      </form>

      <section
        ref={results}
        tabIndex={-1}
        aria-label="Calculation results"
        className="min-w-0 scroll-mt-24 rounded-card border border-line bg-paper p-6 sm:p-8"
      >
        {pending ? (
          <div className="min-h-80">
            <Skeleton lines={6} label="Calculating energy estimate" />
          </div>
        ) : dirty || state.kind === "empty" ? (
          <EmptyState
            title={dirty ? "Ready to calculate" : "Build your energy estimate"}
            className="border-0 p-0 sm:p-0"
          >
            {dirty
              ? "Your values have changed. Calculate to see a fresh estimate."
              : "Enter your driving and energy costs. Your monthly and annual comparison will appear here."}
          </EmptyState>
        ) : state.kind === "invalid" ? (
          <ErrorState title="Check your inputs" className="border-0 p-0 sm:p-0">
            Correct the highlighted fields and calculate again. Your values have
            been kept.
          </ErrorState>
        ) : state.kind === "unavailable" ? (
          <ErrorState
            title="The estimate is unavailable"
            className="border-0 p-0 sm:p-0"
          >
            We could not calculate right now. Your values are kept; use
            Calculate estimate to try again.
          </ErrorState>
        ) : (
          <SavingsResults result={state.result} input={state.input} />
        )}
      </section>
    </div>
  );
}
