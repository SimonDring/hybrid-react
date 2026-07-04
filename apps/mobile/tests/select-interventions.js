// tests/select-interventions.js — Sprint 8 D11: value-ordered selection satisfying the requirement,
// EDS §34 tier order, transfer-per-fatigue, stopping at the fatigue budget. Tested in isolation.
import { selectInterventions } from '@performance-os/engine/lib/plan/selectInterventions.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { muscleContribution } from '@performance-os/engine/lib/plan/contributions.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

// A stub makePick mirroring the allocator's shape: 3 working sets, real muscle contribution.
const makePick = (ex) => ({ ex, sets: ex.role === 'primary' ? 4 : 3, contrib: muscleContribution(ex), effectiveRole: ex.role });
const FULL = new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'kettlebell']);
const bigCeiling = {}; for (const e of EXERCISES) for (const m in muscleContribution(e)) bigCeiling[m] = 999;

const runReq = {
  objective: { targetQuality: 'robustness', fatigueBudget: { level: 'moderate' } },
  requirements: { movementPatterns: ['hinge', 'lunge', 'calf', 'iso'], contraindicated: [] },
};
const picks = selectInterventions({ req: runReq, equip: FULL, level: 3, levelName: 'advanced', sport: 'run', skbIds: new Set(), ledger: { weeklyDelivered: {}, weeklyCeiling: bigCeiling }, makePick });

// Non-empty, and every pick carries a tier + real sets.
assert(picks.length >= 1, 'produces at least one intervention (never empty)');
assert(picks.every((p) => p.tier >= 1 && p.tier <= 7 && p.sets > 0), 'every pick has a §34 tier + sets');

// Tier order is non-decreasing (primary compound before mobility).
const tiers = picks.map((p) => p.tier);
assert(tiers.every((t, i) => i === 0 || t >= tiers[i - 1]), 'picks are in value-hierarchy tier order');

// A robustness (hinge/calf) session must NOT contain chest pressing (hpush) — off-target.
assert(picks.every((p) => p.ex.pattern !== 'hpush'), 'no chest/hpush work in a robustness session');

// Stopping rule: a LOW budget yields no more working items than a HIGH budget.
const lowReq = { ...runReq, objective: { ...runReq.objective, fatigueBudget: { level: 'low' } } };
const highReq = { ...runReq, objective: { ...runReq.objective, fatigueBudget: { level: 'high' } } };
const lowN = selectInterventions({ req: lowReq, equip: FULL, level: 3, levelName: 'advanced', sport: 'run', skbIds: new Set(), ledger: { weeklyDelivered: {}, weeklyCeiling: bigCeiling }, makePick }).length;
const highN = selectInterventions({ req: highReq, equip: FULL, level: 3, levelName: 'advanced', sport: 'run', skbIds: new Set(), ledger: { weeklyDelivered: {}, weeklyCeiling: bigCeiling }, makePick }).length;
assert(lowN <= highN, 'a lower fatigue budget selects no more items (stopping rule)');

// MRV ledger gate: zero the ceiling for a specific quality-driver compound's muscles and confirm THAT
// exercise is excluded (it appears under a loose ceiling). A tight ceiling does not reduce total count —
// lower/zero-volume tiers backfill the freed budget — so we assert the specific over-ceiling exercise is
// blocked, not that fewer items appear.
const compound = picks.find((p) => p.tier <= 2);
assert(compound, 'a loose ceiling admits a quality-driver compound');
const zeroCeil = { ...bigCeiling };
for (const m in compound.contrib) zeroCeil[m] = 0;
const gated = selectInterventions({ req: runReq, equip: FULL, level: 3, levelName: 'advanced', sport: 'run', skbIds: new Set(), ledger: { weeklyDelivered: {}, weeklyCeiling: zeroCeil }, makePick });
assert(!gated.some((p) => p.ex.id === compound.ex.id), 'MRV gate blocks the exercise whose muscles are at ceiling');

// SKB transfer boost changes ranking, not legality: with a boost the boosted id ranks earlier.
const boosted = selectInterventions({ req: runReq, equip: FULL, level: 3, levelName: 'advanced', sport: 'run', skbIds: new Set(['nordic_curl']), ledger: { weeklyDelivered: {}, weeklyCeiling: bigCeiling }, makePick });

// Sprint 9 19a: a Map(id→transferToSportRating) values library movements by the sport
// scientist's authored rating — a higher-rated movement outranks a lower-rated one of
// the same tier, and a legacy Set still works (default rating).
{
  const rated = selectInterventions({ req: runReq, equip: FULL, level: 3, levelName: 'advanced', sport: 'run',
    skbIds: new Map([['trap_bar_dl', 9], ['rdl', 6]]), ledger: { weeklyDelivered: {}, weeklyCeiling: bigCeiling }, makePick });
  const names = rated.map((p) => p.ex.id);
  const ti = names.indexOf('trap_bar_dl'), ri = names.indexOf('rdl');
  if (ti === -1 || (ri !== -1 && ti > ri)) { console.error('FAIL: higher-rated library movement outranks lower-rated (trap@9 vs rdl@6):', names.join(',')); process.exitCode = 1; }
  else console.log('PASS: higher-rated library movement outranks lower-rated (trap@9 before rdl@6)');
}
const idxBoosted = boosted.findIndex((p) => p.ex.id === 'nordic_curl');
const idxPlain = picks.findIndex((p) => p.ex.id === 'nordic_curl');
assert(idxBoosted === -1 || idxPlain === -1 || idxBoosted <= idxPlain, 'SKB-boosted exercise ranks no later');

// Variety cap: no movement pattern appears more than twice (EDS §34 primary + secondary compound —
// avoids a session collapsing to 3+ variants of the target quality's one pattern).
const patCount = {};
for (const p of picks) patCount[p.ex.pattern] = (patCount[p.ex.pattern] || 0) + 1;
assert(Object.values(patCount).every((n) => n <= 2), 'at most 2 exercises per movement pattern');

// Deterministic.
assert(JSON.stringify(selectInterventions({ req: runReq, equip: FULL, level: 3, levelName: 'advanced', sport: 'run', skbIds: new Set(), ledger: { weeklyDelivered: {}, weeklyCeiling: bigCeiling }, makePick })) === JSON.stringify(picks), 'deterministic');
