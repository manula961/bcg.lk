import React, { useEffect } from 'react';
import './LifeDetailPage.css';

const image = 'https://bcg.lk/img/banner1.jpg';

// Keep content grounded in the existing Life as a Nayaken section.
// New editorial copy or photographs can be added after college approval.
export const lifePages = Object.freeze({
  'academic-excellence': {
    title: 'Academic Excellence',
    label: 'THE NAYAKEN WAY',
    subtitle: 'Learning, ambition and opportunity',
    description: 'Guided by dedicated teachers, our students consistently achieve top provincial and national standings.',
    accent: 'maroon',
  },
  'sports-athletics': {
    title: 'Sports & Athletics',
    label: 'CHAMPIONS',
    subtitle: 'Strength, teamwork and sportsmanship',
    description: 'From cricket to athletics, our athletes carry the BCG spirit with pride at every national competition.',
    accent: 'blue',
  },
  'arts-culture': {
    title: 'Arts & Culture',
    label: 'EXPRESSION',
    subtitle: 'Creativity, drama, music and tradition',
    description: 'Drama, music, and tradition.',
    accent: 'maroon',
  },
  'prefect-council': {
    title: 'Prefect Council',
    label: 'LEADERSHIP',
    subtitle: 'Service, responsibility and brotherhood',
    description: 'Service and brotherhood.',
    accent: 'blue',
  },
});

const labels = Object.entries(lifePages);

export default function LifeDetailPage({ slug }) {
  const current = lifePages[slug];

  useEffect(() => {
    if (!current) return;
    const oldTitle = document.title;
    document.title = current.title + ' | Bandaranayake College, Gampaha';
    window.scrollTo(0, 0);
    return () => { document.title = oldTitle; };
  }, [slug, current]);

  if (!current) return null;

  return (
    <main className="life-detail">
      <a className="life-detail-skip" href="#life-detail-main">Skip to content</a>
      <header className="life-detail-topbar">
        <a href="/" className="life-detail-brand" aria-label="Bandaranayake College homepage">
          <span className="life-detail-brand-mark">B</span>
          <span>BANDARANAYAKE COLLEGE <small>GAMPAHA</small></span>
        </a>
        <a className="life-detail-home" href="/#extracurricular">
          <span aria-hidden="true">←</span> Back to Life as a Nayaken
        </a>
      </header>

      <section id="life-detail-main" className="life-detail-intro" aria-labelledby="life-detail-title">
        <p className="life-detail-kicker">EXPERIENCE IT</p>
        <p className="life-detail-eyebrow">{current.label}</p>
        <h1 id="life-detail-title">{current.title}</h1>
        <p className="life-detail-description">{current.description}</p>
      </section>

      <div className="life-detail-container">
        <section className={'life-detail-feature ' + current.accent} aria-label={current.title}>
          <img className="life-detail-feature-image" src={image} alt="Bandaranayake College campus" />
          <div className="life-detail-feature-shade" />
          <div className="life-detail-feature-body">
            <span className="life-detail-feature-label">{current.label}</span>
            <h2>{current.subtitle}</h2>
            <p>{current.description}</p>
          </div>
        </section>

        <section className="life-detail-explore" aria-labelledby="life-detail-explore-title">
          <div className="life-detail-section-heading">
            <p className="life-detail-kicker">EXPLORE MORE</p>
            <h2 id="life-detail-explore-title">LIFE AS A NAYAKEN</h2>
          </div>
          <div className="life-detail-grid">
            {labels.filter(([key]) => key !== slug).map(([key, page]) => (
              <a key={key} className={'life-detail-card ' + page.accent} href={'/life/' + key}>
                <img src={image} alt="" loading="lazy" />
                <span className="life-detail-card-shade" />
                <span className="life-detail-card-arrow" aria-hidden="true">↗</span>
                <span className="life-detail-card-content">
                  <span className="life-detail-card-label">{page.label}</span>
                  <strong>{page.title}</strong>
                  <span>{page.description}</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>
      <footer className="life-detail-footer">
        <span>Bandaranayake College, Gampaha</span>
        <a href="/#extracurricular">Return to the College website ↑</a>
      </footer>
    </main>
  );
}
