import React, { useEffect, useRef, useState } from 'react';
import './EventsSection.css';

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
    <section id="events" ref={sectionRef} className="events-section">
      <div className="events-bg-overlay" />
      <div className="events-watermark">1918</div>

      <div className="events-container">
        {/* Header */}
        <div className={`events-header ${visible ? 'visible' : ''}`}>
          <div className="events-subtitle">Mark Your Calendar</div>
          <h2 className="events-title">LATEST EVENTS</h2>
          <div className="events-divider-wrap">
            <div className="events-divider-maroon" />
            <div className="events-divider-blue" />
          </div>
        </div>

        {/* Events list */}
        <div className="events-list">
          {events.map((event, i) => (
            <div
              key={event.id}
              className={`event-row ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              {/* Date Badge */}
              <div className="event-date-block">
                <div className="event-month" style={{ color: event.color }}>
                  {event.month}
                </div>
                <div className="event-day">{event.day}</div>
              </div>

              {/* Content */}
              <div className="event-content">
                <h3 className="event-item-title">{event.title}</h3>
                <p className="event-desc">{event.desc}</p>
                <div className="event-location" style={{ color: event.color }}>
                  <svg
                    className="location-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {event.location}
                </div>
              </div>

              {/* Action SVG Arrow */}
              <div className="event-arrow-circle">
                <svg
                  className="arrow-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* View all button */}
        <div className={`events-action ${visible ? 'visible' : ''}`}>
          <button className="events-btn">
            View All Events
            <svg
              className="btn-arrow-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default EventsSection;