import { rmSync } from "node:fs";
import { resolve } from "node:path";

const directories = [".next", ".open-next"];

for (const directory of directories) {
  const target = resolve(process.cwd(), directory);
  rmSync(target, { recursive: true, force: true });
}

console.log("[cf:build] Cleaned .next and .open-next build artifacts.");
