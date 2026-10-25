import React, { useEffect, useRef, useState } from 'react';
import './ExploreSection.css';

const places = [
  {
    id: 1,
    title: 'The Main Building',
    subtitle: 'Heritage Architecture',
    desc: 'Built in the colonial era, the main building stands as a testament to the rich history and heritage of Bandaranayake College, Gampaha.',
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=85',
    tag: '1918',
  },
  {
    id: 2,
    title: 'Sports Grounds',
    subtitle: 'Where Champions Train',
    desc: 'World-class sporting facilities including a cricket ground, athletics track, and indoor courts that have produced provincial and national champions.',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=85',
    tag: 'Sports',
  },
  {
    id: 3,
    title: 'Library & Resource Centre',
    subtitle: 'Knowledge Hub',
    desc: 'A modern library housing thousands of books, digital resources, and quiet study spaces to support academic excellence.',
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200&q=85',
    tag: 'Academics',
  },
  {
    id: 4,
    title: 'Science Laboratories',
    subtitle: 'Innovation & Discovery',
    desc: 'Fully equipped laboratories for Biology, Chemistry, and Physics empowering students to explore, experiment, and excel.',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&q=85',
    tag: 'Science',
  },
];

const ExploreSection = () => {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.05, rootMargin: '0px 0px -10% 0px' }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!visible || reducedMotion) return;
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % places.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [visible, reducedMotion]);

  return (
    <section
      id="explore"
      ref={sectionRef}
      className="explore-section"
    >
      <div className="section-container">
        <div className={`explore-content-group ${visible ? 'visible' : ''}`}>
          <div className="explore-header">
            <div className="explore-subtitle">Discover BCG</div>
            <h2 className="explore-title">Explore The School</h2>
            <div className="explore-divider-wrap">
              <div className="explore-divider-maroon" />
              <div className="explore-divider-blue" />
            </div>
          </div>

          <div className="explore-grid">
            {/* Tabs List */}
            <div className="explore-tabs-list" role="tablist" aria-label="Campus Locations">
              {places.map((place, i) => (
                <div key={place.id} className="explore-tab-wrapper">
                  <button
                    type="button"
                    role="tab"
                    tabIndex={active === i ? 0 : -1}
                    onKeyDown={event => {
                      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                      event.preventDefault();
                      const next = event.key === 'Home' ? 0
                        : event.key === 'End' ? places.length - 1
                        : (i + (event.key === 'ArrowRight' ? 1 : -1) + places.length) % places.length;
                      setActive(next);
                      document.getElementById('place-tab-' + places[next].id)?.focus();
                    }}
                    aria-selected={active === i}
                    aria-controls={`place-panel-${place.id}`}
                    id={`place-tab-${place.id}`}
                    onClick={() => setActive(i)}
                    className={`explore-tab-btn ${active === i ? 'active' : ''}`}
                  >
                    <div className="explore-tab-tag">{place.tag}</div>
                    <h3 className="explore-tab-title">{place.title}</h3>
                  </button>

                  {/* Accordion content visible on mobile screens only */}
                  {active === i && (
                    <div className="explore-accordion-content">
                      <div className="explore-display-card">
                        <img
                          src={place.image}
                          alt={place.title}
                          className="explore-display-img"
                        />
                        <div className="explore-display-overlay" />
                        <div className="explore-display-content">
                          <div className="explore-display-subtitle">{place.subtitle}</div>
                          <h3 className="explore-display-title">{place.title}</h3>
                          <p className="explore-display-desc">{place.desc}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Main Display Card for Desktop */}
            <div
              className="explore-display-card explore-desktop-card"
              id={`place-panel-${places[active].id}`}
              role="tabpanel"
              aria-labelledby={`place-tab-${places[active].id}`}
            >
              <img
                key={active}
                src={places[active].image}
                alt={places[active].title}
                className="explore-display-img"
              />
              <div className="explore-display-overlay" />
              <div className="explore-display-content">
                <div className="explore-display-subtitle">
                  {places[active].subtitle}
                </div>
                <h3 className="explore-display-title">{places[active].title}</h3>
                <p className="explore-display-desc">{places[active].desc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreSection;