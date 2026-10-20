/**
 * Lightweight navigation for the public pages. Links remain real <a href>
 * elements, so direct visits, refreshes and opening links in a new tab work.
 * Admin/auth routes keep full-page navigation and are deliberately isolated.
 */
export const NAVIGATION_EVENT = 'bcg:public-navigation';
const SCROLL_STATE = '__bcgScroll';

export function isHomePath(pathname) {
  return pathname === '/' || pathname === '/index.html';
}

function isAdminPath(pathname) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

// Static assets, downloads and API URLs must keep their native behavior.
export function isPublicRoute(pathname) {
  return isHomePath(pathname) || pathname === '/about-us' || pathname === '/about-us/' ||
    pathname === '/past-papers' || pathname === '/past-papers/' ||
    pathname === '/events' || pathname === '/events/' ||
    /^\/(?:life|pages|updates|events)\/[^/]+\/?$/.test(pathname);
}

function saveScrollPosition() {
  const previous = window.history.state || {};
  window.history.replaceState(
    { ...previous, [SCROLL_STATE]: { x: window.scrollX, y: window.scrollY } },
    '',
    window.location.href,
  );
}

export function getSavedScroll() {
  return window.history.state?.[SCROLL_STATE] || { x: 0, y: 0 };
}

/** Returns true if a same-origin public URL was handled without a reload. */
export function navigate(to, { replace = false } = {}) {
  const url = new URL(to, window.location.href);
  if (url.origin !== window.location.origin || !isPublicRoute(url.pathname) || isAdminPath(url.pathname)) {
    window.location.assign(url.href);
    return false;
  }

  const from = window.location.pathname + window.location.search + window.location.hash;
  const next = url.pathname + url.search + url.hash;
  if (from === next) {
    // A second click on the current anchor should still bring it into view.
    window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, { detail: { type: 'same' } }));
    return true;
  }

  saveScrollPosition();
  if (isHomePath(url.pathname) && !isHomePath(window.location.pathname)) {
    // The original homepage intro remains for fresh visits, but not returns.
    window.sessionStorage.setItem('skipLoading', 'true');
  }

  const state = { [SCROLL_STATE]: { x: 0, y: 0 } };
  if (replace) window.history.replaceState(state, '', next);
  else window.history.pushState(state, '', next);
  window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, { detail: { type: 'push' } }));
  return true;
}

/** Called once from the public React root. No UI styles or markup are added. */
export function listenForNavigation(onNavigate) {
  let previousPathname = window.location.pathname;
  const previousRestoration = window.history.scrollRestoration;
  window.history.scrollRestoration = 'manual';

  const handleClick = (event) => {
    if (isAdminPath(window.location.pathname) || event.defaultPrevented ||
        event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download') ||
        (anchor.target && anchor.target !== '_self') ||
        anchor.relList?.contains('external')) return;
    const url = new URL(anchor.href, window.location.href);
    if (!['http:', 'https:'].includes(url.protocol) ||
        url.origin !== window.location.origin || !isPublicRoute(url.pathname) ||
        isAdminPath(url.pathname)) return;
    event.preventDefault();
    navigate(url.href);
  };

  const handleNavigation = (event) => {
    previousPathname = window.location.pathname;
    onNavigate(event.detail?.type || 'push');
  };
  const handlePopState = () => {
    if (isHomePath(window.location.pathname) && !isHomePath(previousPathname)) {
      window.sessionStorage.setItem('skipLoading', 'true');
    }
    previousPathname = window.location.pathname;
    onNavigate('pop', getSavedScroll());
  };

  // Throttled position storage also captures history entries left via the
  // browser's Back / Forward controls, not only links initiated by the site.
  let scrollTimer = null;
  const handleScroll = () => {
    if (scrollTimer !== null) return;
    const expectedState = window.history.state;
    scrollTimer = window.setTimeout(() => {
      scrollTimer = null;
      if (window.history.state !== expectedState) return;
      saveScrollPosition();
    }, 120);
  };

  document.addEventListener('click', handleClick);
  window.addEventListener(NAVIGATION_EVENT, handleNavigation);
  window.addEventListener('popstate', handlePopState);
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('pagehide', saveScrollPosition);
  return () => {
    document.removeEventListener('click', handleClick);
    window.removeEventListener(NAVIGATION_EVENT, handleNavigation);
    window.removeEventListener('popstate', handlePopState);
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('pagehide', saveScrollPosition);
    if (scrollTimer !== null) window.clearTimeout(scrollTimer);
    window.history.scrollRestoration = previousRestoration;
  };
}
