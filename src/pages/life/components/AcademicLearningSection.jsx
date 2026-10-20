import React from 'react';

const learningPillars = [
  {
    index: '01',
    title: 'Build Strong Foundations',
    description: 'Develop understanding across subject areas, with a focus on curiosity, confidence and steady academic growth.',
  },
  {
    index: '02',
    title: 'Think Beyond the Textbook',
    description: 'Connect classroom ideas to practical challenges through exploration, questioning and independent thinking.',
  },
  {
    index: '03',
    title: 'Prepare with Purpose',
    description: 'Create study routines, revisit difficult topics and use examination practice to measure progress over time.',
  },
];

/** Complements the existing highlights and Past Papers preview. */
export default function AcademicLearningSection() {
  return (
    <section className="life-detail-learning" aria-labelledby="academic-learning-title">
      <header className="life-detail-learning-heading">
        <p className="life-detail-kicker">THE LEARNING JOURNEY</p>
        <h2 id="academic-learning-title">Learning That Goes Further</h2>
        <p>Academic excellence is built on strong habits, new ideas and a willingness to keep improving.</p>
      </header>
      <div className="life-detail-learning-grid">
        {learningPillars.map((pillar) => (
          <article className="life-detail-learning-card" key={pillar.index}>
            <span className="life-detail-learning-index">{pillar.index}</span>
            <h3>{pillar.title}</h3>
            <p>{pillar.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
