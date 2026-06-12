import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

import { useAuthStore } from './stores/authStore.js';
import { useTrainingStore } from './stores/trainingStore.js';
import Login from './screens/Login.jsx';
import SetNewPassword from './screens/SetNewPassword.jsx';
import Onboarding from './screens/Onboarding.jsx';
import DevPlayground from './screens/DevPlayground.jsx';

import TopBar from './components/TopBar.jsx';
import TabBar from './components/TabBar.jsx';
import ScreenContainer from './components/ScreenContainer.jsx';

import Home from './screens/Home.jsx';
import TrainNow from './screens/TrainNow.jsx';
import PlanScreen from './screens/Plan.jsx';
import PhaseDetail from './screens/PhaseDetail.jsx';
import WeekDetail from './screens/WeekDetail.jsx';
import SessionDetail from './screens/SessionDetail.jsx';
import Progress from './screens/Progress.jsx';
import Wearables from './screens/Wearables.jsx';
import Trends from './screens/Trends.jsx';
import Profile from './screens/Profile.jsx';
import Injuries from './screens/Injuries.jsx';
import Settings from './screens/Settings.jsx';
import Coach from './screens/Coach.jsx';
import BlockCheckin from './screens/BlockCheckin.jsx';

const routeMeta = {
  '/': { title: 'Today', topLevel: true, tab: 'today' },
  '/train-now': { title: 'Train now', topLevel: false, tab: 'today' },
  '/plan': { title: 'Plan', topLevel: true, tab: 'plan' },
  '/phases/:phaseId': { title: 'Phase', topLevel: false, tab: 'plan' },
  '/phases/:phaseId/weeks/:weekNum': { title: 'Week', topLevel: false, tab: 'plan' },
  '/phases/:phaseId/weeks/:weekNum/sessions/:sessionIdx': { title: 'Session', topLevel: false, tab: 'plan' },
  '/progress': { title: 'Progress', topLevel: true, tab: 'progress' },
  '/tracking/wearables': { title: 'Daily metrics', topLevel: false, tab: 'progress' },
  '/tracking/trends': { title: 'Trends', topLevel: false, tab: 'progress' },
  '/tracking/injuries': { title: 'Injury log', topLevel: false, tab: 'profile' },
  '/profile': { title: 'Profile', topLevel: true, tab: 'profile' },
  '/profile/injuries': { title: 'Injury log', topLevel: false, tab: 'profile' },
  '/settings': { title: 'Settings', topLevel: false, tab: 'profile' }
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

// Returns true when the current plan block's end date has passed.
// plan_start_date and plan_weeks must both be set; if not, returns false
// so brand-new users are never accidentally shown the check-in.
function planBlockEnded(profile) {
  if (!profile.plan_start_date || !profile.plan_weeks) return false;
  const start = new Date(profile.plan_start_date + 'T00:00:00');
  if (isNaN(start.getTime())) return false;
  const end = new Date(start.getTime() + profile.plan_weeks * 7 * 24 * 60 * 60 * 1000);
  return new Date() >= end;
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

  // Hidden developer testing route — bypasses auth + onboarding and never writes
  // to the store/Supabase. Reached by typing /dev only; not linked anywhere.
  if (location.pathname === '/dev') {
    return <DevPlayground />;
  }

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
  // An explicit onboarded:false (e.g. after "Clear plan") always re-triggers the
  // wizard, even though the user still has a name + history. Otherwise a user is
  // treated as onboarded if they've finished it or already have goals/name.
  const isOnboarded = profile.onboarded === false
    ? false
    : (profile.onboarded === true
      || (profile.goals && profile.goals.length > 0)
      || !!(profile.name && profile.name.trim()));
  // While the first cloud pull is in flight we can't yet tell a brand-new user
  // from an existing one on a fresh device — hold on the splash to avoid showing
  // either the wizard or the app on the wrong side of the sync.
  if (!isOnboarded && syncing) {
    return <Splash />;
  }
  if (!isOnboarded) {
    return <Onboarding />;
  }

  // Block-end check-in — runs once after each completed plan block.
  // Shows a brief wizard that continues the plan automatically.
  if (planBlockEnded(profile)) {
    return <BlockCheckin />;
  }

  // Signed in → the app
  return (
    <div className="app">
      <TopBar title={meta.title} showBack={!meta.topLevel} />

      <ScreenContainer pathname={location.pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/train-now" element={<TrainNow />} />
          <Route path="/plan" element={<PlanScreen />} />
          <Route path="/phases" element={<Navigate to="/plan" replace />} />
          <Route path="/phases/:phaseId" element={<PhaseDetail />} />
          <Route path="/phases/:phaseId/weeks/:weekNum" element={<WeekDetail />} />
          <Route path="/phases/:phaseId/weeks/:weekNum/sessions/:sessionIdx" element={<SessionDetail />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/tracking" element={<Navigate to="/progress" replace />} />
          <Route path="/tracking/wearables" element={<Wearables />} />
          <Route path="/tracking/trends" element={<Trends />} />
          <Route path="/tracking/injuries" element={<Injuries />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/injuries" element={<Injuries />} />
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
