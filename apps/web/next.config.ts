import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // @evone/ui ships TypeScript source; Next compiles it with the app.
  transpilePackages: ["@evone/ui"],
};

export default nextConfig;
