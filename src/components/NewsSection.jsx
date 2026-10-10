import React, { useEffect, useRef, useState } from 'react';

const dummyPosts = [
  {
    id: 1,
    category: 'Announcements',
    title: 'G.D. Sarath Bandu Gunasekara Appointed As Principal',
    excerpt: 'We are proud to announce the appointment of G.D. Sarath Bandu Gunasekara as the new Principal of Bandaranayake College, Gampaha.',
    date: 'April 28, 2025',
    image: 'https://i.ibb.co/C5GVQgsr/Image-jpg.jpg',
    tag: 'Leadership',
  },
  {
    id: 2,
    category: 'News',
    title: 'Annual Prize Giving Ceremony 2024 — A Night to Remember',
    excerpt: 'The annual Prize Giving Ceremony celebrated academic excellence, sporting achievements, and cultural contributions of our students.',
    date: 'March 15, 2025',
    image: 'https://i.ibb.co/C5GVQgsr/Image-jpg.jpg',
    tag: 'Events',
  },
  {
    id: 3,
    category: 'News',
    title: 'BCG Wins Provincial Schools Football Championship',
    excerpt: 'Our football team has brought glory to the college by winning the Western Province Schools Football Championship for the third consecutive year.',
    date: 'February 10, 2025',
    image: 'https://i.ibb.co/C5GVQgsr/Image-jpg.jpg',
    tag: 'Sports',
  },
];

const NewsSection = () => {
  const sectionRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const filters = ['All', 'Announcements', 'News'];
  const filtered =
    activeFilter === 'All'
      ? dummyPosts
      : dummyPosts.filter((p) => p.category === activeFilter);

  return (
    <section
      id="news"
      ref={sectionRef}
      style={{
        padding: '100px 0',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #120303 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(circle at 80% 50%, rgba(123,28,28,0.08) 0%, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 24px' }}>
        {/* Layout: left heading + filters , right cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2.5fr',
            gap: '60px',
            alignItems: 'flex-start',
          }}
        >
          {/* Left: Title + Filters */}
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-30px)',
              transition: 'all 0.8s ease',
              position: 'sticky',
              top: '120px',
            }}
          >
            <div
              style={{
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.7rem',
                letterSpacing: '0.35em',
                color: '#C9A84C',
                textTransform: 'uppercase',
                marginBottom: '14px',
              }}
            >
              Nayakenz
            </div>
            <h2
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1.1,
                marginBottom: '20px',
                letterSpacing: '0.02em',
              }}
            >
              LATEST
              <br />
              UPDATES
            </h2>

            <div
              style={{
                width: '48px',
                height: '2px',
                background: '#7B1C1C',
                marginBottom: '36px',
              }}
            />

            {/* Filter buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '50px',
                    border: activeFilter === f ? 'none' : '1px solid rgba(255,255,255,0.15)',
                    background:
                      activeFilter === f
                        ? 'linear-gradient(135deg, #7B1C1C, #a02020)'
                        : 'transparent',
                    color: activeFilter === f ? '#fff' : 'rgba(255,255,255,0.6)',
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '0.85rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'left',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {filtered.map((post, i) => (
              <div
                key={post.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.6fr',
                  gap: '0',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#111111',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.35s ease',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(30px)',
                  transitionDelay: `${i * 0.12}s`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(123,28,28,0.5)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(123,28,28,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Image */}
                <div
                  style={{
                    height: '200px',
                    backgroundImage: `url(${post.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(90deg, transparent 60%, #111111)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: '#7B1C1C',
                      color: '#fff',
                      fontFamily: 'Oswald, sans-serif',
                      fontSize: '0.6rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: '4px',
                    }}
                  >
                    {post.tag}
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '28px 28px 28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div
                    style={{
                      fontFamily: 'Oswald, sans-serif',
                      fontSize: '0.65rem',
                      letterSpacing: '0.25em',
                      color: '#C9A84C',
                      textTransform: 'uppercase',
                      marginBottom: '10px',
                    }}
                  >
                    {post.category} · {post.date}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'Cinzel, serif',
                      fontSize: 'clamp(0.95rem, 1.8vw, 1.2rem)',
                      fontWeight: 700,
                      color: '#fff',
                      lineHeight: 1.4,
                      marginBottom: '12px',
                    }}
                  >
                    {post.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'EB Garamond, serif',
                      fontSize: '0.95rem',
                      color: 'rgba(255,255,255,0.45)',
                      lineHeight: 1.7,
                      marginBottom: '16px',
                    }}
                  >
                    {post.excerpt}
                  </p>
                  <span
                    style={{
                      fontFamily: 'Oswald, sans-serif',
                      fontSize: '0.75rem',
                      letterSpacing: '0.2em',
                      color: '#C9A84C',
                      textTransform: 'uppercase',
                    }}
                  >
                    Read More →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
