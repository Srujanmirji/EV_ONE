"use client";
import { useRef, useState } from "react";
import { Button, Checkbox, TextField } from "@evone/ui";
import { CatalogueDraftReview } from "@evone/contracts";
import type { CatalogueDraftView } from "@evone/contracts";

export function CatalogueReviewForm({
  draft,
  busy,
  onReview,
}: {
  draft: CatalogueDraftView;
  busy: boolean;
  onReview: (
    input: ReturnType<typeof CatalogueDraftReview.parse>,
  ) => Promise<void>;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const summary = useRef<HTMLDivElement>(null);
  return (
    <form
      className="space-y-5 rounded-card border border-control bg-paper p-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(
          event.currentTarget,
          (event.nativeEvent as SubmitEvent).submitter,
        );
        const decision = String(form.get("decision"));
        const parsed = CatalogueDraftReview.safeParse({
          version: draft.version,
          decision,
          reviewedSources: form.has("reviewedSources"),
          ...(decision === "REJECT"
            ? { reason: String(form.get("reason")) }
            : {}),
        });
        if (!parsed.success) {
          setErrors(
            Object.fromEntries(
              parsed.error.issues.map((issue) => [
                issue.path.join("."),
                issue.message,
              ]),
            ),
          );
          requestAnimationFrame(() => summary.current?.focus());
          return;
        }
        setErrors({});
        void onReview(parsed.data);
      }}
    >
      <h3 className="font-display text-xl font-semibold">
        Review this revision
      </h3>
      <p className="text-sm text-secondary">
        Compare every specification with its cited wording and source. Approval
        publishes all variants together as local demo data.
      </p>
      {Object.keys(errors).length ? (
        <div ref={summary} role="alert" tabIndex={-1} className="text-danger">
          Check the highlighted review fields.
        </div>
      ) : null}
      <Checkbox
        label="I reviewed the cited sources and every stated specification"
        name="reviewedSources"
        disabled={busy}
        error={errors.reviewedSources}
      />
      <TextField
        label="Reason for requesting changes"
        hint="Required for rejection; at least 10 characters."
        name="reason"
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
        maxLength={500}
        disabled={busy}
        error={errors.reason}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="decision" value="APPROVE" disabled={busy}>
          Approve and publish
        </Button>
        <Button
          type="submit"
          name="decision"
          value="REJECT"
          variant="secondary"
          disabled={busy}
        >
          Request changes
        </Button>
      </div>
    </form>
  );
}
