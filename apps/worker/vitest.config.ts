import { defineConfig } from "vitest/config";

// Against a real Redis (REDIS_URL). Each test isolates itself with a
// unique BullMQ key prefix.
export default defineConfig({
  test: {
    include: ["test/**/*.integration.test.ts"],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
