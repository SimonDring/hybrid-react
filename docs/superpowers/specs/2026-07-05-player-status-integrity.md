# S11 — player_status integrity · design

**Date:** 2026-07-05 · **Status:** implementing (staging-first) · **Finding:** SECURITY-AUDIT.md addendum S11

## Problem
`player_status` (the coach board: readiness / load_state / acwr / adherence_pct /
injury_status) is written by the **player's own client** (`apps/mobile/src/lib/teamStatus.js`).
RLS proves a player writes only their own row, not that the values are honest — a player
could publish a dishonest coach-facing safety signal.

## The decision: override the safety fields server-side, keep the soft metrics engine-computed

The chip's two threat examples — *"'available' while red-flagged"* and *"fake readiness"* —
are exactly the two fields that are **cleanly, faithfully derivable from the owner-only
source tables in SQL**. So a BEFORE INSERT/UPDATE trigger overrides those two with server
truth and clamps the rest:

| Field | Source of truth | Why |
|---|---|---|
| **injury_status** | `injuries` (SQL) | Safety-critical — a coach benches/plays on this. Unambiguous in SQL. Server-authoritative. |
| **readiness** | `daily_metrics.readiness_score` (raw logged) | The engine's `computeReadiness` returns this when present; null when unlogged. Never a client number. |
| acwr / load_state / adherence_pct | engine (client-proposed), **clamped** | Depend on the engine's **EWMA** 7/28-day load model. Reimplementing in SQL would DRIFT from the player's own app and confuse the board. Clamped to sane ranges to reject garbage. |

**Why not full SQL derivation of all five?** The load metrics need the engine's EWMA
(`acuteChronic` + `sessionLoad`); a SQL re-implementation would silently diverge from the
number the player sees in their own app whenever the formula evolves — a worse failure for
a coach board than a soft trend a player can nudge. A coach makes safety/selection calls on
`injury_status` (now un-fakeable), not on a soft ACWR trend. This closes the actual hole
with **zero engine drift**.

**Why a trigger, not an Edge Function?** No new deploy surface, runs atomically with the
write, and the player still owns the write (own-row RLS unchanged) — integrity comes from
the trigger correcting the value, not from revoking the write. (An Edge Function that runs
the real engine would be the way to make ALL five fields server-truth without drift — a
future option once the engine is bundleable server-side; recorded, not needed now.)

**Raw vitals stay private** — hrv/rhr/sleep feed `readiness_score` in the owner-only table
and never appear on the board. The five-column contract (teamStatus.js `ALLOWED`) is preserved.

## Verification
`supabase/tests/rls-harness.mjs`: a player publishes `injury_status:'available'` while
carrying an active/red-flagged injury → the stored row shows `'modified'`/`'out'`; a player
publishes `readiness:99` while their logged score is 30 → the stored row shows 30. Staging-first.
