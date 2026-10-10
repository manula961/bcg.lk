import React, { useEffect, useRef, useState } from 'react';

const gallery = [
  { id: 1, label: 'Academics', emoji: '📚', span: 'wide', bg: '#7B1C1C' },
  { id: 2, label: 'Sports', emoji: '🏃', span: 'tall', bg: '#1a3a6b' },
  { id: 3, label: 'Arts & Culture', emoji: '🎭', span: 'normal', bg: '#5a1212' },
  { id: 4, label: 'Prefect Council', emoji: '🏅', span: 'normal', bg: '#12285a' },
  { id: 5, label: 'Community', emoji: '🤝', span: 'wide', bg: '#3d0b0b' },
];

const stats = [
  { value: '107+', label: 'Years of Excellence' },
  { value: '5000+', label: 'Students Enrolled' },
  { value: '120+', label: 'Sports Titles' },
  { value: '98%', label: 'Pass Rate' },
];

const LifeAsNayaken = () => {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

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
      id="extracurricular"
      ref={sectionRef}
      style={{
        padding: '100px 0',
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div
          style={{
            marginBottom: '64px',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.8s ease',
            textAlign: 'center',
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
            Experience It
          </div>
          <h2
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 900,
              color: '#1a1a1a',
              lineHeight: 1.1,
              marginBottom: '16px',
            }}
          >
            LIFE AS A NAYAKEN
          </h2>
          <p
            style={{
              fontFamily: 'EB Garamond, serif',
              fontSize: '1.15rem',
              color: 'rgba(0,0,0,0.55)',
              lineHeight: 1.8,
              fontStyle: 'italic',
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            Every day at Bandaranayake College is a new chapter — shaped by learning, sport, art, and the unbreakable bond of brotherhood.
          </p>
        </div>

        {/* Bento grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, 220px)',
            gap: '16px',
            marginBottom: '80px',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.8s ease 0.3s',
          }}
        >
          {/* Card 1 — wide */}
          <div
            style={{
              gridColumn: '1 / 3',
              borderRadius: '16px',
              background: `linear-gradient(135deg, #7B1C1C, #a02020)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '28px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(0.99)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <div style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '4rem', opacity: 0.15 }}>📚</div>
            <div
              style={{
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.65rem',
                letterSpacing: '0.3em',
                color: 'rgba(255,255,255,0.6)',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              The Nayaken Way
            </div>
            <h3
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '1.6rem',
                fontWeight: 700,
                color: '#fff',
              }}
            >
              Academic Excellence
            </h3>
            <p style={{ fontFamily: 'EB Garamond, serif', color: 'rgba(255,255,255,0.6)', marginTop: '6px', fontStyle: 'italic' }}>
              Guided by dedicated teachers, our students consistently achieve at the highest levels.
            </p>
          </div>

          {/* Card 2 — tall */}
          <div
            style={{
              gridColumn: '3',
              gridRow: '1 / 3',
              borderRadius: '16px',
              background: `linear-gradient(180deg, #1a3a6b, #2a5298)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '28px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(0.99)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', fontSize: '5rem', opacity: 0.12 }}>🏆</div>
            <div
              style={{
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.65rem',
                letterSpacing: '0.3em',
                color: 'rgba(255,255,255,0.6)',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Champions
            </div>
            <h3
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '1.4rem',
                fontWeight: 700,
                color: '#fff',
                marginBottom: '8px',
              }}
            >
              Sports & Athletics
            </h3>
            <p style={{ fontFamily: 'EB Garamond, serif', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', fontSize: '0.95rem', lineHeight: 1.6 }}>
              From cricket to athletics, our athletes carry the BCG spirit with pride at every competition.
            </p>
          </div>

          {/* Card 3 */}
          <div
            style={{
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #3d0b0b, #5a1212)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
            }}
          >
            <div style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '2.5rem', opacity: 0.15 }}>🎭</div>
            <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Arts & Culture
            </h3>
            <p style={{ fontFamily: 'EB Garamond, serif', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', fontSize: '0.85rem', marginTop: '4px' }}>
              Drama, dance, and music performances
            </p>
          </div>

          {/* Card 4 */}
          <div
            style={{
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #12285a, #1a3a6b)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
            }}
          >
            <div style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '2.5rem', opacity: 0.15 }}>🤝</div>
            <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Prefect Council
            </h3>
            <p style={{ fontFamily: 'EB Garamond, serif', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', fontSize: '0.85rem', marginTop: '4px' }}>
              Leadership, service, and brotherhood
            </p>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.8s ease 0.5s',
          }}
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              style={{
                textAlign: 'center',
                padding: '32px 16px',
                borderTop: '2px solid',
                borderColor: i % 2 === 0 ? '#7B1C1C' : '#1a3a6b',
              }}
            >
              <div
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  fontWeight: 900,
                  color: i % 2 === 0 ? '#7B1C1C' : '#1a3a6b',
                  lineHeight: 1,
                  marginBottom: '8px',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '0.75rem',
                  letterSpacing: '0.2em',
                  color: 'rgba(0,0,0,0.5)',
                  textTransform: 'uppercase',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LifeAsNayaken;
