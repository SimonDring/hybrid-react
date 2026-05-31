import { useNavigate } from 'react-router-dom';

export default function TopBar({ title, showBack }) {
  const navigate = useNavigate();

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
        <div className="topbar-spacer" />
      </div>
    </header>
  );
}
