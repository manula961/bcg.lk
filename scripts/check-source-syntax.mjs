/**
 * Syntax-gate every checked-in backend, tool and non-JSX JavaScript file.
 * Runs before the test suite; no external dependencies or credentials needed.
 * JSX is validated by the existing Vite build instead of node --check.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const files = ['middleware.js', 'vite.config.mjs', 'postcss.config.js', 'tailwind.config.js'];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile() && /\.(?:[cm]?js)$/.test(entry.name)) files.push(path);
  }
}
for (const directory of ['api', 'scripts', 'src', 'tests']) walk(directory);

let failures = 0;
for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    failures++;
    console.error('Syntax check failed: ' + file);
    console.error(result.error?.message || result.stderr || result.stdout || 'Unknown parser error');
  }
}
if (failures) {
  console.error('Syntax gate failed for ' + failures + ' of ' + files.length + ' files.');
  process.exitCode = 1;
} else {
  console.log('Syntax gate passed for ' + files.length + ' non-JSX JavaScript files.');
}
