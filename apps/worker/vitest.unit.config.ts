import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Per-package cache: parallel Turbo runs otherwise share and delete one
    // root cache directory (ENOTEMPTY race).
    fsModuleCachePath: "node_modules/.vitest-cache",
    include: ["src/**/*.test.ts"],
  },
});
