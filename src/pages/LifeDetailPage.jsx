import React, { useEffect, useRef, useState } from 'react';
import './LifeDetailPage.css';
import MenuBar from '../components/MenuBar';
import Footer from '../components/Footer';
import SocietiesListing from './SocietiesListing';
import SchoolContentListing from './SchoolContentListing';

const image = 'https://bcg.lk/img/banner1.jpg';

export const lifePages = Object.freeze({
  'about-us': {
    label: 'About Us',
    title: 'About Us',
    subtitle: 'Our History, Vision & Service',
    description: 'Discover our founding history, vision, mission, and century-long citadel of learning.',
    accent: 'maroon',
    overview: 'Founded with a vision to nurture wisdom and character, Bandaranayake College stands as a citadel of secondary education in Sri Lanka.',
    highlights: [
      { value: '1918', label: 'Year Established' },
      { value: '108+', label: 'Years of Service' },
      { value: 'Citadel', label: 'Of Wisdom & Character' },
    ],
    sections: [
      {
        heading: 'Our Founding & Legacy',
        copy: 'Established to provide quality education and foster leadership, Bandaranayake College has grown into a prestigious seat of learning, producing nation-builders across every field.',
      },
      {
        heading: 'Vision & Educational Mission',
        copy: 'Our mission is to empower students through balanced academic excellence, moral integrity, physical vitality, and strong social responsibility.',
      },
      {
        heading: 'Community & Brotherhood',
        copy: 'Generations of Nayakenz remain united by shared values, honor, and an enduring commitment to serving our motherland.',
      },
    ],
  },
  'academic-excellence': {
    label: 'Academic Excellence',
    title: 'Academic Excellence',
    subtitle: 'Learning, ambition and opportunity',
    description: 'Guided by dedicated teachers, our students consistently achieve top provincial and national standings.',
    accent: 'maroon',
    overview: 'A tradition of learning supported by subject choice, practical exploration and the dedication of the college community.',
    highlights: [
      { value: '1918', label: 'College founded' },
      { value: '87', label: 'Three-A passes reported for the 2025 A/L examination' },
      { value: 'Science', label: 'Exploration beyond the classroom' },
    ],
    sections: [
      { heading: 'Pathways for every ambition', copy: 'The college describes Advanced Level learning across Mathematics, Agriculture, Commerce and Arts, with foreign-language opportunities and examination-focused programmes. These pathways give students room to develop their strengths as they prepare for higher education.' },
      { heading: 'Excellence in national examinations', copy: 'The Past Pupils Association reported 87 students with three A passes in the 2025 G.C.E. Advanced Level examination. Its April 2026 report also highlighted national rankings in Engineering Technology and Commerce. These are results for that specific examination, not a claim about every year.' },
      { heading: 'Learning through discovery', copy: 'The Bandaranayake College Science Society describes workshops, exhibitions and competitions that encourage scientific curiosity. Its Vishwabhiyathra annual science day creates opportunities for students to share ideas and take part in science-related challenges.' },
    ],
  },
  'sports-societies': {
    label: 'Sports & Societies',
    title: 'Sports & Societies',
    subtitle: 'Strength, teamwork and sportsmanship',
    description: 'From cricket to athletics and student-led clubs, Nayakenz carry the BCG spirit with pride across sports and co-curricular domains.',
    accent: 'blue',
    overview: 'Sport and student societies form an integral pillar of life at Bandaranayake College, fostering resilience, discipline, creative expression, and unwavering brotherhood.',
    highlights: [
      { value: '4', label: 'School houses' },
      { value: '2005', label: 'District cricket title recorded in college history' },
      { value: 'Teamwork', label: 'On and off the field' },
    ],
    sections: [
      {
        heading: 'Athletic Tradition & House Pride',
        copy: 'The annual inter-house athletic meet stands as one of the most anticipated highlights of the college calendar. Students represent Vijaya, Gamunu, Thissa, and Parakrama, demonstrating individual athletic strength and collective team dedication in track and field sports.',
      },
      {
        heading: 'Competitive Discipline Across Sports',
        copy: 'Beyond internal house rivalries, college teams actively compete across provincial and national tournaments in cricket, volleyball, hockey, wrestling, karate, and athletics. Training regimes focus on tactical mastery and mental endurance.',
      }
    ],
  },
  'leadership': {
    label: 'Leadership',
    title: 'Leadership',
    subtitle: 'Responsibility, initiative and service',
    description: 'Leadership at Bandaranayake College grows through service, teamwork, discipline and contributions to school life.',
    accent: 'blue',
    overview: 'The college s vision highlights character, future readiness and social values. Student leadership can take many forms, from school responsibilities and collaborative societies to long-standing cadet traditions.',
    highlights: [
      { value: 'Character', label: 'The college s stated educational vision' },
      { value: '1927', label: 'Year the school says its cadet platoon began' },
      { value: 'Service', label: 'Leadership through contribution' },
    ],
    sections: [
      { heading: 'Values that guide leadership', copy: 'The college s published vision describes developing students with strong personalities who can meet future challenges while protecting social values. Its mission also emphasises morals, virtues and intelligence. These are school-wide aims, not a list of current student office holders.' },
      { heading: 'Discipline and cadet tradition', copy: 'The official cadet platoon history dates the establishment of the school s senior cadet platoon to 1927. It also records the 1994 Herman Loos Trophy, illustrating a historical tradition of discipline, coordination and commitment.' },
      { heading: 'Leadership beyond a title', copy: 'The school s clubs and societies include Scouts, Interact Club, Environment Pioneer Brigade, Red Cross Unit and Traffic Warden Unit. Participation offers opportunities to practise communication, cooperation and service; responsibilities and membership may differ by year.' },
    ],
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
    description: 'Named in honor of steadfast leadership, Gamunu House stands for strategic unity, resilience, and tactical focus.',
  },
  {
    id: 'thissa',
    name: 'Thissa House',
    color: 'Green',
    description: 'Embodying endurance and steady growth, Thissa House emphasizes disciplined athletic training and persistent determination.',
  },
  {
    id: 'parakrama',
    name: 'Parakrama House',
    color: 'Yellow',
    description: 'Representing energy and grand ambition, Parakrama House drives competitors to aim for victory and peak performance.',
  },
];

export default function LifeDetailPage({ slug }) {
  const normalizedSlug = slug ? decodeURIComponent(slug).toLowerCase().trim().replace(/\s+/g, '-') : '';
  const current = lifePages[normalizedSlug] || lifePages[slug];
  const pageRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!current) return;
    const oldTitle = document.title;
    document.title = current.title + ' | Bandaranayake College, Gampaha';
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
    const item = event.target.closest?.(".menu-nav-item");
    if (!item) return;
    const label = item.querySelector(".menu-title")?.textContent;
    const destinations = {
      Home: "home",
      News: "news",
      Events: "events",
      Explore: "explore",
      "Extra Curricular": "extracurricular",
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
              <span>BACK</span>
            </a>
          </div>

          <section id="life-detail-main" className="life-detail-intro" aria-labelledby="life-detail-title">
            <p className="life-detail-kicker">EXPERIENCE IT</p>
            <p className="life-detail-eyebrow">{current.label}</p>
            <h1 id="life-detail-title">{current.title}</h1>
            <p className="life-detail-description">{current.description}</p>
          </section>

          <div className="section-container life-detail-container">
            {/* Main Feature Card */}
            <section className={'life-detail-feature ' + current.accent} aria-label={current.title}>
              <img className="life-detail-feature-image" src={image} alt="Bandaranayake College campus" />
              <div className="life-detail-feature-shade" />
              <div className="life-detail-feature-body">
                <span className="life-detail-feature-label">{current.label}</span>
                <h2>{current.subtitle}</h2>
                <p>{current.description}</p>
              </div>
            </section>

            {/* Editorial Story Section */}
            <section className="life-detail-story" aria-labelledby="life-detail-story-title">
              <div className="life-detail-section-heading">
                <p className="life-detail-kicker">DISCOVER THE STORY</p>
                <h2 id="life-detail-story-title">{current.title} at Bandaranayake</h2>
                <p className="life-detail-description">{current.overview}</p>
              </div>

              <div className="life-detail-highlights">
                {current.highlights.map((item) => (
                  <div className="life-detail-highlight" key={item.label}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* House Division Editorial Grid for Sports & Societies */}
              {normalizedSlug === 'sports-societies' && (
                <div className="house-showcase-section">
                  <div className="life-detail-section-heading">
                    <p className="life-detail-kicker">INTER-HOUSE DIVISION</p>
                    <h2>The Four Houses</h2>
                    <p className="life-detail-description">
                      Every Nayaken belongs to one of four historic houses, competing annually in track, field, and indoor championships.
                    </p>
                  </div>

                  <div className="house-showcase-grid">
                    {detailedHouses.map((house, index) => (
                      <div key={house.id} className={`house-card-modern house-card-${house.id}`}>
                        <div className="house-card-header">
                          <span className="house-card-num">0{index + 1}</span>
                          <span className="house-card-tag">{house.color}</span>
                        </div>
                        <div>
                          <h3 className="house-card-title">{house.name}</h3>
                          <p className="house-card-desc">{house.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Editorial Articles */}
              {current.sections.length > 0 && (
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
            </section>

            {/* Directories */}
            {normalizedSlug === 'sports-societies' && <SocietiesListing />}
            {normalizedSlug === 'sports-societies' && <SchoolContentListing kind="sports" />}
            {normalizedSlug === 'sports-societies' && <SchoolContentListing kind="extracurricular" />}
            {normalizedSlug === 'leadership' && <SchoolContentListing kind="leadership" />}

            {/* Explore More Cards Section */}
            <section className="life-detail-explore" aria-labelledby="life-detail-explore-title">
              <div className="life-detail-section-heading">
                <p className="life-detail-kicker">EXPLORE MORE</p>
                <h2 id="life-detail-explore-title">Life As A Nayaken</h2>
              </div>
              <div className="life-detail-grid">
                {labels.filter(([key]) => key !== normalizedSlug).map(([key, page]) => (
                  <a key={key} className={'life-detail-card ' + page.accent} href={'/life/' + key}>
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