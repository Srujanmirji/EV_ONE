import { describe, expect, it } from "vitest";
import { PREVIEW_DISCLOSURE, previewMetadata } from "./site-metadata";

describe("previewMetadata", () => {
  it("keeps the preview out of search indexes", () => {
    expect(previewMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("labels the site as a preview", () => {
    expect(previewMetadata.title).toMatch(/Preview$/);
  });

  it("discloses that discovery and transactions are unavailable", () => {
    expect(previewMetadata.description).toContain(PREVIEW_DISCLOSURE);
  });
});
