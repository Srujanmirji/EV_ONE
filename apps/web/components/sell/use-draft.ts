"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SellerListingResponse } from "@evone/contracts";
import type { SellerListing } from "@evone/contracts";
import { SellerApiError } from "@/lib/sell/request";
import type { SellerRequest } from "@/lib/sell/request";
import { listingValues, parseSellValues } from "@/lib/sell/values";
import type { SellValues } from "@/lib/sell/values";

export function useListingDraft(
  initial: SellerListing,
  request: SellerRequest,
) {
  const [listing, setListing] = useState(initial),
    [values, setValues] = useState(() => listingValues(initial)),
    [status, setStatus] = useState<
      "saved" | "saving" | "unsaved" | "invalid" | "error" | "conflict"
    >("saved"),
    [error, setError] = useState<string | null>(null);
  const current = useRef(initial),
    raw = useRef(values),
    saved = useRef(JSON.stringify(initial.fields)),
    queue = useRef<Promise<unknown>>(Promise.resolve()),
    active = useRef(true),
    paused = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const accept = useCallback((row: SellerListing) => {
    current.current = row;
    saved.current = JSON.stringify(row.fields);
    if (active.current) setListing(row);
  }, []);
  const fail = useCallback((cause: unknown) => {
    paused.current = true;
    if (active.current) {
      setStatus(
        cause instanceof SellerApiError && cause.status === 409
          ? "conflict"
          : "error",
      );
      setError(
        cause instanceof Error
          ? cause.message
          : "Save failed. Your values are still here.",
      );
    }
  }, []);
  const serialize = useCallback(
    (operation: () => Promise<SellerListing | null>) => {
      const result = queue.current.then(async () => {
        if (!active.current) return null;
        return operation();
      });
      queue.current = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    [],
  );
  const flush = useCallback(
    () =>
      serialize(async () => {
        if (paused.current) return null;
        const parsed = parseSellValues(raw.current);
        if (!parsed.fields) {
          if (active.current) setStatus("invalid");
          return null;
        }
        if (JSON.stringify(parsed.fields) === saved.current) {
          if (active.current) setStatus("saved");
          return current.current;
        }
        if (active.current) {
          setStatus("saving");
          setError(null);
        }
        try {
          const row = SellerListingResponse.parse(
            await request(`/listings/${current.current.id}`, "PATCH", {
              version: current.current.version,
              fields: parsed.fields,
            }),
          ).data;
          accept(row);
          if (active.current)
            setStatus(
              JSON.stringify(parseSellValues(raw.current).fields) ===
                saved.current
                ? "saved"
                : "unsaved",
            );
          return row;
        } catch (cause) {
          fail(cause);
          return null;
        }
      }),
    [serialize, accept, fail, request],
  );
  useEffect(() => {
    const editable = ["DRAFT", "REJECTED"].includes(listing.status);
    if (!editable || paused.current) return;
    const timer = setTimeout(() => {
      void flush();
    }, 750);
    return () => clearTimeout(timer);
  }, [values, listing.status, flush]);
  const change = useCallback((patch: Partial<SellValues>) => {
    raw.current = { ...raw.current, ...patch };
    setValues(raw.current);
    if (!paused.current) setStatus("unsaved");
  }, []);
  const mutate = useCallback(
    async (operation: (row: SellerListing) => Promise<unknown>) => {
      const row = await flush();
      if (!row) return null;
      return serialize(async () => {
        if (paused.current) return null;
        if (active.current) setStatus("saving");
        try {
          const updated = SellerListingResponse.parse(
            await operation(current.current),
          ).data;
          accept(updated);
          if (active.current) {
            setStatus("saved");
            setError(null);
          }
          return updated;
        } catch (cause) {
          fail(cause);
          return null;
        }
      });
    },
    [flush, serialize, accept, fail],
  );
  const reload = useCallback(
    () =>
      serialize(async () => {
        if (active.current) setStatus("saving");
        try {
          const row = SellerListingResponse.parse(
            await request(`/listings/${current.current.id}`),
          ).data;
          accept(row);
          raw.current = listingValues(row);
          paused.current = false;
          if (active.current) {
            setValues(raw.current);
            setStatus("saved");
            setError(null);
          }
          return row;
        } catch (cause) {
          fail(cause);
          return null;
        }
      }),
    [serialize, accept, request, fail],
  );
  const retry = useCallback(() => {
    paused.current = false;
    return flush();
  }, [flush]);
  const dirty =
    JSON.stringify(parseSellValues(values).fields) !==
    JSON.stringify(listing.fields);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  return {
    listing,
    values,
    change,
    flush,
    mutate,
    reload,
    retry,
    status,
    error,
    dirty,
  };
}
