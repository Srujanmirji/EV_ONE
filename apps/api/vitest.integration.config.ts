import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// In-process API against a real migrated PostgreSQL (DATABASE_URL).
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    // Per-package cache: parallel Turbo runs otherwise share and delete one
    // root cache directory (ENOTEMPTY race).
    fsModuleCachePath: "node_modules/.vitest-cache",

    environment: "node",
    include: ["test/**/*.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
