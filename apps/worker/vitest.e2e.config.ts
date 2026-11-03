import { defineConfig } from "vitest/config";

// Runs the built worker (dist/) as a real child process against REDIS_URL.
export default defineConfig({
  test: {
    // Per-package cache: parallel Turbo runs otherwise share and delete one
    // root cache directory (ENOTEMPTY race).
    fsModuleCachePath: "node_modules/.vitest-cache",
    include: ["test/**/*.e2e.test.ts"],
    testTimeout: 30000,
  },
});
