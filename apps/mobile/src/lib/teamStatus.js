/**
 * teamStatus — the player-side STATUS ROLL-UP for the Team package.
 *
 * Computes the derived signals a coach is allowed to see and writes ONE
 * player_status row per active team membership, via SyncService. This is the
 * second, in-code enforcement of the data-isolation rule (the first is RLS,
 * proven by supabase/tests/rls-harness.mjs): the row is built from an explicit
 * ALLOWED-COLUMNS shape — the raw vitals that FEED readiness (HRV, sleep,
 * resting HR) are inputs to a score here and never leave the owner-only tables.
 *
 *   deriveStatus(view)   — pure: the store's view → the allowed row fields
 *   syncTeamStatus(view) — derive + upsert for every active membership
 *                          (no-op when the athlete is on no team / offline;
 *                          self-healing: it recomputes from local truth on every
 *                          trigger, so a failed push is corrected by the next)
 *
 * S11: the SERVER is authoritative for the safety fields — a BEFORE trigger on
 * player_status (migration 20260708) OVERRIDES injury_status (from the player's
 * injuries) and readiness (from their logged daily_metrics.readiness_score) with
 * server truth, so a client cannot publish a dishonest availability/readiness. The
 * values computed here are the player's honest proposal; they AGREE with the server
 * in the normal case and are the offline fallback. The soft trend metrics pass through.
 *
 * load_state is the coach-facing plain-English band from the SAME ACWR the
 * athlete's own screens use — one number, two audiences, no re-derivation:
 *   no data → 'no-data' · <0.8 'ramping' · 0.8–1.3 'balanced'
 *   1.3–1.5 'high' · >1.5 'overreaching'
 * injury_status: 'out' when an active injury is red-flagged / professionally
 * referred; 'modified' for any other active injury (the plan is being filtered);
 * else 'available'. The private detail (notes, rehab plan) never leaves.
 */
import * as Sync from './SyncService.js';

// The ONLY fields a coach-readable row may carry. Anything else is dropped —
// adding a column here is a deliberate privacy decision, not a spread.
const ALLOWED = ['readiness', 'load_state', 'acwr', 'adherence_pct', 'injury_status'];

const LOAD_STATE = (acwr) =>
  acwr == null ? 'no-data'
  : acwr < 0.8 ? 'ramping'
  : acwr <= 1.3 ? 'balanced'
  : acwr <= 1.5 ? 'high'
  : 'overreaching';

function injuryStatusOf(injuries = []) {
  const active = injuries.filter((i) => i.status === 'active' || i.status === 'rehabbing' || i.status === 'monitoring');
  if (!active.length) return 'available';
  if (active.some((i) => i.red_flag_triggered || i.referred_to_professional)) return 'out';
  return 'modified';
}

/**
 * Pure derivation from the store's view slices. Returns ONLY the allowed shape.
 * @param {{ readiness?: {score}|null, load?: {acwr}|null, injuries?: [],
 *           consistencyPct?: number|null }} view
 */
export function deriveStatus(view = {}) {
  const row = {
    readiness: view.readiness && view.readiness.score != null ? Math.round(view.readiness.score) : null,
    load_state: LOAD_STATE(view.load ? view.load.acwr : null),
    acwr: view.load && view.load.acwr != null ? view.load.acwr : null,
    adherence_pct: view.consistencyPct != null ? view.consistencyPct : null,
    injury_status: injuryStatusOf(view.injuries),
  };
  // The guard: nothing beyond the allowed columns, ever.
  for (const k of Object.keys(row)) if (!ALLOWED.includes(k)) delete row[k];
  return row;
}

/**
 * Derive + push a player_status row for every team the athlete is an ACTIVE
 * member of. Fire-and-forget safe; returns what was pushed (for tests/logs).
 */
export async function syncTeamStatus(view) {
  const teams = await Sync.listMyActiveTeams();
  if (!teams.length) return { pushed: 0 };
  const status = deriveStatus(view);
  const rows = teams.map((t) => ({ team_id: t.team_id, ...status }));
  const res = await Sync.pushPlayerStatus(rows);
  return { pushed: res.ok ? rows.length : 0, ...res };
}

export default { deriveStatus, syncTeamStatus };
