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
import Sync, { pullFromSupabase, runSessionDMigration, syncFitbit, syncStrava, checkConnections, setDevicePrimary } from '../lib/SyncService.js';
import { nextE1RM } from '../lib/liftProgression.js';
import { computeReadiness } from '../lib/Readiness.js';
import { setRuntime } from '../lib/PlanService.js';
import { setOverride, clearOverride } from '../lib/sessionOverrides.js';

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
    sessions[s.template_ref] = {
      completed: s.status === 'completed',
      skipped: s.status === 'skipped',
      started: !!s.started_at && s.status !== 'completed' && s.status !== 'skipped',
      startedAt: s.started_at || null,
      completedAt: s.completed_at || null,
      quality: log ? log.quality : null,
      energy: log ? log.energy : null,
      recovery: log ? log.recovery : null,
      notes: log ? (log.notes || '') : ''
    };
  });

  const dailyMetrics = Database.services.listDailyMetrics();

  // Keep the plan's adaptive reflow current: it reflows this week around what's
  // been completed + today's readiness. Set before screens read the plan.
  setRuntime({ sessions, readiness: computeReadiness(dailyMetrics, logs).score });

  return {
    logs,
    sessions,
    reassess:     Database.services.getReassessAnswers(),
    profile:      Database.services.getProfile(),
    injuries:     Database.services.listInjuries(),
    dailyMetrics,
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
  stravaError: null,        // last Strava sync failure reason (null when ok)

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
    set({ stravaError: null });
    const result = await syncStrava();
    if (result?.ok) {
      await pullFromSupabase();
      set({ ...buildView(), stravaError: null });
    } else {
      set({ stravaError: result?.reason || 'Sync failed' });
    }
    return result;
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
    Sync.completeSession(templateRef, payload).catch(e => console.error('completeSession sync failed:', e));
    set(buildView());
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
    await Sync.updateProfile(patch);
    set(buildView());
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

  // ----- Injuries -----
  async addInjury(fields) {
    await Sync.addInjury(fields);
    set(buildView());
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
    await Sync.upsertDailyMetric(fields);
    set(buildView());
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
