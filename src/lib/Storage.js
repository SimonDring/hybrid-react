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
  weeklyCheckins:    'htp_weekly_checkins_v4',
  reassessments:     'htp_reassessments_v4',
  wearableReadings:  'htp_wearable_readings_v4',
  aiRecommendations: 'htp_ai_recommendations_v4',
  appMeta:           'htp_app_meta_v4',
  // ---- v3 (legacy): read-only during migration, deleted on success ----
  legacyLogs:     'htp_logs_v3',
  legacySessions: 'htp_sessions_v3',
  legacyReassess: 'htp_reassess_v3'
};

export function load(k, fb) {
  try {
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : fb;
  } catch (e) {
    return fb;
  }
}

export function save(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch (e) {
    // Common cause: storage quota exceeded, or private browsing mode.
    alert('Storage unavailable');
    return false;
  }
}

export function remove(k) {
  try {
    localStorage.removeItem(k);
  } catch (e) {
    /* swallow — removing a non-existent key shouldn't crash the app */
  }
}

// Default export so consumers can also import as `import Storage from ...`
export default { KEYS, load, save, remove };
