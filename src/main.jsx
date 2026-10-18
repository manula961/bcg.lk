import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import Lenis from 'lenis';
import { lifePages } from './pages/lifePageData.js';

// Load only the route being visited. Admin Firebase and editor code stays out
// of the public homepage's initial JavaScript download.
const App = lazy(() => import('./App.jsx'));
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));
const LifeDetailPage = lazy(() => import('./pages/LifeDetailPage.jsx'));
const PublishedContentPage = lazy(() => import('./pages/PublishedContentPage.jsx'));
const Updates = lazy(() => import('./pages/Updates.jsx'));
const EventDetail = lazy(() => import('./pages/EventDetail.jsx'));
const EventsPage = lazy(() => import('./pages/EventsPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));
import './index.css';

function Root() {
  const pathname = window.location.pathname;
  const isAdminPath = pathname === '/admin' || pathname === '/admin/';
  const isAboutUsPath = pathname === '/about-us' || pathname === '/about-us/';

  const lifeMatch = pathname.match(/^\/life\/([a-z-]+)\/?$/);
  const lifeSlug = lifeMatch && Object.prototype.hasOwnProperty.call(lifePages, lifeMatch[1]) ? lifeMatch[1] : null;

  const pageMatch = pathname.match(/^\/pages\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
  const pageSlug = pageMatch ? pageMatch[1] : null;

  // Handle /updates/[News title] routing
  const updatesMatch = pathname.match(/^\/updates\/([^/]+)\/?$/);
  const updatesSlug = updatesMatch ? updatesMatch[1] : null;

  // Handle /events page vs /events/[Event title] detail routing
  const isEventsIndex = pathname === '/events' || pathname === '/events/';
  const eventsMatch = pathname.match(/^\/events\/([^/]+)\/?$/);
  const eventsSlug = eventsMatch ? eventsMatch[1] : null;

  if (isAdminPath) return <AdminApp />;
  if (isAboutUsPath) return <LifeDetailPage slug="about-us" />;
  if (isEventsIndex) return <EventsPage />;
  if (eventsSlug) return <EventDetail titleSlug={eventsSlug} />;
  if (updatesSlug) return <Updates titleSlug={updatesSlug} />;
  if (lifeSlug) return <LifeDetailPage slug={lifeSlug} />;
  if (pageSlug) return <PublishedContentPage slug={pageSlug} />;
  if (pathname === '/' || pathname === '/index.html') return <App />;
  return <NotFoundPage />;
}

if (window.location.pathname !== '/admin' && window.location.pathname !== '/admin/') {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<main aria-busy="true" aria-label="Loading page" className="min-h-screen bg-[#0a0a0a]" />}>
      <Root />
    </Suspense>
  </React.StrictMode>
);