import React, { useState, useEffect } from 'react';
import './MenuBar.css';

const menuItems = [
  { label: 'home', href: '#home', sub: 'Welcome to BCG' },
  { label: 'news', href: '#news', sub: 'Latest Updates & Events' },
  { label: 'academics', href: '#academics', sub: 'Excellence in Education' },
  { label: 'explore', href: '#explore', sub: 'Discover Our School' },
  { label: 'extra curricular', href: '#extracurricular', sub: 'Beyond the Classroom' },
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

  const handleNav = (href) => {
    setOpen(false);
    setTimeout(() => {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  return (
    <>
      {/* Menu Button */}
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

      {/* Clean Fullscreen Overlay */}
      <div className={`menu-overlay ${open ? 'is-open' : ''}`}>
        <div className="menu-container">
          <nav className="menu-nav-list" aria-label="Main Navigation">
            {menuItems.map((item, i) => (
              <button
                key={item.label}
                onClick={() => handleNav(item.href)}
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