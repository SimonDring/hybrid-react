import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

import { useAuthStore } from './stores/authStore.js';
import { useTrainingStore } from './stores/trainingStore.js';
import Login from './screens/Login.jsx';
import SetNewPassword from './screens/SetNewPassword.jsx';
import Onboarding from './screens/Onboarding.jsx';

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
import QuarterlyReview from './screens/QuarterlyReview.jsx';
import Settings from './screens/Settings.jsx';
import Coach from './screens/Coach.jsx';

const routeMeta = {
  '/': { title: 'Hybrid', topLevel: true, tab: 'today' },
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
  '/profile/review': { title: 'Quarterly review', topLevel: false, tab: 'profile' },
  '/settings': { title: 'Settings', topLevel: false, tab: 'profile' },
  '/coach': { title: 'Coach', topLevel: true, tab: 'coach' }
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
  return { title: 'Hybrid', topLevel: true, tab: 'today' };
}

export default function App() {
  const location = useLocation();
  const meta = matchRoute(location.pathname);

  const authStatus = useAuthStore(s => s.status);
  const recoveryMode = useAuthStore(s => s.recoveryMode);
  const initAuth = useAuthStore(s => s.init);
  const profile = useTrainingStore(s => s.profile);
  const syncing = useTrainingStore(s => s.syncing);

  // Check for an existing session once on mount
  useEffect(() => { initAuth(); }, [initAuth]);

  // While checking for a session, show a minimal splash (avoids a flash of Login)
  if (authStatus === 'loading') {
    return <Splash />;
  }

  // Signed out (or Supabase not configured) → show Login
  if (authStatus === 'signed_out' || authStatus === 'not_configured') {
    return <Login />;
  }

  // A password-reset link opened the app → prompt for a new password first
  if (recoveryMode) {
    return <SetNewPassword />;
  }

  // First-run onboarding. A user is treated as onboarded if they've finished the
  // wizard OR already have data (goals/name) — so existing users aren't trapped.
  const isOnboarded = profile.onboarded === true
    || (profile.goals && profile.goals.length > 0)
    || !!(profile.name && profile.name.trim());
  // While the first cloud pull is in flight we can't yet tell a brand-new user
  // from an existing one on a fresh device — hold on the splash to avoid showing
  // either the wizard or the app on the wrong side of the sync.
  if (!isOnboarded && syncing) {
    return <Splash />;
  }
  if (!isOnboarded) {
    return <Onboarding />;
  }

  // Signed in → the app
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
          <Route path="/profile/review" element={<QuarterlyReview />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ScreenContainer>

      <TabBar activeTab={meta.tab} />
    </div>
  );
}

// Minimal full-screen splash, shown while we resolve auth/sync state.
function Splash() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.4 }}>
        Hybrid
      </div>
    </div>
  );
}
