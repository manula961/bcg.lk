import React, { useEffect, useRef, useState } from 'react';
import './EventsSection.css';
import { subscribePublishedEvents } from '../lib/eventsService';

function parseEventDate(eventDateStr) {
  const date = /^\d{4}-(\d{2})-(\d{2})$/.exec(eventDateStr || "");
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const monthIndex = date ? Number(date[1]) - 1 : -1;
  return {
    month: months[monthIndex] || "UPCOMING",
    day: date ? date[2] : "--",
  };
}

const EventsSection = () => {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -10% 0px' }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribePublishedEvents(
        (publishedEvents) => {
          // Dynamically alternate colors (index % 2) so adjacent items never share the same accent
          const mapped = publishedEvents.map((event, index) => {
            const { month, day } = parseEventDate(event.eventDate);
            const alternatingColor = index % 2 === 0 ? '#7B1C1C' : '#1A3A6B';

            return {
              id: event.id,
              month,
              day,
              title: event.title || 'College Event',
              desc: event.description || 'Event details will be announced soon.',
              location: event.location || 'Main Hall',
              color: alternatingColor,
            };
          });
          setEvents(mapped);
        },
        (error) => console.error('Unable to load published events:', error),
      );
    } catch (error) {
      console.error('Unable to subscribe to published events:', error);
    }
    return () => unsubscribe();
  }, []);

  const handleEventClick = (eventItem) => {
    const slug = encodeURIComponent(eventItem.id);
    window.location.href = `/events/${slug}`;
  };

  const handleViewAllEvents = () => {
    window.location.href = '/events';
  };

  return (
    <section id="events" ref={sectionRef} className="events-section">
      <div className="events-bg-overlay" />
      <div className="events-watermark">1918</div>
      <div className="events-container">
        <div className={`events-content-group ${visible ? 'visible' : ''}`}>
          <div className="events-header">
            <div className="events-subtitle">Mark Your Calendar</div>
            <h2 className="events-title">Latest Events</h2>
            <div className="events-divider-wrap">
              <div className="events-divider-maroon" />
              <div className="events-divider-blue" />
            </div>
          </div>

          <div className="events-list">
            {events.length === 0 ? (
              <p className="events-empty-msg">No scheduled public events at this time.</p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="event-row"
                  tabIndex={0}
                  role="button"
                  aria-label={`Event: ${event.title} on ${event.month} ${event.day} at ${event.location}`}
                  style={{ '--hover-color': event.color }}
                  onClick={() => handleEventClick(event)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleEventClick(event);
                    }
                  }}
                >
                  <div className="event-date-block">
                    <div className="event-month" style={{ color: event.color }}>
                      {event.month}
                    </div>
                    <div className="event-day">{event.day}</div>
                  </div>
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
                        aria-hidden="true"
                      >
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {event.location}
                    </div>
                  </div>
                  <div className="event-arrow-circle" aria-hidden="true">
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
              ))
            )}
          </div>
          <div className="events-action">
            <button
              className="events-btn"
              onClick={handleViewAllEvents}
              aria-label="View all college events"
            >
              View All Events
              <svg
                className="btn-arrow-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventsSection;