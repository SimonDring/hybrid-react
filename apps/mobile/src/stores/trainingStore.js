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
import Sync, { pullFromSupabase, runSessionDMigration, drainOutbox, syncFitbit, syncStrava, checkConnections, setDevicePrimary, linkWorkout, unlinkWorkout, enrichSessions } from '../lib/SyncService.js';
import { nextE1RM, resolveLifts, substituteOptions, getGymLevel, computeReadiness, dailyLoads, acuteChronic, acwr, acwrSeries, acwrBand, sessionLoad, assessRecovery, recoveryFromScore, assessLoad, readinessIndex } from '@performance-os/engine';
import { setRuntime, currentAdaptation, sessionDiscipline, getWeek, withinEpoch, adaptedSessionByKey } from '../lib/PlanService.js';
import * as Plan from '../lib/PlanService.js';
import { consistencyGoal } from '../lib/goals.js';
import { setOverride, clearOverride, getOverride, reconcileFromProfile } from '../lib/sessionOverrides.js';
import * as AthleteModel from '../lib/AthleteModelService.js';
import { syncTeamStatus } from '../lib/teamStatus.js';
import { setTeamSchedule } from '../lib/teamScheduleCache.js';
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
    // Session state is keyed by POSITION (p1_wk1_s0…), so a new plan reuses the
    // old plan's keys. Only count settled state that was acted on in the CURRENT
    // plan's epoch — otherwise a stale "completed"/"skipped" row leaks onto the new
    // plan's identical slot (phantom Done/Missed, hidden Start button). One guard
    // here keeps every consumer (calendar, week strip, SessionDetail) consistent.
    const inEpoch = withinEpoch({ createdAt: s.created_at });
    const completed = inEpoch && s.status === 'completed';
    const skipped = inEpoch && s.status === 'skipped';
    const started = inEpoch && !!s.started_at && s.status !== 'completed' && s.status !== 'skipped';
    const log = completed
      ? Database.tables.sessionLogs.find(l => l.session_id === s.id)
      : null;
    const linkedWorkout = Database.tables.workouts.all().find(w => w.session_id === s.id) || null;
    sessions[s.template_ref] = {
      id: s.id,                 // session DB id — needed by the UI to link/unlink
      completed,
      skipped,
      started,
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
  // Load contract (ACWR demoted to a soft input). Recovery contract blends objective
  // wearable readiness with subjective wellness (latest daily_metrics: energy/soreness/
  // mood — dormant until captured) + illness/travel flags. See src/lib/{load,recovery}/.
  const loadOut = assessLoad({ acwrVal, recentAcwr: acwrSeries(dl, today, 4) });
  const objectiveScore = computeReadiness(dailyMetrics, logs).score;
  const latestMetric = [...dailyMetrics].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] || {};
  const profileRow = Database.services.getProfile() || {};
  const readinessV2 = profileRow.readiness_v2 !== false;   // evidence-based weighting is the DEFAULT; set readiness_v2:false to opt out

  // Derived Readiness Index — the physiological index breakdown. Computed once, reused
  // for the UI AND (when readiness_v2 is on) to drive plan adaptation via recoveryOut.
  const priorMetrics = [...dailyMetrics].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(1);
  const cutoff14 = new Date(Date.parse(today) - 14 * 86400000).toISOString().split('T')[0];
  const recVals = [...logs].filter(l => l && l.recovery != null)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 4).map(l => Number(l.recovery));
  const recentRecovery = recVals.length ? recVals.reduce((a, b) => a + b, 0) / recVals.length : null;
  const loggedDays = new Set(dailyMetrics.filter(m => (m.date || '') >= cutoff14).map(m => m.date)).size;
  const completed14 = sessionLogsAll.filter(l => (l.completed_at || '').split('T')[0] >= cutoff14).length;
  const readinessIx = readinessIndex({
    metric: latestMetric, prior: priorMetrics, objectiveScore, recentRecovery,
    dl, asOf: today, setLogs: Database.tables.setLogs.all(),
    capacity: { history: dailyMetrics, profile: profileRow },
    consistency: { loggedDays, windowDays: 14, completed: completed14, planned: 0 },
    v2: readinessV2
  });

  // Recovery contract. v1 (default): the legacy objective+subjective blend. v2 (flagged):
  // the Readiness Index value drives volumeModifier + the deload decision instead.
  const recoveryOut = readinessV2
    ? recoveryFromScore(readinessIx.value, { illness: !!latestMetric.illness, travel: !!latestMetric.travel, confidence: readinessIx.confidence, greenCut: 67 })
    : assessRecovery({
      objectiveScore,
      subjective: { sleepQuality: latestMetric.sleep_quality, soreness: latestMetric.soreness, mood: latestMetric.mood, stress: latestMetric.stress, energy: latestMetric.energy },
      illness: !!latestMetric.illness,
      travel: !!latestMetric.travel
    });

  setRuntime({ sessions, recovery: recoveryOut, load: loadOut });

  // Load view-model: acute/chronic/acwr + recent session loads (newest first).
  // WP-57: the band derives from the engine's ONE governed classifier — these
  // cut-points lived here as hand-copied literals (the documented drift class).
  const band = acwrBand(acwrVal);
  const loadSessions = sessionLogsAll
    .filter(l => l.completed_at)
    .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
    .slice(0, 14)
    .map(l => ({ date: (l.completed_at || '').split('T')[0], ...sessionLoad(l) }));
  const loadView = { acute: Math.round(ac.acute), chronic: Math.round(ac.chronic), acwr: acwrVal, band, sessions: loadSessions };

  // Per-set training history grouped by session id — drives the runner's resume.
  const setLogsBySession = {};
  Database.tables.setLogs.all().forEach(r => {
    (setLogsBySession[r.session_id] = setLogsBySession[r.session_id] || []).push(r);
  });

  return {
    logs,
    sessions,
    setLogsBySession,
    workouts:     workoutsAll,
    reassess:     Database.services.getReassessAnswers(),
    profile:      Database.services.getProfile(),
    injuries:     Database.services.listInjuries(),
    dailyMetrics,
    load:         loadView,
    readiness:    readinessIx,
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
  // Push the derived team status (readiness/load/adherence/availability) for
  // every active membership. Fire-and-forget from the writes that change it.
  // Pull the coach-set team schedule into the local cache so plan generation
  // (synchronous) can apply it as constraints. Fire-and-forget safe.
  refreshTeamSchedule() {
    Sync.fetchMyTeamSchedule()
      .then((raw) => { setTeamSchedule(raw); set(buildView()); })
      .catch(() => {});
  },

  refreshTeamStatus() {
    const st = useTrainingStore.getState();
    const readiness = computeReadiness(st.dailyMetrics || [], st.logs || []);
    const consistencyPct = (() => {
      try { return consistencyGoal(st.profile, st.sessions, Plan.currentWeekNumber()).pct; }
      catch { return null; }
    })();
    syncTeamStatus({ readiness, load: st.load, injuries: st.injuries, consistencyPct })
      .catch(() => {});
  },

  async syncFromCloud() {
    set({ syncing: true });
    // Session D: push any pre-auth localStorage data to Supabase (no-op if done)
    await runSessionDMigration();
    // WP-31: drain queued offline writes BEFORE pulling — otherwise the pull would
    // replace local tables with stale cloud state and lose what was written offline.
    await drainOutbox();
    const result = await pullFromSupabase();
    // WP-28: merge the pulled cloud pins with the local cache (frozen wins — Art 10),
    // so a session started on another device shows ITS frozen content here too.
    reconcileFromProfile((Database.services.getProfile() || {}).session_overrides);
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
    useTrainingStore.getState().refreshTeamStatus();   // the coach board reflects sign-in state
    useTrainingStore.getState().refreshTeamSchedule(); // coach-set constraints reach the plan
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
    // Starting a session must NEVER change it. The plan reflows dynamically while a
    // session is PENDING (on app open / refresh) — that's intended. But the moment
    // you commit to it at the rack, we lock it to exactly what's on screen by pinning
    // the current adapted session as a local override (the same snapshot mechanism
    // Train Now uses). Without this, marking it "started" drops it out of the reflow
    // horizon and it silently reverts to the baseline plan — different exercises.
    // Don't clobber an existing pin (e.g. a Train Now session). Only gym sessions
    // reflow, so only they can change on start.
    if (!getOverride(templateRef)) {
      const s = adaptedSessionByKey(templateRef);
      if (s && sessionDiscipline(s) === 'gym') {
        const focus = (s.title || '').includes('·')
          ? s.title.split('·').slice(1).join('·').trim()
          : (s.focus || s.title || '');
        setOverride(templateRef, { focus, duration: s.duration, items: s.items, pinnedAtStart: true });
      }
    }
    Sync.startSession(templateRef).catch(e => console.error('startSession sync failed:', e));
    set(buildView());
  },
  completeSession(templateRef, payload) {
    const { ok, value, errors } = validateSessionLog(payload || {});
    if (!ok) return { ok: false, errors };
    Sync.completeSession(templateRef, value).catch(e => console.error('completeSession sync failed:', e));
    set(buildView());
    useTrainingStore.getState().refreshTeamStatus();   // adherence + load changed
    return { ok: true };
  },
  uncompleteSession(templateRef) {
    Sync.uncompleteSession(templateRef).catch(e => console.error('uncompleteSession sync failed:', e));
    clearOverride(templateRef);   // re-completing later rebuilds from the plan, not the old pinned snapshot
    set(buildView());
    useTrainingStore.getState().refreshTeamStatus();
  },
  cancelSession(templateRef) {
    Sync.cancelSession(templateRef).catch(e => console.error('cancelSession sync failed:', e));
    clearOverride(templateRef);   // started by mistake → drop the pinned snapshot too
    set(buildView());
  },
  // Log one completed set from the focused runner. Offline-first: the local write
  // happens synchronously (instant), the cloud upsert runs in the background and can
  // never block or fail the runner. Pass a deterministic `id` to make re-logging the
  // same set idempotent (overwrite, not duplicate).
  logSet(fields) {
    Promise.resolve(Sync.saveSetLog(fields)).catch(e => console.error('logSet sync failed:', e));
    set(buildView());
  },
  // Ranked same-muscle alternatives for an exercise (equipment unavailable in the gym).
  // Pure read of the current profile — used by the runner's Substitute sheet.
  substituteOptionsFor(item) {
    const profile = Database.services.getProfile() || {};
    return substituteOptions(item, {
      access: profile.access || [], lifts: resolveLifts(profile), level: getGymLevel(profile)
    });
  },
  // Swap one exercise in the CURRENT session for a same-muscle alternative — session
  // only. Writes into the local session override (the same snapshot pin-on-start uses),
  // so the generated plan and future weeks are never touched. Keyed by the exercise's
  // current name (the override holds undecorated items; the runner shows decorated ones,
  // so index wouldn't line up). The new exercise keeps the original's sets/reps/RPE and
  // carries its own recomputed weight; `substitutedFrom` records what it replaced.
  substituteExercise(templateRef, originalName, option) {
    let override = getOverride(templateRef);
    if (!override) {
      const s = adaptedSessionByKey(templateRef);
      if (!s) return;
      const focus = (s.title || '').includes('·') ? s.title.split('·').slice(1).join('·').trim() : (s.focus || s.title || '');
      override = { focus, duration: s.duration, items: s.items, pinnedAtStart: true };
    }
    const items = (override.items || []).slice();
    const idx = items.findIndex(it => it.name === originalName);
    if (idx < 0) return;
    items[idx] = {
      ...items[idx],
      name: option.name,
      weight: option.weight ?? null,
      equip: option.equip,
      substitutedFrom: items[idx].substitutedFrom || items[idx].name
    };
    setOverride(templateRef, { ...override, items });
    set(buildView());
  },
  skipSession(templateRef) {
    Sync.skipSession(templateRef).catch(e => console.error('skipSession sync failed:', e));
    set(buildView());
    useTrainingStore.getState().refreshTeamStatus();
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
    AthleteModel.syncInjuryHistory().catch(() => {});   // keep the model's injury history current (WP-36)
    useTrainingStore.getState().refreshTeamStatus();     // availability may have changed
    return { ok: true };
  },
  async updateInjury(id, patch) {
    await Sync.updateInjury(id, patch);
    set(buildView());
    AthleteModel.syncInjuryHistory().catch(() => {});   // resolution lands here (status → 'recovered')
    useTrainingStore.getState().refreshTeamStatus();
  },
  async removeInjury(id) {
    await Sync.removeInjury(id);
    set(buildView());
    AthleteModel.syncInjuryHistory().catch(() => {});
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
    useTrainingStore.getState().refreshTeamStatus();   // readiness inputs changed
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
