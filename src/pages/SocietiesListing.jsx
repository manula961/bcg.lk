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
        <h2 id="societies-directory-title">COLLEGE SOCIETIES</h2>
        <p className="life-detail-description">Discover the societies published by the college administration.</p>
      </div>
      {error && <p role="alert" className="life-detail-societies-message">{error}</p>}
      {!error && items.length === 0 && (
        <p className="life-detail-societies-message">Society profiles will appear here when published.</p>
      )}
      <div className="life-detail-society-grid">
        {items.map(item => (
          <article key={item.id} className="life-detail-society-card">
            {item.imageUrl && <img src={item.imageUrl} alt={item.title + ' logo'} loading="lazy" className="life-detail-society-logo" />}
            {item.category && <span className="life-detail-feature-label">{item.category}</span>}
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            {item.websiteUrl && (
              <a href={item.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={'Visit ' + item.title + ' website'}>
                Visit society ↗
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
