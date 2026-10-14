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
          <h2 className="life-title">LIFE AS A NAYAKEN</h2>
          <p className="life-desc">
            Every day at Bandaranayake College is a new chapter shaped by learning, sport, art, and the unbreakable bond of brotherhood.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className={`life-bento-grid ${visible ? 'visible' : ''}`}>
          {/* Card 1 - Academic Excellence */}
          <div className="bento-card card-1">
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
          <div className="bento-card card-2">
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

          {/* Card 3 - Arts & Culture */}
          <div className="bento-card card-3">
            <img
              src="https://bcg.lk/img/banner1.jpg"
              alt="Arts & Culture"
              className="bento-bg-img"
            />
            <div className="bento-overlay" />
            <div className="bento-arrow">
              <svg className="bento-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="bento-content">
              <div className="bento-tag">Expression</div>
              <h3 className="bento-title">Arts & Culture</h3>
              <p className="bento-desc">Drama, music, and tradition.</p>
            </div>
          </div>

          {/* Card 4 - Prefect Council */}
          <div className="bento-card card-4">
            <img
              src="https://bcg.lk/img/banner1.jpg"
              alt="Prefect Council"
              className="bento-bg-img"
            />
            <div className="bento-overlay" />
            <div className="bento-arrow">
              <svg className="bento-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="bento-content">
              <div className="bento-tag">Leadership</div>
              <h3 className="bento-title">Prefect Council</h3>
              <p className="bento-desc">Service and brotherhood.</p>
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