import { Skeleton } from "@evone/ui";

export default function LoadingUsedEvDetail() {
  return (
    <main
      id="main"
      tabIndex={-1}
      role="status"
      aria-label="Loading used EV listing"
      className="flex-1"
    >
      <div className="bg-graphite py-10 sm:py-14">
        <div className="mx-auto flex w-full max-w-content flex-col gap-4 px-4 sm:px-8">
          <Skeleton className="h-5 w-48 bg-glass" />
          <Skeleton className="h-10 w-full max-w-80 bg-glass" />
          <Skeleton className="h-7 w-full max-w-64 bg-glass" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-content gap-10 px-4 py-10 sm:px-8 sm:py-14 min-[769px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <Skeleton className="aspect-[16/9] w-full rounded-card" />
          <Skeleton className="h-44 w-full rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-72 w-full rounded-card" />
          <Skeleton className="h-56 w-full rounded-card" />
        </div>
      </div>
    </main>
  );
}
