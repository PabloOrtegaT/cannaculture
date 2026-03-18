import fs from "node:fs";
import path from "node:path";

const summaryPath = path.resolve(process.cwd(), "coverage", "coverage-summary.json");

if (!fs.existsSync(summaryPath)) {
  console.log("[coverage-target] coverage-summary.json not found. Run `npm run test` first.");
  process.exit(0);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const totals = summary.total;
if (!totals) {
  console.log("[coverage-target] Invalid coverage summary format.");
  process.exit(0);
}

const metrics = ["lines", "functions", "statements", "branches"];
const notAtTarget = metrics.filter((metric) => {
  const value = totals[metric]?.pct ?? 0;
  return value < 100;
});

if (notAtTarget.length === 0) {
  console.log("[coverage-target] Stretch target reached: 100% global coverage.");
  process.exit(0);
}

console.log("[coverage-target] Stretch target report (non-blocking):");
for (const metric of metrics) {
  const value = totals[metric]?.pct ?? 0;
  const status = value >= 100 ? "OK" : "below-target";
  console.log(`  - ${metric}: ${value}% (${status})`);
}
