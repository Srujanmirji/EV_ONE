import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    fsModuleCachePath: "node_modules/.vitest-cache",
  },
});
