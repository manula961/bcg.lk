import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import LifeDetailPage, { lifePages } from './pages/LifeDetailPage.jsx';
import './index.css';

const isAdminPath = window.location.pathname === '/admin' || window.location.pathname === '/admin/';
const lifeMatch = window.location.pathname.match(/^\/life\/([a-z-]+)\/?$/);
const lifeSlug = lifeMatch && Object.prototype.hasOwnProperty.call(lifePages, lifeMatch[1]) ? lifeMatch[1] : null;
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdminPath ? <AdminApp /> : lifeSlug ? <LifeDetailPage slug={lifeSlug} /> : <App />}
  </React.StrictMode>
);
