import React, { useEffect, useState } from 'react';
import MenuBar from '../../components/layout/MenuBar';
import Footer from '../../components/layout/Footer';
import BackButton from '../../navigation/BackButton';
import { subscribePublishedNews, subscribePublishedNewsById } from '../../lib/newsService';
import '../life/LifeDetailPage.css';

export default function NewsDetail({ titleSlug }) {
  const [state, setState] = useState({ loading: true, post: null, error: false });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    setState({ loading: true, post: null, error: false });
    const receive = post => active && setState({ loading: false, post, error: false });
    const fail = () => active && setState({ loading: false, post: null, error: true });
    try {
      const id = decodeURIComponent(titleSlug);
      if (/^[A-Za-z0-9]{20}$/.test(id)) {
        unsubscribe = subscribePublishedNewsById(id, receive, fail);
      } else {
        unsubscribe = subscribePublishedNews(posts => receive(posts.find(post =>
          post.id === id || post.title === id ||
          (post.title || '').toLowerCase().trim().replace(/\s+/g, '-') === id
        ) || null), fail);
      }
    } catch { fail(); }
    return () => { active = false; unsubscribe(); };
  }, [titleSlug, retry]);
  useEffect(() => {
    const previous = document.title;
    if (state.post) document.title = `${state.post.title} | Bandaranayake College`;
    return () => { document.title = previous; };
  }, [state.post]);
  const post = state.post;
  const date = (post?.publishedAt ?? post?.createdAt)?.toDate?.();
  return (
    <main className="life-detail">
      <MenuBar />
      <div className="section-container life-detail-container">
        <div className="life-detail-return">
          <BackButton className="life-detail-return-btn" fallback="/#news">BACK</BackButton>
        </div>
        <section className="life-detail-intro" aria-live="polite">
          {state.loading ? <p role="status">Loading update…</p> : !post ? <>
            <h1>{state.error ? 'Unable to load update' : 'Update unavailable'}</h1>
            <p className="life-detail-description">
              {state.error ? 'Please try again.' : 'This update is unpublished or could not be found.'}
            </p>
            {state.error && <button type="button" className="life-detail-return-btn"
              onClick={() => setRetry(value => value + 1)}>Try again</button>}
          </> : <>
            <p className="life-detail-kicker">{post.category || 'News'}{post.tag ? ` · ${post.tag}` : ''}</p>
            <h1 style={{ overflowWrap: 'anywhere' }}>{post.title}</h1>
            {date instanceof Date && !Number.isNaN(date.getTime()) &&
              <time dateTime={date.toISOString()}>{date.toLocaleDateString()}</time>}
            {post.excerpt && <p className="life-detail-description">{post.excerpt}</p>}
          </>}
        </section>
        {post && <article className="life-detail-story">
          {post.imageUrl && <img src={post.imageUrl} alt={post.title}
            style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 16 }} />}
          <div className="life-detail-story-card">
            <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              {(post.body || '').split(/\n\s*\n/).filter(Boolean).map((paragraph, index) =>
                <p key={index} style={{ whiteSpace: 'pre-wrap' }}>{paragraph}</p>)}
            </div>
          </div>
        </article>}
      </div>
      <Footer />
    </main>
  );
}
