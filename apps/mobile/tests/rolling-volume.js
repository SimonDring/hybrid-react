import { rollingTarget, distributeAcrossSlots, WINDOW_DAYS } from '../src/lib/plan/rollingVolume.js';
import { allocateGym } from '../src/lib/plan/allocator.js';
import { countWeeklyVolume } from '../src/lib/plan/volume.js';
import { VOLUME_LANDMARKS, MUSCLE_GROUPS } from '../src/data/muscleVolume.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const approx = (a, b, t = 0.51) => Math.abs(a - b) <= t;

// ---- rollingTarget: weekly target expressed as a rate over the window ----
const rt = rollingTarget({ chest: 14, quads: 7 }, 10);
assert(approx(rt.chest, 14 / 7 * 10), 'T1 rollingTarget = weekly/7 × windowDays (chest 14 → 20)');
assert(approx(rt.quads, 10), 'T2 rollingTarget quads 7 → 10');
assert(WINDOW_DAYS === 10, 'T3 default window is 10 days');

// ---- distributeAcrossSlots: even spread of a deficit across slots ----
const even = distributeAcrossSlots({
  slots: [{ normalShare: { chest: 0 } }, { normalShare: { chest: 0 } }],
  deficit: { chest: 6 }, windowDays: 10
});
assert(even.perSlot.length === 2, 'T4 one target per slot');
assert(even.perSlot[0].chest === 3 && even.perSlot[1].chest === 3, 'T5 deficit 6 over 2 slots → 3 + 3 (no cramming)');
assert((even.forgiven.chest || 0) === 0, 'T6 within ceiling → nothing forgiven');

// ---- normal share is preserved when nothing is owed ----
const onTrack = distributeAcrossSlots({
  slots: [{ normalShare: { chest: 5 } }, { normalShare: { chest: 5 } }],
  deficit: { chest: 0 }, windowDays: 10
});
assert(onTrack.perSlot[0].chest === 5 && onTrack.perSlot[1].chest === 5, 'T7 no deficit → each slot keeps its normal share');

// ---- forgiveness: a huge deficit is capped at the MRV rate, remainder forgiven ----
const ceiling = VOLUME_LANDMARKS.chest.mrv / 7 * 10;   // ~31.4 sets over 10 days
const flood = distributeAcrossSlots({
  slots: [{ normalShare: { chest: 0 } }], deficit: { chest: 100 }, windowDays: 10
});
assert(flood.perSlot[0].chest <= ceiling + 0.5, 'T8 single slot never planned past the MRV-rate ceiling');
assert(flood.forgiven.chest >= 100 - ceiling - 1, 'T9 overflow above the ceiling is forgiven, not crammed');

// ---- empty horizon: no slots → no crash, nothing scheduled ----
const none = distributeAcrossSlots({ slots: [], deficit: { chest: 10 }, windowDays: 10 });
assert(none.perSlot.length === 0, 'T10 no upcoming slots → empty plan (no crash)');

// ---- Stage 2 backstop end-to-end: even a flooded single session stays sane ----
// Hand the allocator an impossible target in ONE 60-min slot; the per-session
// ceiling must keep every muscle at/under its weekly sweet-spot (MAV) — i.e. no
// single session can become the "whole week crammed in" monster.
const hugeTarget = {};
MUSCLE_GROUPS.forEach(m => { hugeTarget[m] = 50; });
const specs = allocateGym({
  targets: hugeTarget,
  slots: [{ minutes: 60, equip: ['full_gym'] }],
  ctx: { style: 'functional', intent: 'base', deload: false, weekNum: 1, level: 'intermediate', access: ['full_gym'] }
});
assert(specs.length === 1 && specs[0].items.length > 0, 'T11 allocator returns a real session under a flooded target');
const got = countWeeklyVolume([specs[0]]).counts;
const over = MUSCLE_GROUPS.filter(m => got[m] > VOLUME_LANDMARKS[m].mrv + 1);
assert(over.length === 0, `T12 no muscle exceeds its weekly MRV in one session (offenders: ${over.join(', ') || 'none'})`);
