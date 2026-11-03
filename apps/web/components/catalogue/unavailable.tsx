import { buttonClasses, ErrorState } from "@evone/ui";
import Link from "next/link";

export function CatalogueUnavailable({ retryHref }: { retryHref: string }) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full max-w-content flex-1 px-4 py-14 sm:px-8"
    >
      <h1 className="sr-only">Electric vehicle details</h1>
      <ErrorState
        title="This page is unavailable right now"
        action={
          <Link href={retryHref} className={buttonClasses("primary")}>
            Try again
          </Link>
        }
      >
        We could not load these details. Please try again in a moment.
      </ErrorState>
    </main>
  );
}
