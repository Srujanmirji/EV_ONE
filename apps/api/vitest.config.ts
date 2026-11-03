import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// SWC emits decorator metadata, which NestJS dependency injection needs and
// Vitest's default esbuild transform does not produce.
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    // Per-package cache: parallel Turbo runs otherwise share and delete one
    // root cache directory (ENOTEMPTY race).
    fsModuleCachePath: "node_modules/.vitest-cache",

    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
