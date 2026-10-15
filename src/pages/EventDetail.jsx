import React, { useEffect, useState } from 'react';
import MenuBar from '../components/MenuBar';
import Footer from '../components/Footer';
import { subscribePublishedEvents } from '../lib/eventsService';
import './EventDetail.css';

export default function EventDetail({ titleSlug }) {
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribePublishedEvents((eventsList) => {
        const match = eventsList.find((item) => {
          const slug = encodeURIComponent(
            (item.title || '')
              .toLowerCase()
              .trim()
              .replace(/\s+/g, '-')
          );
          return slug === titleSlug || encodeURIComponent(item.title) === titleSlug;
        });
        setEventData(match || null);
        setLoading(false);
      });
    } catch (error) {
      console.error('Error fetching event item:', error);
      setLoading(false);
    }
    return () => unsubscribe();
  }, [titleSlug]);

  useEffect(() => {
    if (eventData?.title) {
      document.title = `${eventData.title} | Bandaranayake College Events`;
    }
    window.scrollTo(0, 0);
  }, [eventData]);

  const handleBackToHome = (e) => {
    e.preventDefault();
    sessionStorage.setItem('skipLoading', 'true');
    sessionStorage.setItem('scrollToSection', 'top');
    window.location.assign('/');
  };

  const handleMenuNavigation = (event) => {
    const item = event.target.closest?.(".menu-nav-item");
    if (!item) return;
    const label = item.querySelector(".menu-title")?.textContent;
    const destinations = {
      Home: "home",
      News: "news",
      Events: "events",
      Explore: "explore",
      "Extra Curricular": "extracurricular",
    };
    if (destinations[label]) {
      event.stopPropagation();
      sessionStorage.setItem('skipLoading', 'true');
      sessionStorage.setItem('scrollToSection', destinations[label]);
      window.location.assign('/');
    }
  };

  if (loading) {
    return (
      <main className="event-detail-page">
        <div className="event-detail-loading">
          <p className="text-gray-500">Loading event details...</p>
        </div>
      </main>
    );
  }

  if (!eventData) {
    return (
      <main className="event-detail-page">
        <div onClickCapture={handleMenuNavigation}>
          <MenuBar />
        </div>
        <div className="event-detail-not-found">
          <h1 className="event-detail-not-found-title">Event Not Found</h1>
          <p className="event-detail-not-found-desc">
            The event you are looking for does not exist or has been removed.
          </p>
          <a href="/" onClick={handleBackToHome} className="event-detail-return-btn">
            <svg className="return-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>BACK</span>
          </a>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="event-detail-page">
      <div onClickCapture={handleMenuNavigation}>
        <MenuBar />
      </div>
      <div className="event-detail-top-wrapper">
        <div className="event-detail-container">
          <div className="event-detail-return">
            <a href="/" onClick={handleBackToHome} className="event-detail-return-btn">
              <svg className="return-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>BACK</span>
            </a>
          </div>
          <header className="event-detail-header">
            <p className="event-detail-kicker">COLLEGE EVENT</p>
            <h1 className="event-detail-title">{eventData.title}</h1>
            <div className="event-detail-meta-box">
              {eventData.eventDate && (
                <div className="event-detail-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{eventData.eventDate}</span>
                </div>
              )}
              {eventData.location && (
                <div className="event-detail-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{eventData.location}</span>
                </div>
              )}
            </div>
          </header>

          {eventData.imageUrl && (
            <div className="event-detail-hero-image-wrap">
              <img src={eventData.imageUrl} alt={eventData.title} className="event-detail-hero-image" />
            </div>
          )}

          <article className="event-detail-content">
            {eventData.description}
          </article>
        </div>
      </div>
      <Footer />
    </main>
  );
}