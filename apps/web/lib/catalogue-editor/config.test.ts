import { it, expect } from "vitest";
import { catalogueEditorConfig } from "./config";
it("requires explicit opt-in and stays unavailable in production", () => {
  expect(catalogueEditorConfig({ NODE_ENV: "development" }).kind).toBe(
    "disabled",
  );
  expect(
    catalogueEditorConfig({
      NODE_ENV: "production",
      CATALOGUE_EDITOR_ENABLED: "true",
      AUTH_SPIKE_ENABLED: "true",
    }).kind,
  ).toBe("disabled");
  expect(
    catalogueEditorConfig({
      NODE_ENV: "development",
      CATALOGUE_EDITOR_ENABLED: "true",
      AUTH_SPIKE_ENABLED: "true",
    }).kind,
  ).toBe("unconfigured");
});
