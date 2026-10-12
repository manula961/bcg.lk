import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import './index.css';

const isAdminPath = window.location.pathname === '/admin' || window.location.pathname === '/admin/';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdminPath ? <AdminApp /> : <App />}
  </React.StrictMode>
);
