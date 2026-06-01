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
        <div className="topbar-spacer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          {syncing && (
            <div title="Syncing…" style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--rust)', opacity: 0.7,
              animation: 'pulse 1s ease-in-out infinite'
            }} />
          )}
        </div>
      </div>
    </header>
  );
}
