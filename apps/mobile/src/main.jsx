import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/main.css';

// Dark-only ("Midnight"): set the status-bar colour to the app background.
const tcMeta = document.querySelector('meta[name="theme-color"]');
if (tcMeta) tcMeta.setAttribute('content', '#0D1016');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
