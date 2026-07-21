// tests/position-prevention.js — Sprint 3 Task B3: POSITION-SPECIFIC injury prevention.
// Each position in the five team-sport SKBs now declares a structured `commonInjuryRegions` list
// (authored from its `commonInjuries` prose, using the injury-taxonomy region vocabulary). Those
// regions resolve — via the injury taxonomy's prevention protocols (INJURY_PROFILES) — to the
// prevention exercise ids they recommend, and D11 (selectInterventions) gains a small GOVERNED
// additive nudge preferring those position-relevant prevention exercises.
//
// The contracts this pins (the prevention mirror of position-priority-patterns.js):
//   (a) PREFERENCE — a front row's lumbar/cervical prevention (e.g. pallof) ranks AHEAD of an
//       otherwise-equal sport-generic pick (e.g. ab_wheel) that the no-position baseline chose first.
//   (b) NUDGE, not GATE — the candidate POOL is identical with/without a position: the SET of picked
//       ids is the same regardless of position (the nudge only re-orders; it never removes a candidate).
//   (c) DIFFERENCE — two positions of the same sport whose injury regions differ (front row's core
//       prevention vs outside backs' hamstring/ankle prevention) select differently.
//   (d) NEGATIVE — a position `commonInjuryRegions` token that is not a real injury-taxonomy region
//       is rejected by the SKB validator (so the nudge can never silently never-fire on a typo).
import { selectInterventions } from '@performance-os/engine/lib/plan/selectInterventions.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { muscleContribution } from '@performance-os/engine/lib/plan/contributions.js';
import { preventionIdsForRegions } from '@performance-os/engine/lib/injury/profiles.js';
import { validateSportProfile } from '@performance-os/engine/lib/sportKnowledge/schema.js';
import * as SKB from '@performance-os/engine/lib/sportKnowledge/index.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const makePick = (ex) => ({ ex, sets: 3, contrib: muscleContribution(ex), effectiveRole: ex.role });
const FULL = new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'kettlebell']);
const bigCeiling = {}; for (const e of EXERCISES) for (const m in muscleContribution(e)) bigCeiling[m] = 999;
const byId = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

// Real SKB position injury regions — the test is tied to the authored data, so a drift in either
// the SKB or the resolver fails loudly here.
const positions = SKB.section('rugby', 'positions') || [];
const regionsFor = (name) => (positions.find((p) => p.name === name) || {}).commonInjuryRegions;
const frontRegions = regionsFor('Front row (props & hooker)');        // ['cervical','shoulder','lumbar']
const outsideRegions = regionsFor('Outside backs (wings, fullback, centres)'); // ['hamstring','shoulder','ankle']

// T0 — fixtures present + they genuinely differ so the nudge has something to move.
assert(Array.isArray(frontRegions) && frontRegions.length >= 2, 'T0a rugby front row declares commonInjuryRegions');
assert(Array.isArray(outsideRegions) && outsideRegions.length >= 2, 'T0b rugby outside backs declare commonInjuryRegions');
assert(frontRegions.includes('lumbar') && !outsideRegions.includes('lumbar'),
  'T0c front row flags lumbar (core prevention), outside backs do not');

// The resolved prevention ids — the "prevention library" the regions map onto.
const frontPrev = preventionIdsForRegions(frontRegions);
const outsidePrev = preventionIdsForRegions(outsideRegions);
assert(frontPrev.includes('pallof') && !outsidePrev.includes('pallof'),
  'T0d pallof (a lumbar/core prevention exercise) is a front-row prevention id, not an outside-backs one');

// ── Scenario A: preference + not-a-gate on a minimal same-tier pool ─────────────
// Two core exercises, EQUAL base selection value (both robustness-secondary, tier 6): a PREVENTION
// exercise for the front row's lumbar region (pallof) and a sport-generic core exercise (ab_wheel,
// in no prevention protocol). Baseline breaks the tie by id → ab_wheel leads. The front-row nudge
// lifts pallof past it; the outside-backs nudge (no core prevention) leaves the baseline order.
const pool = ['ab_wheel', 'pallof'].map((id) => byId[id]);
const req = {
  objective: { targetQuality: 'robustness', fatigueBudget: { level: 'high' } },
  requirements: { movementPatterns: ['core'], contraindicated: [] },
};
const run = (positionPreventionIds) => selectInterventions({
  req, exercises: pool, equip: FULL, level: 3, levelName: 'advanced', sport: 'rugby',
  skbIds: new Set(), ledger: { weeklyDelivered: {}, weeklyCeiling: bigCeiling }, makePick, positionPreventionIds,
});
const ids = (picks) => picks.map((p) => p.ex.id);
const noPos = run(null);
const frontPicks = run(frontPrev);
const outsidePicks = run(outsidePrev);

assert(ids(noPos)[0] === 'ab_wheel' && ids(noPos)[1] === 'pallof',
  `A0 baseline (no position) picks the id-first generic ahead of the prevention exercise: ${ids(noPos).join(',')}`);
assert(ids(frontPicks)[0] === 'pallof',
  `A1 the front-row nudge ranks its lumbar prevention (pallof) FIRST, ahead of the generic pick: ${ids(frontPicks).join(',')}`);
const rankFront = (id) => ids(frontPicks).indexOf(id);
assert(rankFront('pallof') < rankFront('ab_wheel'),
  'A2 for the front row, position-relevant prevention ranks ahead of the sport-generic pick');
assert(JSON.stringify(ids(outsidePicks)) === JSON.stringify(ids(noPos)),
  `A3 outside backs (no core prevention) leave this pool at the baseline order: ${ids(outsidePicks).join(',')}`);
assert(JSON.stringify(ids(frontPicks)) !== JSON.stringify(ids(outsidePicks)),
  'A4 two positions with different injury regions select differently (the nudge steers)');

// ── (b) nudge, not gate ─────────────────────────────────────────────────────────
const set = (picks) => [...new Set(ids(picks))].sort();
assert(JSON.stringify(set(frontPicks)) === JSON.stringify(set(noPos)),
  'B1 the picked SET is identical to the no-position baseline (the nudge re-orders, never gates)');
assert(JSON.stringify(set(outsidePicks)) === JSON.stringify(set(noPos)),
  'B2 the picked SET is identical for outside backs too (position never removes a candidate)');

// A larger, non-truncated mixed-pattern pool (≤2 per pattern, total fatigue under budget) — every
// candidate is selected regardless of position, proving the nudge never gates even when prevention
// and generic candidates of several patterns compete together.
const mixed = ['face_pull', 'sl_calf', 'ab_wheel', 'pallof'].map((id) => byId[id]);
const runMixed = (positionPreventionIds) => selectInterventions({
  req: { objective: { targetQuality: 'robustness', fatigueBudget: { level: 'high' } }, requirements: { movementPatterns: ['core', 'iso', 'calf'], contraindicated: [] } },
  exercises: mixed, equip: FULL, level: 3, levelName: 'advanced', sport: 'rugby',
  skbIds: new Set(), ledger: { weeklyDelivered: {}, weeklyCeiling: bigCeiling }, makePick, positionPreventionIds,
});
assert(JSON.stringify(set(runMixed(frontPrev))) === JSON.stringify(set(runMixed(null))),
  'B3 mixed pool: the picked SET is identical with/without a position (not a gate)');

// ── determinism / purity ──────────────────────────────────────────────────────
assert(JSON.stringify(run(frontPrev)) === JSON.stringify(frontPicks), 'C1 deterministic under a fixed position');

// ── (d) NEGATIVE — the SKB validator rejects a bogus injury region ──────────────
const rugby = JSON.parse(JSON.stringify(SKB.get('rugby')));
const valid = validateSportProfile(rugby).filter((e) => /commonInjuryRegions/.test(e));
assert(valid.length === 0, 'D0 the authored SKB commonInjuryRegions all validate');
rugby.positions[0].commonInjuryRegions = ['shoulder', 'not_a_real_region'];
const errs = validateSportProfile(rugby).filter((e) => /commonInjuryRegions/.test(e));
assert(errs.length === 1 && /not_a_real_region/.test(errs[0]),
  'D1 a bogus commonInjuryRegions token is rejected by the SKB validator');
