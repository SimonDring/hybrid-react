import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/main.css';

// Apply the theme before render to avoid a flash. The brand default is the bolder
// DARK athletic theme — used unless the user has explicitly chosen light/auto.
const savedTheme = localStorage.getItem('htp_theme') || 'dark';
if (savedTheme !== 'auto') {
  document.documentElement.setAttribute('data-theme', savedTheme);
}
// Match the status-bar colour to the resolved theme (default dark athletic).
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDark = savedTheme === 'dark' || (savedTheme === 'auto' && prefersDark);
const tcMeta = document.querySelector('meta[name="theme-color"]');
if (tcMeta) tcMeta.setAttribute('content', isDark ? '#100d09' : '#f4f1ea');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
