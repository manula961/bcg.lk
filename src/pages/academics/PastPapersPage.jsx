import React, { useEffect, useMemo, useRef, useState } from "react";
import MenuBar from "../../components/layout/MenuBar";
import Footer from "../../components/layout/Footer";
import BackButton from "../../navigation/BackButton";
import { subscribePublishedPastPapers } from "../../lib/pastPapersService";
import "./PastPapersPage.css";

const ALL = "All";
const PAGE_SIZE = 12;

const unique = (items) =>
  [ALL, ...new Set(items.filter(Boolean).map(String))].sort((a, b) =>
    a === ALL
      ? -1
      : b === ALL
        ? 1
        : b.localeCompare(a, undefined, { numeric: true }),
  );

const safePaperUrl = (url) => {
  if (typeof url !== "string") return "";

  try {
    const parsed = new URL(url, window.location.origin);

    return ["https:", "http:"].includes(parsed.protocol) &&
      (parsed.protocol === "https:" ||
        parsed.origin === window.location.origin) &&
      !parsed.username &&
      !parsed.password
      ? parsed.href
      : "";
  } catch {
    return "";
  }
};

const searchable = (paper) =>
  [
    paper.title,
    paper.subject,
    paper.year,
    paper.exam,
    paper.language,
    paper.term,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

/* =========================================
   CUSTOM DROPDOWN COMPONENT
   ========================================= */

function PaperDropdown({ label, value, onChange, options, compact = false }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const itemRefs = useRef([]);

  const selectedIndex = Math.max(
    0,
    options.findIndex((item) => item.value === value),
  );

  useEffect(() => {
    if (!open) return undefined;

    const outside = (event) => {
      if (!root.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", outside);

    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const choose = (index) => {
    const option = options[index];
    if (!option) return;

    onChange(option.value);
    setOpen(false);

    root.current?.querySelector(".papers-dropdown-trigger")?.focus();
  };

  const handleKeys = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      root.current?.querySelector(".papers-dropdown-trigger")?.focus();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      if (!open) {
        setOpen(true);

        requestAnimationFrame(() => itemRefs.current[selectedIndex]?.focus());
      } else {
        const current = itemRefs.current.indexOf(document.activeElement);

        const next =
          (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) %
          options.length;

        itemRefs.current[next]?.focus();
      }
    }

    if (
      (event.key === "Enter" || event.key === " ") &&
      open &&
      itemRefs.current.includes(document.activeElement)
    ) {
      event.preventDefault();

      choose(itemRefs.current.indexOf(document.activeElement));
    }
  };

  return (
    <div
      className={`papers-dropdown ${compact ? "papers-dropdown-compact" : ""}`}
      ref={root}
      onKeyDown={handleKeys}
    >
      <span className="papers-dropdown-label">{label}</span>

      <button
        type="button"
        className="papers-dropdown-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((previous) => !previous);
        }}
      >
        <span>{options[selectedIndex]?.label || ""}</span>

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="papers-dropdown-menu" role="listbox" aria-label={label}>
          {options.map((option, index) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              tabIndex={-1}
              className={`papers-dropdown-option ${
                option.value === value ? "selected" : ""
              }`}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>

              {option.value === value && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================
   MAIN PAST PAPERS PAGE
   ========================================= */

export default function PastPapersPage() {
  const [pastPapers, setPastPapers] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [retryPapers, setRetryPapers] = useState(0);

  const [search, setSearch] = useState("");
  const [exam, setExam] = useState(ALL);
  const [subject, setSubject] = useState(ALL);
  const [year, setYear] = useState(ALL);
  const [language, setLanguage] = useState(ALL);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  /* Firebase Listener */

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribePublishedPastPapers(
        (items) => {
          setPastPapers(items);
          setLoadError(false);
        },
        () => setLoadError(true),
      );
    } catch {
      setLoadError(true);
    }
    return () => unsubscribe();
  }, [retryPapers]);

  useEffect(() => {
    document.title = "Past Papers | Bandaranayake College, Gampaha";
  }, []);

  /* Available Filter Values */

  const exams = useMemo(
    () => unique(pastPapers.map((p) => p.exam)),
    [pastPapers],
  );

  const subjects = useMemo(
    () => unique(pastPapers.map((p) => p.subject)),
    [pastPapers],
  );

  const years = useMemo(
    () => unique(pastPapers.map((p) => p.year)),
    [pastPapers],
  );

  const languages = useMemo(
    () => unique(pastPapers.map((p) => p.language)),
    [pastPapers],
  );

  /* Filtering and Sorting */

  const filtered = useMemo(() => {
    return pastPapers
      .filter(
        (paper) =>
          (exam === ALL || String(paper.exam) === exam) &&
          (subject === ALL || String(paper.subject) === subject) &&
          (year === ALL || String(paper.year) === year) &&
          (language === ALL || String(paper.language) === language) &&
          searchable(paper).includes(search.trim().toLowerCase()),
      )
      .sort((a, b) => {
        if (sort === "oldest") {
          return Number(a.year || 0) - Number(b.year || 0);
        }

        if (sort === "subject") {
          return String(a.subject || "").localeCompare(String(b.subject || ""));
        }

        return Number(b.year || 0) - Number(a.year || 0);
      });
  }, [pastPapers, search, exam, subject, year, language, sort]);

  /* Pagination */

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const visiblePapers = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [search, exam, subject, year, language, sort]);

  const isFiltering = Boolean(
    search || [exam, subject, year, language].some((value) => value !== ALL),
  );

  const reset = () => {
    setSearch("");
    setExam(ALL);
    setSubject(ALL);
    setYear(ALL);
    setLanguage(ALL);
    setSort("newest");
    setPage(1);
  };

  /* Reusable Filter Control */

  const filterControl = (label, value, setter, options) => (
    <PaperDropdown
      key={label}
      label={label}
      value={value}
      onChange={setter}
      options={options.map((option) => ({
        value: option,
        label: option === ALL ? `All ${label.toLowerCase()}s` : option,
      }))}
    />
  );

  return (
    <main className="papers-page">
      <a className="papers-skip" href="#papers-main">
        Skip to past papers
      </a>

      <MenuBar />

      <div className="papers-wrapper" id="papers-main">
        <div className="papers-inner">
          {/* Back Button */}

          <div className="papers-return">
            <BackButton
              fallback="/life/academic-excellence"
              className="papers-return-btn"
            >
              BACK
            </BackButton>
          </div>

          {/* Banner */}

          <section className="life-detail-feature">
            <img
              className="life-detail-feature-image"
              src="https://bcg.lk/img/banner1.jpg"
              alt="Bandaranayake College campus"
            />

            <div className="life-detail-feature-shade" />

            <div className="life-detail-feature-body">
              <span className="life-detail-feature-label">
                School Past Papers
              </span>

              <h2>Prepare with Confidence, Achieve with Excellence</h2>

              <p>
                Explore our collection of past examination papers to strengthen
                your understanding, practise essential skills, and prepare
                effectively for upcoming assessments. Find the resources you
                need by subject, year, examination, and language.
              </p>
            </div>
          </section>

          {/* Resource Library */}

          <section
            className="papers-library"
            id="papers-library"
            aria-labelledby="papers-library-title"
          >
            <div className="papers-heading">
              <div>
                <span className="papers-kicker">RESOURCE LIBRARY</span>

                <h2 id="papers-library-title">Browse examination papers</h2>

                <p>
                  Everything you need for focused revision, all in one place.
                </p>
              </div>

              <span className="papers-count">
                {filtered.length} {filtered.length === 1 ? "paper" : "papers"}{" "}
                available
              </span>
            </div>

            {/* Exam Tabs */}

            {pastPapers.length > 0 && (
              <nav
                className="papers-exam-tabs"
                aria-label="Examination categories"
              >
                {exams.map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={exam === value ? "active" : ""}
                    onClick={() => setExam(value)}
                    aria-pressed={exam === value}
                  >
                    {value === ALL ? "All papers" : value}
                  </button>
                ))}
              </nav>
            )}

            {loadError && (
              <p role="alert" className="papers-error">
                Could not load papers. Please try again.
                <button type="button" className="papers-reset-btn" onClick={() => { setLoadError(false); setRetryPapers(value => value + 1); }}>Try again</button>
              </p>
            )}

            {/* Search and Filters */}

            {pastPapers.length > 0 && (
              <>
                <div className="papers-tools">
                  <label className="papers-search">
                    <span className="papers-field-label">Search library</span>

                    <span className="papers-search-input">
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m16 16 5 5" />
                      </svg>

                      <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search subject, paper or year"
                      />
                    </span>
                  </label>

                  <div className="papers-filters">
                    {filterControl("Exam", exam, setExam, exams)}

                    {filterControl("Subject", subject, setSubject, subjects)}

                    {filterControl("Year", year, setYear, years)}

                    {filterControl(
                      "Language",
                      language,
                      setLanguage,
                      languages,
                    )}
                  </div>
                </div>

                {/* Results and Sorting */}

                <div className="papers-results-line">
                  <span aria-live="polite">
                    Showing{" "}
                    {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
                    {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length} matching papers
                  </span>

                  <div className="papers-sort">
                    <PaperDropdown
                      label="Sort"
                      compact
                      value={sort}
                      onChange={setSort}
                      options={[
                        {
                          value: "newest",
                          label: "Newest year",
                        },
                        {
                          value: "oldest",
                          label: "Oldest year",
                        },
                        {
                          value: "subject",
                          label: "Subject A–Z",
                        },
                      ]}
                    />
                  </div>

                  {isFiltering && (
                    <button
                      type="button"
                      className="papers-clear"
                      onClick={reset}
                    >
                      Clear all filters ×
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Paper Cards */}

            {filtered.length > 0 ? (
              <div className="papers-grid">
                {visiblePapers.map((paper) => {
                  const pdfUrl = safePaperUrl(paper.url);

                  return (
                    <article key={paper.id} className="papers-card">
                      <div className="papers-card-top">
                        <span className="papers-file-symbol" aria-hidden="true">
                          PDF
                        </span>

                        <span className="papers-card-year">{paper.year}</span>
                      </div>

                      <span className="papers-card-exam">
                        {paper.exam}
                        {paper.term ? ` · ${paper.term}` : ""}
                      </span>

                      <h3>{paper.title || paper.subject}</h3>

                      <p>
                        {[paper.subject, paper.language]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>

                      {/* View PDF Button */}

                      <div className="papers-card-actions">
                        {pdfUrl ? (
                          <a
                            className="papers-view-btn"
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`View ${
                              paper.title || paper.subject
                            } ${paper.year} PDF in a new tab`}
                          >
                            <svg
                              width="19"
                              height="19"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            View PDF
                            
                          </a>
                        ) : (
                          <span className="papers-broken-link">
                            PDF link unavailable
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* Empty State */

              <div className="papers-empty" role="status">
                <div className="papers-empty-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 64 64"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 8h20l10 10v35a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z" />
                    <path d="M39 8v12h10M24 32h16M24 40h11" />
                  </svg>
                </div>

                <h3>
                  {pastPapers.length
                    ? "No matching papers"
                    : "Past papers are coming soon"}
                </h3>

                <p>
                  {pastPapers.length
                    ? "We couldn’t find a paper matching your search. Try changing your filters or searching for another subject."
                    : "Our team is preparing the school’s past paper collection. Approved examination papers will be published here as they become available."}
                </p>

                {isFiltering && (
                  <button
                    type="button"
                    className="papers-reset-btn"
                    onClick={reset}
                  >
                    Reset filters
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}

            {filtered.length > PAGE_SIZE && (
              <nav
                className="papers-pagination"
                aria-label="Paper results pages"
              >
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>

                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </nav>
            )}
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}
