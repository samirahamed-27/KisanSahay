const fs = require('fs');
const path = require('path');
const vm = require('vm');

const srcFile = path.resolve(__dirname, '../../public/different_languages.js');
const outDir = path.resolve(__dirname, '../src/i18n/translations');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let code = fs.readFileSync(srcFile, 'utf8');

// Replace top-level const with global assignment or eval
const runner = code + '\n; ({ INDIAN_LANGUAGES, TRANSLATIONS });';
const result = eval(runner);

const languages = result.INDIAN_LANGUAGES || [];
const translations = result.TRANSLATIONS || {};

console.log(`Found ${languages.length} languages and ${Object.keys(translations).length} translation sets.`);

// Write languages list
fs.writeFileSync(
  path.resolve(__dirname, '../src/i18n/languages.json'),
  JSON.stringify(languages, null, 2),
  'utf8'
);

// Write individual language translation files
for (const [langCode, dict] of Object.entries(translations)) {
  const targetPath = path.join(outDir, `${langCode}.json`);
  fs.writeFileSync(targetPath, JSON.stringify(dict, null, 2), 'utf8');
  console.log(`Saved: ${targetPath} (${Object.keys(dict).length} keys)`);
}

console.log('Translations extraction completed successfully!');
