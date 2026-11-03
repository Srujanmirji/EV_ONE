import { defineConfig } from "vitest/config";

// Runs the built server (dist/) as a real child process.
export default defineConfig({
  test: {
    // Per-package cache: parallel Turbo runs otherwise share and delete one
    // root cache directory (ENOTEMPTY race).
    fsModuleCachePath: "node_modules/.vitest-cache",

    environment: "node",
    include: ["test/**/*.e2e.test.ts"],
    testTimeout: 30000,
  },
});
