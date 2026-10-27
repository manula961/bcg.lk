import React, { useEffect, useRef, useState } from 'react';
import MenuBar from '../../components/layout/MenuBar';
import Footer from '../../components/layout/Footer';
import BackButton from '../../navigation/BackButton';
import { subscribePublishedEvents } from '../../lib/eventsService';
import './EventsPage.css';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [today, setToday] = useState(() => new Date());
  const [loadError, setLoadError] = useState(false);
  const [retryEvents, setRetryEvents] = useState(0);

  // Smooth floating preview tooltip state
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 12, y: 12 });
  const tooltipRef = useRef(null);
  const rafId = useRef(null);
  const modalRef = useRef(null);
  const closeRef = useRef(null);
  const priorFocusRef = useRef(null);

  // Mobile modal popup state
  const [activeMobileEvent, setActiveMobileEvent] = useState(null);

  // Update today's marker for long-lived tabs and when the browser becomes visible.
  useEffect(() => {
    const syncToday = () => {
      const now = new Date();
      setToday(previous => previous.toDateString() === now.toDateString() ? previous : now);
    };
    const interval = window.setInterval(syncToday, 60_000);
    document.addEventListener('visibilitychange', syncToday);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', syncToday);
    };
  }, []);

  const realToday = today;
  const todayYear = realToday.getFullYear();
  const todayMonth = realToday.getMonth();
  const todayDay = realToday.getDate();
  const todayString = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    setLoadError(false);
    try {
      unsubscribe = subscribePublishedEvents(
        fetchedEvents => {
          if (!active) return;
          setEvents(fetchedEvents);
          setLoadError(false);
        },
        error => {
          if (!active) return;
          console.error('Error fetching events:', error);
          setLoadError(true);
        },
      );
    } catch (error) {
      console.error('Error fetching events:', error);
      if (active) setLoadError(true);
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [retryEvents]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday start offset calculation: Convert Sun(0)...Sat(6) -> Mon(0)...Sun(6)
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const jumpToToday = () => setCurrentDate(new Date());

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const isCurrentMonth = year === todayYear && month === todayMonth;

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

  const openEvent = (event, trigger) => {
    priorFocusRef.current = trigger;
    setActiveMobileEvent(event);
  };

  const closeEvent = () => setActiveMobileEvent(null);

  useEffect(() => {
    if (!activeMobileEvent) return undefined;
    closeRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeEvent();
      }
      if (event.key === 'Tab') {
        const focusable = [...(modalRef.current?.querySelectorAll('button:not(:disabled), a[href]') || [])];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      priorFocusRef.current?.focus();
    };
  }, [activeMobileEvent]);


  return (
    <main className="events-page" onMouseMove={handleMouseMove}>
      <MenuBar />
      <div className="events-page-top">
        <div className="events-page-container">
          <div className="events-page-return">
            <BackButton className="events-page-return-btn" fallback="/#events">BACK</BackButton>
          </div>

          <header className="events-page-header">
            <p className="events-page-subtitle">SCHEDULE & CALENDAR</p>
            <h1 className="events-page-title">College Events</h1>
          </header>

          {loadError && (
            <div className="calendar-card" role="alert">
              <p>Events could not be loaded. Check your connection and try again.</p>
              <button type="button" className="jump-today-btn"
                onClick={() => setRetryEvents(value => value + 1)}>Try again</button>
            </div>
          )}

          <div className="calendar-card">
            <div className="calendar-header">
              <button onClick={prevMonth} className="calendar-nav-btn" aria-label="Previous Month">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <div className="calendar-month-wrapper">
                <h2 className="calendar-month-title">{monthName} {year}</h2>
                {!isCurrentMonth && (
                  <button onClick={jumpToToday} className="jump-today-btn" title="Jump to Today">
                    Jump to Today
                  </button>
                )}
              </div>

              <button onClick={nextMonth} className="calendar-nav-btn" aria-label="Next Month">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {hasEventsInFutureMonths && <span className="has-event-indicator" title="Future months have events" />}
              </button>
            </div>

            {/* Week Starting Monday */}
            <div className="calendar-grid-header">
              <div><span className="day-name-full">Mon</span><span className="day-name-short">M</span></div>
              <div><span className="day-name-full">Tue</span><span className="day-name-short">T</span></div>
              <div><span className="day-name-full">Wed</span><span className="day-name-short">W</span></div>
              <div><span className="day-name-full">Thu</span><span className="day-name-short">T</span></div>
              <div><span className="day-name-full">Fri</span><span className="day-name-short">F</span></div>
              <div><span className="day-name-full">Sat</span><span className="day-name-short">S</span></div>
              <div><span className="day-name-full">Sun</span><span className="day-name-short">S</span></div>
            </div>

            {/* Animated Grid Container */}
            <div key={`${year}-${month}`} className="calendar-grid-days month-transition-active">
              {Array.from({ length: firstDayIndex }).map((_, index) => (
                <div key={`empty-${index}`} className="calendar-day-cell empty" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
                const dayNumber = dayIndex + 1;
                const formattedDay = String(dayNumber).padStart(2, '0');
                const formattedMonth = String(month + 1).padStart(2, '0');
                const dateString = `${year}-${formattedMonth}-${formattedDay}`;

                const isToday = dateString === todayString;
                const dayEvents = events.filter((ev) => ev.eventDate === dateString);
                const primaryEvent = dayEvents[0];

                return (
                  <div
                    key={dayNumber}
                    className={`calendar-day-cell ${dayEvents.length > 0 ? 'has-events' : ''} ${isToday ? 'is-today' : ''}`}
                    onMouseEnter={() => {
                      if (primaryEvent && window.innerWidth > 640) {
                        setHoveredEvent(primaryEvent);
                      }
                    }}
                    onMouseLeave={() => setHoveredEvent(null)}
                  >
                    <div className="calendar-day-header">
                      <span className={`calendar-day-number ${isToday ? 'today-text' : ''}`}>{dayNumber}</span>
                      {isToday && <span className="today-hover-label">Today</span>}
                    </div>

                    <div>
                      {dayEvents.map((ev) => {
                        const isPassed = ev.eventDate < todayString;
                        return (
                          <React.Fragment key={ev.id}>
                            {/* Desktop Pill View */}
                            <a
                              className={`calendar-event-pill ${isPassed ? 'passed' : ''}`}
                              href={`/events/${encodeURIComponent(ev.id)}`}
                              aria-label={`View ${ev.title} on ${ev.eventDate}`}
                              onFocus={(event) => {
                                const bounds = event.currentTarget.getBoundingClientRect();
                                setTooltipPosition({
                                  x: Math.max(12, Math.min(bounds.right + 12, window.innerWidth - 332)),
                                  y: Math.max(12, Math.min(bounds.top, window.innerHeight - 210)),
                                });
                                setHoveredEvent(ev);
                              }}
                              onBlur={() => setHoveredEvent(null)}
                            >
                              {ev.title}
                            </a>
                            {/* Mobile event button: independently reachable for every event. */}
                            <button
                              type="button"
                              className={`calendar-event-dot ${isPassed ? 'passed' : ''}`}
                              aria-label={`View ${ev.title} on ${ev.eventDate}`}
                              onClick={(event) => openEvent(ev, event.currentTarget)}
                            />
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Preview Tooltip with SVG Icons */}
      {hoveredEvent && window.innerWidth > 640 && (
        <div ref={tooltipRef} className="event-floating-tooltip"
          style={{ transform: `translate3d(${tooltipPosition.x}px, ${tooltipPosition.y}px, 0)` }}>
          <div className="tooltip-date-tag">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{hoveredEvent.eventDate}</span>
          </div>
          <div className="tooltip-title">{hoveredEvent.title}</div>
          <div className="tooltip-desc">{hoveredEvent.description}</div>
          {hoveredEvent.location && (
            <div className="tooltip-location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{hoveredEvent.location}</span>
            </div>
          )}
        </div>
      )}

      {/* Mobile Event Popup Modal with SVG Icons */}
      {activeMobileEvent && (
        <div className="mobile-event-modal-overlay" onMouseDown={event => {
          if (event.target === event.currentTarget) closeEvent();
        }}>
          <div
            className="mobile-event-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-modal-title"
            ref={modalRef}
          >
            <button
              ref={closeRef}
              className="mobile-modal-close"
              onClick={closeEvent}
              aria-label="Close modal"
            >
              ✕
            </button>
            <p className="mobile-modal-kicker">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px', verticalAlign: 'middle' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {activeMobileEvent.eventDate}
            </p>
            <h3 id="event-modal-title" className="mobile-modal-title">{activeMobileEvent.title}</h3>
            <p className="mobile-modal-desc">{activeMobileEvent.description}</p>
            {activeMobileEvent.location && (
              <p className="mobile-modal-location">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{activeMobileEvent.location}</span>
              </p>
            )}
            <a
              href={`/events/${encodeURIComponent(activeMobileEvent.id)}`}
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