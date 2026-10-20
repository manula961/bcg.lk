import React, { useEffect, useState } from 'react';
import { subscribePublishedSocieties } from '../../../lib/societiesService';
import { subscribePublishedSports } from '../../../lib/sportsService';
import { subscribePublishedLeadership } from '../../../lib/leadershipService';

const directories = {
  societies: {
    title: 'School Societies',
    kicker: 'OUR COMMUNITY',
    headingId: 'societies-directory-title',
    subscribe: subscribePublishedSocieties,
    errorText: 'Unable to load societies right now.',
    emptyText: 'Society profiles will appear here when published.',
    messageClass: 'life-detail-societies-message',
  },
  sports: {
    title: 'School Sports',
    kicker: 'OUR COLLEGE',
    headingId: 'directory-sports',
    subscribe: subscribePublishedSports,
    errorText: 'Unable to load this content right now.',
    emptyText: 'Profiles will appear here when published.',
    messageClass: 'empty-listing-message',
  },
  leadership: {
    title: 'School Leadership',
    kicker: 'OUR COLLEGE',
    headingId: 'directory-leadership',
    subscribe: subscribePublishedLeadership,
    errorText: 'Unable to load this content right now.',
    emptyText: 'Profiles will appear here when published.',
    messageClass: 'empty-listing-message',
  },
};

/** One listing layout for all three published school directories. */
export default function ContentDirectory({ kind }) {
  const config = directories[kind];
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
        () => setError(config.errorText)
      );
    } catch {
      setError(config.errorText);
    }
    return () => unsubscribe();
  }, [config]);

  if (!config) return null;
  const isSocieties = kind === 'societies';
  return (
    <section className="life-detail-societies" aria-labelledby={config.headingId}>
      <div className="life-detail-section-heading">
        <p className="life-detail-kicker">{config.kicker}</p>
        <h2 id={config.headingId}>{config.title}</h2>
        {!isSocieties && <p className="life-detail-description">{config.intro}</p>}
      </div>
      {error && <p role="alert" className={config.messageClass}>{error}</p>}
      {!error && records.length === 0 && (
        <p className={config.messageClass}>{config.emptyText}</p>
      )}
      <div className="life-detail-society-grid">
        {records.map((item) => (
          <article key={item.id} className="life-detail-society-card">
            {item.imageUrl && (
              <div className="life-detail-society-logo-wrap">
                <img
                  src={item.imageUrl}
                  alt={isSocieties ? item.title + ' logo' : kind === 'leadership' ? item.title : ''}
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
            {isSocieties && item.websiteUrl && (
              <a
                href={item.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="life-detail-society-link"
                aria-label={'Visit ' + item.title + ' website'}
              >
                <span>Visit society</span>
                <svg className="society-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
