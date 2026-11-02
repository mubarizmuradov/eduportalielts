/**
 * Checks an IELTS Test Package file without importing it.
 *   npm run package:validate -- path/to/package.json
 * Exit code 0 = valid, 1 = invalid. Prints a summary or the error list.
 */
import { readFileSync } from 'node:fs';
import { buildIeltsExam } from '../src/ielts-format/build-exam';

const file = process.argv[2];
if (!file) {
  console.error('usage: npm run package:validate -- <package.json>');
  process.exit(2);
}
const result = buildIeltsExam(JSON.parse(readFileSync(file, 'utf8')));
for (const w of result.ok ? result.exam.warnings : result.warnings) console.warn(`warning  ${w.path}: ${w.message}`);
if (!result.ok) {
  for (const e of result.errors) console.error(`error    ${e.path}: ${e.message}`);
  console.error(`\n${result.errors.length} error(s): the package is NOT a valid IELTS test.`);
  process.exit(1);
}
console.log(JSON.stringify(result.exam.summary, null, 2));
console.log('\nValid IELTS test package.');
