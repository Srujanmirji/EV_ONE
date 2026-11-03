import { defineConfig } from "prisma/config";

// The CLI reads connection strings from the environment only. `generate`
// needs neither, so missing values fall back to empty strings here and are
// rejected by the commands that actually connect.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
