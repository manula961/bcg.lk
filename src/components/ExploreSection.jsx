import React, { useEffect, useRef, useState } from 'react';

const places = [
  {
    id: 1,
    title: 'The Main Building',
    subtitle: 'Heritage Architecture',
    desc: 'Built in the colonial era, the main building stands as a testament to the rich history and heritage of Bandaranayake College, Gampaha.',
    image: 'https://i.ibb.co/C5GVQgsr/Image-jpg.jpg',
    tag: '1918',
  },
  {
    id: 2,
    title: 'Sports Grounds',
    subtitle: 'Where Champions Train',
    desc: 'World-class sporting facilities including a cricket ground, athletics track, and indoor courts that have produced provincial and national champions.',
    image: 'https://i.ibb.co/C5GVQgsr/Image-jpg.jpg',
    tag: 'Sports',
  },
  {
    id: 3,
    title: 'Library & Resource Centre',
    subtitle: 'Knowledge Hub',
    desc: 'A modern library housing thousands of books, digital resources, and quiet study spaces to support academic excellence.',
    image: 'https://i.ibb.co/C5GVQgsr/Image-jpg.jpg',
    tag: 'Academics',
  },
  {
    id: 4,
    title: 'Science Laboratories',
    subtitle: 'Innovation & Discovery',
    desc: 'Fully equipped laboratories for Biology, Chemistry, and Physics — empowering students to explore, experiment, and excel.',
    image: 'https://i.ibb.co/C5GVQgsr/Image-jpg.jpg',
    tag: 'Science',
  },
];

const ExploreSection = () => {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);

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
      id="explore"
      ref={sectionRef}
      style={{
        padding: '100px 0',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #0f0404 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 24px' }}>
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
              color: '#C9A84C',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            Discover BCG
          </div>
          <h2
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1.1,
            }}
          >
            EXPLORE THE SCHOOL
          </h2>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <div style={{ width: '50px', height: '3px', background: '#7B1C1C' }} />
            <div style={{ width: '15px', height: '3px', background: '#C9A84C' }} />
          </div>
        </div>

        {/* Main layout: tabs, display */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.6fr',
            gap: '48px',
            alignItems: 'flex-start',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.8s ease 0.3s',
          }}
        >
          {/* Left: place list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {places.map((place, i) => (
              <button
                key={place.id}
                onClick={() => setActive(i)}
                style={{
                  padding: '24px 20px',
                  background: active === i ? 'rgba(123,28,28,0.2)' : 'transparent',
                  border: 'none',
                  borderLeft: active === i ? '3px solid #7B1C1C' : '3px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s ease',
                  borderRadius: '0 8px 8px 0',
                }}
              >
                <div
                  style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '0.65rem',
                    letterSpacing: '0.25em',
                    color: active === i ? '#C9A84C' : 'rgba(201,168,76,0.35)',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                    transition: 'color 0.3s ease',
                  }}
                >
                  {place.tag}
                </div>
                <h3
                  style={{
                    fontFamily: 'Cinzel, serif',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: active === i ? '#ffffff' : 'rgba(255,255,255,0.4)',
                    transition: 'color 0.3s ease',
                    lineHeight: 1.3,
                  }}
                >
                  {place.title}
                </h3>
              </button>
            ))}
          </div>

          {/* Right: featured display */}
          <div
            style={{
              borderRadius: '16px',
              overflow: 'hidden',
              position: 'relative',
              height: '480px',
            }}
          >
            <img
              key={active}
              src={places[active].image}
              alt={places[active].title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                animation: 'fadeIn 0.5s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 50%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '32px',
              }}
            >
              <div
                style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '0.65rem',
                  letterSpacing: '0.3em',
                  color: '#C9A84C',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                {places[active].subtitle}
              </div>
              <h3
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: 'clamp(1.3rem, 3vw, 2rem)',
                  fontWeight: 700,
                  color: '#fff',
                  marginBottom: '12px',
                }}
              >
                {places[active].title}
              </h3>
              <p
                style={{
                  fontFamily: 'EB Garamond, serif',
                  fontSize: '1rem',
                  color: 'rgba(255,255,255,0.7)',
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                }}
              >
                {places[active].desc}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(1.04); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </section>
  );
};

export default ExploreSection;
