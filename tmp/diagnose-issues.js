const fs = require('fs');
const path = require('path');
const glob = require('glob');

function flatten(obj, prefix = '') {
  const result = [];
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result.push(...flatten(value, full));
    } else {
      result.push(full);
    }
  }
  return result;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function getFiles(pattern) {
  return glob.sync(pattern, { nodir: true, cwd: process.cwd(), absolute: true });
}

const envRegex = /process\.env\.([A-Z0-9_]+)/g;
const keyRegex = /\b(?:t|tHome|tCat|tType|tDemo|tBoost|tScan|tAuth|tProfile|tManga|tFeedback|tNews|tAdmin|tCommunity|tSearch|tBilling|tScanPanel)\(\s*['\"]([a-zA-Z0-9_.-]+)['\"]\s*[,)\]]/g;

const files = getFiles('src/**/*.{ts,tsx}');
const envNames = new Set();
const translationKeys = new Set();
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = envRegex.exec(content))) envNames.add(m[1]);
  while ((m = keyRegex.exec(content))) translationKeys.add(m[1]);
}
const envExample = fs.readFileSync('.env.example', 'utf8');
const envExampleNames = new Set();
envExample.split(/\r?\n/).forEach((line) => {
  const m = line.match(/^([A-Z0-9_]+)=/);
  if (m) envExampleNames.add(m[1]);
});
const missingEnv = Array.from(envNames).filter((n) => !envExampleNames.has(n)).sort();
const esArKeys = new Set(flatten(readJson('src/messages/es-ar.json')));
const missingI18n = Array.from(translationKeys).filter((key) => !esArKeys.has(key)).sort();

console.log('ENV_USED:' + Array.from(envNames).sort().join(','));
console.log('ENV_MISSING:' + missingEnv.join(','));
console.log('I18N_KEYS_USED:' + Array.from(translationKeys).sort().join(','));
console.log('I18N_MISSING:' + missingI18n.join(','));
