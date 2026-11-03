import { type DbClient, pingDatabase } from "@evone/db";
import type { ReadinessCheck } from "../health/readiness.js";

/** Readiness fails while PostgreSQL cannot answer `SELECT 1`. */
export class DatabaseReadinessCheck implements ReadinessCheck {
  readonly name = "database";

  constructor(private readonly db: Pick<DbClient, "$queryRaw">) {}

  check(): Promise<void> {
    return pingDatabase(this.db as DbClient);
  }
}
