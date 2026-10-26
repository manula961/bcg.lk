import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import './PostViewsDashboard.css';

const OPTIONS = [7, 30, 90];
const number = n => new Intl.NumberFormat('en-US').format(n);
const label = kind => ({ news:'News', events:'Events', pages:'Pages' })[kind] || 'Posts';

function csvValue(value) {
  const text = String(value ?? '').replace(/^[=+\-@\t\r]/, "'$&");
  return '"' + text.replace(/"/g, '""') + '"';
}
export function makeViewsCsv(report) {
  const lines = [['Rank','Title','Section','Qualified views','Path']];
  report.posts.forEach((item, index) => lines.push([
    index + 1, item.title, label(item.kind), item.views, item.path,
  ]));
  return lines.map(line => line.map(csvValue).join(',')).join('\n') + '\n';
}
async function resolvePostTitles(report) {
  if (!db) return report;
  const resolved = await Promise.all(report.posts.slice(0, 15).map(async post => {
    try {
      const snapshot = await getDoc(doc(db, post.kind, post.id));
      const value = snapshot.data();
      if (snapshot.exists() && value?.published === true &&
          typeof value.title === 'string' && value.title.trim())
        return { id: post.kind + '/' + post.id, title: value.title.trim().slice(0, 180) };
    } catch { /* A missing title must not suppress Cloudflare counts. */ }
    return null;
  }));
  const titles = new Map(resolved.filter(Boolean).map(value => [value.id, value.title]));
  return { ...report, posts: report.posts.map(post => ({
    ...post, title: titles.get(post.kind + '/' + post.id) || post.title,
  })) };
}

async function getReport(userId, days) {
  const current = auth?.currentUser;
  if (!current || current.uid !== userId)
    throw Error('Administrator session changed. Sign in again.');
  const token = await current.getIdToken();
  const response = await fetch('/api/admin/post-analytics?days=' + days, {
    method:'GET', cache:'no-store', credentials:'same-origin',
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || !Array.isArray(data.posts) || !Array.isArray(data.daily) ||
      !Number.isSafeInteger(data.totalViews))
    throw Error(response.status === 403 ? 'This role cannot read the report.' :
      'Post visit statistics are unavailable. Check analytics setup and your connection.');
  if (!auth.currentUser || auth.currentUser.uid !== userId)
    throw Error('Administrator session changed. Sign in again.');
  return resolvePostTitles(data);
}
function Summary({ title, value, note }) {
  return <article className="admin-analytics-stat">
    <p className="admin-analytics-stat-label">{title}</p>
    <p className="admin-analytics-stat-value">{number(value)}</p>
    <p className="admin-analytics-stat-helper">{note}</p>
  </article>;
}
export default function PostViewsDashboard({ userId }) {
  const [days, setDays] = useState(30);
  const [refresh, setRefresh] = useState(0);
  const [reportState, setReportState] = useState({ loading:true, data:null, error:'' });
  useEffect(() => {
    let active = true;
    setReportState({loading:true, data:null, error:''});
    getReport(userId, days).then(data => {
      if (active) setReportState({ loading:false, data, error:'' });
    }).catch(error => {
      if (active) setReportState({ loading:false, data:null, error:error.message });
    });
    return () => { active = false; };
  }, [userId, days, refresh]);

  const data = reportState.data;
  const maxDaily = Math.max(1, ...(data?.daily?.map(x=>x.views) || [1]));
  const biggest = Math.max(1, ...(data?.posts?.slice(0, 10).map(x=>x.views) || [1]));
  const saveCsv = () => {
    if (!data) return;
    const blob = new Blob([makeViewsCsv(data)], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bcg-most-viewed-posts-' + days + 'days.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return <section className="admin-views" aria-labelledby="bcg-post-views-title">
    <div className="admin-analytics-heading">
      <div>
        <h2 id="bcg-post-views-title">Post visitor analytics</h2>
        <p>Discover your most visited news, events and published pages.</p>
      </div>
      <div className="admin-analytics-controls">
        <label className="admin-label" htmlFor="bcg-view-period">Reporting period</label>
        <select id="bcg-view-period" className="admin-select" value={days}
          onChange={e=>setDays(Number(e.target.value))}>
          {OPTIONS.map(n=><option value={n} key={n}>Last {n} days</option>)}
        </select>
        <button type="button" className="admin-btn-secondary" disabled={reportState.loading}
          onClick={()=>setRefresh(x=>x+1)}>Refresh views</button>
        <button type="button" className="admin-btn-secondary" disabled={!data}
          onClick={saveCsv}>Export rankings</button>
      </div>
    </div>
    {reportState.loading && <div className="admin-table-card admin-analytics-message"
      role="status">Loading recorded post visits...</div>}
    {reportState.error && <div className="admin-table-card admin-analytics-message" role="alert">
      <p>{reportState.error}</p>
      <button type="button" className="admin-btn-secondary" onClick={()=>setRefresh(x=>x+1)}>
        Retry</button>
    </div>}
    {data && <>
      <div className="admin-analytics-stats">
        <Summary title="Cloudflare pageviews" value={data.totalViews}
          note={'Last ' + days + ' days (UTC)'} />
        <Summary title="Posts receiving views" value={data.postsTracked}
          note="News, events and pages" />
        <Summary title="Top post views" value={data.posts[0]?.views || 0}
          note={data.posts[0]?.title || 'No tracked posts yet'} />
        <Summary title="Average per post" value={data.postsTracked
          ? Math.round(data.totalViews/data.postsTracked) : 0}
          note="Among posts with recorded views" />
      </div>
      <div className="admin-analytics-panels">
        <section className="admin-table-card admin-analytics-panel"
          aria-labelledby="bcg-trend-title">
          <header className="admin-editor-header"><div>
            <h3 id="bcg-trend-title" className="admin-editor-title">Daily visit trend</h3>
            <p className="admin-header-desc">UTC days · each bar represents Cloudflare pageviews</p>
          </div></header>
          <div className="bcg-trend-container">
            <div className="bcg-trend-bars" role="img"
              aria-label={'Daily visit trend from ' + data.range.start + ' to ' + data.range.end}>
              {data.daily.map(day=><div key={day.date} className="bcg-trend-column">
                <span className="bcg-trend-bar"
                  style={{height: Math.max(day.views ? 4 : 0, day.views/maxDaily*100) + '%'}}
                  title={day.date + ': ' + number(day.views) + ' views'} />
              </div>)}
            </div>
            <div className="bcg-trend-endpoints"><span>{data.range.start}</span>
              <span>{data.range.end}</span></div>
          </div>
        </section>
        <section className="admin-table-card admin-analytics-panel"
          aria-labelledby="bcg-popular-title">
          <header className="admin-editor-header"><div>
            <h3 id="bcg-popular-title" className="admin-editor-title">Top-performing posts</h3>
            <p className="admin-header-desc">Most viewed content, ranked highest first</p>
          </div></header>
          <div className="admin-analytics-bars">
            {data.posts.length === 0 && <p className="admin-analytics-footnote">
              No Cloudflare pageviews reported yet. Connect the Cloudflare beacon and reporting token first.
              Visits before setup cannot be recovered.</p>}
            {data.posts.slice(0,10).map((item,index)=><div className="admin-analytics-bar-row"
              key={item.kind+item.id}>
              <div className="admin-analytics-bar-label">
                <a href={item.path} target="_blank" rel="noopener noreferrer"
                  title={item.title}>#{index+1} {item.title}</a>
                <span>{number(item.views)} views</span>
              </div>
              <div className="admin-analytics-track" role="img"
                aria-label={item.title + ': ' + number(item.views) + ' qualified views'}>
                <span className="admin-analytics-published"
                  style={{width:(item.views/biggest*100)+'%'}} />
              </div>
            </div>)}
          </div>
        </section>
      </div>
      <section className="admin-table-card admin-analytics-panel"
        aria-labelledby="bcg-views-breakdown">
        <header className="admin-editor-header"><div>
          <h3 id="bcg-views-breakdown" className="admin-editor-title">Visits by content type</h3>
          <p className="admin-header-desc">Counts include tracked public post detail visits only.</p>
        </div></header>
        <div className="admin-analytics-table-scroll"><table className="admin-analytics-table">
          <thead><tr><th scope="col">Type</th><th scope="col">Views</th>
            <th scope="col">Share</th></tr></thead>
          <tbody>{data.collections.map(item=><tr key={item.kind}>
            <th scope="row">{label(item.kind)}</th><td>{number(item.views)}</td>
            <td>{data.totalViews ? Math.round(item.views/data.totalViews*100) : 0}%</td>
          </tr>)}</tbody>
        </table></div>
      </section>
      <p className="admin-analytics-footnote">
        {data.measured}. Reports from modern browsers and their page visits
        are reported by Cloudflare. Automated traffic is filtered, not perfectly
        eliminated. No personal visitor identities are available. Historical activity before
        tracking was enabled is not included.
      </p>
    </>}
  </section>;
}
