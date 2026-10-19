import React, { useEffect, useState } from 'react';
import MenuBar from '../components/MenuBar';
import Footer from '../components/Footer';
import { subscribePublishedNews, subscribePublishedNewsById } from '../lib/newsService';
import './Updates.css';

export default function Updates({ titleSlug }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    setLoading(true);
    setLoadError(false);
    try {
      const onFailure = error => {
        if (!active) return;
        console.error('News subscription failed:', error);
        setLoadError(true);
        setLoading(false);
      };
      // Standard public links use generated Firestore document IDs. Watching
      // just that document avoids subscribing to every published news entry.
      // Preserve full-collection lookup only for legacy title-based URLs.
      const id = decodeURIComponent(titleSlug);
      if (/^[A-Za-z0-9]{20}$/.test(id)) {
        unsubscribe = subscribePublishedNewsById(id, record => {
          if (!active) return;
          setArticle(record || null);
          setLoading(false);
        }, onFailure);
      } else {
        unsubscribe = subscribePublishedNews((newsList) => {
          if (!active) return;
          const match = newsList.find((item) => {
            const slug = encodeURIComponent(
              (item.title || '')
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
            );
            return encodeURIComponent(item.id) === titleSlug || slug === titleSlug || encodeURIComponent(item.title) === titleSlug;
          });
          setArticle(match || null);
          setLoading(false);
        }, onFailure);
      }
    } catch (error) {
      console.error('Error fetching news item:', error);
      if (active) { setLoadError(true); setLoading(false); }
    }
    return () => { active = false; unsubscribe(); };
  }, [titleSlug, retry]);

  useEffect(() => {
    if (article?.title) {
      document.title = `${article.title} | Bandaranayake College`;
    }
    window.scrollTo(0, 0);
  }, [article]);

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
      <main className="updates-page">
        <div className="updates-loading-container">
          <p className="text-gray-500">Loading update...</p>
        </div>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="updates-page">
        <div onClickCapture={handleMenuNavigation}>
          <MenuBar />
        </div>
        <div className="updates-not-found">
          <h1 className="updates-not-found-title">{loadError ? 'Unable to Load Update' : 'Update Not Found'}</h1>
          <p className="updates-not-found-desc">
            {loadError ? 'The news service could not be reached. Please try again.' : 'The news update you are looking for does not exist or has been removed.'}
          </p>
          {loadError && <button type="button" className="updates-return-btn" onClick={() => setRetry(n => n + 1)}>TRY AGAIN</button>}
          <a href="/" onClick={handleBackToHome} className="updates-return-btn">
            <svg className="return-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>HOME</span>
          </a>
        </div>
        <Footer />
      </main>
    );
  }

  const formattedDate = article.publishedAt?.toDate
    ? article.publishedAt.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <main className="updates-page">
      <div onClickCapture={handleMenuNavigation}>
        <MenuBar />
      </div>
      <div className="updates-top-wrapper">
        <div className="updates-container">
          <div className="updates-return">
            <a href="/" onClick={handleBackToHome} className="updates-return-btn">
              <svg className="return-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>BACK</span>
            </a>
          </div>
          <header className="updates-header">
            {article.category && <p className="updates-category">{article.category}</p>}
            <h1 className="updates-title">{article.title}</h1>
            {formattedDate && <p className="updates-date">{formattedDate}</p>}
          </header>
          {article.imageUrl && (
            <div className="updates-hero-image-wrap">
              <img src={article.imageUrl} alt={article.title} className="updates-hero-image" />
            </div>
          )}
          <article className="updates-content">
            {article.body || article.excerpt}
          </article>
        </div>
      </div>
      <Footer />
    </main>
  );
}