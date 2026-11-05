"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, EmptyState, ErrorState, Skeleton } from "@evone/ui";
import {
  CatalogueDraftListResponse,
  CatalogueDraftResponse,
  missingCatalogueSources,
} from "@evone/contracts";
import type { CatalogueDocument, CatalogueDraftView } from "@evone/contracts";
import { CatalogueReviewForm } from "./review-form";
import { DraftForm } from "./draft-form";

export type EditorRequest = (
  path: string,
  method?: "GET" | "POST" | "PATCH",
  body?: unknown,
) => Promise<unknown>;
type List = ReturnType<typeof CatalogueDraftListResponse.parse>["data"];
export function CatalogueWorkspace({ request }: { request: EditorRequest }) {
  const [list, setList] = useState<List | null>(null),
    [draft, setDraft] = useState<CatalogueDraftView | null>(null);
  const [creating, setCreating] = useState(false),
    [dirty, setDirty] = useState(false),
    [pending, setPending] = useState<string | null>("Loading drafts…"),
    [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null);
  const [formEpoch, setFormEpoch] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const loadList = useCallback(
    async (cursor?: string) => {
      const result = CatalogueDraftListResponse.parse(
        await request(`/drafts${cursor ? `?cursor=${cursor}` : ""}`),
      ).data;
      setList(result);
    },
    [request],
  );
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = CatalogueDraftListResponse.parse(
          await request("/drafts"),
        ).data;
        if (active) setList(result);
      } catch {
        if (active)
          setError(
            "Drafts could not load. Check your sign-in, catalogue role and API connection, then retry.",
          );
      } finally {
        if (active) setPending(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [request]);
  const perform = async (label: string, operation: () => Promise<void>) => {
    setPending(label);
    setError(null);
    setNotice(null);
    try {
      await operation();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The catalogue request failed. Retry when the API is available.",
      );
    } finally {
      setPending(null);
    }
  };
  const discard = () =>
    !dirty || window.confirm("Discard unsaved changes and switch drafts?");
  const open = (id: string) => {
    if (!discard()) return;
    void perform("Opening draft…", async () => {
      setDraft(
        CatalogueDraftResponse.parse(await request(`/drafts/${id}`)).data,
      );
      setCreating(false);
      setDirty(false);
      setFormEpoch((value) => value + 1);
      requestAnimationFrame(() => heading.current?.focus());
    });
  };
  const save = async (document: CatalogueDocument) =>
    perform("Saving draft…", async () => {
      const data = CatalogueDraftResponse.parse(
        await request(
          draft ? `/drafts/${draft.id}` : "/drafts",
          draft ? "PATCH" : "POST",
          draft ? { version: draft.version, document } : { document },
        ),
      ).data;
      setDraft(data);
      setCreating(false);
      setDirty(false);
      setNotice("Draft saved. Public catalogue data is unchanged.");
      await loadList().catch(() =>
        setError(
          "Saved changes are recorded, but the draft list could not refresh. Retry the list.",
        ),
      );
      requestAnimationFrame(() => noticeRef.current?.focus());
    });
  const transition = async (
    action: "submit" | "review",
    extra: Record<string, unknown> = {},
  ) => {
    if (!draft) return;
    await perform(
      action === "submit" ? "Submitting…" : "Recording review…",
      async () => {
        setDraft(
          CatalogueDraftResponse.parse(
            await request(`/drafts/${draft.id}/${action}`, "POST", {
              version: draft.version,
              ...extra,
            }),
          ).data,
        );
        setNotice(
          action === "submit"
            ? "Submitted for a different admin to review."
            : "Review recorded.",
        );
        await loadList().catch(() =>
          setError(
            "Saved changes are recorded, but the draft list could not refresh. Retry the list.",
          ),
        );
        requestAnimationFrame(() => noticeRef.current?.focus());
      },
    );
  };
  const editable =
    creating ||
    !!(draft?.isOwner && ["DRAFT", "REJECTED"].includes(draft.status));
  return (
    <div className="mt-8 grid items-start gap-10 lg:grid-cols-3">
      <section
        aria-label="Catalogue drafts"
        className="space-y-5 lg:col-span-1"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Drafts</h2>
          <Button
            disabled={!!pending}
            onClick={() => {
              if (!discard()) return;
              setDraft(null);
              setCreating(true);
              setDirty(false);
              setFormEpoch((value) => value + 1);
              setError(null);
              setNotice(null);
              requestAnimationFrame(() => heading.current?.focus());
            }}
          >
            New draft
          </Button>
        </div>
        {list ? (
          <>
            <p className="text-sm text-secondary">
              {list.role === "ADMIN"
                ? "All catalogue drafts"
                : "Your catalogue drafts"}
            </p>
            {list.items.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {list.items.map((item) => (
                  <li key={item.id}>
                    <Button
                      variant="ghost"
                      disabled={!!pending}
                      onClick={() => open(item.id)}
                      className="w-full flex-wrap justify-start rounded-none px-2 py-4 text-left whitespace-normal"
                    >
                      <span className="w-full font-semibold">{item.name}</span>
                      <span className="text-sm font-normal text-secondary">
                        {item.status.replaceAll("_", " ")} · Revision{" "}
                        {item.version}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No drafts yet">
                Create a catalogue draft. It stays private until admin approval.
              </EmptyState>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={!!pending}
                onClick={() => {
                  void perform("Refreshing…", () => loadList());
                }}
              >
                Refresh first page
              </Button>
              {list.nextCursor ? (
                <Button
                  variant="secondary"
                  disabled={!!pending}
                  onClick={() => {
                    void perform("Loading more drafts…", () =>
                      loadList(list.nextCursor!),
                    );
                  }}
                >
                  Next page
                </Button>
              ) : null}
            </div>
          </>
        ) : pending ? (
          <Skeleton label="Loading catalogue drafts" />
        ) : (
          <Button
            variant="secondary"
            onClick={() => {
              void perform("Retrying…", () => loadList());
            }}
          >
            Retry drafts
          </Button>
        )}
      </section>
      <section
        aria-label="Catalogue workspace"
        className="min-w-0 space-y-6 lg:col-span-2"
      >
        <h2
          ref={heading}
          tabIndex={-1}
          className="scroll-mt-24 font-display text-2xl font-semibold"
        >
          {creating
            ? "New catalogue draft"
            : (draft?.document.model.name ?? "Catalogue review")}
        </h2>
        {pending ? (
          <p role="status" className="text-secondary">
            {pending}
          </p>
        ) : null}
        {error ? (
          <ErrorState title="Catalogue action unavailable">
            <span>{error}</span>
            {draft ? (
              <Button
                variant="secondary"
                disabled={!!pending}
                onClick={() => open(draft.id)}
                className="mt-4"
              >
                Reload saved revision
              </Button>
            ) : null}
          </ErrorState>
        ) : null}
        {notice ? (
          <p
            ref={noticeRef}
            tabIndex={-1}
            role="status"
            className="scroll-mt-24 rounded-card bg-mist p-4"
          >
            {notice}
          </p>
        ) : null}
        {draft ? (
          <div className="border-y border-line py-4 text-sm">
            <p className="font-semibold">
              {draft.status.replaceAll("_", " ")} · Revision {draft.version}
            </p>
            <p className="mt-2 text-secondary">
              Last changed{" "}
              <time dateTime={draft.updatedAt}>
                {new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Kolkata",
                }).format(new Date(draft.updatedAt))}{" "}
                IST
              </time>
            </p>
            <p className="mt-1 break-all text-secondary">
              Account: {draft.lastActorId}
            </p>
            {draft.reviewReason ? (
              <p className="mt-2">Changes requested: {draft.reviewReason}</p>
            ) : null}
            {dirty ? (
              <p className="mt-2">Unsaved changes. Save before submitting.</p>
            ) : null}
          </div>
        ) : null}
        {creating || draft ? (
          <DraftForm
            key={`${draft?.id ?? "new"}:${draft?.version ?? 0}:${formEpoch}`}
            document={draft?.document}
            disabled={!editable}
            busy={!!pending}
            onSave={save}
            onDirty={() => setDirty(true)}
          />
        ) : (
          <EmptyState title="Choose a draft or start a new one">
            Editors prepare specifications and citations. A different admin
            reviews the submitted revision before publication.
          </EmptyState>
        )}
        {draft?.isOwner && draft.status === "DRAFT" ? (
          <div className="border-t border-line pt-6">
            <p className="mb-4 text-sm text-secondary">
              {missingCatalogueSources(draft.document).length
                ? "Some stated specifications still need citations."
                : "Every stated specification has a citation ready for admin review."}
            </p>
            <Button
              disabled={
                !!pending ||
                dirty ||
                missingCatalogueSources(draft.document).length > 0
              }
              onClick={() => {
                void transition("submit");
              }}
            >
              Submit for review
            </Button>
          </div>
        ) : null}
        {draft?.canReview ? (
          <CatalogueReviewForm
            key={`${draft.id}:${draft.version}`}
            draft={draft}
            busy={!!pending}
            onReview={(input) => transition("review", input)}
          />
        ) : null}
      </section>
    </div>
  );
}
