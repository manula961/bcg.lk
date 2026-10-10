import React, { useEffect, useRef, useState } from 'react';

const events = [
  {
    id: 1,
    month: 'JUN',
    day: '14',
    title: 'Annual Sports Meet 2025',
    desc: 'The inter-house sports competition bringing together athletes from all grades in track, field, and team events.',
    location: 'BCG Sports Grounds',
    color: '#7B1C1C',
  },
  {
    id: 2,
    month: 'JUL',
    day: '02',
    title: 'Prize Giving Ceremony 2025',
    desc: 'Celebrating academic, sporting, and cultural achievements of our outstanding students and staff.',
    location: 'Main Hall, BCG',
    color: '#1a3a6b',
  },
  {
    id: 3,
    month: 'AUG',
    day: '19',
    title: 'Founders Day Celebrations',
    desc: 'Commemorating 107 years of excellence with a cultural showcase, alumni reunion, and ceremonial events.',
    location: 'Bandaranayake College',
    color: '#7B1C1C',
  },
  {
    id: 4,
    month: 'SEP',
    day: '05',
    title: 'Inter-School Debate Championship',
    desc: 'BCG hosts the annual Western Province Inter-School Debate Championship in Sinhala and English.',
    location: 'Main Auditorium',
    color: '#1a3a6b',
  },
];

const EventsSection = () => {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="events"
      ref={sectionRef}
      style={{
        padding: '100px 0',
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '35%',
          height: '100%',
          background: 'linear-gradient(135deg, #f5f0e8 0%, #ede5d0 100%)',
          clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '-2%',
          top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: 'Cinzel, serif',
          fontSize: '16rem',
          fontWeight: 900,
          color: 'rgba(123,28,28,0.04)',
          userSelect: 'none',
          pointerEvents: 'none',
          lineHeight: 1,
        }}
      >
        1918
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div
          style={{
            marginBottom: '64px',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.8s ease',
          }}
        >
          <div
            style={{
              fontFamily: 'Oswald, sans-serif',
              fontSize: '0.7rem',
              letterSpacing: '0.4em',
              color: '#7B1C1C',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            Mark Your Calendar
          </div>
          <h2
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 900,
              color: '#1a1a1a',
              lineHeight: 1.1,
              letterSpacing: '0.03em',
            }}
          >
            LATEST EVENTS
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginTop: '16px',
            }}
          >
            <div style={{ width: '60px', height: '3px', background: '#7B1C1C' }} />
            <div style={{ width: '10px', height: '3px', background: '#1a3a6b' }} />
          </div>
        </div>

        {/* Events list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {events.map((event, i) => (
            <div
              key={event.id}
              onMouseEnter={() => setHovered(event.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr auto',
                gap: '32px',
                alignItems: 'center',
                padding: '32px 0',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                cursor: 'pointer',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-40px)',
                transition: `all 0.7s ease ${i * 0.1}s`,
                position: 'relative',
              }}
            >
              {/* Hover bg */}
              <div
                style={{
                  position: 'absolute',
                  inset: '0 -24px',
                  background: hovered === event.id ? 'rgba(123,28,28,0.04)' : 'transparent',
                  transition: 'background 0.3s ease',
                  borderRadius: '8px',
                }}
              />

              {/* Date block */}
              <div
                style={{
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '0.7rem',
                    letterSpacing: '0.3em',
                    color: event.color,
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                    opacity: 0.8,
                  }}
                >
                  {event.month}
                </div>
                <div
                  style={{
                    fontFamily: 'Cinzel, serif',
                    fontSize: '3rem',
                    fontWeight: 900,
                    color: hovered === event.id ? event.color : '#1a1a1a',
                    lineHeight: 1,
                    transition: 'color 0.3s ease',
                  }}
                >
                  {event.day}
                </div>
              </div>

              {/* Content */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h3
                  style={{
                    fontFamily: 'Cinzel, serif',
                    fontSize: 'clamp(1rem, 2vw, 1.4rem)',
                    fontWeight: 700,
                    color: '#1a1a1a',
                    marginBottom: '8px',
                    letterSpacing: '0.02em',
                  }}
                >
                  {event.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'EB Garamond, serif',
                    fontSize: '1rem',
                    color: 'rgba(0,0,0,0.55)',
                    lineHeight: 1.7,
                    marginBottom: '8px',
                  }}
                >
                  {event.desc}
                </p>
                <div
                  style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '0.7rem',
                    letterSpacing: '0.15em',
                    color: event.color,
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>📍</span> {event.location}
                </div>
              </div>

              {/* Arrow */}
              <div
                style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '1.5rem',
                  color: hovered === event.id ? event.color : 'rgba(0,0,0,0.2)',
                  transition: 'all 0.3s ease',
                  transform: hovered === event.id ? 'translateX(6px)' : 'translateX(0)',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                →
              </div>
            </div>
          ))}
        </div>

        {/* View all button */}
        <div
          style={{
            marginTop: '48px',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.6s',
          }}
        >
          <button
            style={{
              padding: '14px 40px',
              border: '2px solid #7B1C1C',
              borderRadius: '4px',
              background: 'transparent',
              color: '#7B1C1C',
              fontFamily: 'Oswald, sans-serif',
              fontSize: '0.85rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#7B1C1C';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#7B1C1C';
            }}
          >
            View All Events
          </button>
        </div>
      </div>
    </section>
  );
};

export default EventsSection;
