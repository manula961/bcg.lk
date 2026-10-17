import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import './LifeDetailPage.css';
import MenuBar from '../components/MenuBar';
import Footer from '../components/Footer';
import SocietiesListing from './SocietiesListing';
import SchoolContentListing from './SchoolContentListing';
import Timeline from '../components/ui/Timeline';
import LifeAsNayakenz from '../components/LifeAsNayaken';

const HERO_BANNER_IMAGE = 'https://bcg.lk/img/banner1.jpg';

export const lifePages = Object.freeze({
  'about-us': {
    label: 'ABOUT US',
    title: 'About Us',
    subtitle: 'Legacy, Vision & Century of Distinction',
    description: 'Discover our founding heritage, transformative vision, and century-old citadel of holistic education.',
    accent: 'maroon',
    overview: 'Bandaranayake College Gampaha is the premier Buddhist national school for boys in the Gampaha District, nurturing over 5,000 students in a tradition of moral integrity, academic excellence, and visionary leadership.',
    highlights: [
      { value: '1918', label: 'FOUNDED SEPT 18' },
      { value: '5,000+', label: 'STUDENT POPULATION' },
      { value: 'National', label: 'SCHOOL STATUS' },
    ],
    sections: [
      {
        heading: 'Founding & Historical Evolution',
        copy: 'Established on September 18, 1918, as "Henarathgoda Seewali Buddhist School" under founding Principal Mr. Charles Samarasooriya, the institution laid the bedrock for Buddhist education in Gampaha.',
      },
      {
        heading: 'Vision',
        copy: 'To empower well-rounded, morally upright, and visionary young leaders equipped to excel in global challenges while preserving timeless cultural and social values.',
      },
      {
        heading: 'Mission',
        copy: 'To nurture an inspiring generation fortified with moral integrity, intellectual vigor, and social responsibility, fostering a spiritually fertile and enlightened society.',
      },
    ],
  },
  'academic-excellence': {
    label: 'THE NAYAKENZ WAY',
    title: 'Academic Excellence',
    subtitle: 'Intellectual Ambition, Innovation & Distinction',
    description: 'Guided by dedicated educators, our students consistently achieve top provincial and island-wide standings across all disciplines.',
    accent: 'maroon',
    overview: 'A century-old tradition of academic rigor supported by comprehensive subject pathways, practical scientific discovery, and dedicated mentorship.',
    highlights: [
      { value: '1918', label: 'COLLEGE FOUNDED' },
      { value: '87', label: 'THREE-A PASSES (2025 A/L)' },
      { value: 'Science', label: 'EXPLORATION BEYOND CLASSROOM' },
    ],
    sections: [
      {
        heading: 'Pathways for Every Ambition',
        copy: 'The college provides comprehensive G.C.E. Advanced Level learning across Physical Science, Biological Science, Commerce, Arts, and Technology streams.',
      },
    ],
  },
  'sports-societies': {
    label: 'CHAMPIONS',
    title: 'Sports & Societies',
    subtitle: 'Resilience, Teamwork & Unyielding Brotherhood',
    description: 'Spanning 15 competitive athletic disciplines and 15 student associations, Nayakenz champion pride and leadership.',
    accent: 'blue',
    overview: 'Athletics and co-curricular societies form a cornerstone of student life at Bandaranayake College instilling discipline and creative leadership.',
    highlights: [
      { value: '4', label: 'HISTORIC HOUSES' },
      { value: '15', label: 'SPORTS DISCIPLINES' },
      { value: '15+', label: 'STUDENT ASSOCIATIONS' },
    ],
    sections: [],
  },
  'leadership': {
    label: 'LEADERSHIP',
    title: 'Leadership',
    subtitle: 'Executive Leadership & Strategic Governance',
    description: 'Distinguished administrative leaders guiding the academic rigor, moral integrity, and modern infrastructure of Bandaranayake College.',
    accent: 'maroon',
    overview: 'Our executive leadership steers strategic vision, academic rigor, character building, and campus governance.',
    highlights: [
      { value: 'Principal', label: 'EXECUTIVE HEAD' },
      { value: '5,000+', label: 'STUDENTS GUIDED' },
      { value: 'Governance', label: 'ACADEMIC STEWARDSHIP' },
    ],
    sections: [],
  },
});

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
    <main className="life-detail">
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

            {/* Highlights Grid (Side-by-side on Mobile) */}
            <div className="life-detail-highlights">
              {current.highlights.map((item) => (
                <div className="life-detail-highlight" key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

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