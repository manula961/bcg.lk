import React, { useEffect, useRef, useState } from 'react';
import MenuBar from '../components/MenuBar';
import Footer from '../components/Footer';
import { subscribePublishedEvents } from '../lib/eventsService';
import './EventsPage.css';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Smooth floating preview tooltip state
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const tooltipRef = useRef(null);
  const rafId = useRef(null);

  // Mobile modal popup state
  const [activeMobileEvent, setActiveMobileEvent] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribePublishedEvents(
        (fetchedEvents) => setEvents(fetchedEvents),
        (error) => console.error('Error fetching events:', error)
      );
    } catch (err) {
      console.error(err);
    }
    return () => unsubscribe();
  }, []);

  const handleBackToHome = (e) => {
    e.preventDefault();
    sessionStorage.setItem('skipLoading', 'true');
    sessionStorage.setItem('scrollToSection', 'top');
    window.location.assign('/');
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Check if future months have events scheduled
  const hasEventsInFutureMonths = events.some((ev) => {
    if (!ev.eventDate) return false;
    const evDate = new Date(ev.eventDate + 'T00:00:00');
    const currentMonthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    return evDate > currentMonthEnd;
  });

  // Direct 60fps DOM transform update without triggering React re-renders
  const handleMouseMove = (e) => {
    if (!tooltipRef.current) return;
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      if (tooltipRef.current) {
        tooltipRef.current.style.transform = `translate3d(${clientX + 18}px, ${clientY + 18}px, 0)`;
      }
    });
  };

  const handleCellInteraction = (ev, e) => {
    if (!ev) return;
    const isMobile = window.innerWidth <= 640;
    if (isMobile) {
      e.stopPropagation();
      setActiveMobileEvent(ev);
    } else {
      const slug = encodeURIComponent(
        (ev.title || '').toLowerCase().trim().replace(/\s+/g, '-')
      );
      window.location.href = `/events/${slug}`;
    }
  };

  return (
    <main className="events-page" onMouseMove={handleMouseMove}>
      <MenuBar />
      <div className="events-page-top">
        <div className="events-page-container">
          <div className="events-page-return">
            <a href="/" onClick={handleBackToHome} className="events-page-return-btn">
              <svg className="return-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>BACK</span>
            </a>
          </div>

          <header className="events-page-header">
            <p className="events-page-subtitle">SCHEDULE & CALENDAR</p>
            <h1 className="events-page-title">College Events</h1>
          </header>

          <div className="calendar-card">
            <div className="calendar-header">
              <button onClick={prevMonth} className="calendar-nav-btn" aria-label="Previous Month">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <h2 className="calendar-month-title">{monthName} {year}</h2>
              <button onClick={nextMonth} className="calendar-nav-btn" aria-label="Next Month">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {hasEventsInFutureMonths && <span className="has-event-indicator" title="Future months have events" />}
              </button>
            </div>

            <div className="calendar-grid-header">
              <div><span className="day-name-full">Sun</span><span className="day-name-short">S</span></div>
              <div><span className="day-name-full">Mon</span><span className="day-name-short">M</span></div>
              <div><span className="day-name-full">Tue</span><span className="day-name-short">T</span></div>
              <div><span className="day-name-full">Wed</span><span className="day-name-short">W</span></div>
              <div><span className="day-name-full">Thu</span><span className="day-name-short">T</span></div>
              <div><span className="day-name-full">Fri</span><span className="day-name-short">F</span></div>
              <div><span className="day-name-full">Sat</span><span className="day-name-short">S</span></div>
            </div>

            <div className="calendar-grid-days">
              {Array.from({ length: firstDayIndex }).map((_, index) => (
                <div key={`empty-${index}`} className="calendar-day-cell empty" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
                const dayNumber = dayIndex + 1;
                const formattedDay = String(dayNumber).padStart(2, '0');
                const formattedMonth = String(month + 1).padStart(2, '0');
                const dateString = `${year}-${formattedMonth}-${formattedDay}`;

                const dayEvents = events.filter((ev) => ev.eventDate === dateString);
                const primaryEvent = dayEvents[0];

                return (
                  <div
                    key={dayNumber}
                    className={`calendar-day-cell ${dayEvents.length > 0 ? 'has-events' : ''}`}
                    onClick={(e) => handleCellInteraction(primaryEvent, e)}
                    onMouseEnter={() => {
                      if (primaryEvent && window.innerWidth > 640) {
                        setHoveredEvent(primaryEvent);
                      }
                    }}
                    onMouseLeave={() => setHoveredEvent(null)}
                  >
                    <span className="calendar-day-number">{dayNumber}</span>
                    <div>
                      {dayEvents.map((ev) => (
                        <React.Fragment key={ev.id}>
                          {/* Desktop Pill View */}
                          <div className="calendar-event-pill">
                            {ev.title}
                          </div>
                          {/* Mobile Indicator Dot View */}
                          <div className="calendar-event-dot" />
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Hardware-Accelerated Floating Preview Tooltip (Desktop) */}
      {hoveredEvent && window.innerWidth > 640 && (
        <div
          ref={tooltipRef}
          className="event-floating-tooltip"
        >
          <div className="tooltip-date-tag">{hoveredEvent.eventDate}</div>
          <div className="tooltip-title">{hoveredEvent.title}</div>
          <div className="tooltip-desc">{hoveredEvent.description}</div>
          {hoveredEvent.location && (
            <div className="tooltip-location">📍 {hoveredEvent.location}</div>
          )}
        </div>
      )}

      {/* Mobile Event Popup Modal */}
      {activeMobileEvent && (
        <div
          className="mobile-event-modal-overlay"
          onClick={() => setActiveMobileEvent(null)}
        >
          <div
            className="mobile-event-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="mobile-modal-close"
              onClick={() => setActiveMobileEvent(null)}
              aria-label="Close modal"
            >
              ✕
            </button>
            <p className="mobile-modal-kicker">UPCOMING EVENT</p>
            <h3 className="mobile-modal-title">{activeMobileEvent.title}</h3>
            <p className="mobile-modal-desc">{activeMobileEvent.description}</p>
            <a
              href={`/events/${encodeURIComponent(
                (activeMobileEvent.title || '').toLowerCase().trim().replace(/\s+/g, '-')
              )}`}
              className="mobile-modal-btn"
            >
              VIEW EVENT
            </a>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}