/** Client-side navigation for public routes; native anchors and downloads still work. */
export const NAVIGATION_EVENT = 'bcg:public-navigation';
const PREVIOUS_ROUTE = '__bcgPreviousRoute';
let smoothScroller = null;

export function setSmoothScroller(instance) {
  smoothScroller = instance;
}

export function scrollToPageTop() {
  // Lenis has its own target scroll position; reset that as well as the browser.
  smoothScroller?.scrollTo(0, { immediate: true, force: true });
  window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
}

export function isHomePath(pathname) {
  return pathname === '/' || pathname === '/index.html';
}

function isAdminPath(pathname) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function isPublicRoute(pathname) {
  return isHomePath(pathname) || pathname === '/about-us' || pathname === '/about-us/' ||
    pathname === '/past-papers' || pathname === '/past-papers/' ||
    pathname === '/events' || pathname === '/events/' ||
    /^\/(?:life|pages|updates|events)\/[^/]+\/?$/.test(pathname);
}

/** Returns true when a same-origin public URL was handled without a reload. */
export function navigate(to, { replace = false } = {}) {
  const url = new URL(to, window.location.href);
  if (url.origin !== window.location.origin || !isPublicRoute(url.pathname) || isAdminPath(url.pathname)) {
    window.location.assign(url.href);
    return false;
  }

  const from = window.location.pathname + window.location.search + window.location.hash;
  const next = url.pathname + url.search + url.hash;
  if (from === next) {
    window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, { detail: { type: 'same' } }));
    return true;
  }

  if (isHomePath(url.pathname) && !isHomePath(window.location.pathname)) {
    sessionStorage.setItem('skipLoading', 'true');
  }

  const previous = window.history.state || {};
  const state = replace
    ? { ...previous, [PREVIOUS_ROUTE]: previous[PREVIOUS_ROUTE] || null }
    : { [PREVIOUS_ROUTE]: from };
  if (replace) window.history.replaceState(state, '', next);
  else window.history.pushState(state, '', next);

  // Reset immediately to avoid displaying the new page at the old scroll offset.
  if (url.pathname !== new URL(from, window.location.origin).pathname) scrollToPageTop();
  window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, { detail: { type: 'push' } }));
  return true;
}

/**
 * Return to the actual previous page when this entry was created by an
 * internal navigation. A direct link/new tab uses the supplied safe fallback.
 */
export function navigateBack(fallback = '/') {
  if (window.history.state?.[PREVIOUS_ROUTE]) {
    window.history.back();
    return;
  }
  // A full document visit from another same-origin page can use its referrer.
  try {
    const referrer = document.referrer && new URL(document.referrer);
    if (referrer && referrer.origin === window.location.origin &&
        isPublicRoute(referrer.pathname) &&
        referrer.href !== window.location.href) {
      navigate(referrer.href, { replace: true });
      return;
    }
  } catch { /* Missing or invalid referrer: use the fallback. */ }
  navigate(fallback, { replace: true });
}

export function listenForNavigation(onNavigate) {
  let previousPathname = window.location.pathname;
  const previousRestoration = window.history.scrollRestoration;
  window.history.scrollRestoration = 'manual';

  const handleClick = (event) => {
    if (isAdminPath(window.location.pathname) || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download') ||
        (anchor.target && anchor.target !== '_self') ||
        anchor.relList?.contains('external')) return;
    const url = new URL(anchor.href, window.location.href);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== window.location.origin ||
        !isPublicRoute(url.pathname) || isAdminPath(url.pathname)) return;
    event.preventDefault();
    navigate(url.href);
  };

  const handleNavigation = (event) => {
    previousPathname = window.location.pathname;
    onNavigate(event.detail?.type || 'push');
  };
  const handlePopState = () => {
    if (isHomePath(window.location.pathname) && !isHomePath(previousPathname)) {
      sessionStorage.setItem('skipLoading', 'true');
    }
    if (window.location.pathname !== previousPathname) scrollToPageTop();
    previousPathname = window.location.pathname;
    onNavigate('pop');
  };

  document.addEventListener('click', handleClick);
  window.addEventListener(NAVIGATION_EVENT, handleNavigation);
  window.addEventListener('popstate', handlePopState);
  return () => {
    document.removeEventListener('click', handleClick);
    window.removeEventListener(NAVIGATION_EVENT, handleNavigation);
    window.removeEventListener('popstate', handlePopState);
    window.history.scrollRestoration = previousRestoration;
  };
}
