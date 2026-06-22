import { useNavigate } from 'react-router-dom';

const TABS = [
  { id: 'home', path: '/', label: 'Home',
    icon: <><path d="M3 12l9-9 9 9"></path><path d="M5 10v10h14V10"></path></> },
  { id: 'plan', path: '/plan', label: 'Plan',
    icon: <><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><line x1="9" y1="4" x2="9" y2="20"></line></> },
  { id: 'health', path: '/health', label: 'Health',
    icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path> },
  { id: 'atlas', path: '/atlas', label: 'Atlas',
    icon: <><polygon points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5"></polygon><path d="M12 12V3M12 12l8-4.5M12 12l8 4.5M12 12v9M12 12l-8 4.5M12 12L4 7.5"></path></> }
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
