/**
 * trainingStore — Zustand store wrapping Database.
 *
 * In Stage 1 (vanilla JS) we had a State module that used a subscribe/publish
 * pattern. In React, Zustand does the same thing with a much smaller API.
 *
 * Components use it like:
 *   const sessions = useTrainingStore(state => state.sessions);
 *   const completeSession = useTrainingStore(state => state.completeSession);
 *
 * Calling an action updates Database (which writes to localStorage) AND
 * triggers a re-render of every component using the store.
 */

import { create } from 'zustand';
import Database from '../lib/Database.js';

// Build the legacy-shape view from Database tables so screens that expect
// the old { logs, sessions, reassess } shape work without rewriting.
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
    reassess: Database.services.getReassessAnswers(),
    profile: Database.services.getProfile(),
    injuries: Database.services.listInjuries(),
    dailyMetrics: Database.services.listDailyMetrics(),
    // Bump this whenever data changes so React knows to re-render
    _tick: Date.now()
  };
}

export const useTrainingStore = create((set, get) => ({
  ...buildView(),

  // ----- Session lifecycle -----
  startSession(templateRef) {
    Database.services.startSession(templateRef);
    set(buildView());
  },
  completeSession(templateRef, payload) {
    Database.services.completeSession(templateRef, payload);
    set(buildView());
  },
  uncompleteSession(templateRef) {
    Database.services.uncompleteSession(templateRef);
    set(buildView());
  },

  // ----- Weekly check-ins -----
  addLog(entry) {
    Database.services.addCheckin(entry);
    set(buildView());
  },
  deleteLog(idx) {
    const view = buildView().logs;
    // Logs are sorted ascending by date in buildView; UI usually shows desc.
    // Caller passes index from THEIR view, so we need to match by id.
    const record = view[idx];
    if (record && record._id) {
      Database.tables.weeklyCheckins.remove(record._id);
      set(buildView());
    }
  },

  // ----- Reassessment -----
  setReassess(qid, value) {
    Database.services.setReassessAnswer(qid, value);
    set(buildView());
  },

  // ----- Profile -----
  updateProfile(patch) {
    Database.services.updateProfile(patch);
    set(buildView());
  },
  setGoals(goals) {
    Database.services.setGoals(goals);
    set(buildView());
  },

  // ----- Injuries -----
  addInjury(fields) {
    Database.services.addInjury(fields);
    set(buildView());
  },
  updateInjury(id, patch) {
    Database.services.updateInjury(id, patch);
    set(buildView());
  },
  removeInjury(id) {
    Database.services.removeInjury(id);
    set(buildView());
  },
  addRecoveryLogEntry(injuryId, entry) {
    Database.services.addRecoveryLogEntry(injuryId, entry);
    set(buildView());
  },

  // ----- Daily metrics -----
  upsertDailyMetric(fields) {
    Database.services.upsertDailyMetric(fields);
    set(buildView());
  },

  // ----- Bulk operations -----
  replaceAll(data) {
    Database.services.importAll(data);
    set(buildView());
  },
  resetAll() {
    Database.services.resetAll();
    set(buildView());
  }
}));

// Subscribe to Database changes from outside the store too (e.g. if Database
// changes are triggered from non-store code), to keep React in sync.
Database.subscribe(() => {
  useTrainingStore.setState(buildView());
});
