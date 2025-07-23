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
async function translateKeys(base, target, to, pathArr = []) {
  if (typeof base !== 'object' || base === null) return base;
  const result = Array.isArray(base) ? [] : {};
  for (const key in base) {
    const currentPath = [...pathArr, key];
    if (typeof base[key] === 'object' && base[key] !== null) {
      result[key] = await translateKeys(base[key], (target && target[key]) || {}, to, currentPath);
    } else {
      // Only translate if missing or identical to English
      if (!target || !(key in target) || target[key] === base[key]) {
        console.log(`[${to}] Translating: ${currentPath.join('.')} ...`);
        result[key] = await translateText(base[key], to);
        await sleep(2000); // 2 second delay
      } else {
        result[key] = target[key];
      }
    }
  }
  return result;
}

async function main() {
  const en = readJson(EN_FILE);
  for (const lang of LANGS) {
    const file = path.join(BASE_PATH, `${lang.code}.json`);
    let target = {};
    if (fs.existsSync(file)) {
      target = readJson(file);
    }
    const translated = await translateKeys(en, target, lang.code);
    writeJson(file, translated);
    console.log(`Auto-translated: ${lang.code}.json`);
  }
  console.log('All language files are now auto-translated (where needed).');
}

main(); 