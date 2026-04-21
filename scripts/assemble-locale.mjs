/**
 * Usage: node scripts/assemble-locale.mjs <locale>
 * Merges src/messages/_build/<locale>/*.json into src/messages/<locale>.json
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const locale = process.argv[2];
if (!locale) {
  console.error("Usage: node scripts/assemble-locale.mjs <locale>");
  process.exit(1);
}

const dir = path.join(ROOT, "src/messages/_build", locale);
const files = (await fs.readdir(dir))
  .filter((f) => f.endsWith(".json"))
  .sort();

let out = {};
for (const f of files) {
  const j = JSON.parse(await fs.readFile(path.join(dir, f), "utf8"));
  out = { ...out, ...j };
}

const outPath = path.join(ROOT, "src/messages", `${locale}.json`);
await fs.writeFile(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.error(`Wrote ${outPath} (${files.length} fragments)`);
