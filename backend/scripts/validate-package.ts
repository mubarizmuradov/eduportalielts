/**
 * Checks a test package file without importing it.
 *   npm run package:validate -- path/to/package.json
 * Reads both formats: IELTS Test Package 1.x and ielts-content 1.0.0
 * (converted first; set ASSET_STORAGE_BASE_URL to resolve its storageKeys).
 * Exit code 0 = valid, 1 = invalid. Prints a summary or the error list.
 */
import { readFileSync } from 'node:fs';
import { buildIeltsExam } from '../src/ielts-format/build-exam';
import { adaptContentV1, isContentV1 } from '../src/ielts-format/content-v1';
import type { BuildIssue } from '../src/ielts-format/exam.types';

const file = process.argv[2];
if (!file) {
  console.error('usage: npm run package:validate -- <package.json>');
  process.exit(2);
}
const input: unknown = JSON.parse(readFileSync(file, 'utf8'));
const warn = (ws: BuildIssue[], prefix = '') => ws.forEach((w) => console.warn(`warning  ${prefix}${w.path}: ${w.message}`));
const fail = (es: BuildIssue[], prefix = '') => {
  for (const e of es) console.error(`error    ${prefix}${e.path}: ${e.message}`);
  console.error(`\n${es.length} error(s): the package is NOT a valid IELTS test.`);
  process.exit(1);
};

let pkg = input;
let prefix = '';
if (isContentV1(input)) {
  console.log('Format: ielts-content 1.0.0 (converted to IELTS Test Package 1.1)');
  const a = adaptContentV1(input, { assetBaseUrl: process.env.ASSET_STORAGE_BASE_URL || undefined });
  warn(a.warnings);
  if (!a.ok) fail(a.errors);
  else {
    pkg = a.pkg;
    prefix = 'converted: ';
    if (a.fixtureOnly) console.warn('note     fixtureOnly: valid for testing, but it can never be imported.');
  }
}
const result = buildIeltsExam(pkg);
warn(result.ok ? result.exam.warnings : result.warnings, prefix);
if (!result.ok) fail(result.errors, prefix);
else {
  console.log(JSON.stringify(result.exam.summary, null, 2));
  console.log('\nValid IELTS test package.');
}
