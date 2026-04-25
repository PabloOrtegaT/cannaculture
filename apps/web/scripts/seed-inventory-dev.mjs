import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const wranglerCliPath = require.resolve("wrangler/bin/wrangler.js");
const workspaceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const useRemote = process.argv.includes("--remote");
const usePreview = process.argv.includes("--preview");
const profile = process.env.STORE_PROFILE ?? "plant-seeds";
const now = Date.now();

function fixtureUuid(seed) {
  return `10000000-0000-4000-8000-${String(seed).padStart(12, "0")}`;
}

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

const inventorySeedsByProfile = {
  "plant-seeds": [
    {
      variantId: "49f3192f-e4c6-4262-8dda-614e92db9e3f",
      onHandQty: 0,
    },
    { variantId: fixtureUuid(3101), onHandQty: 34 },
    { variantId: fixtureUuid(3102), onHandQty: 29 },
    { variantId: fixtureUuid(3103), onHandQty: 31 },
    { variantId: fixtureUuid(3104), onHandQty: 18 },
    { variantId: fixtureUuid(3105), onHandQty: 26 },
    { variantId: fixtureUuid(3106), onHandQty: 35 },
    { variantId: fixtureUuid(3107), onHandQty: 24 },
    { variantId: fixtureUuid(3108), onHandQty: 20 },
    { variantId: fixtureUuid(3109), onHandQty: 32 },
    { variantId: fixtureUuid(3110), onHandQty: 27 },
    { variantId: fixtureUuid(3111), onHandQty: 36 },
    { variantId: fixtureUuid(3112), onHandQty: 23 },
    { variantId: fixtureUuid(3113), onHandQty: 22 },
    { variantId: fixtureUuid(3114), onHandQty: 28 },
  ],
};

const seedRows = inventorySeedsByProfile[profile];
if (!seedRows) {
  const validProfiles = Object.keys(inventorySeedsByProfile).join(", ");
  throw new Error(`Unsupported STORE_PROFILE "${profile}". Supported values: ${validProfiles}`);
}

const valuesClause = seedRows
  .map(
    (row) =>
      `(${sqlValue(row.variantId)}, ${sqlValue(row.onHandQty)}, ${sqlValue(row.onHandQty)}, ${sqlValue(now)}, ${sqlValue(now)})`,
  )
  .join(", ");

const command = [
  `INSERT INTO "inventoryStock" ("variantId","onHandQty","availableQty","createdAt","updatedAt")`,
  `VALUES ${valuesClause}`,
  `ON CONFLICT("variantId") DO UPDATE SET`,
  `"onHandQty"=excluded."onHandQty",`,
  `"availableQty"=excluded."availableQty",`,
  `"updatedAt"=excluded."updatedAt";`,
].join(" ");

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

  execFileSync(process.execPath, d1Args, {
    stdio: "inherit",
    cwd: workspaceDir,
  });

  const targetLabel = useRemote ? (usePreview ? "remote preview" : "remote production") : "local";
  console.log(`[seed] Seeded ${targetLabel} inventory for profile: ${profile}`);
  console.log(`[seed] Variants seeded: ${seedRows.length}`);
} catch (error) {
  console.error("[seed] Failed to seed inventory data.");
  throw error;
}
