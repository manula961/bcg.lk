/** Client-side navigation for public routes; native anchors and downloads still work. */
export const NAVIGATION_EVENT = 'bcg:public-navigation';
const PREVIOUS_ROUTE = '__bcgPreviousRoute';
let smoothScroller = null;

export function setSmoothScroller(instance) {
  smoothScroller = instance;
  if (scrollLocks.size) smoothScroller?.stop();
}

function getTargetScrollTop(target) {
  if (typeof target === 'number') return Math.max(0, target);
  if (typeof target === 'string') {
    if (target === '#top' || target === '#home' || target === 'top' || target === 'home') return 0;
    const id = target.startsWith('#') ? target.slice(1) : target;
    const el = document.getElementById(id) || document.querySelector(target);
    return el ? Math.max(0, el.getBoundingClientRect().top + window.scrollY) : 0;
  }
  if (target && typeof target.getBoundingClientRect === 'function') {
    return Math.max(0, target.getBoundingClientRect().top + window.scrollY);
  }
  return 0;
}

function resetNativeScrollTo(top) {
  window.scrollTo({ left: 0, top, behavior: 'instant' });
  document.documentElement.scrollTop = top;
  document.body.scrollTop = top;
}

function forceResetSmoothScroller(top) {
  if (!smoothScroller) return;
  // Cancel any active Lenis momentum/wheel/lerp animation before snapping.
  smoothScroller.stop();
  smoothScroller.resize();
  smoothScroller.scrollTo(top, { immediate: true, force: true });
  resetNativeScrollTo(top);
  if (!scrollLocks.size) {
    smoothScroller.start();
    smoothScroller.scrollTo(top, { immediate: true, force: true });
  }
}

// All programmatic scrolling uses the same engine.
export function scrollPageTo(target, { smooth = false, force = false } = {}) {
  const top = getTargetScrollTop(target);
  if (scrollLocks.size) {
    if (!force) return;
    if (savedScroll) {
      savedScroll.x = 0;
      savedScroll.y = top;
      document.body.style.top = `-${top}px`;
      document.body.style.left = '0px';
    }
    if (smoothScroller) {
      smoothScroller.stop();
      smoothScroller.resize();
      smoothScroller.scrollTo(top, { immediate: true, force: true });
    }
    return;
  }
  const animate = smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!animate) {
    resetNativeScrollTo(top);
    forceResetSmoothScroller(top);
    return;
  }
  if (smoothScroller) {
    smoothScroller.start();
    smoothScroller.resize();
    smoothScroller.scrollTo(top, {
      immediate: false,
      force: true,
      duration: 1.15,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    return;
  }
  window.scrollTo({ left: 0, top, behavior: 'smooth' });
}

export function scrollToPageTop(options) {
  scrollPageTo(0, options);
}

const scrollLocks = new Set();
let savedScroll = null;

/** Shared, nest-safe lock for menu and dialogs. Returns an idempotent release. */
export function lockPageScroll(owner = 'dialog') {
  const token = { owner };
  if (!scrollLocks.size) {
    const body = document.body;
    savedScroll = {
      x: window.scrollX, y: window.scrollY,
      position: body.style.position, top: body.style.top,
      left: body.style.left, width: body.style.width,
      overflow: body.style.overflow, paddingRight: body.style.paddingRight,
      htmlOverflow: document.documentElement.style.overflow,
    };
    smoothScroller?.stop();
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    if (gutter > 0) body.style.paddingRight =
      `${parseFloat(getComputedStyle(body).paddingRight) + gutter}px`;
    Object.assign(body.style, {
      position: 'fixed', top: `-${savedScroll.y}px`,
      left: `-${savedScroll.x}px`, width: '100%', overflow: 'hidden',
    });
    document.documentElement.style.overflow = 'hidden';
  }
  scrollLocks.add(token);
  document.body.dataset.pageOverlay = owner;
  return () => {
    if (!scrollLocks.delete(token)) return;
    if (scrollLocks.size) {
      document.body.dataset.pageOverlay = [...scrollLocks].at(-1).owner;
      return;
    }
    const saved = savedScroll;
    savedScroll = null;
    const { x, y, htmlOverflow, ...styles } = saved;
    Object.assign(document.body.style, styles);
    document.documentElement.style.overflow = htmlOverflow;
    delete document.body.dataset.pageOverlay;
    resetNativeScrollTo(y);
    if (smoothScroller) {
      smoothScroller.stop();
      smoothScroller.resize();
      smoothScroller.scrollTo(y, { immediate: true, force: true });
      smoothScroller.start();
    }
  };
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

  const fromUrl = new URL(window.location.href);
  const from = fromUrl.pathname + fromUrl.search + fromUrl.hash;
  const next = url.pathname + url.search + url.hash;
  const sameDocumentPath =
    fromUrl.pathname === url.pathname ||
    (isHomePath(fromUrl.pathname) && isHomePath(url.pathname));

  if (from === next) {
    window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, { detail: { type: 'same' } }));
    return true;
  }

  if (isHomePath(url.pathname) && !isHomePath(fromUrl.pathname)) {
    sessionStorage.setItem('skipLoading', 'true');
  }

  const previous = window.history.state || {};
  const state = replace
    ? { ...previous, [PREVIOUS_ROUTE]: previous[PREVIOUS_ROUTE] || null }
    : { [PREVIOUS_ROUTE]: from };
  if (replace) window.history.replaceState(state, '', next);
  else window.history.pushState(state, '', next);

  // Stop any in-flight Lenis momentum and reset immediately when changing between pages.
  if (!sameDocumentPath) {
    scrollToPageTop({ smooth: false, force: true });
  }
  window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, {
    detail: { type: sameDocumentPath ? 'same' : 'push' },
  }));
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
    const rawHref = anchor.getAttribute('href') || '';
    if (rawHref.startsWith('#')) return;
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
    const currentPathname = window.location.pathname;
    const sameDocumentPath =
      currentPathname === previousPathname ||
      (isHomePath(currentPathname) && isHomePath(previousPathname));
    if (isHomePath(currentPathname) && !isHomePath(previousPathname)) {
      sessionStorage.setItem('skipLoading', 'true');
    }
    if (!sameDocumentPath) {
      scrollToPageTop({ smooth: false, force: true });
    }
    previousPathname = currentPathname;
    onNavigate(sameDocumentPath ? 'same' : 'pop');
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
