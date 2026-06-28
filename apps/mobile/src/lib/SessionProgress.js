/**
 * SessionProgress — clears the legacy LOCAL-ONLY check-off state for a session.
 *
 * The old per-exercise tap-to-tick checklist was replaced by the focused set-by-set
 * runner (which records to `set_logs`), so nothing writes this key any more. We keep
 * `clearChecked` as defensive cleanup: it removes any stale entry left in an existing
 * user's localStorage when a session is reset/completed.
 *
 * Keyed by the session's template_ref (e.g. "p1_wk5_s0").
 */

const KEY = 'htp_session_progress';

// Forget any legacy progress for a session (called on complete/cancel/uncomplete).
export function clearChecked(sessionKey) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY)) || {};
    if (all[sessionKey] != null) { delete all[sessionKey]; localStorage.setItem(KEY, JSON.stringify(all)); }
  } catch { /* non-critical */ }
}

export default { clearChecked };
