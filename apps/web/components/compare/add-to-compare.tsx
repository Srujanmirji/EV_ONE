"use client";

import { Button, buttonClasses } from "@evone/ui";
import Link from "next/link";
import { compareHref, MAX_COMPARE } from "@/lib/compare";
import { useEffect } from "react";
import { useCompareTray, writeTray } from "./tray";

/** On a variant page: collect it for comparison and link to the result. */
export function AddToCompare({
  variantId,
  variantName,
}: {
  variantId: string;
  variantName: string;
}) {
  const { ids, ready, add, remove } = useCompareTray();
  const selected = ids.includes(variantId);
  const full = !selected && ids.length >= MAX_COMPARE;
  const others = ids.filter((id) => id !== variantId);

  return (
    <div className="flex flex-wrap items-center gap-3" aria-live="polite">
      {selected ? (
        <Button
          variant="secondary"
          onClick={() => remove(variantId)}
          disabled={!ready}
        >
          Remove {variantName} from comparison
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={() => add(variantId)}
          disabled={!ready || full}
        >
          {full
            ? `Comparison is full (${MAX_COMPARE})`
            : `Add ${variantName} to comparison`}
        </Button>
      )}
      {ids.length >= 2 ? (
        <Link href={compareHref(ids)} className={buttonClasses("primary")}>
          Compare {ids.length} variants
        </Link>
      ) : selected && others.length === 0 ? (
        <span className="text-sm text-secondary">
          Add one more variant to compare.
        </span>
      ) : null}
    </div>
  );
}

/** On /compare: the tray follows the comparison being viewed. */
export function SyncTray({ ids }: { ids: string[] }) {
  const key = ids.join(",");
  useEffect(() => {
    writeTray(key ? key.split(",") : []);
  }, [key]);
  return null;
}
