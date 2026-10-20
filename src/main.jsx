import React, { Suspense, lazy, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import Lenis from 'lenis';
import { lifePages } from './pages/life/lifePageData.js';
import { listenForNavigation, setSmoothScroller } from './navigation/clientNavigation.js';
import RouteScroll from './navigation/RouteScroll.jsx';

// Load only the route being visited. Admin Firebase and editor code stays out
// of the public homepage's initial JavaScript download.
const App = lazy(() => import('./App.jsx'));
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));
const LifeDetailPage = lazy(() => import('./pages/life/LifeDetailPage.jsx'));
const PublishedContentPage = lazy(() => import('./pages/content/PublishedContentPage.jsx'));
const Updates = lazy(() => import('./pages/news/Updates.jsx'));
const EventDetail = lazy(() => import('./pages/events/EventDetail.jsx'));
const EventsPage = lazy(() => import('./pages/events/EventsPage.jsx'));
const PastPapersPage = lazy(() => import('./pages/academics/PastPapersPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/errors/NotFoundPage.jsx'));
import './index.css';

function Root() {
  const [route, setRoute] = useState(() => ({
    location: window.location.pathname + window.location.search + window.location.hash,
    type: 'initial',
    revision: 0,
    savedScroll: null,
  }));
  useEffect(() => {
    // Admin keeps its original standalone navigation and scroll handling.
    if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') return undefined;
    return listenForNavigation((type, savedScroll = null) => {
      setRoute(previous => ({
        location: window.location.pathname + window.location.search + window.location.hash,
        type,
        savedScroll,
        revision: previous.revision + 1,
      }));
    });
  }, []);

  const pathname = new URL(route.location, window.location.origin).pathname;
  let page;
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

  if (pathname === '/past-papers' || pathname === '/past-papers/') page = <PastPapersPage />;
  else if (isAdminPath) page = <AdminApp />;
  else if (isAboutUsPath) page = <LifeDetailPage slug="about-us" />;
  else if (isEventsIndex) page = <EventsPage />;
  else if (eventsSlug) page = <EventDetail titleSlug={eventsSlug} />;
  else if (updatesSlug) page = <Updates titleSlug={updatesSlug} />;
  else if (lifeSlug) page = <LifeDetailPage slug={lifeSlug} />;
  else if (pageSlug) page = <PublishedContentPage slug={pageSlug} />;
  else if (pathname === '/' || pathname === '/index.html') page = <App />;
  else page = <NotFoundPage />;

  // The path key resets local page state when moving between two CMS records.
  // Hash-only navigation keeps its current page mounted.
  return (
    <Suspense fallback={<main aria-busy="true" aria-label="Loading page" className="min-h-screen bg-[#0a0a0a]" />}>
      {!isAdminPath && <RouteScroll key={route.revision} location={route.location} navigationType={route.type} savedScroll={route.savedScroll} />}
      {React.cloneElement(page, { key: pathname })}
    </Suspense>
  );
}

if (window.location.pathname !== '/admin' && window.location.pathname !== '/admin/' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false,
  });

  setSmoothScroller(lenis);

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);