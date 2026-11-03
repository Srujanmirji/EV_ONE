import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "on-dark";
export type ButtonSize = "md" | "lg";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap " +
  "transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-busy:cursor-progress";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper hover:bg-graphite",
  secondary: "border border-line bg-paper text-ink hover:border-ink",
  ghost: "text-ink hover:bg-mist",
  "on-dark":
    "border border-glass-line bg-glass text-paper hover:bg-paper hover:text-ink",
};

const sizes: Record<ButtonSize, string> = {
  md: "px-5 text-sm",
  lg: "min-h-12 px-6 text-base",
};

/**
 * Classes for anything that should look like a button, including links
 * (`<Link className={buttonClasses()}>`), so navigation stays a real link.
 */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows progress text, sets aria-busy and blocks repeat submits. */
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  variant,
  size,
  loading = false,
  loadingLabel = "Working…",
  className,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
