import React, { useEffect, useState } from 'react';
import { subscribePublishedSports } from '../lib/sportsService';
import { subscribePublishedExtracurricular } from '../lib/extracurricularService';
import { subscribePublishedLeadership } from '../lib/leadershipService';

const directory = {
  sports: {
    title: 'College Sports',
    intro: 'School sports and achievements published by the administration.',
    subscribe: subscribePublishedSports,
  },
  extracurricular: {
    title: 'Extracurricular Activities',
    intro: 'Activities and programmes published by the administration.',
    subscribe: subscribePublishedExtracurricular,
  },
  leadership: {
    title: 'Sschool Administration',
    intro: 'Verified senior school administrative staff, displayed in the order set by the administration.',
    subscribe: subscribePublishedLeadership,
  },
};

export default function SchoolContentListing({ kind }) {
  const config = directory[kind];
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
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

  return (
    <section className="life-detail-societies" aria-labelledby={'directory-' + kind}>
      <div className="life-detail-section-heading">
        <p className="life-detail-kicker">OUR COLLEGE</p>
        <h2 id={'directory-' + kind}>{config.title}</h2>
        <p className="life-detail-description">{config.intro}</p>
      </div>
      {error && <p role="alert" className="life-detail-societies-message">{error}</p>}
      {!error && records.length === 0 && (
        <p className="life-detail-societies-message">Profiles will appear here when published.</p>
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
              <span className="life-detail-feature-label">
                {kind === 'leadership' ? item.role : item.category}
              </span>
            )}
            <h3>{item.title}</h3>
            {item.description && <p>{item.description}</p>}
            {kind === 'sports' && item.achievements && (
              <p><strong>Achievements: </strong>{item.achievements}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}