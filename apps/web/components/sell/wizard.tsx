"use client";
import { useRef, useState } from "react";
import { Button, Checkbox, ErrorState } from "@evone/ui";
import type { SellerListing } from "@evone/contracts";
import type { SellerRequest } from "@/lib/sell/request";
import {
  resumeStep,
  sellSteps,
  stepErrors,
  paiseToInput,
} from "@/lib/sell/values";
import type { SellErrors } from "@/lib/sell/values";
import { useListingDraft } from "./use-draft";
import { SellFields } from "./fields";
import { VehiclePicker } from "./vehicle-picker";
import { ListingPhotos } from "./photos";
export function SellWizard({
  initial,
  request,
  onBack,
}: {
  initial: SellerListing;
  request: SellerRequest;
  onBack: () => void;
}) {
  const draft = useListingDraft(initial, request);
  const readonly = !["DRAFT", "REJECTED"].includes(draft.listing.status);
  const [step, setStep] = useState(readonly ? 9 : resumeStep(initial)),
    [visited, setVisited] = useState(readonly ? 9 : resumeStep(initial)),
    [confirmedVersion, setConfirmedVersion] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [errors, setErrors] = useState<SellErrors>({}),
    [generalError, setGeneralError] = useState<string | null>(null),
    [epoch, setEpoch] = useState(0);
  const declaration = confirmedVersion === draft.listing.version;
  const heading = useRef<HTMLHeadingElement>(null),
    summary = useRef<HTMLDivElement>(null);
  const move = (next: number) => {
    setErrors({});
    setGeneralError(null);
    setStep(next);
    setVisited((value) => Math.max(value, next));
    const url = new URL(window.location.href);
    url.searchParams.set("draft", initial.id);
    url.searchParams.set("step", String(next));
    window.history.replaceState(null, "", url);
    requestAnimationFrame(() => heading.current?.focus());
  };
  const next = async () => {
    const found = stepErrors(step, draft.values, draft.listing, declaration);
    setErrors(found);
    if (
      Object.keys(found).length ||
      (step === 5 && !draft.listing.media.length)
    ) {
      setGeneralError(
        step === 5
          ? "Add at least one validated vehicle photo."
          : "Check the highlighted fields.",
      );
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    setBusy(true);
    const saved = await draft.flush();
    setBusy(false);
    if (saved) {
      if (step === 7) setConfirmedVersion(saved.version);
      move(step + 1);
    }
  };
  const submit = async () => {
    if (!declaration) {
      setGeneralError("Confirm the seller declaration before submitting.");
      return;
    }
    setBusy(true);
    await draft.mutate((row) =>
      request(`/listings/${row.id}/submit`, "POST", {
        version: row.version,
        sellerDeclaration: true,
      }),
    );
    setBusy(false);
    requestAnimationFrame(() => heading.current?.focus());
  };
  const locked = busy || uploading;
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-4">
      <aside className="space-y-5 lg:col-span-1">
        <Button
          variant="secondary"
          disabled={locked}
          onClick={() => {
            if (
              draft.dirty &&
              !window.confirm(
                "Return to your drafts with unsaved values? A save may still be finishing.",
              )
            )
              return;
            onBack();
          }}
        >
          Your drafts
        </Button>
        <ol
          aria-label="Selling steps"
          className="flex flex-wrap gap-2 lg:flex-col"
        >
          {sellSteps.map((label, index) => (
            <li key={label}>
              <Button
                variant="ghost"
                aria-current={step === index + 1 ? "step" : undefined}
                disabled={
                  locked || index + 1 > visited || (readonly && index !== 8)
                }
                className="w-full justify-start whitespace-normal text-left"
                onClick={async () => {
                  if (index + 1 >= 8 && !readonly) {
                    setBusy(true);
                    const row = await draft.flush();
                    setBusy(false);
                    if (!row) return;
                  }
                  move(index + 1);
                }}
              >
                {index + 1}. {label}
              </Button>
            </li>
          ))}
        </ol>
      </aside>
      <section className="min-w-0 space-y-6 lg:col-span-3">
        <div className="border-b border-line pb-5">
          <p className="text-sm text-secondary">
            Step {step} of 9 · {draft.listing.status.replaceAll("_", " ")} ·
            Revision {draft.listing.version}
          </p>
          <h2
            ref={heading}
            tabIndex={-1}
            className="mt-2 scroll-mt-24 font-display text-2xl font-semibold"
          >
            {readonly ? "Submitted draft" : sellSteps[step - 1]}
          </h2>
          <p role="status" className="mt-3 text-sm text-secondary">
            {uploading
              ? "Photo upload in progress…"
              : draft.status === "saving"
                ? "Saving…"
                : draft.status === "saved"
                  ? "Saved to your private draft."
                  : draft.status === "invalid"
                    ? "Finish the invalid fields to save."
                    : draft.status === "unsaved"
                      ? "Unsaved changes…"
                      : "Autosave paused."}
          </p>
        </div>
        {draft.listing.reviewReason ? (
          <p className="rounded-card bg-mist p-5">
            Changes requested: {draft.listing.reviewReason}
          </p>
        ) : null}
        {draft.error ? (
          <ErrorState
            title={
              draft.status === "conflict" ? "Draft changed" : "Save unavailable"
            }
          >
            {draft.error}
            <div className="mt-4 flex flex-wrap gap-3">
              {draft.status !== "conflict" ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    void draft.retry();
                  }}
                >
                  Retry save
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={async () => {
                  if (
                    draft.dirty &&
                    !window.confirm(
                      "Discard unsaved values and load the saved draft?",
                    )
                  )
                    return;
                  const row = await draft.reload();
                  if (row) {
                    setConfirmedVersion(null);
                    setEpoch((value) => value + 1);
                    move(
                      ["DRAFT", "REJECTED"].includes(row.status)
                        ? resumeStep(row)
                        : 9,
                    );
                  }
                }}
              >
                Reload saved draft
              </Button>
            </div>
          </ErrorState>
        ) : null}
        {generalError ? (
          <div
            ref={summary}
            tabIndex={-1}
            role="alert"
            className="scroll-mt-24 rounded-card border border-danger bg-danger-surface p-5"
          >
            <p className="font-semibold text-danger">{generalError}</p>
            {Object.entries(errors).map(([field, message]) => (
              <p key={field} className="mt-2 text-sm">
                {message}
              </p>
            ))}
          </div>
        ) : null}
        {!readonly ? (
          <SellFields
            step={step}
            values={draft.values}
            change={draft.change}
            errors={errors}
            disabled={locked}
          />
        ) : null}
        {step === 2 && !readonly ? (
          <VehiclePicker
            key={epoch}
            listing={draft.listing}
            values={draft.values}
            change={draft.change}
            request={request}
            error={errors.variantId}
          />
        ) : null}
        {step === 5 && !readonly ? (
          <ListingPhotos
            key={epoch}
            listing={draft.listing}
            request={request}
            mutate={draft.mutate}
            onBusy={setUploading}
          />
        ) : null}
        {step === 7 && !readonly ? (
          <div className="space-y-5">
            <p className="text-secondary">
              This local flow collects city only. Phone numbers, email and home
              addresses are not collected. Contact sharing requires a later
              consented enquiry.
            </p>
            <Checkbox
              label="I am authorized to offer this vehicle and have removed personal details from its photos and notes"
              checked={declaration}
              disabled={locked}
              onChange={(event) =>
                setConfirmedVersion(
                  event.target.checked ? draft.listing.version : null,
                )
              }
            />
            <p className="text-sm text-secondary">
              Confirm this declaration again when resuming a draft. It is
              recorded only on submission.
            </p>
          </div>
        ) : null}
        {step >= 8 ? (
          <div className="space-y-6">
            <div className="rounded-card border border-line bg-paper p-6">
              <h3 className="font-display text-xl font-semibold">
                Private preview · Demo data
              </h3>
              <p className="mt-3 text-lg">
                {draft.listing.canonical
                  ? `${draft.listing.canonical.brand} ${draft.listing.canonical.model} · ${draft.listing.canonical.variant}`
                  : "No available canonical variant selected"}
              </p>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  ["Model year", draft.listing.fields.year],
                  ["Kilometres", draft.listing.fields.odometerKm],
                  ["Owners", draft.listing.fields.ownershipCount],
                  ["City", draft.listing.fields.city],
                  [
                    "Asking price (₹)",
                    paiseToInput(draft.listing.fields.askingPricePaise),
                  ],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-sm text-secondary">{label}</dt>
                    <dd className="mt-1 break-words font-semibold">
                      {value === null || value === ""
                        ? "Not entered"
                        : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 whitespace-pre-wrap break-words">
                {draft.listing.fields.conditionNotes ||
                  "Condition notes not entered"}
              </p>
            </div>
            <ListingPhotos
              key={`preview-${epoch}`}
              readonly
              listing={draft.listing}
              request={request}
              mutate={draft.mutate}
              onBusy={setUploading}
            />
            <p className="text-sm text-secondary">
              This is an owner-only preview. Submission requests moderation; it
              does not publish or verify the vehicle. No vehicle payment is
              collected.
            </p>
            {readonly ? (
              <p role="status" className="rounded-card bg-mist p-5">
                {draft.listing.status === "PENDING_REVIEW"
                  ? "Submitted for moderation. Editing is paused until a decision."
                  : "This listing is not editable in the local wizard."}
              </p>
            ) : null}
          </div>
        ) : null}
        {!readonly && step === 9 && !declaration ? (
          <p role="alert">
            Reconfirm the seller declaration for this saved revision in Seller &
            privacy before submitting.
          </p>
        ) : null}
        {!readonly ? (
          <div className="flex flex-wrap justify-between gap-4 border-t border-line pt-6">
            <Button
              variant="secondary"
              disabled={locked || step === 1}
              onClick={() => move(step - 1)}
            >
              Previous
            </Button>
            {step < 9 ? (
              <Button
                disabled={
                  locked ||
                  draft.status === "conflict" ||
                  draft.status === "error"
                }
                loading={busy}
                loadingLabel="Saving…"
                onClick={() => {
                  void next();
                }}
              >
                Save and continue
              </Button>
            ) : (
              <Button
                disabled={
                  locked ||
                  !declaration ||
                  draft.status === "conflict" ||
                  draft.status === "error"
                }
                loading={busy}
                loadingLabel="Submitting…"
                onClick={() => {
                  void submit();
                }}
              >
                Submit for moderation
              </Button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
