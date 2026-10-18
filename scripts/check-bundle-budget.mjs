import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const names = readdirSync('dist/assets').filter(name => name.startsWith('index-') && name.endsWith('.js'));
if (names.length !== 1) throw new Error('Expected one entry module');
const size = statSync(join('dist/assets', names[0])).size;
console.log('Initial JS entry size:', size, 'bytes');
if (size > 300 * 1024) throw new Error('Entry JS bundle exceeds 300 KiB');
