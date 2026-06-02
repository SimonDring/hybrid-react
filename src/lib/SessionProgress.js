/**
 * SessionProgress — lightweight, LOCAL-ONLY check-off state for a session in
 * progress. Which exercises you've ticked off mid-workout is ephemeral UI scratch
 * data, not core training history, so it lives in its own localStorage key and is
 * deliberately NOT synced to Supabase (and never touches the Database layer).
 *
 * Keyed by the session's template_ref (e.g. "p1_wk5_s0"). Cleared when the
 * session is completed.
 */

const KEY = 'htp_session_progress';

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}

function saveAll(obj) {
  try { localStorage.setItem(KEY, JSON.stringify(obj)); }
  catch { /* storage full / unavailable — progress is non-critical */ }
}

// Indices of the exercises ticked off for this session (array of numbers).
export function getChecked(sessionKey) {
  return loadAll()[sessionKey] || [];
}

// Toggle one exercise index on/off; returns the new array.
export function toggleChecked(sessionKey, idx) {
  const all = loadAll();
  const set = new Set(all[sessionKey] || []);
  if (set.has(idx)) set.delete(idx); else set.add(idx);
  all[sessionKey] = [...set];
  saveAll(all);
  return all[sessionKey];
}

// Forget all progress for a session (called on completion).
export function clearChecked(sessionKey) {
  const all = loadAll();
  delete all[sessionKey];
  saveAll(all);
}

export default { getChecked, toggleChecked, clearChecked };
