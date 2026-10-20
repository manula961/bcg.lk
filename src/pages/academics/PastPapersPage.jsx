import React, { useEffect, useMemo, useState } from 'react';
import MenuBar from '../../components/layout/MenuBar';
import Footer from '../../components/layout/Footer';
import BackButton from '../../navigation/BackButton';
import { pastPapers } from './pastPapersData';
import './PastPapersPage.css';

const ALL = 'All';
const unique = (items) => [ALL, ...new Set(items.filter(Boolean).map(String))]
  .sort((a, b) => a === ALL ? -1 : b === ALL ? 1 : b.localeCompare(a, undefined, { numeric: true }));
const searchable = (paper) => [paper.title, paper.subject, paper.year, paper.exam, paper.language, paper.term]
  .filter(Boolean).join(' ').toLowerCase();

export default function PastPapersPage() {
  const [search, setSearch] = useState('');
  const [exam, setExam] = useState(ALL);
  const [subject, setSubject] = useState(ALL);
  const [year, setYear] = useState(ALL);
  const [language, setLanguage] = useState(ALL);

  const exams = useMemo(() => unique(pastPapers.map((p) => p.exam)), []);
  const subjects = useMemo(() => unique(pastPapers.map((p) => p.subject)), []);
  const years = useMemo(() => unique(pastPapers.map((p) => p.year)), []);
  const languages = useMemo(() => unique(pastPapers.map((p) => p.language)), []);

  const filtered = useMemo(() => pastPapers.filter((paper) =>
    (exam === ALL || String(paper.exam) === exam) &&
    (subject === ALL || String(paper.subject) === subject) &&
    (year === ALL || String(paper.year) === year) &&
    (language === ALL || String(paper.language) === language) &&
    searchable(paper).includes(search.trim().toLowerCase())
  ).sort((a, b) => Number(b.year || 0) - Number(a.year || 0)), [search, exam, subject, year, language]);

  const isFiltering = Boolean(search || [exam, subject, year, language].some((value) => value !== ALL));
  const reset = () => { setSearch(''); setExam(ALL); setSubject(ALL); setYear(ALL); setLanguage(ALL); };

  useEffect(() => { document.title = 'Past Papers | Bandaranayake College, Gampaha'; }, []);

  const filterControl = (label, value, setter, options) => (
    <label className="papers-filter" key={label}>
      <span>{label}</span>
      <select value={value} onChange={(event) => setter(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option === ALL ? `All ${label.toLowerCase()}s` : option}</option>)}
      </select>
    </label>
  );

  return (
    <main className="papers-page">
      <a className="papers-skip" href="#papers-main">Skip to past papers</a>
      <MenuBar />
      <div className="papers-wrapper" id="papers-main">
        <div className="papers-inner">
          <div className="papers-return">
            <BackButton fallback="/life/academic-excellence" className="papers-return-btn">BACK</BackButton>
          </div>

          <header className="papers-hero">
            <div className="papers-hero-copy">
              <span className="papers-eyebrow"><span className="papers-eyebrow-line" /> ACADEMIC RESOURCES</span>
              <h1>Past <em>Papers.</em></h1>
              <p>Explore previous examination papers and prepare for your next exam with confidence. Find resources by subject, exam, year and medium.</p>
              <a href="#papers-library" className="papers-primary-link">Browse papers <span aria-hidden="true">↗</span></a>
            </div>
            <div className="papers-hero-mark" aria-hidden="true">
              <svg viewBox="0 0 150 160" fill="none"><rect x="36" y="16" width="84" height="112" rx="10" stroke="currentColor" strokeWidth="3"/><path d="M53 45h49M53 62h49M53 79h32" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M26 39v99a10 10 0 0 0 10 10h72" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M94 99v22m-10-10 10 10 10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </header>

          <section className="papers-library" id="papers-library" aria-labelledby="papers-library-title">
            <div className="papers-heading">
              <div>
                <span className="papers-kicker">RESOURCE LIBRARY</span>
                <h2 id="papers-library-title">Browse examination papers</h2>
                <p>Everything you need for focused revision, all in one place.</p>
              </div>
              <span className="papers-count">{filtered.length} {filtered.length === 1 ? 'paper' : 'papers'} available</span>
            </div>

            {pastPapers.length > 0 && (
              <>
                <div className="papers-tools">
                  <label className="papers-search">
                    <span className="papers-field-label">Search library</span>
                    <span className="papers-search-input">
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>
                      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subject, paper or year" />
                    </span>
                  </label>
                  <div className="papers-filters">
                    {filterControl('Exam', exam, setExam, exams)}
                    {filterControl('Subject', subject, setSubject, subjects)}
                    {filterControl('Year', year, setYear, years)}
                    {filterControl('Language', language, setLanguage, languages)}
                  </div>
                </div>
                <div className="papers-results-line">
                  <span aria-live="polite">Showing {filtered.length} of {pastPapers.length} papers</span>
                  {isFiltering && <button type="button" className="papers-clear" onClick={reset}>Clear all filters ×</button>}
                </div>
              </>
            )}

            {filtered.length > 0 ? (
              <div className="papers-grid">
                {filtered.map((paper) => (
                  <article key={paper.id} className="papers-card">
                    <div className="papers-card-top"><span className="papers-file-symbol" aria-hidden="true">PDF</span><span className="papers-card-year">{paper.year}</span></div>
                    <span className="papers-card-exam">{paper.exam}{paper.term ? ` · ${paper.term}` : ''}</span>
                    <h3>{paper.title || paper.subject}</h3>
                    <p>{[paper.subject, paper.language].filter(Boolean).join(' · ')}</p>
                    <a className="papers-download" href={paper.url} target="_blank" rel="noopener noreferrer"
                      download={paper.url?.startsWith('/') ? '' : undefined}
                      aria-label={`Download ${paper.title || paper.subject} ${paper.year} paper`}>
                      Download paper <span aria-hidden="true">↓</span>
                    </a>
                  </article>
                ))}
              </div>
            ) : (
              <div className="papers-empty" role="status">
                <div className="papers-empty-icon" aria-hidden="true">
                  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 8h20l10 10v35a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z"/><path d="M39 8v12h10M24 32h16M24 40h11"/></svg>
                </div>
                <h3>{pastPapers.length ? 'No matching papers' : 'Past papers are coming soon'}</h3>
                <p>{pastPapers.length
                  ? 'We couldn’t find a paper matching your search. Try changing your filters or searching for another subject.'
                  : 'Our team is preparing the school’s past paper collection. Approved examination papers will be published here as they become available.'}</p>
                {isFiltering && <button type="button" className="papers-reset-btn" onClick={reset}>Reset filters</button>}
              </div>
            )}
          </section>

          <aside className="papers-notice">
            <div><span className="papers-kicker">STUDY TIP</span><h2>Practice makes progress.</h2><p>Set a timer, complete a paper under exam conditions and review the questions that challenged you.</p></div>
            <a href="/life/academic-excellence">Explore academics <span aria-hidden="true">↗</span></a>
          </aside>
        </div>
      </div>
      <Footer />
    </main>
  );
}
