/**
 * A dependency the API needs before it can serve traffic (database, Redis,
 * ...). EV-013 and EV-014 register their checks under READINESS_CHECKS.
 * `check` resolves when healthy and rejects or times out when not.
 */
export interface ReadinessCheck {
  readonly name: string;
  check(): Promise<void>;
}

export const READINESS_CHECKS = Symbol("READINESS_CHECKS");

export type CheckStatus = "up" | "down";

export interface ReadinessReport {
  status: "ready" | "not_ready";
  checks: { name: string; status: CheckStatus }[];
}
