/**
 * syncOutbox — the offline-write queue (WP-31, audit V16).
 *
 * Before this, a write made while offline (or that failed against Supabase) fell
 * back to localStorage ONLY — the cloud copy was silently never made, and the next
 * sign-in PULL would clobber the local truth with the stale cloud state.
 *
 * The design leans on the app's own architecture: the local Database is the source
 * of truth and every cloud write pushes CURRENT LOCAL ROWS (upsert by id). So the
 * outbox does not replay operations — it records WHICH TABLES have unsynced local
 * changes (a dirty set), and draining simply pushes those tables' local rows, the
 * exact repair pattern runSessionDMigration already proves. That makes the queue:
 *   - idempotent (upsert by id; draining twice is harmless),
 *   - self-deduplicating (N failed writes to one table = one dirty entry),
 *   - never-stale (drain reads the LATEST local rows, not a captured payload),
 *   - ordering-free (row state, not operation order, is what converges).
 * Soft deletes converge too: local rows carry deleted_at, and the upsert mirrors it.
 *
 * Persisted per Storage namespace (per-user cache isolation holds).
 */
import * as Storage from './Storage.js';

const KEY = 'htp_sync_outbox_v1';

function loadSet() {
  const raw = Storage.load(KEY, []);
  return new Set(Array.isArray(raw) ? raw : []);
}

/** Record that a table has local changes the cloud doesn't have yet. */
export function markDirty(...tables) {
  const set = loadSet();
  let changed = false;
  for (const t of tables) if (t && !set.has(t)) { set.add(t); changed = true; }
  if (changed) Storage.save(KEY, [...set].sort());
}

/** The tables awaiting a push. */
export function dirtyTables() {
  return [...loadSet()].sort();
}

/** Clear tables after a successful push (only the ones that drained). */
export function clearDirty(...tables) {
  const set = loadSet();
  for (const t of tables) set.delete(t);
  Storage.save(KEY, [...set].sort());
}

export function isEmpty() {
  return loadSet().size === 0;
}

export default { markDirty, dirtyTables, clearDirty, isEmpty };
