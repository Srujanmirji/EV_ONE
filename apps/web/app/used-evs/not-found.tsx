import { buttonClasses, EmptyState } from "@evone/ui";
import Link from "next/link";

export default function UsedEvNotFound() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full max-w-content flex-1 px-4 py-14 sm:px-8"
    >
      <h1 className="mb-6 font-display text-4xl font-semibold">
        Used EV listing not found
      </h1>
      <EmptyState
        title="This listing is unavailable"
        action={
          <Link href="/used-evs" className={buttonClasses("primary")}>
            Browse used EVs
          </Link>
        }
      />
    </main>
  );
}
