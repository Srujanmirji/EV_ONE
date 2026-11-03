import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Per-package cache: parallel Turbo runs otherwise share and delete one
    // root cache directory (ENOTEMPTY race).
    fsModuleCachePath: "node_modules/.vitest-cache",

    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**", "tests/**"],
  },
});
