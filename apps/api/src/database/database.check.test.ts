import { describe, expect, it } from "vitest";
import { DatabaseReadinessCheck } from "./database.check.js";

describe("DatabaseReadinessCheck", () => {
  it("resolves when the database answers", async () => {
    const db = { $queryRaw: () => Promise.resolve([{ "?column?": 1 }]) };
    await expect(
      new DatabaseReadinessCheck(db as never).check(),
    ).resolves.toBeUndefined();
  });

  it("rejects when the database query fails", async () => {
    const db = { $queryRaw: () => Promise.reject(new Error("ECONNREFUSED")) };
    await expect(
      new DatabaseReadinessCheck(db as never).check(),
    ).rejects.toThrow("ECONNREFUSED");
  });

  it("is named database for probe output", () => {
    expect(
      new DatabaseReadinessCheck({
        $queryRaw: () => Promise.resolve([]),
      } as never).name,
    ).toBe("database");
  });
});
