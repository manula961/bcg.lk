import React, { useState, useEffect } from 'react';

const menuItems = [
  { label: 'Home', href: '#home', sub: 'Welcome to BCG' },
  { label: 'Explore', href: '#explore', sub: 'Discover Our Campus' },
  { label: 'Academics', href: '#academics', sub: 'Excellence in Education' },
  { label: 'Extra Curricular', href: '#extracurricular', sub: 'Beyond the Classroom' },
  { label: 'News', href: '#news', sub: 'Latest Updates' },
];

const MenuBar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNav = (href) => {
    setOpen(false);
    setTimeout(() => {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 400);
  };

  return (
    <>
      {/* Hamburger Menu */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
        style={{
          position: 'fixed',
          top: '24px',
          right: '28px',
          zIndex: 1000,
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: open
            ? 'transparent'
            : scrolled
            ? 'rgba(123,28,28,0.9)'
            : 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(12px)',
          border: `1.5px solid ${open ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.3)'}`,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          transition: 'all 0.35s ease',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: 'block',
              width: '22px',
              height: '1.8px',
              background: '#C9A84C',
              borderRadius: '2px',
              transition: 'all 0.35s ease',
              transformOrigin: 'center',
              transform: open
                ? i === 0
                  ? 'translateY(6.8px) rotate(45deg)'
                  : i === 2
                  ? 'translateY(-6.8px) rotate(-45deg)'
                  : 'scaleX(0)'
                : 'none',
              opacity: open && i === 1 ? 0 : 1,
            }}
          />
        ))}
      </button>

      {/* Full Screen Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 900,
          background: 'rgba(10,5,5,0.97)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: open ? 1 : 0,
          visibility: open ? 'visible' : 'hidden',
          transition: 'opacity 0.4s ease, visibility 0.4s ease',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(123,28,28,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '5%',
            right: '5%',
            opacity: 0.04,
            fontSize: '14rem',
            fontFamily: 'Cinzel, serif',
            fontWeight: 900,
            color: '#fff',
            userSelect: 'none',
          }}
        >
          BCG
        </div>

        {/* Menu Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            padding: '20px',
            maxWidth: '1100px',
            width: '90%',
          }}
        >
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => handleNav(item.href)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: '16px',
                padding: '36px 28px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                opacity: open ? 1 : 0,
                transform: open ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: `${i * 0.07 + 0.1}s`,
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(123,28,28,0.25)';
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '0.75rem',
                  letterSpacing: '0.25em',
                  color: '#C9A84C',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                }}
              >
                0{i + 1}
              </div>
              <div
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: '8px',
                  lineHeight: 1.2,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontFamily: 'EB Garamond, serif',
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.4)',
                  fontStyle: 'italic',
                }}
              >
                {item.sub}
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  color: 'rgba(201,168,76,0.3)',
                  fontSize: '1.2rem',
                }}
              >
                →
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default MenuBar;
