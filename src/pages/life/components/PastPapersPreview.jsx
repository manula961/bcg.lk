import React from 'react';

/** Study-resource preview displayed only on the academic life page. */
export default function PastPapersPreview() {
  return (
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
  );
}
