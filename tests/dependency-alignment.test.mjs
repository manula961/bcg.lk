import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url),'utf8');
const manifest=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
test('React and React DOM majors remain aligned in manifest and lockfile',()=>{
 assert.equal(manifest.dependencies.react, '^19.3.1');
 assert.equal(manifest.dependencies['react-dom'], '^19.3.1');
 assert.equal(lock.packages[''].dependencies.react, manifest.dependencies.react);
 assert.equal(lock.packages[''].dependencies['react-dom'], manifest.dependencies['react-dom']);
 assert.equal(lock.packages['node_modules/react'].version, lock.packages['node_modules/react-dom'].version);
 assert.equal(lock.packages['node_modules/react-dom'].peerDependencies.react, '^19.3.1');
});
test('current Firebase SDK and separate backend remain unchanged',()=>{
 assert.equal(manifest.dependencies.firebase, '^12.0.0');
 assert.equal(lock.packages[''].dependencies.firebase, '^12.0.0');
 assert.equal(lock.packages['node_modules/firebase'].version.split('.')[0], '12');
});
test('Dependabot groups coupled React majors and pauses incompatible Firebase major',()=>{
 const configuration=read('.github/dependabot.yml');
 assert.match(configuration, /react-coupled-major:/);
 assert.match(configuration, /- react\s+- react-dom/);
 assert.match(configuration, /dependency-name: firebase/);
 assert.match(configuration, /version-update:semver-major/);
 assert.doesNotMatch(configuration, /labels:\s*\n\s*- dependencies/);
});
