import React, { useEffect, useMemo, useState } from 'react';
import MenuBar from '../components/MenuBar';
import Footer from '../components/Footer';
import { pastPapers } from './pastPapersData';
import './PastPapersPage.css';

const all = 'All';
const unique = (items) => [all, ...new Set(items.filter(Boolean).map(String))].sort((a, b) => a === all ? -1 : b === all ? 1 : b.localeCompare(a, undefined, { numeric: true }));
const searchable = (paper) => [paper.title, paper.subject, paper.year, paper.exam, paper.language, paper.term].filter(Boolean).join(' ').toLowerCase();

export default function PastPapersPage() {
  const [search, setSearch] = useState('');
  const [exam, setExam] = useState(all);
  const [subject, setSubject] = useState(all);
  const [year, setYear] = useState(all);
  const [language, setLanguage] = useState(all);
  const exams = useMemo(() => unique(pastPapers.map((p) => p.exam)), []);
  const subjects = useMemo(() => unique(pastPapers.map((p) => p.subject)), []);
  const years = useMemo(() => unique(pastPapers.map((p) => p.year)), []);
  const languages = useMemo(() => unique(pastPapers.map((p) => p.language)), []);
  const filtered = useMemo(() => pastPapers.filter((p) =>
    (exam === all || String(p.exam) === exam) &&
    (subject === all || String(p.subject) === subject) &&
    (year === all || String(p.year) === year) &&
    (language === all || String(p.language) === language) &&
    searchable(p).includes(search.trim().toLowerCase())
  ).sort((a, b) => Number(b.year || 0) - Number(a.year || 0)), [search, exam, subject, year, language]);
  const isFiltering = search || [exam, subject, year, language].some((value) => value !== all);
  const reset = () => { setSearch(''); setExam(all); setSubject(all); setYear(all); setLanguage(all); };

  useEffect(() => {
    document.title = 'Past Papers | Bandaranayake College, Gampaha';
    window.scrollTo(0, 0);
  }, []);

  const filterControl = (label, value, setter, options) => (
    <label className="papers-filter" key={label}>
      <span>{label}</span>
      <select value={value} onChange={(event) => setter(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option === all ? `All ${label.toLowerCase()}${label === 'Year' ? 's' : 's'}` : option}</option>)}
      </select>
    </label>
  );

  return (
    <main className="papers-page">
      <a className="papers-skip" href="#papers-main">Skip to papers</a>
      <MenuBar />
      <div className="papers-wrapper" id="papers-main">
        <div className="papers-inner">
          <nav className="papers-breadcrumb" aria-label="Breadcrumb"><a href="/life/academic-excellence">Academic Excellence</a><span aria-hidden="true">/</span><span>Past Papers</span></nav>
          <header className="papers-hero">
            <div className="papers-hero-copy">
              <span className="papers-eyebrow"><span className="papers-eyebrow-line" /> ACADEMIC RESOURCES</span>
              <h1>Past <em>Papers.</em></h1>
              <p>Find examination papers for revision and practice. Search by subject, exam, year or medium to find the resources you need.</p>
              <a href="#papers-library" className="papers-primary-link">Explore papers <span aria-hidden="true">↗</span></a>
            </div>
            <div className="papers-hero-mark" aria-hidden="true"><svg viewBox="0 0 150 160" fill="none"><rect x="36" y="16" width="84" height="112" rx="10" stroke="currentColor" strokeWidth="3"/><path d="M53 45h49M53 62h49M53 79h32" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M26 39v99a10 10 0 0 0 10 10h72" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M94 99v22m-10-10 10 10 10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          </header>
          <section className="papers-library" id="papers-library" aria-labelledby="papers-library-title">
            <div className="papers-heading"><div><span className="papers-kicker">RESOURCE LIBRARY</span><h2 id="papers-library-title">Browse examination papers</h2><p>Filter the collection to quickly find the right paper.</p></div><span className="papers-count">{filtered.length} {filtered.length === 1 ? 'paper' : 'papers'} available</span></div>
            <div className="papers-tools">
              <label className="papers-search"><span className="papers-field-label">Search papers</span><span className="papers-search-input"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subject, paper, year..." /></span></label>
              <div className="papers-filters">{filterControl('Exam', exam, setExam, exams)}{filterControl('Subject', subject, setSubject, subjects)}{filterControl('Year', year, setYear, years)}{filterControl('Language', language, setLanguage, languages)}</div>
            </div>
            {isFiltering && <button type="button" className="papers-clear" onClick={reset}>Clear all filters ×</button>}
            {filtered.length ? <div className="papers-grid">{filtered.map((paper) => <article key={paper.id} className="papers-card"><div className="papers-card-top"><span className="papers-file-symbol" aria-hidden="true">PDF</span><span className="papers-card-year">{paper.year}</span></div><span className="papers-card-exam">{paper.exam}{paper.term ? ` · ${paper.term}` : ''}</span><h3>{paper.title || paper.subject}</h3><p>{[paper.subject, paper.language].filter(Boolean).join(' · ')}</p><a className="papers-download" href={paper.url} target="_blank" rel="noopener noreferrer" download={paper.url?.startsWith('/') ? '' : undefined} aria-label={`Download ${paper.title || paper.subject} ${paper.year} paper`}>Download paper <span aria-hidden="true">↓</span></a></article>)}</div> : <div className="papers-empty"><div className="papers-empty-icon" aria-hidden="true">⌕</div><h3>{pastPapers.length && isFiltering ? 'No matching papers' : 'Past papers are coming soon'}</h3><p>{pastPapers.length && isFiltering ? 'Try a different search or clear the filters to see more resources.' : 'We are preparing the school’s past paper collection. Approved papers will appear here as soon as they are added.'}</p>{pastPapers.length > 0 && isFiltering && <button type="button" onClick={reset}>Reset filters</button>}</div>}
          </section>
          <aside className="papers-notice"><div><span className="papers-kicker">STUDY TIP</span><h2>Practice makes progress.</h2><p>Try completing a paper under timed exam conditions, then review the questions you found difficult.</p></div><a href="/life/academic-excellence">Back to academics <span aria-hidden="true">↗</span></a></aside>
        </div>
      </div>
      <Footer />
    </main>
  );
}
