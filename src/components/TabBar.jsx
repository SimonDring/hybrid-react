import { useNavigate } from 'react-router-dom';

const TABS = [
  {
    id: 'today', path: '/',
    icon: <><path d="M3 12l9-9 9 9"></path><path d="M5 10v10h14V10"></path></>,
    label: 'Today'
  },
  {
    id: 'phases', path: '/phases',
    icon: <><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><line x1="9" y1="4" x2="9" y2="20"></line></>,
    label: 'Phases'
  },
  {
    id: 'tracking', path: '/tracking',
    icon: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></>,
    label: 'Tracking'
  },
  {
    id: 'profile', path: '/profile',
    icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></>,
    label: 'Profile'
  }
];

export default function TabBar({ activeTab }) {
  const navigate = useNavigate();

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
        <button
          className={`tab-coach ${activeTab === 'coach' ? 'active' : ''}`}
          onClick={() => navigate('/coach')}
          aria-label="AI coach"
        >
          <span className="tab-coach-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <span className="tab-coach-label">Coach</span>
        </button>
        {TABS.slice(2).map(renderTab)}
      </div>
    </nav>
  );
}
