import { useNavigate } from 'react-router-dom';

const TABS = [
  {
    id: 'home', path: '/',
    icon: <><path d="M3 12l9-9 9 9"></path><path d="M5 10v10h14V10"></path></>,
    label: 'Home'
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
  },
  {
    id: 'settings', path: '/settings',
    icon: <><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></>,
    label: 'Settings'
  }
];

export default function TabBar({ activeTab }) {
  const navigate = useNavigate();

  return (
    <nav className="tabbar" id="tabbar">
      <div className="tabbar-inner">
        {TABS.map(tab => (
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
        ))}
      </div>
    </nav>
  );
}
