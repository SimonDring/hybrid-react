/**
 * Storage — thin localStorage wrapper.
 *
 * Responsibilities:
 *   - Centralised key names (single source of truth — no magic strings elsewhere)
 *   - Safe read/write/remove with try/catch
 *   - Versioned keys (`_v4`) so future schema bumps don't collide
 *
 * No dependencies on other app modules. Pure I/O.
 */

export const KEYS = {
  // ---- v4 (structured): canonical keys going forward ----
  users:             'htp_users_v4',
  plans:             'htp_plans_v4',
  phases:            'htp_phases_v4',
  weeks:             'htp_weeks_v4',
  sessions:          'htp_sessions_v4',
  sessionLogs:       'htp_session_logs_v4',
  setLogs:           'htp_set_logs_v4',
  weeklyCheckins:    'htp_weekly_checkins_v4',
  reassessments:     'htp_reassessments_v4',
  wearableReadings:  'htp_wearable_readings_v4',
  dailyMetrics:      'htp_daily_metrics_v4',
  injuries:          'htp_injuries_v4',
  workouts:          'htp_workouts_v4',
  aiRecommendations: 'htp_ai_recommendations_v4',
  appMeta:           'htp_app_meta_v4',
  sessionDMigrated:  'htp_session_d_migrated',   // set to true once local→Supabase migration runs
  // ---- v3 (legacy): read-only during migration, deleted on success ----
  legacyLogs:     'htp_logs_v3',
  legacySessions: 'htp_sessions_v3',
  legacyReassess: 'htp_reassess_v3'
};

// ---- Namespacing ----------------------------------------------------------
// Every cache key is stored as `${baseKey}_${namespace}` so two accounts on the
// same browser use physically separate storage and can never read each other's
// data. `anon` is the namespace used while signed out / in local-only mode.
let currentNamespace = 'anon';

const NS_MIGRATED_FLAG = 'htp_ns_migrated';          // device-level, NOT namespaced
const adoptedFlag = (ns) => `htp_adopted_${ns}`;      // per-target, NOT namespaced

// Base keys that hold table/meta data and therefore get namespaced + migrated.
const ALL_BASE_KEYS = Object.values(KEYS);
// Just the per-user table caches (used by adoptAnonDataOnce's "is target empty?").
const TABLE_BASE_KEYS = [
  KEYS.users, KEYS.plans, KEYS.phases, KEYS.weeks, KEYS.sessions, KEYS.sessionLogs,
  KEYS.setLogs, KEYS.weeklyCheckins, KEYS.reassessments, KEYS.wearableReadings,
  KEYS.dailyMetrics, KEYS.injuries, KEYS.workouts, KEYS.aiRecommendations
];

const nsKey = (baseKey) => `${baseKey}_${currentNamespace}`;

export function setNamespace(ns) { currentNamespace = ns || 'anon'; }
export function getNamespace() { return currentNamespace; }

export function load(k, fb) {
  try {
    const r = localStorage.getItem(nsKey(k));
    return r ? JSON.parse(r) : fb;
  } catch (e) {
    return fb;
  }
}

export function save(k, v) {
  try {
    localStorage.setItem(nsKey(k), JSON.stringify(v));
    return true;
  } catch (e) {
    // Common cause: storage quota exceeded, or private browsing mode.
    alert('Storage unavailable');
    return false;
  }
}

export function remove(k) {
  try {
    localStorage.removeItem(nsKey(k));
  } catch (e) {
    /* swallow — removing a non-existent key shouldn't crash the app */
  }
}

// Remove every table/meta key for a namespace (used on sign-out).
export function clearNamespace(ns) {
  for (const base of ALL_BASE_KEYS) {
    try { localStorage.removeItem(`${base}_${ns}`); } catch (e) { /* swallow */ }
  }
}

// One-time per device: move any pre-namespacing bare keys (`htp_*_v4`) into the
// given target namespace, so an existing single-user device keeps its history.
export function migrateUnnamespacedKeysOnce(target) {
  try {
    if (localStorage.getItem(NS_MIGRATED_FLAG)) return;
    for (const base of ALL_BASE_KEYS) {
      const bare = localStorage.getItem(base);
      if (bare === null) continue;
      const dest = `${base}_${target}`;
      if (localStorage.getItem(dest) === null) localStorage.setItem(dest, bare);
      localStorage.removeItem(base);
    }
    localStorage.setItem(NS_MIGRATED_FLAG, '1');
  } catch (e) { /* swallow */ }
}

// One-time per target user: if the target namespace has no table data yet but the
// anon namespace does, adopt the anon data. Covers "used the app signed-out, then
// signed in" without stranding that data. Never overwrites existing target data.
export function adoptAnonDataOnce(target) {
  try {
    if (target === 'anon') return;
    if (localStorage.getItem(adoptedFlag(target))) return;
    const targetHasData = TABLE_BASE_KEYS.some((base) => {
      const raw = localStorage.getItem(`${base}_${target}`);
      if (!raw) return false;
      try { return Object.keys(JSON.parse(raw) || {}).length > 0; } catch { return false; }
    });
    if (targetHasData) { localStorage.setItem(adoptedFlag(target), '1'); return; }
    for (const base of TABLE_BASE_KEYS) {
      const anon = localStorage.getItem(`${base}_anon`);
      if (anon !== null) localStorage.setItem(`${base}_${target}`, anon);
    }
    localStorage.setItem(adoptedFlag(target), '1');
  } catch (e) { /* swallow */ }
}

// Default export so consumers can also import as `import Storage from ...`
export default {
  KEYS, load, save, remove,
  setNamespace, getNamespace, clearNamespace,
  migrateUnnamespacedKeysOnce, adoptAnonDataOnce
};
