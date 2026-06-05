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
import Sync, { pullFromSupabase, runSessionDMigration, checkFitbitConnection, syncFitbit } from '../lib/SyncService.js';
import { nextE1RM } from '../lib/liftProgression.js';

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
      startedAt: s.started_at || null,
      completedAt: s.completed_at || null,
      quality: log ? log.quality : null,
      energy: log ? log.energy : null,
      recovery: log ? log.recovery : null,
      notes: log ? (log.notes || '') : ''
    };
  });

  return {
    logs,
    sessions,
    reassess:     Database.services.getReassessAnswers(),
    profile:      Database.services.getProfile(),
    injuries:     Database.services.listInjuries(),
    dailyMetrics: Database.services.listDailyMetrics(),
    syncing:      false,
    _tick:        Date.now()
  };
}

export const useTrainingStore = create((set) => ({
  ...buildView(),
  fitbitConnection: null,   // null = not connected, object = { connected_at, last_synced_at }
  fitbitSyncing: false,

  // Pull fresh data from Supabase into local cache, then re-render.
  // Call this when the user signs in or the app comes to foreground.
  async syncFromCloud() {
    set({ syncing: true });
    // Session D: push any pre-auth localStorage data to Supabase (no-op if done)
    await runSessionDMigration();
    const result = await pullFromSupabase();
    // Check Fitbit connection and sync today's data if connected
    const fitbitConnection = await checkFitbitConnection();
    set({ ...buildView(), syncing: false, fitbitConnection });
    if (fitbitConnection) {
      useTrainingStore.getState().syncFitbitToday();
    }
    return result;
  },

  // ----- Fitbit -----
  async refreshFitbitConnection() {
    const fitbitConnection = await checkFitbitConnection();
    set({ fitbitConnection });
    return fitbitConnection;
  },

  async syncFitbitToday() {
    set({ fitbitSyncing: true });
    const result = await syncFitbit();
    if (result?.ok) {
      // Pull updated daily_metrics from Supabase into local cache
      await pullFromSupabase();
      set({ ...buildView(), fitbitSyncing: false });
    } else {
      set({ fitbitSyncing: false });
    }
    return result;
  },

  async syncFitbitRange(dateFrom, dateTo) {
    set({ fitbitSyncing: true });
    const result = await syncFitbit(dateFrom, dateTo);
    if (result?.ok) {
      await pullFromSupabase();
      set({ ...buildView(), fitbitSyncing: false });
    } else {
      set({ fitbitSyncing: false });
    }
    return result;
  },

  // ----- Session lifecycle -----
  async startSession(templateRef) {
    await Sync.startSession(templateRef);
    set(buildView());
  },
  async completeSession(templateRef, payload) {
    await Sync.completeSession(templateRef, payload);
    set(buildView());
  },
  async uncompleteSession(templateRef) {
    await Sync.uncompleteSession(templateRef);
    set(buildView());
  },
  async cancelSession(templateRef) {
    await Sync.cancelSession(templateRef);
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
