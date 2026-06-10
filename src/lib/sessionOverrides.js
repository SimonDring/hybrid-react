/**
 * sessionOverrides — local, per-session "train now" overrides.
 *
 * When you build an on-demand session ("I've got 30 min and dumbbells"), we don't
 * regenerate the plan — we ATTACH the generated session to the slot you're about
 * to train as a fixed snapshot, keyed by its session key (p{phase}_wk{week}_s{idx}).
 * PlanService then shows that snapshot for the slot (before and after completion,
 * so the volume it banks matches exactly what you did) and reflows the rest of the
 * week around it.
 *
 * Stored in localStorage only (not synced) — the chosen lightweight model. Each
 * entry: { focus, duration, items, minutes, equip, createdAt }.
 */

const KEY = 'htp_session_overrides';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
  catch { return {}; }
}
function write(obj) {
  try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch { /* ignore */ }
}

export function getOverrides() { return read(); }
export function getOverride(sessionKey) { return read()[sessionKey] || null; }

export function setOverride(sessionKey, snapshot) {
  const all = read();
  all[sessionKey] = { ...snapshot, createdAt: Date.now() };
  write(all);
}

export function clearOverride(sessionKey) {
  const all = read();
  if (all[sessionKey]) { delete all[sessionKey]; write(all); }
}

export default { getOverrides, getOverride, setOverride, clearOverride };
