import React, { useEffect, useState } from 'react';
import { subscribePublishedSports } from '../lib/sportsService';
import { subscribePublishedLeadership } from '../lib/leadershipService';

const directory = {
  sports: {
    title: 'School Sports',
    subscribe: subscribePublishedSports,
  },
  leadership: {
    title: 'School Leadership',
    subscribe: subscribePublishedLeadership,
  },
};

export default function SchoolContentListing({ kind }) {
  const config = directory[kind];
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!config) return;
    let unsubscribe = () => {};
    try {
      unsubscribe = config.subscribe(
        (data) => {
          setRecords(data);
          setError('');
        },
        () => setError('Unable to load this content right now.')
      );
    } catch {
      setError('Unable to load this content right now.');
    }
    return () => unsubscribe();
  }, [config]);

  if (!config) return null;

  return (
    <section className="life-detail-societies" aria-labelledby={`directory-${kind}`}>
      <div className="life-detail-section-heading">
        <p className="life-detail-kicker">OUR COLLEGE</p>
        <h2 id={`directory-${kind}`}>{config.title}</h2>
        <p className="life-detail-description">{config.intro}</p>
      </div>
      {error && <p role="alert" className="empty-listing-message">{error}</p>}
      {!error && records.length === 0 && (
        <p className="empty-listing-message">Profiles will appear here when published.</p>
      )}
      <div className="life-detail-society-grid">
        {records.map((item) => (
          <article key={item.id} className="life-detail-society-card">
            {item.imageUrl && (
              <div className="life-detail-society-logo-wrap">
                <img
                  src={item.imageUrl}
                  alt={kind === 'leadership' ? item.title : ''}
                  loading="lazy"
                  className="life-detail-society-logo"
                />
              </div>
            )}
            {(kind === 'leadership' ? item.role : item.category) && (
              <span className="life-detail-society-role">
                {kind === 'leadership' ? item.role : item.category}
              </span>
            )}
            <h3 className="life-detail-society-title">{item.title}</h3>
            {item.description && <p className="life-detail-society-desc">{item.description}</p>}
            {kind === 'sports' && item.achievements && (
              <p className="life-detail-society-desc">
                <strong>Achievements: </strong>{item.achievements}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}