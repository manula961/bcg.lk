/*
 * First-party post view counter. This module runs on public document routes
 * only, never on /admin. It does not use cookies, local storage, or referrers.
 * Existing React layout/animations/navigation are not modified.
 */
(() => {
  'use strict';
  if (window.__bcgPostViewTracker) return;
  window.__bcgPostViewTracker = true;
  if (navigator.globalPrivacyControl === true ||
      navigator.doNotTrack === '1' || navigator.webdriver === true) return;

  const post = /^\/(?:updates|events)\/[A-Za-z0-9]{20}\/?$/;
  const page = /^\/pages\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/;
  let timeout = null;
  function queue() {
    clearTimeout(timeout);
    const path = window.location.pathname;
    if ((!post.test(path) && !page.test(path)) || document.visibilityState !== 'visible')
      return;
    timeout = setTimeout(() => {
      if (window.location.pathname !== path ||
          document.visibilityState !== 'visible') return;
      fetch('/api/analytics/collect', {
        method: 'POST',
        credentials: 'omit',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-BCG-View': '1' },
        body: JSON.stringify({ path }),
        keepalive: true,
      }).catch(() => {}); // Tracking must not affect the page.
    }, 1200);
  }

  // React app changes URLs via the History API. Preserve its original method.
  for (const action of ['pushState', 'replaceState']) {
    const original = history[action];
    history[action] = function (...args) {
      const result = original.apply(this, args);
      queue();
      return result;
    };
  }
  window.addEventListener('popstate', queue, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') queue();
  }, { passive: true });
  queue();
})();
