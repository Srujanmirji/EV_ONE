import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.integration.test.ts"],
    // One database: run files serially.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
