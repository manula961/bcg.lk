import React from 'react';
import './LifeAsNayaken.css';

const HERO_BANNER_IMAGE = 'https://bcg.lk/img/banner1.jpg';

export const bentoCards = [
  {
    id: 'about-us',
    slug: 'about-us',
    area: 'about',
    tag: 'Our History, Vision & Service',
    title: 'About Our School',
    description: 'Discover our founding history, vision, mission, and century-long citadel of learning.',
    accent: 'maroon',
  },
  {
    id: 'academic-excellence',
    slug: 'academic-excellence',
    area: 'academic',
    tag: 'THE NAYAKENZ WAY',
    title: 'Academic Excellence',
    description: 'Top-tier standings in national A/L & O/L examinations and discovery across all streams.',
    accent: 'blue',
  },
  {
    id: 'leadership',
    slug: 'leadership',
    area: 'leadership',
    tag: 'Lead by Example',
    title: 'School Leadership',
    description: 'Instilling personal responsibility, seamless teamwork, and active service across every generation.',
    accent: 'maroon',
  },
  {
    id: 'sports-societies',
    slug: 'sports-societies',
    area: 'sports',
    tag: 'Champions',
    title: 'Sports & Societies',
    description: 'Explore student organizations, clubs, athletic rivalries, and house tradition.',
    accent: 'blue',
  },
];

export default function LifeAsNayakenz({ currentSlug = '' }) {
  // Filter out the active page if rendered inside a /life/[slug] detail page
  const displayCards = currentSlug
    ? bentoCards.filter((card) => card.slug !== currentSlug)
    : bentoCards;

  const isDetailView = Boolean(currentSlug);

  return (
    <section className="life-bento-section" id="NayakenzPride">
      <div className="life-bento-header">
        <p className="life-bento-kicker">EXPLORE MORE</p>
        <h2 id="life-bento-title" className='life-bento-title'>Life As A Nayaken</h2>
        <p className="life-bento-subtitle">
          Every day at Bandaranayake College is a new chapter shaped by learning, sport, art, and the unbreakable bond of brotherhood.
        </p>
      </div>

      <div className={`life-bento-grid ${isDetailView ? 'detail-grid' : 'full-bento-grid'}`}>
        {displayCards.map((card) => (
          <a
            key={card.id}
            className={`bento-card ${!isDetailView ? `bento-area-${card.area}` : ''} ${card.accent}`}
            href={`/life/${card.slug}`}
          >
            <img src={HERO_BANNER_IMAGE} alt={card.title} loading="lazy" />
            <span className="bento-card-shade" />

            <span className="bento-card-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>

            <div className="bento-card-content">
              <span className="bento-card-tag">{card.tag}</span>
              <h3 className="bento-card-title">{card.title}</h3>
              <p className="bento-card-desc">{card.description}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}