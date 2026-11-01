import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  isHomePath,
  scrollToPageTop,
  scrollPageTo,
  getPendingScrollTarget,
  clearPendingScrollTarget,
} from './clientNavigation';

const INITIAL_TITLE = document.title;

/** Scroll / focus management after a lazily loaded public route mounts. */
export default function RouteScroll({ location, navigationType }) {
  const pendingRef = useRef({ section: null, homeReturn: null });

  useLayoutEffect(() => {
    const currentPending = getPendingScrollTarget();
    if (currentPending.section || currentPending.homeReturn) {
      pendingRef.current = currentPending;
    }

    const hash = window.location.hash.slice(1);
    let hashId = '';
    try { hashId = decodeURIComponent(hash); } catch { hashId = hash; }

    // Clean any hash from the homepage URL bar while preserving section target.
    if (isHomePath(window.location.pathname) && window.location.hash) {
      if (!pendingRef.current.section && hashId) {
        pendingRef.current.section = hashId;
      }
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search
      );
    }

    const hasTarget = Boolean(
      (pendingRef.current.section &&
        pendingRef.current.section !== 'top' &&
        pendingRef.current.section !== 'home') ||
      pendingRef.current.homeReturn ||
      (hashId && hashId !== 'top' && hashId !== 'home')
    );

    // Immediately cancel any active Lenis momentum and snap to the very top when switching pages.
    if (!hasTarget && navigationType !== 'same') {
      scrollToPageTop({ smooth: false, force: true });
    }
  }, [location, navigationType]);

  useEffect(() => {
    let frame = 0;
    let timer = null;
    let settleTimer = null;
    let raf = 0;
    let raf2 = 0;
    let cancelled = false;
    const pathname = window.location.pathname;
    const onHome = isHomePath(pathname);

    if (onHome) document.title = INITIAL_TITLE;
    else if (pathname === '/events' || pathname === '/events/') {
      document.title = 'College Events | Bandaranayake College';
    }

    const hash = window.location.hash.slice(1);
    let hashId = '';
    try { hashId = decodeURIComponent(hash); } catch { hashId = hash; }

    const currentPending = getPendingScrollTarget();
    const pendingSection = currentPending.section || pendingRef.current.section;
    const homeReturn = currentPending.homeReturn || pendingRef.current.homeReturn;

    const sectionId =
      pendingSection ||
      (homeReturn?.section && homeReturn.section !== 'home' ? homeReturn.section : '') ||
      hashId;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasSectionTarget = Boolean(sectionId && sectionId !== 'top' && sectionId !== 'home');
    const isReturningHomeToSection = Boolean(onHome && (homeReturn || pendingSection));

    // Stop any user wheel/touch momentum that continues across a rapid page transition.
    let userScrolledOnNewPage = false;
    const markUserScroll = () => { userScrolledOnNewPage = true; };
    window.addEventListener('wheel', markUserScroll, { passive: true, once: true });
    window.addEventListener('touchmove', markUserScroll, { passive: true, once: true });
    window.addEventListener('keydown', markUserScroll, { passive: true, once: true });

    // Only focus new page headings after a route change. No visual styles
    // change, and focus does not move the document's scroll position.
    if (!hasSectionTarget && !isReturningHomeToSection && navigationType !== 'initial' && navigationType !== 'same') {
      const heading = document.querySelector('main h1');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }

    const applyScroll = () => {
      if (cancelled) return;
      const target = hasSectionTarget ? document.getElementById(sectionId) : null;
      if (target) {
        clearPendingScrollTarget();
        pendingRef.current = { section: null, homeReturn: null };
        // Play smooth scroll when navigating to a section or returning back to the homepage section.
        scrollPageTo(target, { smooth: !reducedMotion, force: true });
        if (navigationType !== 'initial') {
          const heading = target.querySelector('h1, h2, h3') || target;
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
        return;
      }
      if (hasSectionTarget && frame++ < 60) {
        timer = window.setTimeout(applyScroll, 50);
        return;
      }

      clearPendingScrollTarget();
      pendingRef.current = { section: null, homeReturn: null };

      // If returning to the homepage where the user was at the top ('home'), start at top.
      const smooth = navigationType === 'same' && !reducedMotion;
      scrollToPageTop({ smooth, force: !smooth });
      if (!smooth) {
        raf = window.requestAnimationFrame(() => {
          if (cancelled || userScrolledOnNewPage) return;
          scrollToPageTop({ smooth: false, force: true });
          raf2 = window.requestAnimationFrame(() => {
            if (!cancelled && !userScrolledOnNewPage) {
              scrollToPageTop({ smooth: false, force: true });
            }
          });
        });
        settleTimer = window.setTimeout(() => {
          if (!cancelled && !userScrolledOnNewPage) {
            scrollToPageTop({ smooth: false, force: true });
          }
        }, 120);
      }
    };

    if (!hasSectionTarget && navigationType !== 'same') {
      scrollToPageTop({ smooth: false, force: true });
    }
    // Wait until the page (and homepage's optional first-visit curtain) exists.
    timer = window.setTimeout(applyScroll, navigationType === 'same' ? 16 : 36);
    return () => {
      cancelled = true;
      window.removeEventListener('wheel', markUserScroll);
      window.removeEventListener('touchmove', markUserScroll);
      window.removeEventListener('keydown', markUserScroll);
      if (timer !== null) window.clearTimeout(timer);
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      if (raf) window.cancelAnimationFrame(raf);
      if (raf2) window.cancelAnimationFrame(raf2);
    };
  }, [location, navigationType]);

  return null;
}
