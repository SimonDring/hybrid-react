import { useNavigate } from 'react-router-dom';

const TABS = [
  { id: 'today', path: '/', label: 'Today',
    icon: <><path d="M3 12l9-9 9 9"></path><path d="M5 10v10h14V10"></path></> },
  { id: 'plan', path: '/plan', label: 'Plan',
    icon: <><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><line x1="9" y1="4" x2="9" y2="20"></line></> },
  { id: 'progress', path: '/progress', label: 'Progress',
    icon: <><polyline points="3 17 9 11 13 15 21 7"></polyline><polyline points="15 7 21 7 21 13"></polyline></> },
  { id: 'health', path: '/health', label: 'Health',
    icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path> },
  { id: 'profile', path: '/profile', label: 'Profile',
    icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></> }
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
