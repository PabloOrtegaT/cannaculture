import type { Config } from "drizzle-kit";

export default {
  dialect: "sqlite",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle/migrations",
  strict: true,
  verbose: true,
} satisfies Config;

