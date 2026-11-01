import { useEffect, useLayoutEffect } from 'react';
import { isHomePath, scrollToPageTop, scrollPageTo } from './clientNavigation';

const INITIAL_TITLE = document.title;

/** Scroll / focus management after a lazily loaded public route mounts. */
export default function RouteScroll({ location, navigationType }) {
  useLayoutEffect(() => {
    const hash = window.location.hash.slice(1);
    let id = '';
    try { id = decodeURIComponent(hash); } catch { id = hash; }
    const hasSectionTarget = Boolean(id && id !== 'top' && id !== 'home');

    // Immediately cancel any active Lenis momentum and snap to the very top when switching pages.
    if (!hasSectionTarget && navigationType !== 'same') {
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
    if (isHomePath(pathname)) document.title = INITIAL_TITLE;
    else if (pathname === '/events' || pathname === '/events/') {
      document.title = 'College Events | Bandaranayake College';
    }

    const hash = window.location.hash.slice(1);
    let id = '';
    try { id = decodeURIComponent(hash); } catch { id = hash; }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasSectionTarget = Boolean(id && id !== 'top' && id !== 'home');

    // Stop any user wheel/touch momentum that continues across a rapid page transition.
    let userScrolledOnNewPage = false;
    const markUserScroll = () => { userScrolledOnNewPage = true; };
    window.addEventListener('wheel', markUserScroll, { passive: true, once: true });
    window.addEventListener('touchmove', markUserScroll, { passive: true, once: true });
    window.addEventListener('keydown', markUserScroll, { passive: true, once: true });

    // Only focus new page headings after a route change. No visual styles
    // change, and focus does not move the document's scroll position.
    if (!id && navigationType !== 'initial' && navigationType !== 'same') {
      const heading = document.querySelector('main h1');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }

    const applyScroll = () => {
      if (cancelled) return;
      const target = hasSectionTarget ? document.getElementById(id) : null;
      if (target) {
        scrollPageTo(target, { smooth: !reducedMotion && navigationType !== 'pop' });
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
      // Every page transition (including browser Back/Forward) starts at top.
      // Same-page Home/top navigation plays Lenis smooth scroll.
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
    timer = window.setTimeout(applyScroll, navigationType === 'same' ? 16 : 32);
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
