import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { scrollToPageTop, NAVIGATION_EVENT } from '../navigation/clientNavigation.js';
import './BackToTop.css';

export default function BackToTop() {
  const buttonRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const getScrollY = () =>
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const top = getScrollY();
      const distance = Math.max(0, root.scrollHeight - window.innerHeight);
      const progress = distance ? Math.min(1, Math.max(0, top / distance)) : 0;
      buttonRef.current?.style.setProperty('--top-progress', progress);
      setVisible(top > 260);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('popstate', schedule);
    window.addEventListener(NAVIGATION_EVENT, schedule);
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(schedule) : null;
    observer?.observe(document.documentElement);
    observer?.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('popstate', schedule);
      window.removeEventListener(NAVIGATION_EVENT, schedule);
    };
  }, []);

  const handleBackToTop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    scrollToPageTop({ smooth: true, force: true });
    const heading = document.querySelector('main h1') || document.querySelector('main');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  };

  return createPortal(
    <button
      ref={buttonRef}
      type="button"
      className={`site-back-top${visible ? ' is-visible' : ''}`}
      onClick={handleBackToTop}
      aria-label="Back to top"
      title="Back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <svg className="site-back-top__ring" viewBox="0 0 48 48" aria-hidden="true">
        <circle className="site-back-top__track" cx="24" cy="24" r="22" />
        <circle className="site-back-top__progress" cx="24" cy="24" r="22" pathLength="100" />
      </svg>
      <span className="site-back-top__content">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true">
          <path d="m6 11 6-6 6 6M12 5v14" />
        </svg>
        <span>TOP</span>
      </span>
    </button>,
    document.body
  );
}
