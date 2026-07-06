// tests/one-muscle-model.js — WP-45: ONE canonical per-exercise muscle table.
// The volume ledger (MRV accounting, allocator selection) and the substitution
// likeness model disagreed: the ledger credited a hip thrust as a hamstring movement
// (hinge default) while substitution knew it was glute-primary — a hip-thrust-heavy
// plan could 'hit' hamstring volume while glutes went undercounted, invisible to the
// MRV validator. Both now derive from data/muscleVolume.js EXERCISE_MUSCLES.
import { muscleContribution } from '@performance-os/engine/lib/plan/contributions.js';
import { countWeeklyVolume } from '@performance-os/engine';
import { EXERCISE_MUSCLES, EXERCISE_CONTRIB } from '@performance-os/engine/data/muscleVolume.js';
import { OVERRIDES, DEFAULT_MUSCLES } from '@performance-os/engine/data/exerciseSimilarity.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// T1 — the corrections hold in the ACCOUNTING view.
const ht = muscleContribution({ id: 'hip_thrust', pattern: 'hinge' });
assert(ht.glutes === 1.0 && ht.hamstrings === 0.5 && ht.back === undefined,
  `T1a hip thrust counts glute-primary, no erector credit (${JSON.stringify(ht)})`);
const bpa = muscleContribution({ id: 'band_pull_apart', pattern: 'hpull' });
assert(bpa.shoulders === 1.0 && bpa.back === 0.5 && bpa.biceps === undefined,
  `T1b band pull-apart counts rear-delt, not lat/biceps (${JSON.stringify(bpa)})`);
const dip = muscleContribution({ id: 'dip', pattern: 'hpush' });
assert(dip.chest === 1.0 && dip.triceps === 0.5 && dip.shoulders === undefined,
  'T1c dip drops the phantom shoulder credit');

// T2 — an exercise WITHOUT a correction keeps its pattern default (open-world safe).
const rdl = muscleContribution({ id: 'rdl', pattern: 'hinge' });
assert(rdl.hamstrings === 1.0 && rdl.glutes === 0.8 && rdl.back === 0.5, 'T2 RDL keeps the hinge default');

// T3 — the SAME table drives likeness: OVERRIDES is the canonical object itself.
assert(OVERRIDES === EXERCISE_MUSCLES, 'T3a substitution overrides ARE the canonical table (identity, not a copy)');
assert(Object.keys(EXERCISE_CONTRIB).every((id) => EXERCISE_MUSCLES[id]), 'T3b contribution view covers exactly the canonical ids');

// T4 — name-level volume counting reflects the correction end-to-end.
const counted = countWeeklyVolume([{ items: [{ name: 'Hip thrust', sets: '4 × 8', volumeFactor: 1 }] }]).counts;
assert(Math.abs((counted.glutes || 0) - 4) < 0.01 && Math.abs((counted.hamstrings || 0) - 2) < 0.01 && !(counted.back > 0),
  `T4 counting 4 sets of hip thrust → glutes 4.0 / hams 2.0 / back 0 (${JSON.stringify(counted)})`);

// T5 — the weight convention is exactly primary 1.0 / secondary 0.5, derived not hand-kept.
for (const [id, m] of Object.entries(EXERCISE_MUSCLES)) {
  const w = EXERCISE_CONTRIB[id];
  const ok = m.primary.every((g) => w[g] === 1.0) && m.secondary.every((g) => w[g] === 0.5)
    && Object.keys(w).length === m.primary.length + m.secondary.length;
  assert(ok, `T5 ${id}: weights derive from the lists`);
}

// T6 — pattern-level likeness defaults remain likeness-specific (deliberately richer
// than the accounting convention — squat likeness carries hamstrings; accounting doesn't).
assert(DEFAULT_MUSCLES.squat.secondary.includes('hamstrings'), 'T6 likeness pattern defaults untouched');
