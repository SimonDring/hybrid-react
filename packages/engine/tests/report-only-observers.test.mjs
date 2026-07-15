// report-only-observers.test.mjs — Phase 3 M4b: the five REPORT-ONLY D14 observers.
//
// SEEDED-DEFECT discipline (13-VALIDATION-STRATEGY §8.2): for EACH observer this suite
// hand-builds a week/plan that violates EXACTLY its rule and asserts it FIRES (a true
// positive) — at its declared tier, with a reason — AND a clean fixture that asserts it
// stays QUIET (the false-positive guard). Each pair is proven NON-VACUOUS: the same
// fixture flipped one field flips the finding.
//
// REPORT-ONLY law (spec §2.1): every observer emits verdict 'note' — NOT counted in
// counts.trim/veto — so report.pass is untouched and NO plan can move (the golden master
// proves byte-identity separately). This suite also proves the wiring: the notes flow
// through validateWeek → explainValidation into report.observations (reason + tier name),
// kept OUT of the trim/veto `notices`.
//
// Engine-only imports (run-engine.mjs convention): no app layer, no clock, no random.
import { validateWeek, explainValidation } from '@performance-os/engine/lib/validation/contract.js';
import {
  sportProtectionObserver,
  mevFloorObserver,
  doseCoherenceObserver,
  progressionSanityObserver,
  deloadPresenceObserver,
} from '@performance-os/engine/lib/validation/observers.js';

let failures = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failures++; process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── fixture builders (minimal engine plan shape) ──────────────────────────────
const item = (num, name, sets, weight, extra = {}) =>
  ({ num, group: num[0], exId: extra.exId != null ? extra.exId : name.toLowerCase().replace(/\s+/g, '_'), name, sets, weight, ...extra });
const session = (quality, items, title = 'Day · Lift', extra = {}) =>
  ({ title, _objective: { quality, purpose: `Develop ${quality}` }, items, ...extra });
const week = (num, sessions, flags = {}) =>
  ({ num, deload: false, taper: false, ...flags, sessions });
const phase = (title, weeks) => ({ title, weeks });

// The observer's own finding on a week/ctx (the direct call — proves the RULE).
const notesFrom = (observer, wk, ctx) => observer.run(wk, ctx) || [];
// The note that reached the report through validateWeek + explainValidation, by id
// (proves the WIRING — report-only, surfaced as an observation).
function observationsFor(id, wk, ctx) {
  const report = validateWeek(wk, ctx);
  const explain = explainValidation(report);
  return {
    report, explain,
    notes: report.findings.filter((f) => f.validatorId === id),
    obs: explain.observations.filter((o) => o.validatorId === id),
  };
}

// A clean, non-empty gym session so the ENFORCING validators (purpose-coherence's
// shipped-empty veto in particular) all pass — isolating the observer under test.
const squatItem = () => item('A1', 'Back squat', '3 × 5', '100 kg', { exId: 'back_squat' });

// ═══ 1 · SPORT-PROTECTION (tier 2) ════════════════════════════════════════════
{
  const heavyGym = session('maxStrength', [squatItem()], 'Heavy Day · Squat', { axialLoad: 4 });
  const wk = week(1, [heavyGym]);

  // TP: a heavy-axial gym session IN a flagged match/heavy-sport week fires.
  const tp = notesFrom(sportProtectionObserver, wk, { matchWeek: true });
  assert(tp.length === 1, '1.TP sport-protection FIRES: heavy spinal gym work stacked into a match week (Art 2)');
  assert(/axial load 4/.test(tp[0].reason) && /match/.test(tp[0].reason), '1.TP the reason names the axial load and the collision');

  // FP guard: the SAME week with no match-week signal is quiet (non-vacuous — the
  // signal flips it).
  assert(notesFrom(sportProtectionObserver, wk, {}).length === 0,
    '1.FP sport-protection is QUIET on the same heavy week when it is NOT a match/heavy-sport week');
  // FP guard 2: a match week whose gym work is LIGHT-axial is quiet (non-vacuous — the
  // axial load flips it).
  const lightWk = week(1, [session('hypertrophy', [item('A1', 'Cable row', '3 × 10', '40 kg', { exId: 'cable_row' })], 'Match Week · Pull', { axialLoad: 0 })]);
  assert(notesFrom(sportProtectionObserver, lightWk, { matchWeek: true }).length === 0,
    '1.FP sport-protection is QUIET in a match week whose gym work is light-axial');

  // Wiring: the note reaches the report as an OBSERVATION at tier 2, and NEVER as a
  // notice; the plan still passes (report-only cannot gate).
  const { report, explain, notes, obs } = observationsFor('sport.protection', wk, { matchWeek: true });
  assert(notes.length === 1 && notes[0].verdict === 'note', '1.WIRE the finding reaches report.findings as verdict "note"');
  assert(report.pass === true && report.counts.trim === 0 && report.counts.veto === 0, '1.WIRE report.pass stays true — an observer never trims/vetoes');
  assert(obs.length === 1 && obs[0].tier === 2 && obs[0].tierName === 'SPORT PROTECTION', '1.WIRE it surfaces in explain.observations at tier 2 (SPORT PROTECTION)');
  assert(!explain.notices.some((n) => n.validatorId === 'sport.protection'), '1.WIRE it is NOT in notices (an observation is not a trim/veto)');
}

// ═══ 2 · MEV-FLOOR (tier 3) ═══════════════════════════════════════════════════
{
  // chest MEV is 8 (volume.landmarks). 3 sets of bench → chest 3.0 (well under).
  const lowChest = week(1, [session('hypertrophy', [item('A1', 'Bench press', '3 × 5', '80 kg', { exId: 'bench' })], 'Day · Push')]);

  // TP: chest named a PRIORITY yet dosed under MEV fires.
  const tp = notesFrom(mevFloorObserver, lowChest, { priorityMuscles: ['chest'] });
  assert(tp.length === 1, '2.TP MEV-floor FIRES: a priority muscle (chest) dosed below its MEV');
  assert(/MEV 8/.test(tp[0].reason) && /PRIORITY/.test(tp[0].reason), '2.TP the reason names the MEV floor and the priority status');

  // FP guard: no priority declared → quiet (non-vacuous — the priority flips it).
  assert(notesFrom(mevFloorObserver, lowChest, {}).length === 0,
    '2.FP MEV-floor is QUIET when no priority muscle is declared');
  // FP guard 2: chest priority but dosed AT/ABOVE MEV (10 bench sets → chest 10) → quiet.
  const okChest = week(1, [session('hypertrophy', [item('A1', 'Bench press', '10 × 5', '80 kg', { exId: 'bench' })], 'Day · Push')]);
  assert(notesFrom(mevFloorObserver, okChest, { priorityMuscles: ['chest'] }).length === 0,
    '2.FP MEV-floor is QUIET when the priority muscle meets its MEV (non-vacuous)');

  const { report, notes, obs } = observationsFor('volume.mev-floor', lowChest, { priorityMuscles: ['chest'] });
  assert(notes.length === 1 && notes[0].verdict === 'note', '2.WIRE the finding reaches report.findings as verdict "note"');
  assert(report.pass === true, '2.WIRE report.pass stays true');
  assert(obs.length === 1 && obs[0].tier === 3 && obs[0].tierName === 'RECOVERABILITY', '2.WIRE it surfaces in explain.observations at tier 3 (RECOVERABILITY)');
}

// ═══ 3 · DOSE-COHERENCE (tier 4) ══════════════════════════════════════════════
{
  // A maxStrength primary dosed 3×12 — a hypertrophy scheme on a heavy strength lift.
  const mismatch = week(1, [session('maxStrength', [item('A1', 'Back squat', '3 × 12', '60 kg', { exId: 'back_squat' })])]);

  const tp = notesFrom(doseCoherenceObserver, mismatch, {});
  assert(tp.length === 1, '3.TP dose-coherence FIRES: a maxStrength primary dosed 3×12 ("3×12 for everyone" — SR-14)');
  assert(/12/.test(tp[0].reason) && /Back squat/.test(tp[0].reason), '3.TP the reason names the lift and the offending rep count');

  // FP guard: the SAME primary at 3×5 is coherent → quiet (non-vacuous).
  const coherent = week(1, [session('maxStrength', [item('A1', 'Back squat', '3 × 5', '120 kg', { exId: 'back_squat' })])]);
  assert(notesFrom(doseCoherenceObserver, coherent, {}).length === 0,
    '3.FP dose-coherence is QUIET when the maxStrength primary is low-rep (non-vacuous)');

  const { report, obs, notes } = observationsFor('progression.dose-coherence', mismatch, {});
  assert(notes.length === 1 && notes[0].verdict === 'note', '3.WIRE the finding reaches report.findings as verdict "note"');
  assert(report.pass === true, '3.WIRE report.pass stays true');
  assert(obs.length === 1 && obs[0].tier === 4 && obs[0].tierName === 'ATHLETE INTENT', '3.WIRE it surfaces in explain.observations at tier 4 (ATHLETE INTENT)');
}

// ═══ 4 · PROGRESSION-SANITY (tier 4) ══════════════════════════════════════════
{
  // A flat 6-week block: the primary lift is dosed identically every week.
  const flatWeeks = Array.from({ length: 6 }, (_, i) =>
    week(i + 1, [session('maxStrength', [item('A1', 'Back squat', '3 × 5', '100 kg', { exId: 'back_squat' })])]));
  const flatPhases = [phase('Base', flatWeeks)];
  const terminal = flatWeeks[flatWeeks.length - 1];

  // TP: run on the plan's terminal week with the full plan threaded in ctx.
  const tp = notesFrom(progressionSanityObserver, terminal, { planPhases: flatPhases });
  assert(tp.some((f) => /flat block/.test(f.reason)), '4.TP progression-sanity FIRES: a flat 6-week block (a progressing athlete must overload — SR-01)');

  // Emits ONCE: a NON-terminal week of the same plan is quiet (no per-week duplication).
  assert(notesFrom(progressionSanityObserver, flatWeeks[0], { planPhases: flatPhases }).length === 0,
    '4.ONCE progression-sanity emits only on the plan terminal week (no per-week duplicates)');

  // FP guard: a PROGRESSING block (load creeps) is quiet → non-vacuous.
  const progWeeks = Array.from({ length: 6 }, (_, i) =>
    week(i + 1, [session('maxStrength', [item('A1', 'Back squat', '3 × 5', `${100 + i * 2.5} kg`, { exId: 'back_squat' })])]));
  const progPhases = [phase('Base', progWeeks)];
  assert(!notesFrom(progressionSanityObserver, progWeeks[progWeeks.length - 1], { planPhases: progPhases }).some((f) => /flat block/.test(f.reason)),
    '4.FP progression-sanity is QUIET on a block whose primary lift creeps week-over-week (non-vacuous)');

  const { report, obs, notes } = observationsFor('progression.sanity', terminal, { planPhases: flatPhases });
  assert(notes.length >= 1 && notes.every((n) => n.verdict === 'note'), '4.WIRE the finding(s) reach report.findings as verdict "note"');
  assert(report.pass === true, '4.WIRE report.pass stays true');
  assert(obs.some((o) => o.tier === 4 && o.tierName === 'ATHLETE INTENT'), '4.WIRE it surfaces in explain.observations at tier 4');
}

// ═══ 5 · DELOAD-PRESENCE (tier 3) ═════════════════════════════════════════════
{
  // A 6-week accumulation block past the governed window (4 wk) with NO deload.
  const noDeloadWeeks = Array.from({ length: 6 }, (_, i) =>
    week(i + 1, [session('maxStrength', [item('A1', 'Back squat', '3 × 5', `${100 + i * 2.5} kg`, { exId: 'back_squat' })])]));
  const noDeloadPhases = [phase('Endless Base', noDeloadWeeks)];
  const terminal = noDeloadWeeks[noDeloadWeeks.length - 1];

  const tp = notesFrom(deloadPresenceObserver, terminal, { planPhases: noDeloadPhases });
  assert(tp.length === 1 && /no deload/.test(tp[0].reason), '5.TP deload-presence FIRES: 6 working weeks past the accumulation window with no deload (Art 9)');
  assert(/accumulation window \(4 wk\)/.test(tp[0].reason), '5.TP the reason cites the governed accumulation window');

  // FP guard: the SAME block WITH a deload week is quiet → non-vacuous.
  const withDeloadWeeks = noDeloadWeeks.map((w, i) => (i === 3 ? { ...w, deload: true } : w));
  const withDeloadPhases = [phase('Base', withDeloadWeeks)];
  assert(notesFrom(deloadPresenceObserver, withDeloadWeeks[withDeloadWeeks.length - 1], { planPhases: withDeloadPhases }).length === 0,
    '5.FP deload-presence is QUIET when the block contains a deload (non-vacuous)');
  // FP guard 2: a SHORT block (≤ window) with no deload is quiet.
  const shortWeeks = noDeloadWeeks.slice(0, 4);
  const shortPhases = [phase('Short', shortWeeks)];
  assert(notesFrom(deloadPresenceObserver, shortWeeks[shortWeeks.length - 1], { planPhases: shortPhases }).length === 0,
    '5.FP deload-presence is QUIET on a block within the accumulation window');

  const { report, obs, notes } = observationsFor('recoverability.deload-presence', terminal, { planPhases: noDeloadPhases });
  assert(notes.length === 1 && notes[0].verdict === 'note', '5.WIRE the finding reaches report.findings as verdict "note"');
  assert(report.pass === true, '5.WIRE report.pass stays true');
  assert(obs.length === 1 && obs[0].tier === 3 && obs[0].tierName === 'RECOVERABILITY', '5.WIRE it surfaces in explain.observations at tier 3 (RECOVERABILITY)');
}

// ═══ 6 · report-only INVARIANTS across the wave ═══════════════════════════════
{
  // A week with NO observer signals (no ctx): every observer is silent, and the report
  // is byte-clean — no notes, no observations, pass true (the FP floor for the whole wave).
  const wk = week(1, [session('maxStrength', [squatItem()], 'Day · Squat')]);
  const report = validateWeek(wk, {});
  const explain = explainValidation(report);
  assert(report.findings.every((f) => f.verdict !== 'note'), '6.a no observer fires without its context signal (the wave-wide FP floor)');
  assert(explain.observations.length === 0, '6.b explain.observations is empty when nothing is observed');
  assert(report.pass === true, '6.c a clean week passes');
  // Purity: the observers never mutate the week they judge.
  const before = JSON.stringify(wk);
  validateWeek(wk, { matchWeek: true, priorityMuscles: ['chest'], planPhases: [phase('P', [wk])] });
  assert(JSON.stringify(wk) === before, '6.d validateWeek + observers never mutate the input week (Art 18 purity)');
}

if (!failures) console.log('\nreport-only-observers: all assertions passed.');
