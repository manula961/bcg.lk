/** Client-side navigation for public routes; native anchors and downloads still work. */
export const NAVIGATION_EVENT = 'bcg:public-navigation';
const PREVIOUS_ROUTE = '__bcgPreviousRoute';
const HOME_RETURN_STATE = '__bcgHomeReturnState';
const HOME_SECTIONS = ['home', 'news', 'events', 'explore', 'NayakenzPride'];

let smoothScroller = null;
let pendingSectionTarget = null;
let pendingHomeReturn = null;

export function setSmoothScroller(instance) {
  smoothScroller = instance;
  if (scrollLocks.size) smoothScroller?.stop();
}

export function getPendingScrollTarget() {
  return {
    section: pendingSectionTarget,
    homeReturn: pendingHomeReturn,
  };
}

export function clearPendingScrollTarget() {
  pendingSectionTarget = null;
  pendingHomeReturn = null;
}

export function getActiveHomeSection(clickedTarget = null) {
  if (!isHomePath(window.location.pathname)) return 'home';
  if (clickedTarget && typeof clickedTarget.closest === 'function') {
    const parentSection = clickedTarget.closest('section[id]');
    if (parentSection?.id && HOME_SECTIONS.includes(parentSection.id)) {
      return parentSection.id;
    }
  }
  const threshold = window.innerHeight * 0.55;
  return HOME_SECTIONS.reduce((last, id) => {
    const el = document.getElementById(id);
    return el && el.getBoundingClientRect().top <= threshold ? id : last;
  }, 'home');
}

function getCurrentScrollY() {
  if (scrollLocks.size && savedScroll) return savedScroll.y;
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function saveHomeReturnSnapshot(explicitSection = null, clickedTarget = null) {
  if (!isHomePath(window.location.pathname)) return null;
  const section = explicitSection || getActiveHomeSection(clickedTarget);
  const snapshot = {
    section,
    scrollY: getCurrentScrollY(),
  };
  try {
    sessionStorage.setItem(HOME_RETURN_STATE, JSON.stringify(snapshot));
  } catch { /* ignore storage errors */ }
  return snapshot;
}

function readHomeReturnSnapshot(historyState) {
  if (historyState?.homeReturn) return historyState.homeReturn;
  try {
    const raw = sessionStorage.getItem(HOME_RETURN_STATE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function inferHomeSectionFromPathname(pathname) {
  if (/^\/events(?:\/|$)/.test(pathname)) return 'events';
  if (/^\/updates(?:\/|$)/.test(pathname)) return 'news';
  if (/^\/(?:life|about-us|past-papers)(?:\/|$)/.test(pathname)) return 'NayakenzPride';
  return null;
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

/**
 * Navigate to a homepage section without adding #section to the browser URL bar.
 */
export function navigateToSection(sectionId) {
  const cleanSection = (sectionId || 'home').replace(/^#/, '');
  if (isHomePath(window.location.pathname)) {
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search
      );
    }
    if (cleanSection === 'home' || cleanSection === 'top') {
      scrollToPageTop({ smooth: true, force: true });
    } else {
      const el = document.getElementById(cleanSection);
      if (el) scrollPageTo(el, { smooth: true, force: true });
    }
    return;
  }
  navigate('/', { section: cleanSection });
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
export function navigate(
  to,
  { replace = false, section = null, fromSection = null, clickedTarget = null, restoreHomeSection = false } = {}
) {
  const url = new URL(to, window.location.href);
  if (url.origin !== window.location.origin || !isPublicRoute(url.pathname) || isAdminPath(url.pathname)) {
    window.location.assign(url.href);
    return false;
  }

  const fromUrl = new URL(window.location.href);
  const fromOnHome = isHomePath(fromUrl.pathname);
  const toOnHome = isHomePath(url.pathname);

  // Extract any hash on homepage URLs as an internal section target and strip it from the address bar.
  const targetSection = section || (toOnHome && url.hash ? decodeURIComponent(url.hash.slice(1)) : null);
  if (toOnHome && url.hash) {
    url.hash = '';
  }

  // If already on the homepage and navigating to a homepage section, scroll smoothly in-place without changing URL hash.
  if (fromOnHome && toOnHome) {
    if (window.location.hash) {
      window.history.replaceState(window.history.state, '', url.pathname + url.search);
    }
    if (!targetSection || targetSection === 'home' || targetSection === 'top') {
      scrollToPageTop({ smooth: true, force: true });
    } else {
      const el = document.getElementById(targetSection);
      if (el) scrollPageTo(el, { smooth: true, force: true });
    }
    return true;
  }

  // When leaving the homepage for an inner page, record the exact section the user clicked from.
  let homeSnapshot = null;
  if (fromOnHome && !toOnHome) {
    const inferredSection = fromSection || inferHomeSectionFromPathname(url.pathname);
    homeSnapshot = saveHomeReturnSnapshot(inferredSection, clickedTarget);
    const currentState = window.history.state || {};
    window.history.replaceState(
      { ...currentState, homeReturn: homeSnapshot },
      '',
      fromUrl.pathname + fromUrl.search
    );
  }

  const from = fromUrl.pathname + fromUrl.search;
  const next = url.pathname + url.search + (toOnHome ? '' : url.hash);
  const sameDocumentPath =
    fromUrl.pathname === url.pathname ||
    (fromOnHome && toOnHome);

  if (from === next && !targetSection && !restoreHomeSection) {
    window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, { detail: { type: 'same' } }));
    return true;
  }

  if (toOnHome && !fromOnHome) {
    sessionStorage.setItem('skipLoading', 'true');
  }

  if (targetSection) {
    pendingSectionTarget = targetSection;
    pendingHomeReturn = null;
  } else if (toOnHome && restoreHomeSection) {
    const saved = readHomeReturnSnapshot(window.history.state);
    const fallbackInferred = inferHomeSectionFromPathname(fromUrl.pathname);
    pendingHomeReturn = saved || (fallbackInferred ? { section: fallbackInferred } : null);
    pendingSectionTarget = null;
  } else {
    pendingSectionTarget = null;
    pendingHomeReturn = null;
  }

  const previous = window.history.state || {};
  const state = replace
    ? {
        ...previous,
        [PREVIOUS_ROUTE]: previous[PREVIOUS_ROUTE] || null,
        homeReturn: previous.homeReturn || homeSnapshot || null,
      }
    : {
        [PREVIOUS_ROUTE]: from,
        homeReturn: homeSnapshot || previous.homeReturn || null,
      };
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
  const currentPathname = window.location.pathname;
  const fallbackUrl = new URL(fallback, window.location.href);
  const fallbackSection =
    (isHomePath(fallbackUrl.pathname) && fallbackUrl.hash
      ? decodeURIComponent(fallbackUrl.hash.slice(1))
      : null) || inferHomeSectionFromPathname(currentPathname);

  if (window.history.state?.[PREVIOUS_ROUTE]) {
    const prevRouteUrl = new URL(window.history.state[PREVIOUS_ROUTE], window.location.origin);
    if (isHomePath(prevRouteUrl.pathname)) {
      const saved = readHomeReturnSnapshot(window.history.state);
      pendingHomeReturn =
        (saved?.section && saved.section !== 'home' ? saved : null) ||
        (fallbackSection ? { section: fallbackSection, scrollY: saved?.scrollY || 0 } : saved);
    }
    window.history.back();
    return;
  }
  // A full document visit from another same-origin page can use its referrer.
  try {
    const referrer = document.referrer && new URL(document.referrer);
    if (referrer && referrer.origin === window.location.origin &&
        isPublicRoute(referrer.pathname) &&
        referrer.href !== window.location.href) {
      const refOnHome = isHomePath(referrer.pathname);
      const saved = readHomeReturnSnapshot(window.history.state);
      navigate(referrer.pathname + referrer.search, {
        replace: true,
        restoreHomeSection: refOnHome,
        section: refOnHome && (!saved || saved.section === 'home') ? fallbackSection : null,
      });
      return;
    }
  } catch { /* Missing or invalid referrer: use the fallback. */ }

  const fallbackOnHome = isHomePath(fallbackUrl.pathname);
  const savedHome = fallbackOnHome ? readHomeReturnSnapshot(window.history.state) : null;
  navigate(fallbackOnHome ? '/' : fallback, {
    replace: true,
    restoreHomeSection: Boolean(savedHome && savedHome.section !== 'home'),
    section: (!savedHome || savedHome.section === 'home') ? fallbackSection : null,
  });
}

export function listenForNavigation(onNavigate) {
  let previousPathname = window.location.pathname;
  const previousRestoration = window.history.scrollRestoration;
  window.history.scrollRestoration = 'manual';

  // Continuously keep the active homepage section updated in sessionStorage while browsing Home.
  let scrollTrackFrame = 0;
  const handleHomeScrollTrack = () => {
    if (scrollTrackFrame || !isHomePath(window.location.pathname)) return;
    scrollTrackFrame = window.requestAnimationFrame(() => {
      scrollTrackFrame = 0;
      if (isHomePath(window.location.pathname) && !scrollLocks.size) {
        saveHomeReturnSnapshot();
      }
    });
  };

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
    navigate(url.href, { clickedTarget: anchor });
  };

  const handleNavigation = (event) => {
    previousPathname = window.location.pathname;
    onNavigate(event.detail?.type || 'push');
  };
  const handlePopState = (event) => {
    const currentPathname = window.location.pathname;
    const sameDocumentPath =
      currentPathname === previousPathname ||
      (isHomePath(currentPathname) && isHomePath(previousPathname));
    if (isHomePath(currentPathname) && !isHomePath(previousPathname)) {
      sessionStorage.setItem('skipLoading', 'true');
      const inferredFromPrevious = inferHomeSectionFromPathname(previousPathname);
      if (!pendingHomeReturn && !pendingSectionTarget) {
        const saved = readHomeReturnSnapshot(event.state);
        pendingHomeReturn =
          (saved?.section && saved.section !== 'home' ? saved : null) ||
          (inferredFromPrevious ? { section: inferredFromPrevious, scrollY: saved?.scrollY || 0 } : saved);
      }
      if (window.location.hash) {
        window.history.replaceState(event.state, '', window.location.pathname + window.location.search);
      }
    }
    if (!sameDocumentPath) {
      scrollToPageTop({ smooth: false, force: true });
    }
    previousPathname = currentPathname;
    onNavigate(sameDocumentPath ? 'same' : 'pop');
  };

  window.addEventListener('scroll', handleHomeScrollTrack, { passive: true });
  document.addEventListener('click', handleClick);
  window.addEventListener(NAVIGATION_EVENT, handleNavigation);
  window.addEventListener('popstate', handlePopState);
  return () => {
    if (scrollTrackFrame) window.cancelAnimationFrame(scrollTrackFrame);
    window.removeEventListener('scroll', handleHomeScrollTrack);
    document.removeEventListener('click', handleClick);
    window.removeEventListener(NAVIGATION_EVENT, handleNavigation);
    window.removeEventListener('popstate', handlePopState);
    window.history.scrollRestoration = previousRestoration;
  };
}
