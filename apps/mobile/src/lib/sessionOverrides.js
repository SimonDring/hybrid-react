/**
 * sessionOverrides — per-session FROZEN snapshots (pins), portable across devices.
 *
 * When a session is started, its content is pinned (freeze-on-start: what you see
 * when you press Start is what you log, no matter how the reflow moves later);
 * substitutions update the pinned items. PlanService shows the snapshot for the
 * slot (before and after completion, so banked volume matches what was done) and
 * reflows the rest of the week around it. Each entry, keyed by the session key
 * (p{phase}_wk{week}_s{idx}): { focus, duration, items, pinnedAtStart, createdAt }.
 *
 * WP-28 (audit V8) — the freezes are PORTABLE now:
 *   - Local cache moved to a NAMESPACED Storage key (the old raw localStorage key
 *     leaked pins across accounts on a shared device; migrated once, then removed).
 *   - Every change mirrors to users.profile.session_overrides via SyncService —
 *     no schema migration (profile is jsonb), RLS already right (own row), and the
 *     WP-31 outbox covers offline mirrors.
 *   - On sign-in, reconcileFromProfile() merges the pulled cloud copy with the
 *     local cache. Conflict semantics: FROZEN WINS (Art 10) — per key, the EARLIER
 *     createdAt is kept: whichever device froze the session first defined what the
 *     athlete actually saw and trained.
 */
import * as Storage from './Storage.js';

const KEY = 'htp_session_overrides_v2';   // namespaced via Storage
const LEGACY_KEY = 'htp_session_overrides'; // pre-WP-28: raw, un-namespaced

// One-time adoption of the legacy raw-localStorage blob into the current namespace.
function migrateLegacyOnce() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const legacy = JSON.parse(raw) || {};
    const current = Storage.load(KEY, {});
    Storage.save(KEY, { ...legacy, ...current }); // anything already namespaced wins
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* leave the legacy blob for a later attempt */ }
}

function read() {
  migrateLegacyOnce();
  const v = Storage.load(KEY, {});
  return v && typeof v === 'object' ? v : {};
}
function write(obj) {
  Storage.save(KEY, obj);
  mirrorToProfile(obj);
}

// Mirror the full override map to users.profile.session_overrides — fire-and-forget
// (the WP-31 outbox queues it when offline). Imported lazily so this module stays
// cheap for PlanService's synchronous reads and free of import-order coupling.
let _sync = null;
let _lastMirror = Promise.resolve();
function mirrorToProfile(obj) {
  _lastMirror = (async () => {
    try {
      if (!_sync) _sync = await import('./SyncService.js');
      await _sync.updateProfile({ session_overrides: obj });
    } catch { /* local cache still holds the truth; the next mirror retries */ }
  })();
  return _lastMirror;
}

/** Await the in-flight profile mirror (deterministic tests; harmless elsewhere). */
export function flushMirror() { return _lastMirror; }

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

/**
 * Merge the cloud copy (users.profile.session_overrides, just pulled) with the
 * local cache. FROZEN WINS per key: the entry with the EARLIER createdAt is the
 * snapshot the athlete actually trained from — a later re-freeze on another
 * device never rewrites history. Keys only one side knows are kept (a pin made
 * on device A appears on device B; a pin made offline on B survives A's pull).
 * Pushes the merged map back when it differs from the cloud copy.
 * @param {object|null} cloud  profile.session_overrides from the pull
 * @returns {object} the merged map now in the local cache
 */
export function reconcileFromProfile(cloud) {
  const local = read();
  const remote = (cloud && typeof cloud === 'object') ? cloud : {};
  const merged = { ...remote };
  for (const [k, v] of Object.entries(local)) {
    if (!merged[k]) { merged[k] = v; continue; }
    const localFirst = (v.createdAt || Infinity) < (merged[k].createdAt || Infinity);
    if (localFirst) merged[k] = v;   // frozen wins — the earlier freeze is the truth
  }
  Storage.save(KEY, merged);
  if (JSON.stringify(merged) !== JSON.stringify(remote)) mirrorToProfile(merged);
  return merged;
}

export default { getOverrides, getOverride, setOverride, clearOverride, reconcileFromProfile, flushMirror };
