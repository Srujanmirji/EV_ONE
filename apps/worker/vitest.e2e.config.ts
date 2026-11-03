import { defineConfig } from "vitest/config";

// Runs the built worker (dist/) as a real child process against REDIS_URL.
export default defineConfig({
  test: { include: ["test/**/*.e2e.test.ts"], testTimeout: 30000 },
});
