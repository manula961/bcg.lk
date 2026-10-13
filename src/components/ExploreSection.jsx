import React, { useEffect, useRef, useState } from 'react';
import './ExploreSection.css';

const places = [
  {
    id: 1,
    title: 'The Main Building',
    subtitle: 'Heritage Architecture',
    desc: 'Built in the colonial era, the main building stands as a testament to the rich history and heritage of Bandaranayake College, Gampaha.',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRd7XebAjxSca9XehdYlX41ru5rUDxezRs6WBVpex0HA7GgPvbDDy9AXKXK&s=10',
    tag: '1918',
  },
  {
    id: 2,
    title: 'Sports Grounds',
    subtitle: 'Where Champions Train',
    desc: 'World-class sporting facilities including a cricket ground, athletics track, and indoor courts that have produced provincial and national champions.',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRd7XebAjxSca9XehdYlX41ru5rUDxezRs6WBVpex0HA7GgPvbDDy9AXKXK&s=10',
    tag: 'Sports',
  },
  {
    id: 3,
    title: 'Library & Resource Centre',
    subtitle: 'Knowledge Hub',
    desc: 'A modern library housing thousands of books, digital resources, and quiet study spaces to support academic excellence.',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRd7XebAjxSca9XehdYlX41ru5rUDxezRs6WBVpex0HA7GgPvbDDy9AXKXK&s=10',
    tag: 'Academics',
  },
  {
    id: 4,
    title: 'Science Laboratories',
    subtitle: 'Innovation & Discovery',
    desc: 'Fully equipped laboratories for Biology, Chemistry, and Physics empowering students to explore, experiment, and excel.',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRd7XebAjxSca9XehdYlX41ru5rUDxezRs6WBVpex0HA7GgPvbDDy9AXKXK&s=10',
    tag: 'Science',
  },
];

const ExploreSection = () => {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);

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

  return (
    <section id="explore" ref={sectionRef} className="explore-section">
      <div className="section-container">
        {/* Header */}
        <div className={`explore-header ${visible ? 'visible' : ''}`}>
          <div className="explore-subtitle">Discover BCG</div>
          <h2 className="explore-title">EXPLORE THE SCHOOL</h2>
          <div className="explore-divider-wrap">
            <div className="explore-divider-maroon" />
            <div className="explore-divider-blue" />
          </div>
        </div>

        {/* Main layout: tabs, display */}
        <div className={`explore-grid ${visible ? 'visible' : ''}`}>
          {/* Left: place list */}
          <div className="explore-tabs-list">
            {places.map((place, i) => (
              <button
                key={place.id}
                onClick={() => setActive(i)}
                className={`explore-tab-btn ${active === i ? 'active' : ''}`}
              >
                <div className="explore-tab-tag">{place.tag}</div>
                <h3 className="explore-tab-title">{place.title}</h3>
              </button>
            ))}
          </div>

          {/* Right: featured display */}
          <div className="explore-display-card">
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
    </section>
  );
};

export default ExploreSection;