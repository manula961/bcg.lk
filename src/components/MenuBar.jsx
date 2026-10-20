import React, { useState, useEffect, useRef } from 'react';
import './MenuBar.css';

const menuItems = [
  { label: 'Home', href: 'home', sub: 'Welcome to BCG' },
  { label: 'News', href: 'news', sub: 'Latest Updates & Announcements' },
  { label: 'Events', href: 'events', sub: 'Upcoming Events Calendar' },
  { label: 'Explore', href: 'explore', sub: 'Discover Our Campus' },
  { label: 'Explore More', href: 'NayakenzPride', sub: 'Life As A Nayaken' },
];

const MenuBar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 80);
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
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
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

    if (item.isRoute) {
      window.location.assign(item.href);
      return;
    }

    const isHomePage = window.location.pathname === '/' || window.location.pathname === '';
    if (isHomePage) {
      setTimeout(() => {
        const el = document.getElementById(item.href);
        if (el) {
          el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
        if (window.history.pushState) {
          window.history.pushState(null, '', window.location.pathname);
        }
      }, 300);
    } else {
      sessionStorage.setItem('skipLoading', 'true');
      sessionStorage.setItem('scrollToSection', item.href);
      window.location.assign('/');
    }
  };

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        aria-controls="site-navigation-panel"
        onClick={() => setOpen(!open)}
        aria-label="Toggle Navigation Menu"
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
        className={`menu-overlay ${open ? 'is-open' : ''}`}>
        <div className="menu-container">
          <nav className="menu-nav-list" aria-label="Main Navigation">
            {menuItems.map((item, i) => (
              <button
                type="button"
                key={item.label}
                onClick={() => handleNav(item)}
                className="menu-nav-item"
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