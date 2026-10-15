/** Only the published Pages route is added; existing main routes stay byte-identical. */
export function applyApprovedPageRoutePatch(source) {
 const edits=[["import LifeDetailPage, { lifePages } from './pages/LifeDetailPage.jsx';","import LifeDetailPage, { lifePages } from './pages/LifeDetailPage.jsx';\nimport PublishedContentPage from './pages/PublishedContentPage.jsx';"],["const lifeSlug = lifeMatch && Object.prototype.hasOwnProperty.call(lifePages, lifeMatch[1]) ? lifeMatch[1] : null;","const lifeSlug = lifeMatch && Object.prototype.hasOwnProperty.call(lifePages, lifeMatch[1]) ? lifeMatch[1] : null;\nconst pageMatch = pathname.match(/^\\/pages\\/([a-z0-9]+(?:-[a-z0-9]+)*)\\/?$/);\nconst pageSlug = pageMatch ? pageMatch[1] : null;"],["    ) : (\n      <App />\n    )}","    ) : pageSlug ? (\n      <PublishedContentPage slug={pageSlug} />\n    ) : (\n      <App />\n    )}"]];
 let output=source;
 for(const [before,after] of edits){if(!output.includes(before))throw new Error('Missing current main route anchor');output=output.replace(before,after)}
 return output;
}
