import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { hashSync } from "bcryptjs";

const require = createRequire(import.meta.url);
const wranglerCliPath = require.resolve("wrangler/bin/wrangler.js");
const workspaceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const useRemote = process.argv.includes("--remote");
const usePreview = process.argv.includes("--preview");

const email = process.env.DEV_OWNER_EMAIL ?? "owner@cannaculture.local";
const password = process.env.DEV_OWNER_PASSWORD;
if (!password) {
  throw new Error("DEV_OWNER_PASSWORD environment variable is required. Set it before running seed.");
}
const userId = process.env.DEV_OWNER_USER_ID ?? "b2b0caf8-3d7a-4e55-a8ff-7e19633208c7";
const cartId = process.env.DEV_OWNER_CART_ID ?? "aa38b784-84a3-4d9d-9981-eb758568c3a7";
const now = Date.now();
const passwordHash = hashSync(password, 10);

/**
 * Format a JS value for safe use as a SQLite literal.
 * Strings are single-quoted with embedded quotes doubled;
 * numbers are emitted as-is; null/undefined become NULL.
 */
function sqlValue(value) {
  if (typeof value === "string") {
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (value === null || value === undefined) {
    return "NULL";
  }
  throw new Error(`Unsupported SQL value type: ${typeof value}`);
}

const statements = [
  `INSERT OR IGNORE INTO "user" ` +
    `("id","email","name","role","passwordHash","emailVerified","createdAt","updatedAt") ` +
    `VALUES (${sqlValue(userId)},${sqlValue(email)},${sqlValue("Dev Owner")},${sqlValue("owner")},${sqlValue(passwordHash)},${sqlValue(now)},${sqlValue(now)},${sqlValue(now)});`,

  `UPDATE "user" ` +
    `SET "name"=${sqlValue("Dev Owner")},"role"=${sqlValue("owner")},"passwordHash"=${sqlValue(passwordHash)},"emailVerified"=${sqlValue(now)},"updatedAt"=${sqlValue(now)} ` +
    `WHERE "email"=${sqlValue(email)};`,

  `DELETE FROM "authRefreshSession" ` +
    `WHERE "userId"=(SELECT "id" FROM "user" WHERE "email"=${sqlValue(email)} LIMIT 1);`,

  `INSERT OR IGNORE INTO "cart" ("id","userId","createdAt","updatedAt") ` +
    `SELECT ${sqlValue(cartId)}, "id", ${sqlValue(now)}, ${sqlValue(now)} FROM "user" WHERE "email"=${sqlValue(email)};`,

  `DELETE FROM "cartItem" ` +
    `WHERE "cartId"=(SELECT "id" FROM "cart" WHERE "userId"=(SELECT "id" FROM "user" WHERE "email"=${sqlValue(email)} LIMIT 1) LIMIT 1);`,

  `UPDATE "cart" SET "updatedAt"=${sqlValue(now)} ` +
    `WHERE "userId"=(SELECT "id" FROM "user" WHERE "email"=${sqlValue(email)} LIMIT 1);`,
];

const command = statements.join(" ");

try {
  const d1Args = [wranglerCliPath, "d1", "execute", "DB", "--config", "wrangler.jsonc"];
  if (useRemote) {
    d1Args.push("--remote");
    if (usePreview) {
      d1Args.push("--preview");
    }
  } else {
    d1Args.push("--local");
  }
  d1Args.push("--command", command);

  execFileSync(
    process.execPath,
    d1Args,
    {
      stdio: "inherit",
      cwd: workspaceDir,
    },
  );
  const targetLabel = useRemote ? (usePreview ? "remote preview" : "remote production") : "local";
  console.log(`[seed] Seeded ${targetLabel} owner user: ${email}`);
  console.log(`[seed] Password: ${password}`);
} catch (error) {
  console.error("[seed] Failed to seed auth data.");
  throw error;
}
