import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const workflows = new URL('../.github/workflows/', import.meta.url);

test('all external GitHub Actions are pinned to immutable full commit SHAs', () => {
  let checked = 0;
  for (const filename of readdirSync(workflows).filter(name => /\.ya?ml$/.test(name))) {
    const source = readFileSync(new URL(filename, workflows), 'utf8');
    for (const match of source.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)/gm)) {
      const action = match[1];
      if (action.startsWith('./')) continue; // Local reusable workflows and actions
      assert.match(action, /^[^@\s]+@[a-f0-9]{40}$/,
        filename + ' must pin the external action to a full commit SHA: ' + action);
      checked++;
    }
  }
  assert.ok(checked >= 20, 'The workflow action pinning check unexpectedly lost coverage');
});
