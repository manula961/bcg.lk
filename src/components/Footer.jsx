import React from 'react';

const Footer = () => {
  return (
    <footer
      style={{
        background: 'linear-gradient(180deg, #0a0a0a 0%, #060202 100%)',
        borderTop: '1px solid rgba(123,28,28,0.3)',
        padding: '0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '3px',
          background: 'linear-gradient(90deg, #7B1C1C, #C9A84C, #1a3a6b, #C9A84C, #7B1C1C)',
        }}
      />
      <div className="section-container" style={{ paddingTop: '64px', paddingBottom: '40px' }}>
        {/* Top section */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
            gap: '48px',
            marginBottom: '56px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <img
                src="https://i.ibb.co/Wv1bGqbs/images.jpg"
                alt="BCG Logo"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(201,168,76,0.4)',
                }}
              />
              <div>
                <div
                  style={{
                    fontFamily: 'Cinzel, serif',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#fff',
                    lineHeight: 1.2,
                  }}
                >
                  Bandaranayake College
                </div>
                <div
                  style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '0.65rem',
                    letterSpacing: '0.3em',
                    color: '#C9A84C',
                    textTransform: 'uppercase',
                  }}
                >
                  Gampaha
                </div>
              </div>
            </div>
            <p
              style={{
                fontFamily: 'EB Garamond, serif',
                fontSize: '0.95rem',
                color: 'rgba(255,255,255,0.4)',
                lineHeight: 1.8,
                fontStyle: 'italic',
                marginBottom: '20px',
              }}
            >
              Nurturing young minds since 1918. A legacy of academic brilliance, sportsmanship, and cultural harmony in the heart of Gampaha.
            </p>
            {/* Social icons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {['f', 'in', 'yt'].map((social, i) => (
                <a
                  key={i}
                  href="#"
                  style={{
                    width: '36px',
                    height: '36px',
                    border: '1px solid rgba(201,168,76,0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(201,168,76,0.5)',
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#C9A84C';
                    e.currentTarget.style.color = '#C9A84C';
                    e.currentTarget.style.background = 'rgba(201,168,76,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)';
                    e.currentTarget.style.color = 'rgba(201,168,76,0.5)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {social}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '0.08em',
                marginBottom: '20px',
              }}
            >
              Navigate
            </h4>
            {['Home', 'Explore', 'Academics', 'Extra Curricular', 'News'].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(' ', '')}`}
                style={{
                  display: 'block',
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '0.8rem',
                  letterSpacing: '0.12em',
                  color: 'rgba(255,255,255,0.35)',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                  transition: 'color 0.3s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A84C'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
              >
                {link}
              </a>
            ))}
          </div>

          {/* Academics */}
          <div>
            <h4
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '0.08em',
                marginBottom: '20px',
              }}
            >
              Academics
            </h4>
            {['Primary Section', 'Middle School', 'O/L Classes', 'A/L Classes', 'Science Stream', 'Arts Stream'].map((item) => (
              <a
                key={item}
                href="#"
                style={{
                  display: 'block',
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '0.8rem',
                  letterSpacing: '0.12em',
                  color: 'rgba(255,255,255,0.35)',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                  transition: 'color 0.3s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A84C'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '0.08em',
                marginBottom: '20px',
              }}
            >
              Contact Us
            </h4>
            {[
              { icon: '📍', text: 'Bandaranayake College, Gampaha, Sri Lanka' },
              { icon: '📞', text: '+94 33 222 2XXX' },
              { icon: '✉️', text: 'info@bcg.lk' },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '10px',
                  marginBottom: '16px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: '0.9rem', marginTop: '2px' }}>{item.icon}</span>
                <span
                  style={{
                    fontFamily: 'EB Garamond, serif',
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.4)',
                    lineHeight: 1.5,
                  }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div
            style={{
              fontFamily: 'Oswald, sans-serif',
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.2)',
              textTransform: 'uppercase',
            }}
          >
            © 2025 Bandaranayake College, Gampaha. All Rights Reserved.
          </div>
          <div
            style={{
              fontFamily: 'EB Garamond, serif',
              fontSize: '0.8rem',
              color: 'rgba(201,168,76,0.35)',
              fontStyle: 'italic',
            }}
          >
            bcg.lk • Excellence Since 1918
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;