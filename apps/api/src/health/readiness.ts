import type { ReadinessReport as ContractReport } from "@evone/contracts";

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

/** The service's part of the contract report; the controller adds `draining`. */
export type ReadinessReport = Omit<ContractReport, "draining">;
