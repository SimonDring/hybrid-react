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
import Sync, { pullFromSupabase } from '../lib/SyncService.js';

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

  // Pull fresh data from Supabase into local cache, then re-render.
  // Call this when the user signs in or the app comes to foreground.
  async syncFromCloud() {
    set({ syncing: true });
    const result = await pullFromSupabase();
    set({ ...buildView(), syncing: false });
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
