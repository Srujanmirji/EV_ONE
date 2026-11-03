import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INDEXING_ENABLED, primaryNav, sections } from "./site";

describe("site sections", () => {
  it("has unique hrefs and labels", () => {
    expect(new Set(sections.map((s) => s.href)).size).toBe(sections.length);
    expect(new Set(sections.map((s) => s.label)).size).toBe(sections.length);
  });

  it("only links to pages that exist", () => {
    for (const section of sections) {
      const file = new URL(`../app${section.href}/page.tsx`, import.meta.url);
      expect(existsSync(file), `${section.href} has no page`).toBe(true);
    }
  });

  it("states availability honestly for every section", () => {
    for (const section of sections) {
      expect(section.availability).toMatch(
        /not (available|open|offered|published)|No /,
      );
      expect(section.description.length).toBeGreaterThan(20);
    }
  });

  it("keeps the primary navigation short enough for the header", () => {
    expect(primaryNav.length).toBeLessThanOrEqual(6);
  });

  it("keeps search indexing off until publishing is approved (ADR-002)", () => {
    expect(INDEXING_ENABLED).toBe(false);
  });
});
