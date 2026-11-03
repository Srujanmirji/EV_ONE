import { defineConfig } from "vitest/config";

// Against a real Redis (REDIS_URL). Each test isolates itself with a
// unique BullMQ key prefix.
export default defineConfig({
  test: {
    // Per-package cache: parallel Turbo runs otherwise share and delete one
    // root cache directory (ENOTEMPTY race).
    fsModuleCachePath: "node_modules/.vitest-cache",

    include: ["test/**/*.integration.test.ts"],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
