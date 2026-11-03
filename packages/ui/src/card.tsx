import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type CardTone = "paper" | "mist" | "dark";

const tones: Record<CardTone, string> = {
  paper: "border border-line bg-paper text-ink",
  mist: "bg-mist text-ink",
  dark: "bg-graphite text-paper",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  /** Adds a hover border for cards that are wholly a link. */
  interactive?: boolean;
}

export function Card({
  tone = "paper",
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card p-6 sm:p-8",
        tones[tone],
        interactive &&
          "transition-colors hover:border-ink motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}
