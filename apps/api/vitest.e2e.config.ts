import { defineConfig } from "vitest/config";

// Runs the built server (dist/) as a real child process.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.e2e.test.ts"],
    testTimeout: 30000,
  },
});
