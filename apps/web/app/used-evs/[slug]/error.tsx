"use client";

import { Button, ErrorState } from "@evone/ui";

export default function UsedEvDetailError({ retry }: { retry: () => void }) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full max-w-content flex-1 px-4 py-14 sm:px-8"
    >
      <h1 className="sr-only">Used electric vehicle</h1>
      <ErrorState
        title="This listing could not be loaded"
        action={<Button onClick={retry}>Try again</Button>}
      >
        Try loading the listing again.
      </ErrorState>
    </main>
  );
}
