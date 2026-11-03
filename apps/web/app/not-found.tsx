import { buttonClasses } from "@evone/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex min-h-svh max-w-content flex-col justify-center gap-6 px-4 py-16 sm:px-8"
    >
      <h1 className="font-display text-4xl font-semibold">Page not found</h1>
      <p className="max-w-prose text-secondary">
        This page is unavailable. Return to the EVONE preview to continue.
      </p>
      <Link href="/" className={buttonClasses("primary", "lg", "w-fit")}>
        Return to preview
      </Link>
    </main>
  );
}
