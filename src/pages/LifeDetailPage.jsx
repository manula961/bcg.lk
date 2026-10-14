import React, { useEffect } from 'react';
import './LifeDetailPage.css';
import MenuBar from '../components/MenuBar';
import Footer from '../components/Footer';

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
    overview: 'A tradition of learning supported by subject choice, practical exploration and the dedication of the college community.',
    highlights: [
      { value: '1918', label: 'College founded' },
      { value: '87', label: 'Three-A passes reported for the 2025 A/L examination' },
      { value: 'Science', label: 'Exploration beyond the classroom' },
    ],
    sections: [
      { heading: 'Pathways for every ambition', copy: 'The college describes Advanced Level learning across Mathematics, Agriculture, Commerce and Arts, with foreign-language opportunities and examination-focused programmes. These pathways give students room to develop their strengths as they prepare for higher education.', source: 'https://bcg.lk/about_us', sourceLabel: 'College — About Us' },
      { heading: 'Excellence in national examinations', copy: 'The Past Pupils’ Association reported 87 students with three A passes in the 2025 G.C.E. Advanced Level examination. Its April 2026 report also highlighted national rankings in Engineering Technology and Commerce. These are results for that specific examination, not a claim about every year.', source: 'https://www.bcoba.lk/view/?news=p20260404135704', sourceLabel: 'Past Pupils’ Association — 2025 A/L results' },
      { heading: 'Learning through discovery', copy: 'The Bandaranayake College Science Society describes workshops, exhibitions and competitions that encourage scientific curiosity. Its Vishwabhiyathra annual science day creates opportunities for students to share ideas and take part in science-related challenges.', source: 'https://bcss.lk/', sourceLabel: 'Bandaranayake College Science Society' },
    ],
  },
  'sports-athletics': {
    title: 'Sports & Athletics',
    label: 'CHAMPIONS',
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
      { heading: 'Four houses, one college spirit', copy: 'The college names four houses — Vijaya (red), Gamunu (blue), Thissa (green) and Parakrama (yellow). The school describes inter-house games as an opportunity for students to test their skills and contribute to their teams.', source: 'https://bcg.lk/about_us', sourceLabel: 'College — About Us' },
      { heading: 'A record across many sports', copy: 'The school’s published sports history covers athletics, wrestling, karate, volleyball, hockey and cricket. Its historical records include the 2005 Gampaha District cricket championship and the 2005 Western Province volleyball championship.', source: 'https://bcg.lk/sports_achievements', sourceLabel: 'College — Sports Achievements' },
      { heading: 'Developing character through competition', copy: 'Training and competition can teach responsibility, preparation, resilience and respect for teammates and opponents. The same qualities support the college’s wider emphasis on personal growth beyond academic lessons.', source: 'https://bcg.lk/about_us', sourceLabel: 'College — About Us' },
    ],
  },
  'arts-culture': {
    title: 'Arts & Culture',
    label: 'EXPRESSION',
    subtitle: 'Creativity, drama, music and tradition',
    description: 'Drama, music, and tradition.',
    accent: 'maroon',
    overview: 'Music, performance, student media and creative societies add expression and tradition to the Nayakenz experience.',
    highlights: [
      { value: '1963', label: 'Eastern school band began' },
      { value: '1992–94', label: 'Eastern Cadet Band title run' },
      { value: 'Creative', label: 'Voices across campus' },
    ],
    sections: [
      { heading: 'The sound of tradition', copy: 'The Eastern Cadet Band traces its beginnings to 1963. The college records three consecutive All-Island championships from 1992 through 1994, marking a significant chapter in its musical history.', source: 'https://bcg.lk/cadet_band_eastern', sourceLabel: 'College — Eastern Cadet Band' },
      { heading: 'Performance and artistic expression', copy: 'The college describes achievements in dancing, music and the arts, alongside both Eastern and Western bands. The Western Band traces its origins to 1989, with involvement in school ceremonies and inter-house sporting events.', source: 'https://bcg.lk/cadet_band_western', sourceLabel: 'College — Western Cadet Band' },
      { heading: 'Student creativity and communication', copy: 'The college lists an Art Society, Photographic Art Society, Sinhala Debate & Oratory Forum and Media Unit among its student organisations. The Media Unit’s history includes Siyane Sara radio and Siyane Roo television projects.', source: 'https://bcg.lk/clubs_societies', sourceLabel: 'College — Clubs and Societies' },
    ],
  },
  'prefect-council': {
    title: 'Prefect Council',
    label: 'LEADERSHIP',
    subtitle: 'Service, responsibility and brotherhood',
    description: 'Service and brotherhood.',
    accent: 'blue',
    overview: 'Student leadership is an opportunity to practise responsibility, service and respect within the school community.',
    highlights: [
      { value: 'Service', label: 'Putting the school community first' },
      { value: 'Respect', label: 'Leading by example' },
      { value: '2025–26', label: 'Annual Prefects Day commemorated' },
    ],
    sections: [
      { heading: 'Leadership through service', copy: 'Prefectship is a student leadership role associated with responsibility and service to the school community. The values of good example, cooperation and fairness reflect the college’s stated emphasis on strong character and social values.', source: 'https://bcg.lk/', sourceLabel: 'College — Vision and Mission' },
      { heading: 'A tradition of recognition', copy: 'A programme for the Annual Prefects Day of Bandaranayake College, Gampaha, is documented for 2025–2026. It is a record of the school’s prefect tradition, rather than a claim about the currently serving board.', source: 'https://fliphtml5.com/BoardofPrefects_bandaranayakecollege/final-imm_compressed/', sourceLabel: 'Annual Prefects Day — 2025–2026 publication' },
      { heading: 'Growing together as Nayakenz', copy: 'Student leaders can support a positive school culture by showing consideration for younger pupils, communicating respectfully and helping with school activities. These are aims for responsible leadership, not a published list of duties or current appointments.', source: 'https://bcg.lk/', sourceLabel: 'College — Vision and Mission' },
    ],
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

  const handleMenuNavigation = (event) => {
    const item = event.target.closest?.(".menu-nav-item");
    if (!item) return;
    const label = item.querySelector(".menu-title")?.textContent;
    const destinations = { Home: "#home", News: "#news", Academics: "#academics", Explore: "#explore", "Extra Curricular": "#extracurricular" };
    if (destinations[label]) {
      event.stopPropagation();
      window.location.assign("/" + destinations[label]);
    }
  };

  return (
    <main className="life-detail">
      <a className="life-detail-skip" href="#life-detail-main">Skip to content</a>
      <div onClickCapture={handleMenuNavigation}><MenuBar /></div>
      <div className="section-container life-detail-return"><a href="/#extracurricular">← Back to Life as a Nayaken</a></div>

      <section id="life-detail-main" className="life-detail-intro" aria-labelledby="life-detail-title">
        <p className="life-detail-kicker">EXPERIENCE IT</p>
        <p className="life-detail-eyebrow">{current.label}</p>
        <h1 id="life-detail-title">{current.title}</h1>
        <p className="life-detail-description">{current.description}</p>
      </section>

      <div className="section-container life-detail-container">
        <section className={'life-detail-feature ' + current.accent} aria-label={current.title}>
          <img className="life-detail-feature-image" src={image} alt="Bandaranayake College campus" />
          <div className="life-detail-feature-shade" />
          <div className="life-detail-feature-body">
            <span className="life-detail-feature-label">{current.label}</span>
            <h2>{current.subtitle}</h2>
            <p>{current.description}</p>
          </div>
        </section>

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
                    Read the source <span aria-hidden="true">↗</span>
                    <span className="life-detail-visually-hidden">: {section.sourceLabel}</span>
                  </a>
                </div>
              </article>
            ))}
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
      <Footer />
    </main>
  );
}
