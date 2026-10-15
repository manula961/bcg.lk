import React from 'react';
import ReactDOM from 'react-dom/client';
import Lenis from 'lenis';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import LifeDetailPage, { lifePages } from './pages/LifeDetailPage.jsx';
import PublishedContentPage from './pages/PublishedContentPage.jsx';
import './index.css';

const isAdminPath = window.location.pathname === '/admin' || window.location.pathname === '/admin/';
const lifeMatch = window.location.pathname.match(/^\/life\/([a-z-]+)\/?$/);
const lifeSlug = lifeMatch && Object.prototype.hasOwnProperty.call(lifePages, lifeMatch[1]) ? lifeMatch[1] : null;
const pageMatch = window.location.pathname.match(/^\/pages\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
const pageSlug = pageMatch ? pageMatch[1] : null;

// Initialize Lenis Smooth Scroll only for non-admin pages
if (!isAdminPath) {
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
    {isAdminPath ? <AdminApp /> : lifeSlug ? <LifeDetailPage slug={lifeSlug} /> : pageSlug ? <PublishedContentPage slug={pageSlug} /> : <App />}
  </React.StrictMode>
);