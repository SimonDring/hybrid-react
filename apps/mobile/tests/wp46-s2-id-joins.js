// tests/wp46-s2-id-joins.js — WP-46 stage 2: engine-internal joins key on exId.
//
// Stage 1 (wp46-exercise-ids.js) stamped a stable `exId` on every plan item. Stage 2
// switches the engine's OWN item→exercise joins from name-regex to exId (name kept
// as a fallback for un-stamped items — primers/legacy). The point is fragility:
// today a display-name change silently breaks volume accounting and the equipment
// safety gate (the exact failure WP-41 fixed for injuries). After stage 2 those
// joins follow the identity, so a rename can't defeat them.
//
// These tests corrupt an item's NAME while keeping its exId, and assert the join
// still resolves — RED before the migration (name miss → wrong answer), GREEN after.

import { countWeeklyVolume, validateWeek } from '@performance-os/engine';

let pass = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else pass++; }

// ── T1 — volume accounting follows exId, not name ────────────────────────────
// Back squat (exId back_squat) hits quads/glutes/etc. Rename it to garbage but keep
// the exId: the weekly volume tally must be unchanged (it joins by identity now).
const squatWeek = (name) => ({ sessions: [{ discipline: 'gym', title: 'Mon · Lower',
  items: [{ exId: 'back_squat', name, sets: '5 × 5', rpe: 'RPE 8' }] }] });

const realCounts = countWeeklyVolume(squatWeek('Back squat').sessions).counts;
const renamedCounts = countWeeklyVolume(squatWeek('ZZZ Totally Renamed Lift').sessions).counts;
const realQuads = realCounts.quads || 0;
assert(realQuads > 0, `sanity: Back squat contributes quad volume (${realQuads})`);
assert(JSON.stringify(realCounts) === JSON.stringify(renamedCounts),
  `volume tally follows exId under a renamed name (quads real=${realQuads} vs renamed=${renamedCounts.quads})`);

// ── T2 — the equipment SAFETY gate follows exId, not name ────────────────────
// Back squat needs a barbell. With exId kept but the name changed, an athlete
// WITHOUT a barbell must still get the veto (before stage 2, the name miss let an
// unperformable lift through — a silent safety hole).
const renamedBarbell = { sessions: [{ discipline: 'gym', title: 'Mon · Lower', duration: '~45 min',
  items: [{ exId: 'back_squat', name: 'ZZZ Totally Renamed Lift', sets: '5 × 5', rpe: 'RPE 8' }] }] };
const veto = validateWeek(renamedBarbell, { access: ['dumbbell', 'bodyweight'] })
  .findings.find((f) => f.validatorId === 'session.equipment-available');
assert(veto && veto.verdict === 'veto',
  `equipment gate vetoes a renamed barbell lift the athlete can't perform (${veto && veto.verdict})`);

// And with a barbell present it must still pass (no false veto from the id join).
const okPass = validateWeek(renamedBarbell, { access: ['barbell', 'dumbbell', 'bodyweight'] })
  .findings.find((f) => f.validatorId === 'session.equipment-available');
assert(okPass && okPass.verdict === 'pass',
  `the same renamed lift passes when the barbell IS available (${okPass && okPass.verdict})`);

// ── T3 — the NAME fallback still works for un-stamped items (primers/legacy) ──
// Not every item carries an exId (app-added primers, pre-migration cached sessions).
// The join must fall back to name — and must NOT recurse/limp. A name-only Back
// squat counts the same as the exId one.
const nameOnly = countWeeklyVolume({ sessions: [{ discipline: 'gym', title: 'Mon · Lower',
  items: [{ name: 'Back squat', sets: '5 × 5', rpe: 'RPE 8' }] }].map((s) => s) }.sessions).counts;
assert(JSON.stringify(nameOnly) === JSON.stringify(realCounts),
  `un-stamped (name-only) item still tallies via the name fallback (quads=${nameOnly.quads})`);

console.log(process.exitCode ? 'wp46-s2-id-joins FAILURES' : `PASS: wp46-s2-id-joins — ${pass} assertions`);
