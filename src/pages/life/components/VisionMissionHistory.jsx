import React from "react";

const VALUES = [
  {
    num: "01",
    label: "VISION",
    title: "Vision",
    sinhalaTitle: "දැක්ම",
    english: "To achieve excellence in a virtuous society through a generation of capable children.",
    sinhala: "දක්ෂ දරු පිරිසක් මගින් යහපත් සමාජයක විශිෂ්ටත්වය කරා එළඹීම.",
    tone: "maroon",
  },
  {
    num: "02",
    label: "MISSION",
    title: "Mission",
    sinhalaTitle: "මෙහෙවර",
    english: "To nurture courageous sons with well-rounded personalities who uphold moral values and overcome future challenges, and offer them to the world.",
    sinhala: "අනාගත අභියෝග ජයග්‍රහණය කරන සාරධර්ම සුරකින, පූර්ණ පෞරුෂත්වයකින් යුතු දිරිමත් පුතුන් ලොවට දායාද කිරීම.",
    tone: "maroon",
  },
];


export default function VisionMissionHistory() {
  return (
    <>
      <section className="life-about-values" aria-labelledby="life-about-values-title">
        <div className="life-about-heading">
          <span className="life-about-eyebrow">WHAT GUIDES US</span>
          <h2 id="life-about-values-title">Our Vision &amp; Mission</h2>
          <p>Two guiding commitments that shape the Bandaranayake College community.</p>
        </div>
        <div className="life-about-values-grid">
          {VALUES.map((item) => (
            <article className={`life-about-value-card ${item.tone}`} key={item.num}>
              <h3>{item.title}</h3>
              <p className="life-about-value-en">{item.english}</p>
              <div className="life-about-language-divider" />
              <h4 lang="si" className="life-about-sinhala">{item.sinhalaTitle}</h4>
              <p lang="si" className="life-about-sinhala life-about-value-si">{item.sinhala}</p>
            </article>
          ))}
        </div>
      </section>

    </>
  );
}
