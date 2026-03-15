import { drizzle } from "drizzle-orm/d1";
import { getDatabaseBinding } from "@/server/config/runtime-env";
import * as schema from "./schema";

export function getDb() {
  type D1Client = Parameters<typeof drizzle>[0];
  return drizzle(getDatabaseBinding() as D1Client, { schema });
}

export type AppDb = ReturnType<typeof getDb>;
