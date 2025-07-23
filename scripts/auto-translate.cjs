// scripts/auto-translate.cjs
// Usage: node scripts/auto-translate.cjs
// This script auto-translates missing values in i18n files using Google Translate (free API)
// The translation provider can be swapped by replacing the translateText function

const fs = require('fs');
const path = require('path');
const { translate } = require('@vitalets/google-translate-api');

const LANGS = [
  { code: 'de', name: 'German' }
];
const BASE_PATH = path.join(__dirname, '../src/lib/i18n');
const EN_FILE = path.join(BASE_PATH, 'en.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Translation provider abstraction
async function translateText(text, to) {
  // You can swap this function to use another provider (e.g., DeepL, Google Cloud, etc.)
  if (!text || typeof text !== 'string') return text;
  const res = await translate(text, { to });
  return res.text;
}

// Recursively translate missing values
async function translateKeys(base, target, to, pathArr = [], file, fullTarget) {
  if (typeof base !== 'object' || base === null) return base;
  const result = Array.isArray(base) ? [] : {};
  for (const key in base) {
    const currentPath = [...pathArr, key];
    if (typeof base[key] === 'object' && base[key] !== null) {
      result[key] = await translateKeys(base[key], (target && target[key]) || {}, to, currentPath, file, fullTarget);
    } else {
      if (!target || !(key in target) || target[key] === base[key]) {
        console.log(`[${to}] Translating: ${currentPath.join('.')} ...`);
        result[key] = await translateText(base[key], to);
        // Save after each key
        setDeepValue(fullTarget, currentPath, result[key]);
        writeJson(file, fullTarget);
        await sleep(2000);
      } else {
        result[key] = target[key];
      }
    }
  }
  return result;
}

// Helper to set a deep value in an object by path
function setDeepValue(obj, pathArr, value) {
  let curr = obj;
  for (let i = 0; i < pathArr.length - 1; i++) {
    if (!curr[pathArr[i]]) curr[pathArr[i]] = {};
    curr = curr[pathArr[i]];
  }
  curr[pathArr[pathArr.length - 1]] = value;
}

async function main() {
  const en = readJson(EN_FILE);
  for (const lang of LANGS) {
    const file = path.join(BASE_PATH, `${lang.code}.json`);
    let target = {};
    if (fs.existsSync(file)) {
      target = readJson(file);
    }
    // Pass the target as fullTarget for incremental saving
    await translateKeys(en, target, lang.code, [], file, target);
    console.log(`Auto-translation (with incremental saving) attempted for: ${lang.code}.json`);
  }
  console.log('All language files are now auto-translated (where needed, with incremental saving).');
}

main(); 