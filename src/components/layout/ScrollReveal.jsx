import { useEffect } from 'react';
import './ScrollReveal.css';

/** Reveal content instead of moving section backgrounds and containers. */
export default function ScrollReveal({ routeKey }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        typeof IntersectionObserver === 'undefined') return undefined;

    const seen = new WeakSet();
    const selector = [
      // Home: separately animate headings and content, not section backgrounds.
      '.news-header-container', '.news-grid', '.news-dots-container',
      '.events-header', '.events-grid', '.events-carousel', '.events-content-group > :not(.events-header)',
      '.explore-header', '.explore-grid',
      '.life-bento-header', '.life-bento-grid',
      '.footer-brand', '.footer-column', '.footer-bottom-bar',
      // Other public pages: animate their visible inner content only.
      'main > section:not(.hero-section):not(.news-section):not(.events-section):not(.explore-section):not(.life-bento-section) > .container',
      'main > article > :not(style):not(script)',
      'main > .updates-container > :not(style):not(script)',
      'main > .event-detail-container > :not(style):not(script)',
    ].join(', ');

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('scroll-fade-up-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.04, rootMargin: '0px 0px -2% 0px' });

    const register = () => {
      document.querySelectorAll(selector).forEach((el) => {
        if (seen.has(el) || el.closest('[role="dialog"], .news-modal-overlay, .hero-section, #admin-root')) return;
        seen.add(el);
        const box = el.getBoundingClientRect();
        // Do not animate already-visible content or elements above the viewport.
        if (box.top < window.innerHeight * 0.94) {
          el.classList.add('scroll-fade-up-visible');
        } else {
          el.classList.add('scroll-fade-up');
          observer.observe(el);
        }
      });
    };

    register();
    const mutations = new MutationObserver(register);
    mutations.observe(document.getElementById('root') || document.body, {
      childList: true, subtree: true,
    });

    return () => {
      mutations.disconnect();
      observer.disconnect();
    };
  }, [routeKey]);

  return null;
}
