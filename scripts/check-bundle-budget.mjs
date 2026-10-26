import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const chunks = readdirSync('dist/assets')
  .filter(name => name.endsWith('.js'))
  .map(name => ({ name, size: statSync(join('dist/assets', name)).size }));
const entries = chunks.filter(({ name }) => name.startsWith('index-'));
if (entries.length !== 1) throw new Error('Expected one entry module');
console.log('Initial JS entry size:', entries[0].size, 'bytes');
if (entries[0].size > 300 * 1024) throw new Error('Entry JS bundle exceeds 300 KiB');
const largest = chunks.reduce((max, item) => !max || item.size > max.size ? item : max, null);
if (largest?.size > 800 * 1024) {
  throw new Error('Largest JavaScript chunk exceeds 800 KiB: ' + largest.name);
}
console.log('Largest route-shared JavaScript chunk:', largest?.name, largest?.size, 'bytes');
