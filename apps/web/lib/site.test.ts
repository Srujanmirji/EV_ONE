import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INDEXING_ENABLED, primaryNav, sections } from "./site";

describe("site sections", () => {
  it("has unique hrefs and labels", () => {
    expect(new Set(sections.map((s) => s.href)).size).toBe(sections.length);
    expect(new Set(sections.map((s) => s.label)).size).toBe(sections.length);
  });

  it("only links to pages that exist", () => {
    for (const section of sections) {
      // A section page may sit directly in its folder or in a route group.
      const dir = new URL(`../app${section.href}/`, import.meta.url);
      const direct = existsSync(new URL("page.tsx", dir));
      const grouped =
        existsSync(dir) &&
        readdirSync(dir).some(
          (d) =>
            /^\(.+\)$/.test(d) && existsSync(new URL(`${d}/page.tsx`, dir)),
        );
      expect(direct || grouped, `${section.href} has no page`).toBe(true);
    }
  });

  it("states availability honestly for every section that is not live", () => {
    for (const section of sections.filter((s) => !s.live)) {
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
