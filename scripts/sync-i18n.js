// scripts/sync-i18n.js
// Usage: node scripts/sync-i18n.js

const fs = require('fs');
const path = require('path');

const LANGS = ['de', 'fr', 'it', 'es'];
const BASE_PATH = path.join(__dirname, '../src/lib/i18n');
const EN_FILE = path.join(BASE_PATH, 'en.json');

function readJson(file) {
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
	fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function syncKeys(base, target) {
	// Recursively copy keys from base to target, preserving existing values
	if (typeof base !== 'object' || base === null) return base;
	const result = Array.isArray(base) ? [] : {};
	for (const key in base) {
		if (typeof base[key] === 'object' && base[key] !== null) {
			result[key] = syncKeys(base[key], (target && target[key]) || {});
		} else {
			result[key] = target && key in target ? target[key] : base[key];
		}
	}
	return result;
}

function main() {
	const en = readJson(EN_FILE);
	LANGS.forEach((lang) => {
		const file = path.join(BASE_PATH, `${lang}.json`);
		let target = {};
		if (fs.existsSync(file)) {
			target = readJson(file);
		}
		const merged = syncKeys(en, target);
		writeJson(file, merged);
		console.log(`Synced: ${lang}.json`);
	});
	console.log('All language files are now in sync with en.json.');
}

main();
