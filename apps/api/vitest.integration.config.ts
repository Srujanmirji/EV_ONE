import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// In-process API against a real migrated PostgreSQL (DATABASE_URL).
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    environment: "node",
    include: ["test/**/*.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
