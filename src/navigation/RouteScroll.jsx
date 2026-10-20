import { useEffect } from 'react';
import { isHomePath } from './clientNavigation';

const INITIAL_TITLE = document.title;

/** Scroll / focus management after a lazily loaded public route mounts. */
export default function RouteScroll({ location, navigationType, savedScroll }) {
  useEffect(() => {
    let frame = 0;
    let timer = null;
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
    const saved = navigationType === 'pop' ? savedScroll : null;

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
      const target = id && id !== 'top' && id !== 'home'
        ? document.getElementById(id)
        : null;
      if (target) {
        target.scrollIntoView({ behavior: reducedMotion || navigationType === 'pop' ? 'auto' : 'smooth', block: 'start' });
        if (navigationType !== 'initial') {
          const heading = target.querySelector('h1, h2, h3') || target;
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
        return;
      }
      if (id && id !== 'top' && id !== 'home' && frame++ < 60) {
        timer = window.setTimeout(applyScroll, 50);
        return;
      }
      if (saved && !id) {
        // Some details arrive asynchronously. Restore once the height can
        // accommodate the old position, without trapping the user indefinitely.
        const desired = saved.y;
        const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        if (desired > maxY && frame++ < 60) {
          timer = window.setTimeout(applyScroll, 50);
          return;
        }
        window.scrollTo({ left: saved.x, top: desired, behavior: 'instant' });
      } else if (navigationType !== 'initial' || id) {
        window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
      }
    };

    // Wait until the page (and homepage's optional first-visit curtain) exists.
    timer = window.setTimeout(applyScroll, 40);
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [location, navigationType, savedScroll]);

  return null;
}
