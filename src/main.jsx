import React from 'react';
import ReactDOM from 'react-dom/client';
import Lenis from 'lenis';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import LifeDetailPage, { lifePages } from './pages/LifeDetailPage.jsx';
import Updates from './pages/Updates.jsx';
import './index.css';

const pathname = window.location.pathname;
const isAdminPath = pathname === '/admin' || pathname === '/admin/';
const lifeMatch = pathname.match(/^\/life\/([a-z-]+)\/?$/);
const lifeSlug = lifeMatch && Object.prototype.hasOwnProperty.call(lifePages, lifeMatch[1]) ? lifeMatch[1] : null;

// Handle /updates/[News title] routing
const updatesMatch = pathname.match(/^\/updates\/([^/]+)\/?$/);
const updatesSlug = updatesMatch ? updatesMatch[1] : null;

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
    {isAdminPath ? (
      <AdminApp />
    ) : updatesSlug ? (
      <Updates titleSlug={updatesSlug} />
    ) : lifeSlug ? (
      <LifeDetailPage slug={lifeSlug} />
    ) : (
      <App />
    )}
  </React.StrictMode>
);