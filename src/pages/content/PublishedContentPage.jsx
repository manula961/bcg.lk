import React, { useEffect, useState } from 'react';
import MenuBar from '../../components/layout/MenuBar';
import Footer from '../../components/layout/Footer';
import BackButton from '../../navigation/BackButton';
import { getPublishedPage } from '../../lib/pagesService';
import '../life/LifeDetailPage.css';

/** Public route for a published CMS page. Never renders drafts or raw HTML. */
export default function PublishedContentPage({ slug }) {
  const [state, setState] = useState({ loading: true, page: null, error: false });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const oldTitle = document.title;
    setState({ loading: true, page: null, error: false });
    getPublishedPage(slug)
      .then(page => { if (active) setState({ loading: false, page, error: false }); })
      .catch(error => {
        console.error('Failed to load published page:', error);
        if (active) setState({ loading: false, page: null, error: true });
      });
    return () => { active = false; document.title = oldTitle; };
  }, [slug, retry]);

  useEffect(() => {
    if (!state.page) return;
    document.title = state.page.title + ' | Bandaranayake College';
    let meta = document.querySelector('meta[name="description"]');
    if (meta && state.page.seoDescription) {
      const previous = meta.getAttribute('content');
      meta.setAttribute('content', state.page.seoDescription);
      return () => meta.setAttribute('content', previous ?? '');
    }
  }, [state.page]);

  const page = state.page;
  return (
    <main className="life-detail">
      <a className="life-detail-skip" href="#published-page-main">Skip to content</a>
      <MenuBar />
      <div className="section-container life-detail-container">
        <div className="life-detail-return">
          <BackButton className="life-detail-return-btn" fallback="/">BACK</BackButton>
        </div>
        <section id="published-page-main" className="life-detail-intro" aria-live="polite">
          {state.loading ? (
            <p className="life-detail-description" role="status">Loading page…</p>
          ) : !page ? (
            <>
              <h1>{state.error ? 'Unable to load page' : 'Page unavailable'}</h1>
              <p className="life-detail-description" role={state.error ? 'alert' : undefined}>
                {state.error ? 'The page service could not be reached. Please try again.' : 'This page has not been published or cannot be found.'}
              </p>
              {state.error && <button className="life-detail-return-btn" type="button" onClick={() => setRetry(value => value + 1)}>Try again</button>}
            </>
          ) : (
            <>
              <p className="life-detail-kicker">BANDARANAYAKE COLLEGE</p>
              <h1>{page.title}</h1>
              {page.seoDescription && <p className="life-detail-description">{page.seoDescription}</p>}
            </>
          )}
        </section>
        {page && (
          <article className="life-detail-story" aria-label={page.title}>
            {page.imageUrl && (
              <div className="life-detail-feature" aria-label="Page image">
                <img className="life-detail-feature-image" src={page.imageUrl}
                  alt={page.title} loading="lazy" />
              </div>
            )}
            <div className="life-detail-stories">
              <div className="life-detail-story-card">
                <div>
                  {(page.body || '').split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => (
                    <p key={index} style={{ whiteSpace: 'pre-wrap' }}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </article>
        )}
      </div>
      <Footer />
    </main>
  );
}
