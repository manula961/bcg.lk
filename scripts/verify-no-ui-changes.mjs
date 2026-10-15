import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { applyApprovedAdminPatch } from './approved-admin-upload-patch.mjs';
import { applyApprovedPageRoutePatch } from './approved-page-route-patch.mjs';
const base=process.env.GITHUB_BASE_REF || 'main';
const run=args=>execFileSync('git',args,{encoding:'utf8'});
const changed=run(['diff','--name-only','origin/'+base+'...HEAD']).trim().split('\n').filter(Boolean);
const protectedFiles=changed.filter(path=>
 /^src\/(?:components|admin|pages)\//.test(path) ||
 /^src\/(?:App\.jsx|main\.jsx|index\.css)$/.test(path) ||
 /^public\//.test(path) ||
 /\.(?:css|scss|svg|png|jpe?g|webp|woff2?)$/i.test(path)
).filter(path=>!['src/admin/ContentManager.jsx','src/main.jsx','src/pages/PublishedContentPage.jsx','src/pages/LifeDetailPage.jsx'].includes(path));
if(changed.includes('src/admin/ContentManager.jsx')){
 const baseline=run(['show','origin/'+base+':src/admin/ContentManager.jsx']);
 if(readFileSync('src/admin/ContentManager.jsx','utf8')!==applyApprovedAdminPatch(baseline))
   protectedFiles.push('src/admin/ContentManager.jsx (unapproved UI change)');
}
if(changed.includes('src/main.jsx')){
 const baseline=run(['show','origin/'+base+':src/main.jsx']);
 if(readFileSync('src/main.jsx','utf8')!==applyApprovedPageRoutePatch(baseline))protectedFiles.push('src/main.jsx (unapproved route change)');
}
if(changed.includes('src/pages/PublishedContentPage.jsx')){
 const baselineExists=run(['ls-tree','-r','--name-only','origin/'+base,'--','src/pages/PublishedContentPage.jsx']).trim();
 if(baselineExists) protectedFiles.push('Existing published-page UI modified');
}
if(changed.includes('src/pages/LifeDetailPage.jsx')){
 const baseline=run(['show','origin/'+base+':src/pages/LifeDetailPage.jsx']);
 const before="            {slug === 'societies' && <SchoolContentListing kind=\"extracurricular\" />}\n            {slug === 'sports-athletics' && <SchoolContentListing kind=\"sports\" />}";
 const after="            {slug === 'sports-athletics' && <SchoolContentListing kind=\"sports\" />}\n            {slug === 'sports-athletics' && <SchoolContentListing kind=\"extracurricular\" />}";
 const actual=readFileSync('src/pages/LifeDetailPage.jsx','utf8');
 if(!baseline.includes(before) || actual!==baseline.replace(before,after))
  protectedFiles.push('src/pages/LifeDetailPage.jsx (changes beyond approved Extracurricular location move)');
}
if(protectedFiles.length){console.error('Rule #1: UI files changed: '+protectedFiles.join(', '));process.exitCode=1;}
else console.log('Rule #1 passed: original UI source preserved; only approved upload controls added.');
