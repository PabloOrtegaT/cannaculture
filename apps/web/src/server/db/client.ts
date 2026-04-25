import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { getDatabaseBinding } from "@/server/config/runtime-env";
import * as schema from "./schema";

type D1Client = Parameters<typeof drizzle>[0];

let cachedDb: DrizzleD1Database<typeof schema> | undefined;

export function getDb() {
  if (cachedDb) {
    return cachedDb;
  }
  cachedDb = drizzle(getDatabaseBinding() as D1Client, { schema });
  return cachedDb;
}

export type AppDb = DrizzleD1Database<typeof schema>;
