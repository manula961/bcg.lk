import React, { useEffect, useRef, useState } from 'react';
import './LifeAsNayaken.css';

const stats = [
  { value: '108+', label: 'Years of Excellence', color: 'maroon' },
  { value: '5000+', label: 'Students Enrolled', color: 'blue' },
  { value: '120+', label: 'Sports Titles', color: 'maroon' },
  { value: '98%', label: 'Pass Rate', color: 'blue' },
];

const LifeAsNayaken = () => {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

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

  const handleNavigate = (path) => {
    window.location.assign(path);
  };

  return (
    <section id="nayakenzpride" ref={sectionRef} className="life-section">
      <div className="section-container">
        <div className={`life-content-group ${visible ? 'visible' : ''}`}>
          <div className="life-header">
            <div className="life-subtitle">Nayakenz Pride</div>
            <h2 className="life-title">Life As A Nayaken</h2>
            <p className="life-desc">
              Every day at Bandaranayake College is a new chapter shaped by learning, sport, art, and the unbreakable bond of brotherhood.
            </p>
          </div>

          <div className="life-bento-grid">
            <div
              className="bento-card card-1"
              role="link"
              tabIndex={0}
              aria-label="Open About Us details page"
              onClick={() => handleNavigate('/about-us')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNavigate('/about-us');
                }
              }}
            >
              <img
                src="https://bcg.lk/img/banner1.jpg"
                alt=""
                className="bento-bg-img"
              />
              <div className="bento-overlay" />
              <div className="bento-arrow" aria-hidden="true">
                <svg className="bento-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="bento-content">
                <div className="bento-tag">About Us</div>
                <h3 className="bento-title">Our History, Vision & Service</h3>
                <p className="bento-desc">
                  Discover our founding history, vision, mission, and century-long citadel of learning.
                </p>
              </div>
            </div>

            <div
              className="bento-card card-2"
              role="link"
              tabIndex={0}
              aria-label="Open Sports and Societies details page"
              onClick={() => handleNavigate('/life/sports-societies')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNavigate('/life/sports-societies');
                }
              }}
            >
              <img
                src="https://bcg.lk/img/banner1.jpg"
                alt=""
                className="bento-bg-img"
              />
              <div className="bento-overlay" />
              <div className="bento-arrow" aria-hidden="true">
                <svg className="bento-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="bento-content">
                <div className="bento-tag">Champions</div>
                <h3 className="bento-title">Sports & Societies</h3>
                <p className="bento-desc">
                  Explore student organizations, clubs, athletic rivalries, and house tradition.
                </p>
              </div>
            </div>

            <div
              className="bento-card card-3"
              role="link"
              tabIndex={0}
              aria-label="Open Academic Excellence details page"
              onClick={() => handleNavigate('/life/academic-excellence')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNavigate('/life/academic-excellence');
                }
              }}
            >
              <img
                src="https://bcg.lk/img/banner1.jpg"
                alt=""
                className="bento-bg-img"
              />
              <div className="bento-overlay" />
              <div className="bento-arrow" aria-hidden="true">
                <svg className="bento-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="bento-content">
                <div className="bento-tag">The Nayakenz Way</div>
                <h3 className="bento-title">Academic Excellence</h3>
                <p className="bento-desc">Top-tier standings in national A/L & O/L examinations and discovery across all streams.</p>
              </div>
            </div>

            <div
              className="bento-card card-4"
              role="link"
              tabIndex={0}
              aria-label="Open Leadership details page"
              onClick={() => handleNavigate('/life/leadership')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNavigate('/life/leadership');
                }
              }}
            >
              <img
                src="https://bcg.lk/img/banner1.jpg"
                alt=""
                className="bento-bg-img"
              />
              <div className="bento-overlay" />
              <div className="bento-arrow" aria-hidden="true">
                <svg className="bento-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="bento-content">
                <div className="bento-tag">Lead by Example</div>
                <h3 className="bento-title">Leadership</h3>
                <p className="bento-desc">Responsibility, teamwork and service.</p>
              </div>
            </div>
          </div>

          <div className="life-stats-grid">
            {stats.map((stat, i) => (
              <div key={i} className={`stat-card ${stat.color}`}>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LifeAsNayaken;