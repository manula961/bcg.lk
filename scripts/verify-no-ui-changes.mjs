import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { applyApprovedAdminPatch } from './approved-admin-upload-patch.mjs';
const base=process.env.GITHUB_BASE_REF || 'main';
const run=args=>execFileSync('git',args,{encoding:'utf8'});
const changed=run(['diff','--name-only','origin/'+base+'...HEAD']).trim().split('\n').filter(Boolean);
const protectedFiles=changed.filter(path=>
 /^src\/(?:components|admin|pages)\//.test(path) ||
 /^src\/(?:App\.jsx|main\.jsx|index\.css)$/.test(path) ||
 /^public\//.test(path) ||
 /\.(?:css|scss|svg|png|jpe?g|webp|woff2?)$/i.test(path)
).filter(path=>path!=='src/admin/ContentManager.jsx');
if(changed.includes('src/admin/ContentManager.jsx')){
 const baseline=run(['show','origin/'+base+':src/admin/ContentManager.jsx']);
 if(readFileSync('src/admin/ContentManager.jsx','utf8')!==applyApprovedAdminPatch(baseline))
   protectedFiles.push('src/admin/ContentManager.jsx (unapproved UI change)');
}
if(protectedFiles.length){console.error('Rule #1: UI files changed: '+protectedFiles.join(', '));process.exitCode=1;}
else console.log('Rule #1 passed: original UI source preserved; only approved upload controls added.');
