import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import TopBar from './components/TopBar.jsx';
import TabBar from './components/TabBar.jsx';
import ScreenContainer from './components/ScreenContainer.jsx';

import Home from './screens/Home.jsx';
import Phases from './screens/Phases.jsx';
import PhaseDetail from './screens/PhaseDetail.jsx';
import WeekDetail from './screens/WeekDetail.jsx';
import SessionDetail from './screens/SessionDetail.jsx';
import Tracking from './screens/Tracking.jsx';
import Checkin from './screens/Checkin.jsx';
import Wearables from './screens/Wearables.jsx';
import Metrics from './screens/Metrics.jsx';
import Trends from './screens/Trends.jsx';
import Log from './screens/Log.jsx';
import Profile from './screens/Profile.jsx';
import Injuries from './screens/Injuries.jsx';
import Overview from './screens/Overview.jsx';
import Decisions from './screens/Decisions.jsx';
import Principles from './screens/Principles.jsx';
import Reassess from './screens/Reassess.jsx';
import Settings from './screens/Settings.jsx';

const routeMeta = {
  '/': { title: 'Hybrid', topLevel: true, tab: 'home' },
  '/phases': { title: 'Phases', topLevel: true, tab: 'phases' },
  '/phases/:phaseId': { title: 'Phase', topLevel: false, tab: 'phases' },
  '/phases/:phaseId/weeks/:weekNum': { title: 'Week', topLevel: false, tab: 'phases' },
  '/phases/:phaseId/weeks/:weekNum/sessions/:sessionIdx': { title: 'Session', topLevel: false, tab: 'phases' },
  '/tracking': { title: 'Tracking', topLevel: true, tab: 'tracking' },
  '/tracking/checkin': { title: 'Weekly check-in', topLevel: false, tab: 'tracking' },
  '/tracking/wearables': { title: 'Wearable data', topLevel: false, tab: 'tracking' },
  '/tracking/metrics': { title: 'Key metrics', topLevel: false, tab: 'tracking' },
  '/tracking/trends': { title: 'Trends', topLevel: false, tab: 'tracking' },
  '/tracking/log': { title: 'Log history', topLevel: false, tab: 'tracking' },
  '/tracking/injuries': { title: 'Injury log', topLevel: false, tab: 'tracking' },
  '/profile': { title: 'Profile', topLevel: true, tab: 'profile' },
  '/profile/injuries': { title: 'Injury log', topLevel: false, tab: 'profile' },
  '/profile/overview': { title: 'Overview', topLevel: false, tab: 'profile' },
  '/profile/decisions': { title: 'Decisions', topLevel: false, tab: 'profile' },
  '/profile/principles': { title: 'Principles', topLevel: false, tab: 'profile' },
  '/profile/reassess': { title: 'Reassessment', topLevel: false, tab: 'profile' },
  '/settings': { title: 'Settings', topLevel: true, tab: 'settings' }
};

function matchRoute(pathname) {
  if (routeMeta[pathname]) return routeMeta[pathname];
  for (const pattern of Object.keys(routeMeta)) {
    if (!pattern.includes(':')) continue;
    const pParts = pattern.split('/');
    const aParts = pathname.split('/');
    if (pParts.length !== aParts.length) continue;
    const match = pParts.every((p, i) => p.startsWith(':') || p === aParts[i]);
    if (match) return routeMeta[pattern];
  }
  return { title: 'Hybrid', topLevel: true, tab: 'home' };
}

export default function App() {
  const location = useLocation();
  const meta = matchRoute(location.pathname);

  return (
    <div className="app">
      <TopBar title={meta.title} showBack={!meta.topLevel} />

      <ScreenContainer pathname={location.pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/phases" element={<Phases />} />
          <Route path="/phases/:phaseId" element={<PhaseDetail />} />
          <Route path="/phases/:phaseId/weeks/:weekNum" element={<WeekDetail />} />
          <Route path="/phases/:phaseId/weeks/:weekNum/sessions/:sessionIdx" element={<SessionDetail />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/tracking/checkin" element={<Checkin />} />
          <Route path="/tracking/wearables" element={<Wearables />} />
          <Route path="/tracking/metrics" element={<Metrics />} />
          <Route path="/tracking/trends" element={<Trends />} />
          <Route path="/tracking/log" element={<Log />} />
          <Route path="/tracking/injuries" element={<Injuries />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/injuries" element={<Injuries />} />
          <Route path="/profile/overview" element={<Overview />} />
          <Route path="/profile/decisions" element={<Decisions />} />
          <Route path="/profile/principles" element={<Principles />} />
          <Route path="/profile/reassess" element={<Reassess />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ScreenContainer>

      <TabBar activeTab={meta.tab} />
    </div>
  );
}
