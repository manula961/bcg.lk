import React, { useEffect, useState } from 'react';
import MenuBar from '../components/MenuBar';
import Footer from '../components/Footer';
import { subscribePublishedNews } from '../lib/newsService';
import './Updates.css';

export default function Updates({ titleSlug }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribePublishedNews((newsList) => {
        const match = newsList.find((item) => {
          const slug = encodeURIComponent(
            (item.title || '')
              .toLowerCase()
              .trim()
              .replace(/\s+/g, '-')
          );
          return slug === titleSlug || encodeURIComponent(item.title) === titleSlug;
        });

        setArticle(match || null);
        setLoading(false);
      });
    } catch (error) {
      console.error('Error fetching news item:', error);
      setLoading(false);
    }
    return () => unsubscribe();
  }, [titleSlug]);

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
          <h1 className="updates-not-found-title">Update Not Found</h1>
          <p className="updates-not-found-desc">
            The news update you are looking for does not exist or has been removed.
          </p>
          <a href="/" onClick={handleBackToHome} className="updates-return-btn">
            ← BACK
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
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
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