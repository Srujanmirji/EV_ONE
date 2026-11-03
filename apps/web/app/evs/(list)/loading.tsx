import { Skeleton } from "@evone/ui";

export default function Loading() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full max-w-content flex-1 px-4 py-14 sm:px-8"
    >
      <Skeleton label="Loading electric vehicles" lines={6} />
    </main>
  );
}
