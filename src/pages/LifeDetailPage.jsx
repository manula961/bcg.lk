import React, { useEffect, useRef, useState } from 'react';
import './LifeDetailPage.css';
import MenuBar from '../components/MenuBar';
import Footer from '../components/Footer';
import SocietiesListing from './SocietiesListing';
import SchoolContentListing from './SchoolContentListing';
import Timeline from '../components/ui/Timeline';

const image = 'https://bcg.lk/img/banner1.jpg';

export const lifePages = Object.freeze({
  'about-us': {
    label: 'Nayakenz Heritage',
    title: 'About Us',
    subtitle: 'Our History, Vision & Institutional Legacy',
    description: "The premier Buddhist boys' national school in Gampaha, and one of Sri Lanka's leading boys' schools, founded on September 18, 1918.",
    accent: 'maroon',
    overview: 'Bandaranayake College Gampaha (Sinhala: බණ්ඩාරනායක විද්‍යාලය ගම්පහ) is the premier Buddhist boys’ national school in Gampaha and one of the leading boys’ schools in the island, nurturing a student population exceeding 5,000.',
    highlights: [
      { value: '1918', label: 'FOUNDED SEPT 18' },
      { value: '5,000+', label: 'STUDENT POPULATION' },
      { value: 'National', label: 'SCHOOL STATUS' },
    ],
    sections: [
      {
        heading: 'Founding & Historical Evolution',
        copy: 'Established on September 18, 1918, as "Henarathgoda Seewali Buddhist School" at the location where Yashodara Devi Balika Vidyalaya is situated at present, with Mr. Charles Samarasooriya serving as the first principal. It was later transformed into Henarathgoda Senior Secondary School, and in 1949, re-established at its current location as "Henarathgoda Secondary English School" under Principal Mr. Jinadasa Munasinghe. Having operated as a mixed school up to the 1980s, the institution steadily advanced in educational standing, promoted as a First Grade School, and elevated to National Level status as Bandaranayake College on May 25, 1993.',
      },
      {
        heading: 'Vision',
        copy: 'Giving out Students with a great Personality into the world, who can succeed in future challenges while protecting the Social Values.',
      },
      {
        heading: 'Mission',
        copy: 'Endowment of an inspiring younger generation fortified with morals, virtues and intelligence in order to create a spiritually fertile society.',
      },
      {
        heading: 'Infrastructure & Campus Development',
        copy: 'Under the guidance of Principal Ven. Labuthale Sudassana Thero starting in 2006, a new development era was launched. Through the untiring efforts of the Principal, tutorial staff, parents, Past Pupils’ Association (PPA), and well-wishers, the college executed major projects including an international-standard swimming pool, volleyball and badminton courts, playground expansions, a re-established canteen, and campus transport.',
      },
    ],
  },
  'academic-excellence': {
    label: 'The Nayakenz Way',
    title: 'Academic Excellence',
    subtitle: 'Learning, ambition and opportunity',
    description: 'Guided by dedicated teachers, our students consistently achieve top provincial and national standings.',
    accent: 'maroon',
    overview: 'A tradition of learning supported by subject choice, practical exploration and the dedication of the college community across 60 parallel classes from Grade 6 to Grade 13.',
    highlights: [
      { value: '1918', label: 'COLLEGE FOUNDED' },
      { value: '87', label: 'THREE-A PASSES IN 2025 A/L' },
      { value: 'Science', label: 'EXPLORATION BEYOND CLASSROOM' },
    ],
    sections: [
      { heading: 'Pathways for every ambition', copy: 'The college offers Advanced Level learning across Mathematics, Agriculture, Commerce, and Arts streams with 3 foreign languages and 24 subjects, including English medium instruction started in 2002. Over 130 students enter national and international higher education institutes annually.' },
      { heading: 'Excellence in national examinations', copy: 'The Past Pupils Association reported 87 students with three A passes in the 2025 G.C.E. Advanced Level examination. Its April 2026 report also highlighted national rankings in Engineering Technology and Commerce.' },
      { heading: 'Learning through discovery', copy: 'The Bandaranayake College Science Society describes workshops, exhibitions and competitions that encourage scientific curiosity. Its Vishwabhiyathra annual science day creates opportunities for students to share ideas and take part in science-related challenges.' },
    ],
  },
  'sports-societies': {
    label: 'Nayakenz Spirit',
    title: 'Sports & Societies',
    subtitle: 'Strength, teamwork and sportsmanship',
    description: 'From 15 sports disciplines to 15 student associations, Nayakenz carry the BCG spirit with pride across athletic and co-curricular domains.',
    accent: 'blue',
    overview: 'Sport and student societies form an integral pillar of life at Bandaranayake College, fostering resilience, discipline, creative expression, and unwavering brotherhood.',
    highlights: [
      { value: '4', label: 'SCHOOL HOUSES' },
      { value: '15', label: 'SPORTS DISCIPLINES' },
      { value: '15+', label: 'STUDENT ASSOCIATIONS' },
    ],
    sections: [
      {
        heading: 'Athletic Tradition & House Pride',
        copy: 'Every student belongs to one of four historic houses named after distinguished ancient Kings of Sri Lanka: Vijaya, Gamunu, Thissa, and Parakrama. The annual inter-house athletic meet stands as a premier highlight where students compete across track, field, and indoor sports.',
      },
      {
        heading: 'Competitive Sports & Co-Curricular Excellence',
        copy: 'The college fields competitive teams in 15 sports including cricket, volleyball, badminton, swimming, and athletics. Students also participate in 15 student associations and have won international awards in dancing, music, and visual arts.',
      }
    ],
  },
  'leadership': {
    label: 'Leadership',
    title: 'School Administration',
    subtitle: 'Executive Leadership & Governance',
    description: 'Verified senior school administrative staff guiding the academic, moral, and physical development of Bandaranayake College Gampaha.',
    accent: 'maroon',
    overview: 'Our administrative leadership directs the strategic vision, academic rigor, character development, and campus governance for over 5,000 students across Bandaranayake College.',
    highlights: [
      { value: 'Principal', label: 'EXECUTIVE HEAD' },
      { value: '5,000+', label: 'STUDENTS GUIDED' },
      { value: 'Administration', label: 'SCHOOL GOVERNANCE' },
    ],
    sections: [],
  },
});

const labels = Object.entries(lifePages);

const detailedHouses = [
  {
    id: 'vijaya',
    name: 'Vijaya House',
    color: 'Red',
    description: 'Symbolizing courage, passion, and competitive vigor, Vijaya House inspires athletes to push past physical limitations.',
  },
  {
    id: 'gamunu',
    name: 'Gamunu House',
    color: 'Blue',
    description: 'Named in honor of King Dutugemunu, Gamunu House stands for strategic unity, resilience, and tactical focus.',
  },
  {
    id: 'thissa',
    name: 'Thissa House',
    color: 'Green',
    description: 'Named after King Devanampiya Tissa, Thissa House emphasizes endurance, moral strength, and persistent determination.',
  },
  {
    id: 'parakrama',
    name: 'Parakrama House',
    color: 'Yellow',
    description: 'Inspired by King Parakramabahu the Great, Parakrama House drives competitors to aim for grand achievement and victory.',
  },
];

export default function LifeDetailPage({ slug }) {
  const normalizedSlug = slug ? decodeURIComponent(slug).toLowerCase().trim().replace(/\s+/g, '-') : 'about-us';
  const current = lifePages[normalizedSlug] || lifePages['about-us'];
  const pageRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!current) return;
    const oldTitle = document.title;
    document.title = `${current.title} | Bandaranayake College, Gampaha`;
    window.scrollTo(0, 0);
    return () => { document.title = oldTitle; };
  }, [slug, current]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.05, rootMargin: '0px 0px -10% 0px' }
    );
    if (pageRef.current) observer.observe(pageRef.current);
    return () => observer.disconnect();
  }, [slug]);

  if (!current) return null;

  const handleBackToHome = (e) => {
    e.preventDefault();
    sessionStorage.setItem('skipLoading', 'true');
    sessionStorage.setItem('scrollToSection', 'top');
    window.location.assign('/');
  };

  const handleMenuNavigation = (event) => {
    const item = event.target.closest?.('.menu-nav-item');
    if (!item) return;
    const label = item.querySelector('.menu-title')?.textContent;
    const destinations = {
      Home: 'home',
      News: 'news',
      Events: 'events',
      Explore: 'explore',
      'Extra Curricular': 'extracurricular',
    };
    if (destinations[label]) {
      event.stopPropagation();
      sessionStorage.setItem('skipLoading', 'true');
      sessionStorage.setItem('scrollToSection', destinations[label]);
      window.location.assign('/');
    }
  };

  return (
    <main className="life-detail">
      <a className="life-detail-skip" href="#life-detail-main">Skip to content</a>
      <div onClickCapture={handleMenuNavigation}>
        <MenuBar />
      </div>

      <div ref={pageRef} className="life-detail-top-wrapper">
        <div className={`life-content-group ${visible ? 'visible' : ''}`}>
          <div className="section-container life-detail-return">
            <a href="/" onClick={handleBackToHome} className="life-detail-return-btn">
              <svg className="return-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>HOME</span>
            </a>
          </div>

          <section id="life-detail-main" className="life-detail-intro" aria-labelledby="life-detail-title">
            <p className="life-detail-eyebrow">{current.label}</p>
            <h1 id="life-detail-title">{current.title}</h1>
            <p className="life-detail-description">{current.overview}</p>
          </section>

          <div className="section-container life-detail-container">
            {/* Feature Banner Card */}
            {current.subtitle && (
              <section className={`life-detail-feature ${current.accent || 'maroon'}`} aria-label={current.title}>
                <img className="life-detail-feature-image" src={image} alt="Bandaranayake College campus" />
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

            {/* Narrative Sections */}
            {current.sections && current.sections.length > 0 && (
              <div className="life-detail-stories" style={{ marginTop: 'clamp(24px, 4vw, 48px)' }}>
                {current.sections.map((section, index) => (
                  <article className="life-detail-story-card" key={section.heading}>
                    <span className="life-detail-story-number">0{index + 1}</span>
                    <div>
                      <h3>{section.heading}</h3>
                      <p>{section.copy}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Inter-House Division for Sports & Societies */}
            {normalizedSlug === 'sports-societies' && (
              <div className="house-showcase-section">
                <div className="life-detail-section-heading">
                  <p className="life-detail-kicker">INTER-HOUSE DIVISION</p>
                  <h2>The Four Houses</h2>
                  <p className="life-detail-description">
                    Every Nayaken belongs to one of four historic houses named after distinguished ancient Kings of Sri Lanka, competing annually in major games.
                  </p>
                </div>

                <div className="house-showcase-grid">
                  {detailedHouses.map((house, index) => (
                    <div key={house.id} className={`house-card-modern house-card-${house.id}`}>
                      <div className="house-card-header">
                        <span className="house-card-num">0{index + 1}</span>
                      </div>
                      <span className="house-card-tag">{house.color}</span>
                      <div>
                        <h3 className="house-card-title">{house.name}</h3>
                        <p className="house-card-desc">{house.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Render Scroll Timeline for About Us */}
            {normalizedSlug === 'about-us' && <Timeline />}

            {/* Directory & Profile Listings */}
            {normalizedSlug === 'sports-societies' && <SocietiesListing />}
            {normalizedSlug === 'sports-societies' && <SchoolContentListing kind="sports" />}
            {normalizedSlug === 'leadership' && <SchoolContentListing kind="leadership" />}

            {/* Explore More Cards Section */}
            <section className="life-detail-explore" aria-labelledby="life-detail-explore-title">
              <div className="life-detail-section-heading">
                <p className="life-detail-kicker">EXPLORE MORE</p>
                <h2 id="life-detail-explore-title">Life As A Nayaken</h2>
              </div>
              <div className="life-detail-grid">
                {labels.filter(([key]) => key !== normalizedSlug).map(([key, page]) => (
                  <a key={key} className={`life-detail-card ${page.accent}`} href={`/life/${key}`}>
                    <img src={image} alt="" loading="lazy" />
                    <span className="life-detail-card-shade" />
                    <span className="life-detail-card-arrow" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
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
        </div>
      </div>
      <Footer />
    </main>
  );
}