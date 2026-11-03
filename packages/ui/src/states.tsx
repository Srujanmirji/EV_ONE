import type { ReactNode } from "react";
import { cn } from "./cn";

interface StateProps {
  title: string;
  children?: ReactNode;
  /** Primary way forward, e.g. "Reset filters" or "Back to home". */
  action?: ReactNode;
  className?: string;
  /** Heading level that fits the page outline. */
  headingLevel?: 2 | 3;
}

/**
 * Nothing to show (no results, feature not available). role="status" so a
 * change into this state is announced politely.
 */
export function EmptyState({
  title,
  children,
  action,
  className,
  headingLevel = 2,
}: StateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      role="status"
      className={cn(
        "rounded-card border border-line bg-paper p-6 sm:p-8",
        className,
      )}
    >
      <Heading className="font-display text-xl font-semibold">{title}</Heading>
      {children ? (
        <div className="mt-3 max-w-prose text-base text-secondary">
          {children}
        </div>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/**
 * Something failed. role="alert" so it is announced immediately. Say what
 * happened in plain words and offer a retry or route out; never show
 * internal error details.
 */
export function ErrorState({
  title,
  children,
  action,
  className,
  headingLevel = 2,
}: StateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      role="alert"
      className={cn(
        "rounded-card border border-danger bg-danger-surface p-6 sm:p-8",
        className,
      )}
    >
      <Heading className="font-display text-xl font-semibold text-danger">
        {title}
      </Heading>
      {children ? (
        <div className="mt-3 max-w-prose text-base text-ink">{children}</div>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/**
 * Placeholder while content loads. The wrapper announces loading once
 * (aria-busy + label); individual bars are hidden from assistive tech.
 */
export function Skeleton({
  lines = 3,
  label = "Loading",
  className,
}: {
  lines?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn("flex flex-col gap-3", className)}
    >
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn(
            "h-4 animate-pulse rounded-full bg-mist motion-reduce:animate-none",
            i === lines - 1 ? "w-2/3" : "w-full",
          )}
        />
      ))}
    </div>
  );
}
