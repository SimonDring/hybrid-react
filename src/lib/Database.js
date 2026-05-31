/**
 * Database — typed entity facade over localStorage.
 *
 * Architecture:
 *   - Each table is a flat collection of records keyed by UUID
 *   - Every record has id, created_at, updated_at, deleted_at
 *   - Soft delete via deleted_at (active rows have deleted_at = null)
 *   - Subscribe/publish for reactive UI updates
 *
 * This module is designed to migrate row-for-row to a Supabase Postgres schema.
 * The SCHEMA constant below documents every field — it's also the source of truth
 * for the schema you'll create in Supabase (Stage 3).
 *
 * See docs/SCHEMA.md for the full schema specification.
 */

import * as Storage from './Storage.js';

// ---------- ID generation ----------
export const uuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older browsers / Node test environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const now = () => new Date().toISOString();

// ---------- Schema documentation ----------
// Mirrors what you'll create in Supabase. Keep in sync with docs/SCHEMA.md.
export const SCHEMA = {
  users: {
    // id, name, email, profile, settings, created_at, updated_at, deleted_at
    // profile: { age, bodyweight_kg, height_cm, sex, injuries:[], goals:[] }
    // settings: { units, default_pool_length_m, theme }
  },
  training_plans: {
    // id, user_id (FK), name, description, start_date, target_end_date,
    // status (active|paused|completed|archived), template_ref (string),
    // created_at, updated_at, deleted_at
  },
  phases: {
    // id, plan_id (FK), template_phase_id (int — references static Plan module),
    // order (int), week_range_start (int), week_range_end (int),
    // status (upcoming|active|completed|skipped),
    // started_at, completed_at, created_at, updated_at, deleted_at
  },
  weeks: {
    // id, phase_id (FK), week_number (int — absolute, e.g. 5..56),
    // week_in_phase (int — 1..N), deload (bool),
    // status (upcoming|active|completed|skipped),
    // started_at, completed_at, created_at, updated_at, deleted_at
  },
  sessions: {
    // id, week_id (FK), order (int), day_label (string, e.g. "Monday"),
    // template_ref (string, e.g. "p1_wk5_s0" — soft ref into static Plan),
    // status (pending|in_progress|completed|skipped),
    // scheduled_for (ISO date | null),
    // started_at, completed_at, created_at, updated_at, deleted_at
  },
  session_logs: {
    // id, session_id (FK), user_id (FK),
    // started_at, completed_at, duration_sec,
    // quality (1-5|null), energy (1-5|null), recovery (1-5|null),
    // notes (text), created_at, updated_at, deleted_at
  },
  weekly_checkins: {
    // id, user_id (FK), week_ending (date),
    // bodyweight_kg, resting_hr, avg_rpe, sleep_score, knee_rating,
    // notes (text), created_at, updated_at, deleted_at
  },
  reassessments: {
    // id, user_id (FK), quarter_number (int 1..4), period_end (date),
    // answers (jsonb: { q1: ..., q2: ..., ... }),
    // created_at, updated_at, deleted_at
  },
  wearable_readings: {
    // id, user_id (FK), source (string: 'apple_watch'|'garmin'|'whoop'|'strava'|'fitbit'|'manual'),
    // recorded_at (timestamp), metric (string: 'hrv'|'rhr'|'sleep_hr'|'steps'|...),
    // value (numeric), unit (string), raw (jsonb), created_at
    // PLACEHOLDER — schema ready, populated by Stage 5-6 integrations.
  },
  ai_recommendations: {
    // id, user_id (FK), context (string: 'session'|'week'|'phase'|'recovery'),
    // ref_id (FK polymorphic — id of session/week/etc),
    // model (string), prompt_summary (text), recommendation (text),
    // confidence (0-1|null), accepted (bool|null),
    // user_response (text|null), created_at, updated_at
    // PLACEHOLDER — schema ready, populated by Stage 8 AI engine.
  }
};

// ---------- In-memory state ----------
const tables = {
  users:             Storage.load(Storage.KEYS.users, {}),
  plans:             Storage.load(Storage.KEYS.plans, {}),
  phases:            Storage.load(Storage.KEYS.phases, {}),
  weeks:             Storage.load(Storage.KEYS.weeks, {}),
  sessions:          Storage.load(Storage.KEYS.sessions, {}),
  sessionLogs:       Storage.load(Storage.KEYS.sessionLogs, {}),
  weeklyCheckins:    Storage.load(Storage.KEYS.weeklyCheckins, {}),
  reassessments:     Storage.load(Storage.KEYS.reassessments, {}),
  wearableReadings:  Storage.load(Storage.KEYS.wearableReadings, {}),
  aiRecommendations: Storage.load(Storage.KEYS.aiRecommendations, {})
};
const appMeta = Storage.load(Storage.KEYS.appMeta, { version: null, migrated_from_v3: false });

const persist = (tableName) => {
  const k = Storage.KEYS[tableName];
  if (k) Storage.save(k, tables[tableName]);
};
const persistMeta = () => Storage.save(Storage.KEYS.appMeta, appMeta);

// ---------- Subscribe / publish ----------
const subs = [];
const notify = () => subs.forEach(fn => fn(tables));
export const subscribe = (fn) => {
  subs.push(fn);
  return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); };
};

// ---------- Generic CRUD per table ----------
function table(name) {
  return {
    all() {
      return Object.values(tables[name]).filter(r => !r.deleted_at);
    },
    get(id) {
      const r = tables[name][id];
      return r && !r.deleted_at ? r : null;
    },
    find(predicate) {
      return this.all().find(predicate) || null;
    },
    filter(predicate) {
      return this.all().filter(predicate);
    },
    create(fields = {}) {
      const id = fields.id || uuid();
      const record = {
        id,
        ...fields,
        created_at: fields.created_at || now(),
        updated_at: now(),
        deleted_at: null
      };
      tables[name][id] = record;
      persist(name);
      notify();
      return record;
    },
    update(id, patch) {
      if (!tables[name][id]) return null;
      tables[name][id] = { ...tables[name][id], ...patch, updated_at: now() };
      persist(name);
      notify();
      return tables[name][id];
    },
    remove(id) { // soft delete
      if (!tables[name][id]) return false;
      tables[name][id].deleted_at = now();
      tables[name][id].updated_at = now();
      persist(name);
      notify();
      return true;
    },
    hardDelete(id) {
      if (!tables[name][id]) return false;
      delete tables[name][id];
      persist(name);
      notify();
      return true;
    },
    replaceAll(records) {
      tables[name] = {};
      (records || []).forEach(r => {
        if (r && r.id) tables[name][r.id] = r;
      });
      persist(name);
      notify();
    }
  };
}

export const tablesApi = {
  users:             table('users'),
  plans:             table('plans'),
  phases:            table('phases'),
  weeks:             table('weeks'),
  sessions:          table('sessions'),
  sessionLogs:       table('sessionLogs'),
  weeklyCheckins:    table('weeklyCheckins'),
  reassessments:     table('reassessments'),
  wearableReadings:  table('wearableReadings'),
  aiRecommendations: table('aiRecommendations')
};

// ---------- Seed: ensure a default user + active plan exist ----------
function ensureDefaultUserAndPlan() {
  let user = tablesApi.users.find(u => true);
  if (!user) {
    user = tablesApi.users.create({
      name: 'Athlete',
      email: null,
      profile: {
        age: 28,
        bodyweight_kg: 80,
        height_cm: null,
        sex: null,
        injuries: [{ id: uuid(), label: 'Left patellar tendon — mild, improving', flagged_at: now() }],
        goals: [
          { id: uuid(), rank: 1, label: '1:40 half marathon', target_date: '2026-12-31' },
          { id: uuid(), rank: 2, label: '2.5 km continuous swim', target_date: '2026-12-31' },
          { id: uuid(), rank: 3, label: 'Ski-ready', target_date: '2026-11-01' }
        ]
      },
      settings: {
        units: 'metric',
        default_pool_length_m: 20,
        theme: 'paper'
      }
    });
  }
  let plan = tablesApi.plans.find(p => p.user_id === user.id && p.status === 'active');
  if (!plan) {
    plan = tablesApi.plans.create({
      user_id: user.id,
      name: 'Hybrid 12-Month Plan',
      description: 'Built to last, not to peak. Foundation → Run reentry → Half build → Pre-ski + peak → Ski season.',
      start_date: null,
      target_end_date: null,
      status: 'active',
      template_ref: 'hybrid_v1'
    });
  }
  return { user, plan };
}

// ---------- v3 → v4 migration ----------
function migrateFromV3() {
  if (appMeta.migrated_from_v3) return false;

  const legacyLogs     = Storage.load(Storage.KEYS.legacyLogs, null);
  const legacySessions = Storage.load(Storage.KEYS.legacySessions, null);
  const legacyReassess = Storage.load(Storage.KEYS.legacyReassess, null);

  const hasLegacy = (legacyLogs && legacyLogs.length) ||
                    (legacySessions && Object.keys(legacySessions).length) ||
                    (legacyReassess && Object.keys(legacyReassess).length);

  const { user, plan } = ensureDefaultUserAndPlan();

  if (!hasLegacy) {
    appMeta.migrated_from_v3 = true;
    appMeta.version = 4;
    persistMeta();
    return true;
  }

  if (legacyLogs && Array.isArray(legacyLogs)) {
    legacyLogs.forEach(entry => {
      tablesApi.weeklyCheckins.create({
        user_id: user.id,
        week_ending: entry.date || null,
        bodyweight_kg: entry.bw ? parseFloat(entry.bw) : null,
        resting_hr: entry.rhr ? parseFloat(entry.rhr) : null,
        avg_rpe: entry.rpe ? parseFloat(entry.rpe) : null,
        sleep_score: entry.sleep ? parseFloat(entry.sleep) : null,
        knee_rating: entry.knee ? parseFloat(entry.knee) : null,
        notes: entry.notes || ''
      });
    });
  }

  if (legacyReassess && Object.keys(legacyReassess).length) {
    tablesApi.reassessments.create({
      user_id: user.id,
      quarter_number: 1,
      period_end: null,
      answers: { ...legacyReassess }
    });
  }

  if (legacySessions && typeof legacySessions === 'object') {
    Object.entries(legacySessions).forEach(([templateRef, value]) => {
      const isObj = value && typeof value === 'object';
      const completed = value === true || (isObj && value.completed === true);
      if (!completed && !(isObj && value.startedAt)) return;

      const session = tablesApi.sessions.create({
        week_id: null,
        order: null,
        day_label: null,
        template_ref: templateRef,
        status: completed ? 'completed' : 'in_progress',
        started_at: isObj ? (value.startedAt || null) : null,
        completed_at: isObj ? (value.completedAt || null) : (completed ? now() : null),
        scheduled_for: null
      });

      if (completed) {
        const startedAt = isObj ? value.startedAt : null;
        const completedAt = isObj ? value.completedAt : now();
        const durationSec = (startedAt && completedAt)
          ? Math.max(0, Math.floor((new Date(completedAt) - new Date(startedAt)) / 1000))
          : null;
        tablesApi.sessionLogs.create({
          session_id: session.id,
          user_id: user.id,
          started_at: startedAt,
          completed_at: completedAt,
          duration_sec: durationSec,
          quality: isObj ? (value.quality ?? null) : null,
          energy: isObj ? (value.energy ?? null) : null,
          recovery: isObj ? (value.recovery ?? null) : null,
          notes: isObj ? (value.notes || '') : ''
        });
      }
    });
  }

  appMeta.migrated_from_v3 = true;
  appMeta.version = 4;
  persistMeta();
  return true;
}

// ---------- Domain-specific service layer ----------
export const services = {
  currentUser() {
    return tablesApi.users.find(u => true);
  },
  currentPlan() {
    const u = this.currentUser();
    if (!u) return null;
    return tablesApi.plans.find(p => p.user_id === u.id && p.status === 'active');
  },

  findOrCreateSessionByTemplate(templateRef) {
    let s = tablesApi.sessions.find(x => x.template_ref === templateRef);
    if (s) return s;
    return tablesApi.sessions.create({
      week_id: null,
      order: null,
      day_label: null,
      template_ref: templateRef,
      status: 'pending',
      started_at: null,
      completed_at: null,
      scheduled_for: null
    });
  },

  sessionStatus(templateRef) {
    const s = tablesApi.sessions.find(x => x.template_ref === templateRef);
    if (!s) return { status: 'pending', session: null, log: null };
    const log = s.status === 'completed'
      ? tablesApi.sessionLogs.find(l => l.session_id === s.id)
      : null;
    return { status: s.status, session: s, log };
  },

  startSession(templateRef) {
    const s = services.findOrCreateSessionByTemplate(templateRef);
    tablesApi.sessions.update(s.id, {
      status: 'in_progress',
      started_at: s.started_at || now()
    });
  },

  completeSession(templateRef, { quality, energy, recovery, notes } = {}) {
    const u = services.currentUser();
    const s = services.findOrCreateSessionByTemplate(templateRef);
    const startedAt = s.started_at || null;
    const completedAt = now();
    const durationSec = startedAt
      ? Math.max(0, Math.floor((new Date(completedAt) - new Date(startedAt)) / 1000))
      : null;

    tablesApi.sessions.update(s.id, {
      status: 'completed',
      started_at: startedAt,
      completed_at: completedAt
    });
    const existingLog = tablesApi.sessionLogs.find(l => l.session_id === s.id);
    if (existingLog) {
      tablesApi.sessionLogs.update(existingLog.id, {
        started_at: startedAt,
        completed_at: completedAt,
        duration_sec: durationSec,
        quality: quality ?? null,
        energy: energy ?? null,
        recovery: recovery ?? null,
        notes: notes || ''
      });
    } else {
      tablesApi.sessionLogs.create({
        session_id: s.id,
        user_id: u ? u.id : null,
        started_at: startedAt,
        completed_at: completedAt,
        duration_sec: durationSec,
        quality: quality ?? null,
        energy: energy ?? null,
        recovery: recovery ?? null,
        notes: notes || ''
      });
    }
  },

  uncompleteSession(templateRef) {
    const s = tablesApi.sessions.find(x => x.template_ref === templateRef);
    if (!s) return;
    const log = tablesApi.sessionLogs.find(l => l.session_id === s.id);
    if (log) tablesApi.sessionLogs.remove(log.id);
    tablesApi.sessions.update(s.id, { status: 'pending', completed_at: null });
  },

  addCheckin(fields) {
    const u = services.currentUser();
    return tablesApi.weeklyCheckins.create({
      user_id: u ? u.id : null,
      week_ending: fields.date || null,
      bodyweight_kg: fields.bw ? parseFloat(fields.bw) : null,
      resting_hr: fields.rhr ? parseFloat(fields.rhr) : null,
      avg_rpe: fields.rpe ? parseFloat(fields.rpe) : null,
      sleep_score: fields.sleep ? parseFloat(fields.sleep) : null,
      knee_rating: fields.knee ? parseFloat(fields.knee) : null,
      notes: fields.notes || ''
    });
  },

  listCheckins() {
    return tablesApi.weeklyCheckins.all()
      .sort((a, b) => (a.week_ending || '').localeCompare(b.week_ending || ''));
  },

  setReassessAnswer(qid, value) {
    const u = services.currentUser();
    let r = tablesApi.reassessments.find(x =>
      x.user_id === (u ? u.id : null) && x.quarter_number === 1
    );
    if (!r) {
      r = tablesApi.reassessments.create({
        user_id: u ? u.id : null,
        quarter_number: 1,
        period_end: null,
        answers: {}
      });
    }
    const answers = { ...(r.answers || {}), [qid]: value };
    tablesApi.reassessments.update(r.id, { answers });
  },

  getReassessAnswers() {
    const u = services.currentUser();
    const r = tablesApi.reassessments.find(x =>
      x.user_id === (u ? u.id : null) && x.quarter_number === 1
    );
    return r ? (r.answers || {}) : {};
  },

  exportAll() {
    return {
      schema_version: 4,
      exported_at: now(),
      users:              tablesApi.users.all(),
      training_plans:     tablesApi.plans.all(),
      phases:             tablesApi.phases.all(),
      weeks:              tablesApi.weeks.all(),
      sessions:           tablesApi.sessions.all(),
      session_logs:       tablesApi.sessionLogs.all(),
      weekly_checkins:    tablesApi.weeklyCheckins.all(),
      reassessments:      tablesApi.reassessments.all(),
      wearable_readings:  tablesApi.wearableReadings.all(),
      ai_recommendations: tablesApi.aiRecommendations.all()
    };
  },

  importAll(data) {
    if (!data || typeof data !== 'object') return false;
    const map = [
      ['users', 'users'],
      ['training_plans', 'plans'],
      ['phases', 'phases'],
      ['weeks', 'weeks'],
      ['sessions', 'sessions'],
      ['session_logs', 'sessionLogs'],
      ['weekly_checkins', 'weeklyCheckins'],
      ['reassessments', 'reassessments'],
      ['wearable_readings', 'wearableReadings'],
      ['ai_recommendations', 'aiRecommendations']
    ];
    map.forEach(([snakeKey, camelKey]) => {
      if (Array.isArray(data[snakeKey])) {
        tablesApi[camelKey].replaceAll(data[snakeKey]);
      }
    });
    if (data.logs || data.sessions || data.reassess) {
      if (data.logs) Storage.save(Storage.KEYS.legacyLogs, data.logs);
      if (data.sessions) Storage.save(Storage.KEYS.legacySessions, data.sessions);
      if (data.reassess) Storage.save(Storage.KEYS.legacyReassess, data.reassess);
      appMeta.migrated_from_v3 = false;
      persistMeta();
      migrateFromV3();
    }
    ensureDefaultUserAndPlan();
    return true;
  },

  resetAll() {
    Object.keys(tables).forEach(t => { tables[t] = {}; persist(t); });
    appMeta.migrated_from_v3 = false;
    appMeta.version = 4;
    persistMeta();
    Storage.remove(Storage.KEYS.legacyLogs);
    Storage.remove(Storage.KEYS.legacySessions);
    Storage.remove(Storage.KEYS.legacyReassess);
    ensureDefaultUserAndPlan();
    notify();
  }
};

// ---------- Boot ----------
migrateFromV3();
ensureDefaultUserAndPlan();

// Default export preserves the original `Database.tables.X` / `Database.services.Y` shape
// so consumers can migrate gradually.
export const _meta = appMeta;
// Re-export tablesApi as `tables` for consumers using `import * as Database` syntax
export { tablesApi as tables };
export default { SCHEMA, tables: tablesApi, services, subscribe, uuid, now, _meta: appMeta };
