import React, { useEffect, useState } from 'react';
import { collection, getCountFromServer, query, Timestamp, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ANALYTICS_COLLECTIONS, analyticsCsv, summarizeContentMetrics } from './analyticsMetrics.mjs';
import PostViewsDashboard from './PostViewsDashboard';
import './AnalyticsDashboard.css';

const RANGE_OPTIONS = [7, 30, 90];
const integer = value => new Intl.NumberFormat('en-US').format(value);

/** Uses server aggregation queries, not unbounded document subscriptions.
 * Firestore rules authorize each read for the signed-in console account.
 * There are no analytics cookies and no fabricated website traffic counts.
 */
async function loadAnalytics(userId, periodDays) {
  if (!auth?.currentUser || auth.currentUser.uid !== userId || !db)
    throw new Error('Your administrator session has changed. Sign in again.');
  const since = Timestamp.fromDate(new Date(Date.now() - periodDays * 86400000));
  const rows = await Promise.all(ANALYTICS_COLLECTIONS.map(async ({ id }) => {
    const source = collection(db, id);
    const [all, publicDocs, newDocs] = await Promise.all([
      getCountFromServer(source),
      getCountFromServer(query(source, where('published', '==', true))),
      getCountFromServer(query(source, where('createdAt', '>=', since))),
    ]);
    return { id, total: all.data().count, published: publicDocs.data().count,
      recent: newDocs.data().count };
  }));
  if (!auth.currentUser || auth.currentUser.uid !== userId)
    throw new Error('Your administrator session has changed. Sign in again.');
  return summarizeContentMetrics(rows);
}

function Statistic({ label, value, helper }) {
  return (
    <article className="admin-analytics-stat">
      <p className="admin-analytics-stat-label">{label}</p>
      <p className="admin-analytics-stat-value">{integer(value)}</p>
      <p className="admin-analytics-stat-helper">{helper}</p>
    </article>
  );
}

export default function AnalyticsDashboard({ userId }) {
  const [days, setDays] = useState(30);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ status: 'loading', summary: null, at: null, message: '' });

  useEffect(() => {
    let live = true;
    setState({ status: 'loading', summary: null, at: null, message: '' });
    loadAnalytics(userId, days).then(summary => {
      if (live) setState({ status: 'ready', summary, at: new Date(), message: '' });
    }).catch(error => {
      if (!live) return;
      setState({ status: 'error', summary: null, at: null,
        message: error?.code === 'permission-denied'
          ? 'Firestore denied one or more analytics queries. Verify your role and deployed Firestore rules.'
          : 'Analytics could not be loaded. Check the connection or try refreshing.' });
    });
    return () => { live = false; };
  }, [userId, days, version]);

  const downloadCsv = () => {
    if (state.status !== 'ready') return;
    const data = analyticsCsv(state.summary, days);
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }));
    link.href = url;
    link.download = 'bcg-content-analytics-' + days + 'd.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <section className="admin-analytics" aria-labelledby="admin-analytics-title">
      <div className="admin-analytics-heading">
        <div>
          <h2 id="admin-analytics-title">Content overview</h2>
          <p>Live editorial statistics from the seven Firebase content collections.</p>
        </div>
        <div className="admin-analytics-controls">
          <label htmlFor="admin-analytics-period" className="admin-label">Recently added</label>
          <select id="admin-analytics-period" className="admin-select" value={days}
            onChange={event => setDays(Number(event.target.value))}>
            {RANGE_OPTIONS.map(option => <option key={option} value={option}>Last {option} days</option>)}
          </select>
          <button type="button" className="admin-btn-secondary" disabled={state.status === 'loading'}
            onClick={() => setVersion(previous => previous + 1)}>Refresh</button>
          <button type="button" className="admin-btn-secondary" disabled={state.status !== 'ready'}
            onClick={downloadCsv}>Export CSV</button>
        </div>
      </div>

      <PostViewsDashboard userId={userId} />

      {state.status === 'loading' && (
        <div className="admin-table-card admin-analytics-message" role="status">
          Reading Firestore aggregate counts...
        </div>
      )}
      {state.status === 'error' && (
        <div className="admin-table-card admin-analytics-message" role="alert">
          <p>{state.message}</p>
          <button type="button" className="admin-btn-secondary"
            onClick={() => setVersion(previous => previous + 1)}>Retry analytics</button>
        </div>
      )}
      {state.status === 'ready' && (
        <>
          <div className="admin-analytics-stats" aria-label="Content totals">
            <Statistic label="All content" value={state.summary.totals.total}
              helper="Draft and published records" />
            <Statistic label="Published" value={state.summary.totals.published}
              helper={state.summary.publicationRate + '% of all records'} />
            <Statistic label="Drafts" value={state.summary.totals.drafts}
              helper="Currently unpublished records" />
            <Statistic label={'Added in ' + days + ' days'} value={state.summary.totals.recent}
              helper="Records with a recent createdAt timestamp" />
          </div>

          <div className="admin-analytics-panels">
            <section className="admin-table-card admin-analytics-panel" aria-labelledby="admin-analytics-bars">
              <header className="admin-editor-header">
                <div>
                  <h3 id="admin-analytics-bars" className="admin-editor-title">Publishing by section</h3>
                  <p className="admin-header-desc">Gold is published; dark red is an unpublished draft.</p>
                </div>
              </header>
              <div className="admin-analytics-bars">
                {state.summary.items.map(item => (
                  <div className="admin-analytics-bar-row" key={item.id}>
                    <div className="admin-analytics-bar-label">
                      <span>{item.label}</span>
                      <span>{integer(item.published)} / {integer(item.total)}</span>
                    </div>
                    <div className="admin-analytics-track" role="img"
                      aria-label={item.label + ': ' + item.published + ' published, ' + item.drafts + ' drafts'}>
                      <span className="admin-analytics-published"
                        style={{ width: (item.total ? item.published / item.total * 100 : 0) + '%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="admin-table-card admin-analytics-panel" aria-labelledby="admin-analytics-table">
              <header className="admin-editor-header">
                <div>
                  <h3 id="admin-analytics-table" className="admin-editor-title">Collection details</h3>
                  <p className="admin-header-desc">Counts are loaded from Firestore, not estimated traffic.</p>
                </div>
              </header>
              <div className="admin-analytics-table-scroll">
                <table className="admin-analytics-table">
                  <thead>
                    <tr><th scope="col">Collection</th><th scope="col">Total</th>
                      <th scope="col">Live</th><th scope="col">Draft</th>
                      <th scope="col">New</th></tr>
                  </thead>
                  <tbody>
                    {state.summary.items.map(item => (
                      <tr key={item.id}><th scope="row">{item.label}</th>
                        <td>{integer(item.total)}</td><td>{integer(item.published)}</td>
                        <td>{integer(item.drafts)}</td><td>{integer(item.recent)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <p className="admin-analytics-footnote" role="status">
            Refreshed {state.at.toLocaleTimeString()}. Counts may differ slightly while records change.
            New records without a createdAt timestamp are excluded from the selected period.
            This content summary measures Firebase CMS records; the Cloudflare section above reports pageviews.
          </p>
        </>
      )}
    </section>
  );
}
