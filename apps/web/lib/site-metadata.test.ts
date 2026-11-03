import { describe, expect, it } from "vitest";
import { sectionFor } from "./site";
import {
  PREVIEW_DISCLOSURE,
  previewMetadata,
  sectionMetadata,
} from "./site-metadata";

describe("previewMetadata", () => {
  it("keeps the preview out of search indexes", () => {
    expect(previewMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("labels the site as a preview and brands every page title", () => {
    expect(previewMetadata.title.default).toMatch(/Preview$/);
    expect(previewMetadata.title.template).toBe("%s · EVONE");
  });

  it("gives each section its own title, description, canonical and noindex", () => {
    const meta = sectionMetadata(sectionFor("/evs"));
    expect(meta.title).toBe("Explore electric vehicles");
    expect(meta.alternates?.canonical).toBe("/evs");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("discloses that discovery and transactions are unavailable", () => {
    expect(previewMetadata.description).toContain(PREVIEW_DISCLOSURE);
  });
});
