"use client";
import { useEffect, useState } from "react";
import { Button, EmptyState, ErrorState, Skeleton } from "@evone/ui";
import {
  SellerListingListResponse,
  SellerListingResponse,
} from "@evone/contracts";
import type { SellerListing } from "@evone/contracts";
import type { SellerRequest } from "@/lib/sell/request";
import { SellWizard } from "./wizard";
export function SellWorkspace({
  request,
  initialDraftId,
}: {
  request: SellerRequest;
  initialDraftId?: string;
}) {
  const [list, setList] = useState<
      ReturnType<typeof SellerListingListResponse.parse>["data"] | null
    >(null),
    [draft, setDraft] = useState<SellerListing | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState<string | null>(null),
    [epoch, setEpoch] = useState(0),
    [resumeId, setResumeId] = useState(initialDraftId);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const own = SellerListingListResponse.parse(
          await request("/seller/listings"),
        ).data;
        if (active) setList(own);
        if (resumeId) {
          const row = SellerListingResponse.parse(
            await request(`/listings/${resumeId}`),
          ).data;
          if (active) setDraft(row);
        }
      } catch {
        if (active)
          setError(
            "Your drafts could not load. Check sign-in, seller permissions and the API connection.",
          );
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [request, resumeId, epoch]);
  const open = async (id?: string) => {
    setBusy(true);
    setError(null);
    try {
      const row = SellerListingResponse.parse(
        await request(
          id ? `/listings/${id}` : "/listings",
          id ? "GET" : "POST",
          id ? undefined : {},
        ),
      ).data;
      setDraft(row);
    } catch {
      setError("The draft could not open. Retry when the API is available.");
    } finally {
      setBusy(false);
    }
  };
  if (draft)
    return (
      <SellWizard
        key={draft.id}
        initial={draft}
        request={request}
        onBack={() => {
          setResumeId(undefined);
          setDraft(null);
          setBusy(true);
          setEpoch((value) => value + 1);
          const url = new URL(window.location.href);
          url.searchParams.delete("draft");
          url.searchParams.delete("step");
          window.history.replaceState(null, "", url);
        }}
      />
    );
  return (
    <section className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold">
          Your private drafts
        </h2>
        <Button
          disabled={busy}
          onClick={() => {
            void open();
          }}
        >
          Start a draft
        </Button>
      </div>
      {busy ? <Skeleton label="Loading your drafts" /> : null}
      {error ? (
        <ErrorState title="Drafts unavailable">
          {error}
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              setBusy(true);
              setEpoch((value) => value + 1);
            }}
          >
            Retry drafts
          </Button>
        </ErrorState>
      ) : null}
      {list && !busy ? (
        <>
          {list.items.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {list.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-5"
                >
                  <div>
                    <h3 className="font-semibold">
                      {item.label ?? "New vehicle draft"}
                    </h3>
                    <p className="text-sm text-secondary">
                      {item.status.replaceAll("_", " ")} · Revision{" "}
                      {item.version}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      void open(item.id);
                    }}
                  >
                    Open draft
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No drafts yet">
              Start with your vehicle type. Drafts stay private and save to your
              account.
            </EmptyState>
          )}
          {list.nextCursor ? (
            <Button
              variant="secondary"
              onClick={async () => {
                setBusy(true);
                try {
                  setList(
                    SellerListingListResponse.parse(
                      await request(
                        `/seller/listings?cursor=${list.nextCursor}`,
                      ),
                    ).data,
                  );
                } catch {
                  setError("The next draft page could not load.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Next draft page
            </Button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
