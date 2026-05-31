import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/main.css';

// Apply saved theme preference before render to avoid flash
const savedTheme = localStorage.getItem('htp_theme');
if (savedTheme && savedTheme !== 'auto') {
  document.documentElement.setAttribute('data-theme', savedTheme);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
