import React from 'react';
import './LifeAsNayaken.css';

export const bentoCards = [
  {
    id: 'about-us',
    slug: 'about-us',
    area: 'about',
    tag: 'Our History, Vision & Service',
    title: 'About Our School',
    description: 'Discover our founding history, vision, mission, and century-long citadel of learning.',
    accent: 'maroon',
    image: 'https://bcg.lk/img/banner1.jpg', // Replace with About Us image
  },
  {
    id: 'academic-excellence',
    slug: 'academic-excellence',
    area: 'academic',
    tag: 'THE NAYAKENZ WAY',
    title: 'Academic Excellence',
    description: 'Top-tier standings in national A/L & O/L examinations and discovery across all streams.',
    accent: 'blue',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80', // Replace with Academic image
  },
  {
    id: 'leadership',
    slug: 'leadership',
    area: 'leadership',
    tag: 'Lead by Example',
    title: 'School Leadership',
    description: 'Instilling personal responsibility, seamless teamwork, and active service across every generation.',
    accent: 'maroon',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80', // Replace with Leadership image
  },
  {
    id: 'sports-societies',
    slug: 'sports-societies',
    area: 'sports',
    tag: 'Champions',
    title: 'Sports & Societies',
    description: 'Explore student organizations, clubs, athletic rivalries, and house tradition.',
    accent: 'blue',
    image: 'https://cdn.britannica.com/22/238522-050-F29FD74E/FIFA-2022-World-Cup-Argentina.jpg', // Replace with Sports image
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
      <div className="life-bento-container">
        <div className="life-bento-header">
          <p className="life-bento-kicker">EXPLORE MORE</p>
          <h2 id="life-bento-title" className="life-bento-title">
            Life As A Nayaken
          </h2>
          <p className="life-bento-subtitle">
            Every day at Bandaranayake College is a new chapter shaped by learning, sport, art, and the unbreakable bond of brotherhood.
          </p>
        </div>

        <div className={`life-bento-grid ${isDetailView ? 'detail-grid' : 'full-bento-grid'}`}>
          {displayCards.map((card) => (
            <a
              key={card.id}
              className={`bento-card bento-area-${card.area} ${card.accent}`}
              href={`/life/${card.slug}`}
              aria-label={`Learn more about ${card.title}`}
            >
              <img src={card.image} alt={card.title} loading="lazy" />
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
      </div>
    </section>
  );
}