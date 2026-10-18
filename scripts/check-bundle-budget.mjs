import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const names = readdirSync('dist/assets').filter(name => name.startsWith('index-') && name.endsWith('.js'));
if (names.length !== 1) throw new Error('Expected one entry module');
const size = statSync(join('dist/assets', names[0])).size;
console.log('Initial JS entry size:', size, 'bytes');
if (size > 300 * 1024) throw new Error('Entry JS bundle exceeds 300 KiB');
const chunks = readdirSync('dist/assets').filter(name => name.endsWith('.js'));
const all = chunks.map(name => ({ name, size: statSync(join('dist/assets', name)).size }))
  .sort((a, b) => b.size - a.size);
if (all[0]?.size > 800 * 1024) {
  throw new Error('Largest JavaScript chunk exceeds 800 KiB: ' + all[0].name);
}
console.log('Largest route-shared JavaScript chunk:', all[0]?.name, all[0]?.size, 'bytes');

