import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';

export default function TopBar({ title, showBack }) {
  const navigate = useNavigate();
  const syncing = useTrainingStore(s => s.syncing);

  return (
    <header className="topbar" id="topbar">
      <div className="topbar-inner">
        {showBack ? (
          <button className="btn-back" aria-label="Back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        ) : (
          <div className="topbar-spacer" />
        )}
        <div className="topbar-title">{title}</div>
        <div className="topbar-spacer" style={{ width: 'auto', minWidth: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
          {syncing && (
            <div title="Syncing…" style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--rust)', opacity: 0.7,
              animation: 'pulse 1s ease-in-out infinite'
            }} />
          )}
          {!showBack && (
            <button className="btn-icon" aria-label="Settings" onClick={() => navigate('/settings')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
