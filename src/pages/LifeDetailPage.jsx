import React, { useEffect, useRef, useState } from 'react';
import './LifeDetailPage.css';
import MenuBar from '../components/MenuBar';
import Footer from '../components/Footer';
import SocietiesListing from './SocietiesListing';

const image = 'https://bcg.lk/img/banner1.jpg';

export const lifePages = Object.freeze({
  'academic-excellence': {
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
      { heading: 'Pathways for every ambition', copy: 'The college describes Advanced Level learning across Mathematics, Agriculture, Commerce and Arts, with foreign-language opportunities and examination-focused programmes. These pathways give students room to develop their strengths as they prepare for higher education.', source: 'https://bcg.lk/about_us', sourceLabel: 'College • About Us' },
      { heading: 'Excellence in national examinations', copy: 'The Past Pupils’ Association reported 87 students with three A passes in the 2025 G.C.E. Advanced Level examination. Its April 2026 report also highlighted national rankings in Engineering Technology and Commerce. These are results for that specific examination, not a claim about every year.', source: 'https://www.bcoba.lk/view/?news=p20260404135704', sourceLabel: 'Past Pupils’ Association • 2025 A/L results' },
      { heading: 'Learning through discovery', copy: 'The Bandaranayake College Science Society describes workshops, exhibitions and competitions that encourage scientific curiosity. Its Vishwabhiyathra annual science day creates opportunities for students to share ideas and take part in science-related challenges.', source: 'https://bcss.lk/', sourceLabel: 'Bandaranayake College Science Society' },
    ],
  },
  'sports-athletics': {
    title: 'Sports & Athletics',
    subtitle: 'Strength, teamwork and sportsmanship',
    description: 'From cricket to athletics, our athletes carry the BCG spirit with pride at every national competition.',
    accent: 'blue',
    overview: 'Sport is part of college life: opportunities to compete, develop discipline, and represent the Nayakenz with pride.',
    highlights: [
      { value: '4', label: 'School houses' },
      { value: '2005', label: 'District cricket title recorded in college history' },
      { value: 'Teamwork', label: 'On and off the field' },
    ],
    sections: [
      { heading: 'Four houses, one college spirit', copy: 'The college names four houses — Vijaya (red), Gamunu (blue), Thissa (green) and Parakrama (yellow). The school describes inter-house games as an opportunity for students to test their skills and contribute to their teams.', source: 'https://bcg.lk/about_us', sourceLabel: 'College • About Us' },
      { heading: 'A record across many sports', copy: 'The school’s published sports history covers athletics, wrestling, karate, volleyball, hockey and cricket. Its historical records include the 2005 Gampaha District cricket championship and the 2005 Western Province volleyball championship.', source: 'https://bcg.lk/sports_achievements', sourceLabel: 'College • Sports Achievements' },
      { heading: 'Developing character through competition', copy: 'Training and competition can teach responsibility, preparation, resilience and respect for teammates and opponents. The same qualities support the college’s wider emphasis on personal growth beyond academic lessons.', source: 'https://bcg.lk/about_us', sourceLabel: 'College • About Us' },
    ],
  },
  'societies': {
    title: 'Societies',
    subtitle: 'Explore, collaborate and make your mark',
    description: 'Student societies bring ideas to life through science, technology, creativity, communication and community service.',
    accent: 'maroon',
    overview: 'Bandaranayake College lists societies and clubs across science, technology, creative arts, communication, service and the environment. These offer different ways for Nayakenz to explore interests beyond their subjects.',
    highlights: [
      { value: 'STEM', label: 'Science, computing and innovation' },
      { value: 'Creative', label: 'Media, photography and the arts' },
      { value: 'Service', label: 'Interact, scouts and community-minded groups' },
    ],
    sections: [
      { heading: 'Science, technology and discovery', copy: 'The school lists a Science Society, Computer Society, Technology Society, New Invention Society, Aeronautical Society and Union of Astronomy. Together they represent opportunities to pursue scientific curiosity, technical skills and new ideas. Specific current events should be confirmed with the relevant society.', source: 'https://bcg.lk/clubs_societies', sourceLabel: 'College • Clubs and Societies' },
      { heading: 'Creativity and communication', copy: 'The Media Unit, Photographic Art Society, Art Society, Sinhala Debate & Oratory Forum Society and Quiz Club represent a wide range of creative and communication interests. The college describes the Media Unit as connected with Siyanesara FM and SiyaneRoo TV.', source: 'https://bcg.lk/clubs_societies', sourceLabel: 'College • Clubs and Societies' },
      { heading: 'Citizenship and service', copy: 'The college also lists its Interact Club, Scouts, Environment Pioneer Brigade, Red Cross Unit and Traffic Warden Unit. These organisations offer different contexts for teamwork, service and responsibility beyond the classroom.', source: 'https://bcg.lk/clubs_societies', sourceLabel: 'College • Clubs and Societies' },
    ],
  },
  'leadership': {
    title: 'Leadership',
    subtitle: 'Responsibility, initiative and service',
    description: 'Leadership at Bandaranayake College grows through service, teamwork, discipline and contributions to school life.',
    accent: 'blue',
    overview: 'The college’s vision highlights character, future readiness and social values. Student leadership can take many forms, from school responsibilities and collaborative societies to long-standing cadet traditions.',
    highlights: [
      { value: 'Character', label: 'The college’s stated educational vision' },
      { value: '1927', label: 'Year the school says its cadet platoon began' },
      { value: 'Service', label: 'Leadership through contribution' },
    ],
    sections: [
      { heading: 'Values that guide leadership', copy: 'The college’s published vision describes developing students with strong personalities who can meet future challenges while protecting social values. Its mission also emphasises morals, virtues and intelligence. These are school-wide aims, not a list of current student office holders.', source: 'https://bcg.lk/', sourceLabel: 'College • Vision and Mission' },
      { heading: 'Discipline and cadet tradition', copy: 'The official cadet platoon history dates the establishment of the school’s senior cadet platoon to 1927. It also records the 1994 Herman Loos Trophy, illustrating a historical tradition of discipline, coordination and commitment.', source: 'https://bcg.lk/cadet_band_platoon', sourceLabel: 'College • Cadet Platoon' },
      { heading: 'Leadership beyond a title', copy: 'The school’s clubs and societies include Scouts, Interact Club, Environment Pioneer Brigade, Red Cross Unit and Traffic Warden Unit. Participation offers opportunities to practise communication, cooperation and service; responsibilities and membership may differ by year.', source: 'https://bcg.lk/clubs_societies', sourceLabel: 'College • Clubs and Societies' },
    ],
  },
});

const labels = Object.entries(lifePages);

export default function LifeDetailPage({ slug }) {
  const current = lifePages[slug];
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

  const handleMenuNavigation = (event) => {
    const item = event.target.closest?.(".menu-nav-item");
    if (!item) return;
    const label = item.querySelector(".menu-title")?.textContent;
    const destinations = {
      Home: "#home",
      News: "#news",
      Academics: "#academics",
      Explore: "#explore",
      "Extra Curricular": "#extracurricular",
    };
    if (destinations[label]) {
      event.stopPropagation();
      window.location.assign("/" + destinations[label]);
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
            <a href="/#extracurricular" className="life-detail-return-btn">
              <svg className="return-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back</span>
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

            {/* Editorial Story — hidden on Societies only */}
            {slug !== 'societies' && (
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

              <div className="life-detail-stories">
                {current.sections.map((section, index) => (
                  <article className="life-detail-story-card" key={section.heading}>
                    <span className="life-detail-story-number">0{index + 1}</span>
                    <div>
                      <h3>{section.heading}</h3>
                      <p>{section.copy}</p>
                      <a href={section.source} target="_blank" rel="noopener noreferrer">
                        Read more <span aria-hidden="true">→</span>
                        <span className="life-detail-visually-hidden">: {section.sourceLabel}</span>
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            )}

            {/* Render Societies Directory if active tab is societies */}
            {slug === 'societies' && <SocietiesListing />}

            {/* Explore More Cards Section */}
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