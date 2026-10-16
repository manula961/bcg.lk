import React, { useEffect, useState } from 'react';
import { subscribePublishedSocieties } from '../lib/societiesService';

/** Uses the existing Life-page palette and card spacing, without changing the homepage. */
export default function SocietiesListing() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribePublishedSocieties(
        records => { setItems(records); setError(''); },
        () => setError('Unable to load societies right now.')
      );
    } catch {
      setError('Unable to load societies right now.');
    }
    return () => unsubscribe();
  }, []);

  return (
    <section className="life-detail-societies" aria-labelledby="societies-directory-title">
      <div className="life-detail-section-heading">
        <p className="life-detail-kicker">OUR COMMUNITY</p>
        <h2 id="societies-directory-title">College Societies</h2>
        <p className="life-detail-description">Discover the societies published by the college administration.</p>
      </div>

      {error && <p role="alert" className="life-detail-societies-message">{error}</p>}
      {!error && items.length === 0 && (
        <p className="life-detail-societies-message">Society profiles will appear here when published.</p>
      )}

      <div className="life-detail-society-grid">
        {items.map(item => (
          <article key={item.id} className="life-detail-society-card">
            {item.imageUrl && (
              <div className="life-detail-society-logo-wrap">
                <img src={item.imageUrl} alt={item.title + ' logo'} loading="lazy" className="life-detail-society-logo" />
              </div>
            )}
            {item.category && <span className="life-detail-feature-label">{item.category}</span>}
            <h3>{item.title}</h3>
            {item.description && <p>{item.description}</p>}
            {item.websiteUrl && (
              <a
                href={item.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="life-detail-society-link"
                aria-label={'Visit ' + item.title + ' website'}
              >
                <span>Visit society</span>
                <svg className="return-arrow-icon" style={{ transform: 'rotate(135deg)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}