import React, { useState, useEffect } from 'react';
import './MenuBar.css';

const menuItems = [
  { label: 'Home', href: 'home', sub: 'Welcome to BCG' },
  { label: 'News', href: 'news', sub: 'Latest Updates & Announcements' },
  { label: 'Events', href: 'events', sub: 'Upcoming Events Calendar' },
  { label: 'Explore', href: 'explore', sub: 'Discover Our Campus' },
  { label: 'Nayakenz Pride', href: 'nayakenzpride', sub: 'Life As A Nayaken' },
];

const MenuBar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
          el.scrollIntoView({ behavior: 'smooth' });
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
        onClick={() => setOpen(!open)}
        aria-label="Toggle Navigation Menu"
        aria-expanded={open}
        className={`menu-toggle-btn ${open ? 'open' : scrolled ? 'scrolled' : 'default'}`}
      >
        <span className="hamburger-line line-1" />
        <span className="hamburger-line line-2" />
        <span className="hamburger-line line-3" />
      </button>
      <div className={`menu-overlay ${open ? 'is-open' : ''}`}>
        <div className="menu-container">
          <nav className="menu-nav-list" aria-label="Main Navigation">
            {menuItems.map((item, i) => (
              <button
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