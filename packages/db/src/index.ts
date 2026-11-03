import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client.js";

export { PrismaClient } from "./generated/client.js";
export type DbClient = PrismaClient;

/**
 * Creates the Prisma client over the node-postgres driver adapter
 * (required by Prisma 7). Callers own the lifecycle and must `$disconnect()`.
 */
export function createDbClient(connectionString: string): DbClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Resolves when the database answers a trivial query; rejects otherwise. */
export async function pingDatabase(db: DbClient): Promise<void> {
  await db.$queryRaw`SELECT 1`;
}
