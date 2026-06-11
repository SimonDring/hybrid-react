import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';

const TABS = [
  {
    id: 'today', path: '/',
    icon: <><path d="M3 12l9-9 9 9"></path><path d="M5 10v10h14V10"></path></>,
    label: 'Today'
  },
  {
    id: 'plan', path: '/plan',
    icon: <><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><line x1="9" y1="4" x2="9" y2="20"></line></>,
    label: 'Plan'
  },
  {
    id: 'progress', path: '/progress',
    icon: <><polyline points="3 17 9 11 13 15 21 7"></polyline><polyline points="15 7 21 7 21 13"></polyline></>,
    label: 'Progress'
  },
  {
    id: 'profile', path: '/profile',
    icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></>,
    label: 'Profile'
  }
];

export default function TabBar({ activeTab }) {
  const navigate = useNavigate();

  // Smart primary action: today's (or next) planned session if there's a plan,
  // otherwise the on-demand Train Now flow — one tap to train from anywhere.
  const startTrain = () => {
    const sessions = useTrainingStore.getState().sessions || {};
    const rec = Plan.getStartDate() ? Plan.recommendedSession(sessions) : null;
    if (rec && rec.phase) navigate(`/phases/${rec.phase.id}/weeks/${rec.week.num}/sessions/${rec.sessionIdx}`);
    else navigate('/train-now');
  };

  const renderTab = (tab) => (
    <button
      key={tab.id}
      className={`tab ${activeTab === tab.id ? 'active' : ''}`}
      data-tab={tab.id}
      onClick={() => navigate(tab.path)}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {tab.icon}
      </svg>
      <span>{tab.label}</span>
    </button>
  );

  return (
    <nav className="tabbar" id="tabbar">
      <div className="tabbar-inner">
        {TABS.slice(0, 2).map(renderTab)}
        <button className="tab-train" onClick={startTrain} aria-label="Train">
          <span className="tab-train-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </span>
          <span className="tab-train-label">Train</span>
        </button>
        {TABS.slice(2).map(renderTab)}
      </div>
    </nav>
  );
}
