import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CATALOG_DIR = path.join(ROOT, "src/messages/_catalog");
const LOCALES = ["en-us", "en-gb", "es-ar", "es-es", "pt-br", "ja-jp", "ko-kr", "zh-cn"];

for (const loc of LOCALES) {
  const catalogPath = path.join(CATALOG_DIR, `${loc}.json`);
  const messagesPath = path.join(ROOT, "src/messages", `${loc}.json`);
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  const messages = JSON.parse(await fs.readFile(messagesPath, "utf8"));
  messages.catalog = catalog;
  await fs.writeFile(messagesPath, JSON.stringify(messages, null, 2) + "\n", "utf8");
  console.error(`Merged catalog → ${loc}.json`);
}
