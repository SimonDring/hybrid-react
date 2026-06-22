/**
 * trainingStore — Zustand store, now routing writes through SyncService.
 *
 * Read path:  store reads from Database (localStorage cache) — always instant.
 * Write path: store calls SyncService which writes to Supabase first (if signed
 *             in), then updates localStorage. UI re-renders from localStorage
 *             immediately via buildView(), so there's no spinner on writes.
 *
 * syncFromCloud(): called once on sign-in. Pulls all Supabase rows into local
 * cache, then re-renders. This is what makes cross-device sync work.
 */

import { create } from 'zustand';
import Database from '../lib/Database.js';
import Sync, { pullFromSupabase, runSessionDMigration, syncFitbit, syncStrava, checkConnections, setDevicePrimary, linkWorkout, unlinkWorkout, enrichSessions } from '../lib/SyncService.js';
import { nextE1RM } from '../lib/liftProgression.js';
import { computeReadiness } from '../lib/Readiness.js';
import { setRuntime, currentAdaptation, sessionDiscipline, getWeek } from '../lib/PlanService.js';
import { dailyLoads, acuteChronic, acwr, acwrSeries, loadDecision, sessionLoad } from '../lib/plan/trainingLoad.js';
import { setOverride, clearOverride } from '../lib/sessionOverrides.js';
import { matchWorkoutToSession, sessionPhysiologyFromWorkout } from '../lib/sessionWorkoutMatch.js';
import { validateProfile, validateDailyMetric, validateSessionLog, validateInjury } from '../lib/validation/validate.js';

// Resolve the plan-template session object (with .items) for a template_ref.
// Returns {} (→ sessionDiscipline 'gym') when it can't be resolved.
function planSessionFor(templateRef) {
  const m = /^p(\d+)_wk(\d+)_s(\d+)$/.exec(templateRef || '');
  if (!m) return {};
  const week = getWeek(Number(m[1]), Number(m[2]));
  return (week && week.sessions && week.sessions[Number(m[3])]) || {};
}

// Read the current state from localStorage into a React-friendly shape.
// All reads go through here — screens never call Database directly.
function buildView() {
  const checkins = Database.services.listCheckins();
  const logs = checkins.map(c => ({
    _id: c.id,
    date: c.week_ending || '',
    bw: c.bodyweight_kg != null ? String(c.bodyweight_kg) : '',
    rhr: c.resting_hr != null ? String(c.resting_hr) : '',
    rpe: c.avg_rpe != null ? String(c.avg_rpe) : '',
    sleep: c.sleep_score != null ? String(c.sleep_score) : '',
    knee: c.knee_rating != null ? String(c.knee_rating) : '',
    notes: c.notes || ''
  }));

  const sessions = {};
  Database.tables.sessions.all().forEach(s => {
    if (!s.template_ref) return;
    const log = s.status === 'completed'
      ? Database.tables.sessionLogs.find(l => l.session_id === s.id)
      : null;
    const linkedWorkout = Database.tables.workouts.all().find(w => w.session_id === s.id) || null;
    sessions[s.template_ref] = {
      id: s.id,                 // session DB id — needed by the UI to link/unlink
      completed: s.status === 'completed',
      skipped: s.status === 'skipped',
      started: !!s.started_at && s.status !== 'completed' && s.status !== 'skipped',
      startedAt: s.started_at || null,
      completedAt: s.completed_at || null,
      createdAt: s.created_at || null,   // when the user first acted on this slot — used to scope settled state to the current plan epoch (see PlanService.withinEpoch)
      quality: log ? log.quality : null,
      energy: log ? log.energy : null,
      recovery: log ? log.recovery : null,
      notes: log ? (log.notes || '') : '',
      avgHr: log ? (log.avg_hr ?? null) : null,
      maxHr: log ? (log.max_hr ?? null) : null,
      calories: log ? (log.calories ?? null) : null,
      hrSource: log ? (log.hr_source ?? null) : null,
      hrZones: log ? (log.hr_zones ?? null) : null,
      linkedWorkout
    };
  });

  const dailyMetrics = Database.services.listDailyMetrics();

  // Keep the plan's adaptive reflow current: it reflows this week around what's
  // been completed + today's readiness. Set before screens read the plan.
  const today = new Date().toISOString().split('T')[0];
  const sessionLogsAll = Database.tables.sessionLogs.all();
  const workoutsAll = Database.tables.workouts.all();
  const dl = dailyLoads(sessionLogsAll, workoutsAll);
  const ac = acuteChronic(dl, today);
  const acwrVal = acwr(ac);
  const decision = loadDecision(acwrVal, acwrSeries(dl, today, 4));

  setRuntime({ sessions, readiness: computeReadiness(dailyMetrics, logs).score, loadDecision: decision });

  // Load view-model: acute/chronic/acwr + recent session loads (newest first).
  const band = acwrVal == null ? null : acwrVal < 0.8 ? 'under' : acwrVal > 1.5 ? 'over' : acwrVal > 1.3 ? 'high' : 'sweet';
  const loadSessions = sessionLogsAll
    .filter(l => l.completed_at)
    .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
    .slice(0, 14)
    .map(l => ({ date: (l.completed_at || '').split('T')[0], ...sessionLoad(l) }));
  const loadView = { acute: Math.round(ac.acute), chronic: Math.round(ac.chronic), acwr: acwrVal, band, sessions: loadSessions };

  return {
    logs,
    sessions,
    workouts:     workoutsAll,
    reassess:     Database.services.getReassessAnswers(),
    profile:      Database.services.getProfile(),
    injuries:     Database.services.listInjuries(),
    dailyMetrics,
    load:         loadView,
    adaptation:   currentAdaptation(),
    syncing:      false,
    _tick:        Date.now()
  };
}

export const useTrainingStore = create((set) => ({
  ...buildView(),
  connections: [],          // all wearable_connections rows: { provider, role, connected_at, last_synced_at }
  fitbitConnection: null,   // null = not connected, object = { connected_at, last_synced_at }
  fitbitSyncing: false,
  fitbitError: null,        // last sync failure reason (null when ok) — drives the UI
  stravaSyncing: false,
  stravaError: null,        // last Strava sync failure reason (null when ok)

  // Re-read the local cache into the view (used by the dev preview seeder).
  refresh: () => set(buildView()),

  // Pull fresh data from Supabase into local cache, then re-render.
  // Call this when the user signs in or the app comes to foreground.
  async syncFromCloud() {
    set({ syncing: true });
    // Session D: push any pre-auth localStorage data to Supabase (no-op if done)
    await runSessionDMigration();
    const result = await pullFromSupabase();
    // Load all wearable connections; derive the Fitbit one for existing UI/logic.
    const connections = await checkConnections();
    const fitbitConnection = connections.find(c => c.provider === 'fitbit') || null;
    set({ ...buildView(), syncing: false, connections, fitbitConnection });
    if (fitbitConnection) {
      useTrainingStore.getState().syncFitbitToday();
    }
    if (connections.some(c => c.provider === 'strava')) {
      useTrainingStore.getState().syncStrava();
    }
    // Link cardio workouts to sessions, then enrich HR for windowed sessions.
    await useTrainingStore.getState().autoLinkWorkouts();
    if (connections.some(c => c.provider === 'fitbit')) {
      useTrainingStore.getState().enrichSessions();
    }
    return result;
  },

  // ----- Fitbit -----
  // Refresh all wearable connections (and the derived Fitbit one).
  async refreshFitbitConnection() {
    const connections = await checkConnections();
    const fitbitConnection = connections.find(c => c.provider === 'fitbit') || null;
    set({ connections, fitbitConnection });
    return fitbitConnection;
  },

  // Make `provider` the sole primary device, then refresh connections.
  async setPrimaryDevice(provider) {
    const res = await setDevicePrimary(provider);
    if (!res.ok) return;
    const connections = await checkConnections();
    const fitbitConnection = connections.find(c => c.provider === 'fitbit') || null;
    set({ connections, fitbitConnection });
  },

  async syncFitbitToday() {
    set({ fitbitSyncing: true, fitbitError: null });
    const result = await syncFitbit();
    if (result?.ok) {
      // Pull updated daily_metrics from Supabase into local cache
      await pullFromSupabase();
      set({ ...buildView(), fitbitSyncing: false, fitbitError: null });
    } else {
      set({ fitbitSyncing: false, fitbitError: result?.reason || 'Sync failed' });
    }
    return result;
  },

  async syncFitbitRange(dateFrom, dateTo) {
    set({ fitbitSyncing: true, fitbitError: null });
    const result = await syncFitbit(dateFrom, dateTo);
    if (result?.ok) {
      await pullFromSupabase();
      set({ ...buildView(), fitbitSyncing: false, fitbitError: null });
    } else {
      set({ fitbitSyncing: false, fitbitError: result?.reason || 'Sync failed' });
    }
    return result;
  },

  async syncStrava() {
    set({ stravaSyncing: true, stravaError: null });
    const result = await syncStrava();
    if (result?.ok) {
      await pullFromSupabase();
      set({ ...buildView(), stravaSyncing: false, stravaError: null });
    } else {
      set({ stravaSyncing: false, stravaError: result?.reason || 'Sync failed' });
    }
    return result;
  },

  // Auto-link each completed cardio session to its best-matching Strava workout.
  async autoLinkWorkouts() {
    const workouts = Database.tables.workouts.all().filter(w => !w.session_id);
    if (!workouts.length) { return; }
    let linkedAny = false;
    for (const s of Database.tables.sessions.all()) {
      if (s.status !== 'completed' || !s.started_at || !s.completed_at) continue;
      if (Database.tables.workouts.all().some(w => w.session_id === s.id)) continue; // already linked
      const discipline = sessionDiscipline(planSessionFor(s.template_ref));
      const match = matchWorkoutToSession({ startedAt: s.started_at, completedAt: s.completed_at, discipline }, workouts);
      if (!match) continue;
      const log = Database.tables.sessionLogs.find(l => l.session_id === s.id);
      if (!log) continue;
      await Sync.linkWorkout(match.id, s.id, sessionPhysiologyFromWorkout(match));
      const mi = workouts.indexOf(match);
      if (mi >= 0) workouts.splice(mi, 1);   // a workout links to at most one session per pass
      linkedAny = true;
    }
    if (linkedAny) { await pullFromSupabase(); set(buildView()); }
  },

  async enrichSessions() {
    const result = await enrichSessions();
    if (result?.ok) { await pullFromSupabase(); set(buildView()); }
    return result;
  },

  async linkWorkoutToSession(workoutId, sessionId) {
    const w = Database.tables.workouts.get(workoutId);
    if (!w) return;
    if (!Database.tables.sessionLogs.find(l => l.session_id === sessionId)) return;
    await Sync.linkWorkout(workoutId, sessionId, sessionPhysiologyFromWorkout(w));
    await pullFromSupabase(); set(buildView());
  },

  async unlinkWorkoutFromSession(workoutId, sessionId) {
    await Sync.unlinkWorkout(workoutId, sessionId);
    await pullFromSupabase();
    // Instant unlinked feedback now; enrichSessions refills band HR async (it
    // pulls + rebuilds the view itself on completion). Two-step update is intended.
    useTrainingStore.getState().enrichSessions(); // re-fill from the band
    set(buildView());
  },

  // ----- Session lifecycle -----
  // OFFLINE-FIRST: each Sync.* writes localStorage SYNCHRONOUSLY (before its first
  // await), then syncs to Supabase. We rebuild the view from local state right
  // away and let the cloud write run in the background — so the UI updates
  // instantly and can NEVER be blocked or frozen by a slow/hung network request.
  // Cloud errors are logged, not surfaced (the local cache is the source of truth).
  startSession(templateRef) {
    Sync.startSession(templateRef).catch(e => console.error('startSession sync failed:', e));
    set(buildView());
  },
  completeSession(templateRef, payload) {
    const { ok, value, errors } = validateSessionLog(payload || {});
    if (!ok) return { ok: false, errors };
    Sync.completeSession(templateRef, value).catch(e => console.error('completeSession sync failed:', e));
    set(buildView());
    return { ok: true };
  },
  uncompleteSession(templateRef) {
    Sync.uncompleteSession(templateRef).catch(e => console.error('uncompleteSession sync failed:', e));
    clearOverride(templateRef);   // re-completing later rebuilds from the plan, not the old train-now snapshot
    set(buildView());
  },
  cancelSession(templateRef) {
    Sync.cancelSession(templateRef).catch(e => console.error('cancelSession sync failed:', e));
    clearOverride(templateRef);   // started by mistake → drop any train-now adaptation too
    set(buildView());
  },
  skipSession(templateRef) {
    Sync.skipSession(templateRef).catch(e => console.error('skipSession sync failed:', e));
    set(buildView());
  },
  // "Train now" → pin a generated session onto the slot you're about to do, then
  // the rest of the week reflows around it. Stored locally (see sessionOverrides).
  applyTrainNow(sessionKey, snapshot) {
    setOverride(sessionKey, snapshot);
    set(buildView());
  },

  // ----- Weekly check-ins -----
  async addLog(entry) {
    await Sync.addCheckin(entry);
    set(buildView());
  },
  async deleteLog(idx) {
    const view = buildView().logs;
    const record = view[idx];
    if (record && record._id) {
      await Sync.deleteCheckin(record._id);
      set(buildView());
    }
  },

  // ----- Reassessment -----
  async setReassess(qid, value) {
    await Sync.setReassessAnswer(qid, value);
    set(buildView());
  },

  // ----- Profile -----
  async updateProfile(patch) {
    const { ok, value, errors } = validateProfile(patch);
    if (!ok) return { ok: false, errors };
    await Sync.updateProfile(value);
    set(buildView());
    return { ok: true };
  },

  // Log top-set results for the main lifts → updates the tracked e1RMs so next
  // week's target weights autoregulate. `sets`: [{ key, weight, reps, rpe,
  // targetRpe, factor }]. See src/lib/liftProgression.js.
  async logLiftSets(sets) {
    if (!sets || !sets.length) return;
    const profile = buildView().profile || {};
    const log = { ...(profile.lift_log || {}) };
    let changed = false;
    sets.forEach(s => {
      const e1rm = nextE1RM(s);
      if (e1rm) { log[s.key] = { e1rm, rpe: Number(s.rpe), at: new Date().toISOString() }; changed = true; }
    });
    if (changed) {
      await Sync.updateProfile({ lift_log: log });
      set(buildView());
    }
  },
  // Clear the current plan and re-trigger onboarding to build a fresh one. KEEPS
  // baseline, tracked ability (lifts/lift_log) and ALL training history (sessions,
  // check-ins, metrics, injuries) — only the plan-defining inputs are reset, so
  // the next plan layers on top of where you actually are.
  async clearPlan() {
    await Sync.updateProfile({
      focus: [], primary: null, strength_style: null, experience: {},
      run_goal: null, swim_goal: null, availability: {}, long_run_day: null, doubles: true,
      plan_start_date: null, plan_weeks: null, access: [], pool_length_m: null,
      markers: '', goals: [], onboarded: false
    });
    set(buildView());
  },
  // Delete all logged training data (sessions, check-ins, daily metrics,
  // injuries, reassessments) and reset tracked lift ability — but KEEP the
  // account, baseline and current plan. A clean slate of history without
  // re-onboarding. (Lighter than clearPlan, much lighter than account deletion.)
  async wipeTrainingData() {
    await Sync.deleteTrainingData();          // cloud soft-delete (no-op if local)
    await Sync.updateProfile({ lift_log: null }); // reset tracked ability
    Database.services.clearTrainingData();    // clear local history
    set(buildView());
  },
  async setGoals(goals) {
    await Sync.setGoals(goals);
    set(buildView());
  },

  // Pin the current week to the plan (ignore the load adaptation). `weekNum` is
  // the plan week number (state.adaptation.week).
  async revertWeekAdaptation(weekNum) {
    if (weekNum == null) return;
    const profile = buildView().profile || {};
    const overrides = { ...(profile.load_overrides || {}), [weekNum]: 'plan' };
    await Sync.updateProfile({ load_overrides: overrides });
    set(buildView());
  },

  // Undo a revert — let load adapt this week again.
  async unrevertWeekAdaptation(weekNum) {
    if (weekNum == null) return;
    const profile = buildView().profile || {};
    const overrides = { ...(profile.load_overrides || {}) };
    delete overrides[weekNum];
    await Sync.updateProfile({ load_overrides: overrides });
    set(buildView());
  },

  // ----- Injuries -----
  async addInjury(fields) {
    const { ok, value, errors } = validateInjury(fields);
    if (!ok) return { ok: false, errors };
    await Sync.addInjury(value);
    set(buildView());
    return { ok: true };
  },
  async updateInjury(id, patch) {
    await Sync.updateInjury(id, patch);
    set(buildView());
  },
  async removeInjury(id) {
    await Sync.removeInjury(id);
    set(buildView());
  },
  async addRecoveryLogEntry(injuryId, entry) {
    await Sync.addRecoveryLogEntry(injuryId, entry);
    set(buildView());
  },

  // ----- Daily metrics -----
  async upsertDailyMetric(fields) {
    const { ok, value, errors } = validateDailyMetric(fields);
    if (!ok) return { ok: false, errors };
    await Sync.upsertDailyMetric(value);
    set(buildView());
    return { ok: true };
  },

  // ----- Bulk operations -----
  replaceAll(data) {
    Database.services.importAll(data);
    set(buildView());
  },
  async resetAll() {
    await Sync.resetAll();
    set(buildView());
  }
}));

// Keep the store current if something else writes to Database directly
Database.subscribe(() => {
  useTrainingStore.setState(buildView());
});
