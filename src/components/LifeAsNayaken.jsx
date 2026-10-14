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
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="extracurricular" ref={sectionRef} className="life-section">
      <div className="section-container">
        {/* Header */}
        <div className={`life-header ${visible ? 'visible' : ''}`}>
          <div className="life-subtitle">Experience It</div>
          <h2 className="life-title">Life As A Nayaken</h2>
          <p className="life-desc">
            Every day at Bandaranayake College is a new chapter shaped by learning, sport, art, and the unbreakable bond of brotherhood.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className={`life-bento-grid ${visible ? 'visible' : ''}`}>
          {/* Card 1 - Academic Excellence */}
          <div className="bento-card card-1" role="link" tabIndex={0} aria-label="Open academic excellence page" onClick={() => window.location.assign('/life/academic-excellence')} onKeyDown={(event) => { if (event.key === 'Enter') window.location.assign('/life/academic-excellence'); }}>
            <img
              src="https://bcg.lk/img/banner1.jpg"
              alt="Academic Excellence"
              className="bento-bg-img"
            />
            <div className="bento-overlay" />
            <div className="bento-arrow">
              <svg className="bento-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="bento-content">
              <div className="bento-tag">The Nayaken Way</div>
              <h3 className="bento-title">Academic Excellence</h3>
              <p className="bento-desc">
                Guided by dedicated teachers, our students consistently achieve top provincial and national standings.
              </p>
            </div>
          </div>

          {/* Card 2 - Sports & Athletics */}
          <div className="bento-card card-2" role="link" tabIndex={0} aria-label="Open sports athletics page" onClick={() => window.location.assign('/life/sports-athletics')} onKeyDown={(event) => { if (event.key === 'Enter') window.location.assign('/life/sports-athletics'); }}>
            <img
              src="https://bcg.lk/img/banner1.jpg"
              alt="Sports and Athletics"
              className="bento-bg-img"
            />
            <div className="bento-overlay" />
            <div className="bento-arrow">
              <svg className="bento-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="bento-content">
              <div className="bento-tag">Champions</div>
              <h3 className="bento-title">Sports & Athletics</h3>
              <p className="bento-desc">
                From cricket to athletics, our athletes carry the BCG spirit with pride at every national competition.
              </p>
            </div>
          </div>

          {/* Card 3 - Societies */}
          <div className="bento-card card-3" role="link" tabIndex={0} aria-label="Open societies page" onClick={() => window.location.assign('/life/societies')} onKeyDown={(event) => { if (event.key === 'Enter') window.location.assign('/life/societies'); }}>
            <img
              src="https://bcg.lk/img/banner1.jpg"
              alt="Societies"
              className="bento-bg-img"
            />
            <div className="bento-overlay" />
            <div className="bento-arrow">
              <svg className="bento-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="bento-content">
              <div className="bento-tag">Discovery</div>
              <h3 className="bento-title">Societies</h3>
              <p className="bento-desc">Science, creativity, service and teamwork.</p>
            </div>
          </div>

          {/* Card 4 - Leadership */}
          <div className="bento-card card-4" role="link" tabIndex={0} aria-label="Open leadership page" onClick={() => window.location.assign('/life/leadership')} onKeyDown={(event) => { if (event.key === 'Enter') window.location.assign('/life/leadership'); }}>
            <img
              src="https://bcg.lk/img/banner1.jpg"
              alt="Leadership"
              className="bento-bg-img"
            />
            <div className="bento-overlay" />
            <div className="bento-arrow">
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

        {/* Stats Grid */}
        <div className={`life-stats-grid ${visible ? 'visible' : ''}`}>
          {stats.map((stat, i) => (
            <div key={i} className={`stat-card ${stat.color}`}>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LifeAsNayaken;