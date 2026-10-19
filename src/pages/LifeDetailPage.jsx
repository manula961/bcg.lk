import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import './LifeDetailPage.css';
import MenuBar from '../components/MenuBar';
import Footer from '../components/Footer';
import SocietiesListing from './SocietiesListing';
import SchoolContentListing from './SchoolContentListing';
import Timeline from '../components/ui/Timeline';
import LifeAsNayakenz from '../components/LifeAsNayaken';

const HERO_BANNER_IMAGE = 'https://bcg.lk/img/banner1.jpg';

import { lifePages } from './lifePageData.js';
export { lifePages } from './lifePageData.js';

export default function LifeDetailPage({ slug }) {
  const normalizedSlug = useMemo(() => {
    return slug ? decodeURIComponent(slug).toLowerCase().trim().replace(/\s+/g, '-') : 'about-us';
  }, [slug]);

  const current = useMemo(() => {
    return lifePages[normalizedSlug] || lifePages['about-us'];
  }, [normalizedSlug]);

  const pageRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!current) return;
    document.title = `${current.title} | Bandaranayake College, Gampaha`;
    window.scrollTo(0, 0);
  }, [current]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.05 }
    );
    const el = pageRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
      observer.disconnect();
    };
  }, [normalizedSlug]);

  const handleBackToHome = useCallback((e) => {
    e.preventDefault();
    sessionStorage.setItem('skipLoading', 'true');
    sessionStorage.setItem('scrollToSection', 'top');
    window.location.assign('/');
  }, []);

  if (!current) return null;

  return (
    <main className={`life-detail life-detail--${normalizedSlug}`}>
      <a className="life-detail-skip" href="#life-detail-main">
        Skip to main content
      </a>
      <MenuBar />
      <div ref={pageRef} className="life-detail-top-wrapper">
        <div className={`life-content-group ${visible ? 'visible' : ''}`}>
          <div className="section-container life-detail-return">
            <a href="/" onClick={handleBackToHome} className="life-detail-return-btn">
              <svg
                className="return-arrow-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>HOME</span>
            </a>
          </div>

          {/* Intro Section */}
          <section id="life-detail-main" className="life-detail-intro">
            <p className="life-detail-kicker">BANDARANAYAKE COLLEGE</p>
            <h1>{current.title}</h1>
            <p className="life-detail-description">{current.overview}</p>
          </section>

          <div className="section-container life-detail-container">
            {/* Feature Banner Card */}
            {current.subtitle && (
              <section className={`life-detail-feature ${current.accent || 'maroon'}`}>
                <img className="life-detail-feature-image" src={HERO_BANNER_IMAGE} alt="Bandaranayake College campus" />
                <div className="life-detail-feature-shade" />
                <div className="life-detail-feature-body">
                  <span className="life-detail-feature-label">{current.label}</span>
                  <h2>{current.subtitle}</h2>
                  <p>{current.description}</p>
                </div>
              </section>
            )}

            {/* Highlights Grid */}
            <div className="life-detail-highlights">
              {current.highlights.map((item) => (
                <div className="life-detail-highlight" key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Past papers preview — the full downloads page lives at a separate route. */}
            {normalizedSlug === 'academic-excellence' && (
              <section className="life-detail-past-papers" aria-labelledby="past-papers-title">
                <div className="life-detail-past-papers-copy">
                  <span className="life-detail-past-papers-eyebrow">STUDY RESOURCES</span>
                  <h2 id="past-papers-title">Past Papers</h2>
                  <p>
                    Prepare with confidence using past examination papers. Explore
                    previous G.C.E. O/L and A/L papers to practise questions,
                    understand exam patterns, and strengthen your revision.
                  </p>
                  <a className="life-detail-past-papers-link" href="/past-papers">
                    View All
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      aria-hidden="true">
                      <path d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  </a>
                </div>
                <div className="life-detail-past-papers-art" aria-hidden="true">
                  <svg viewBox="0 0 120 120" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="29" y="22" width="63" height="79" rx="7" />
                    <path d="M42 42h37M42 55h37M42 68h23" />
                    <path d="M20 39v60a9 9 0 0 0 9 9h49" />
                    <path d="M71 81v10m-5-5 5 5 5-5" />
                  </svg>
                </div>
              </section>
            )}

            {/* Render Timeline for About Us */}
            {normalizedSlug === 'about-us' && <Timeline />}

            {/* Directory Listings */}
            {normalizedSlug === 'sports-societies' && (
              <>
                <SocietiesListing />
                <SchoolContentListing kind="sports" />
              </>
            )}
            {normalizedSlug === 'leadership' && <SchoolContentListing kind="leadership" />}

            {/* Shared Bento Explore More Section */}
            <LifeAsNayakenz currentSlug={normalizedSlug} />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}