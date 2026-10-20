import React, { useState, useEffect, useRef } from 'react';
import './MenuBar.css';
import { navigate, isHomePath, NAVIGATION_EVENT } from '../../navigation/clientNavigation';

const menuItems = [
  { label: 'Home', href: 'home', sub: 'Welcome to BCG' },
  { label: 'News', href: 'news', sub: 'Latest Updates & Announcements' },
  { label: 'Events', href: 'events', sub: 'Upcoming Events Calendar' },
  { label: 'Discover', href: 'explore', sub: 'Discover Our School' },
  { label: 'Explore More', href: 'NayakenzPride', sub: 'Life As A Nayaken' },
];

const MenuBar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef(null);
  const menuRef = useRef(null);
  const [activeSection, setActiveSection] = useState(() => window.location.hash.slice(1) || 'home');

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 80);
          if (isHomePath(window.location.pathname)) {
            const visible = menuItems.reduce((last, item) => {
              const section = document.getElementById(item.href);
              return section && section.getBoundingClientRect().top <= window.innerHeight * 0.4
                ? item.href : last;
            }, 'home');
            setActiveSection(visible);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Mobile browser Back / Forward also dismisses an already open menu.
  useEffect(() => {
    const closeOnRouteChange = () => setOpen(false);
    window.addEventListener('popstate', closeOnRouteChange);
    window.addEventListener(NAVIGATION_EVENT, closeOnRouteChange);
    return () => {
      window.removeEventListener('popstate', closeOnRouteChange);
      window.removeEventListener(NAVIGATION_EVENT, closeOnRouteChange);
    };
  }, []);

  // Prevent the page behind the mobile/full-screen menu from scrolling.
  useEffect(() => {
    if (!open) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, [open]);

  // Keep keyboard focus inside the open navigation panel and restore it on close.
  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    const panel = menuRef.current;
    const elements = () => [...(panel?.querySelectorAll('button:not([disabled]), a[href]') || [])];
    elements()[0]?.focus();
    const trap = event => {
      if (event.key !== 'Tab') return;
      const focusables = elements();
      if (!focusables.length) { event.preventDefault(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      toggle?.focus();
    };
  }, [open]);

  const handleNav = (item) => {
    setOpen(false);
    setActiveSection(item.href);
    // Same navigation on every page; existing menu button markup/styles stay.
    navigate(`/#${item.href}`);
  };

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        aria-controls="site-navigation-panel"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        className={`menu-toggle-btn ${open ? 'open' : scrolled ? 'scrolled' : 'default'}`}
      >
        <span className="hamburger-line line-1" />
        <span className="hamburger-line line-2" />
        <span className="hamburger-line line-3" />
      </button>
      <div id="site-navigation-panel" ref={menuRef}
        role={open ? 'dialog' : undefined} aria-modal={open ? 'true' : undefined}
        aria-label={open ? 'Main navigation' : undefined}
        aria-hidden={!open}
        className={`menu-overlay ${open ? 'is-open' : ''}`}
        onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div className="menu-container">
          <nav className="menu-nav-list" aria-label="Main Navigation">
            {menuItems.map((item, i) => (
              <button
                type="button"
                key={item.label}
                onClick={() => handleNav(item)}
                className="menu-nav-item"
                aria-current={isHomePath(window.location.pathname) && activeSection === item.href ? 'location' : undefined}
              >
                <span className="menu-num">0{i + 1}</span>
                <div className="menu-text-wrap">
                  <span className="menu-title">{item.label}</span>
                  <span className="menu-sub">{item.sub}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default MenuBar;