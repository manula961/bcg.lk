/** Approved addition of published CMS page routes; existing website routes unchanged. */
export function applyApprovedPageRoutePatch(source) {
 const edits=[["import LifeDetailPage, { lifePages } from './pages/LifeDetailPage.jsx';","import LifeDetailPage, { lifePages } from './pages/LifeDetailPage.jsx';\nimport PublishedContentPage from './pages/PublishedContentPage.jsx';"],["const lifeSlug = lifeMatch && Object.prototype.hasOwnProperty.call(lifePages, lifeMatch[1]) ? lifeMatch[1] : null;","const lifeSlug = lifeMatch && Object.prototype.hasOwnProperty.call(lifePages, lifeMatch[1]) ? lifeMatch[1] : null;\nconst pageMatch = window.location.pathname.match(/^\\/pages\\/([a-z0-9]+(?:-[a-z0-9]+)*)\\/?$/);\nconst pageSlug = pageMatch ? pageMatch[1] : null;"],["{isAdminPath ? <AdminApp /> : lifeSlug ? <LifeDetailPage slug={lifeSlug} /> : <App />}","{isAdminPath ? <AdminApp /> : lifeSlug ? <LifeDetailPage slug={lifeSlug} /> : pageSlug ? <PublishedContentPage slug={pageSlug} /> : <App />}"]];
 let output=source;
 for (const [before,after] of edits) {
  if(!output.includes(before))throw new Error('Missing original route anchor');
  output=output.replace(before,after);
 }
 return output;
}
