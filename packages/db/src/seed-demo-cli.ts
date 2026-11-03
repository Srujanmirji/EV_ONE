import { createDbClient } from "./index.js";
import { seedDemoCatalogue } from "./seed-demo.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const db = createDbClient(url);
try {
  await seedDemoCatalogue(db, process.env);
  console.log("Seeded DEMO catalogue (fictional, is_demo = true).");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
