import React, { useEffect, useRef, useState } from 'react';
import './EventsSection.css';
import { subscribePublishedEvents } from '../lib/eventsService';

// Adapt published Firestore events to the existing card props without UI changes.
// YYYY-MM-DD is split directly to preserve the calendar date across timezones.
function toEventCard(event) {
  const date = /^\d{4}-(\d{2})-(\d{2})$/.exec(event.eventDate || "");
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const monthIndex = date ? Number(date[1]) - 1 : -1;

  return {
    id: event.id,
    month: months[monthIndex] || "",
    day: date ? date[2] : "",
    title: event.title || "",
    desc: event.description || "",
    location: event.location || "",
    color: event.color || "#7B1C1C",
  };
}
const EventsSection = () => {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [events, setEvents] = useState([]);

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

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribePublishedEvents(
        (publishedEvents) => setEvents(publishedEvents.map(toEventCard)),
        (error) => console.error('Unable to load published events:', error),
      );
    } catch (error) {
      console.error('Unable to subscribe to published events:', error);
    }
    return () => unsubscribe();
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