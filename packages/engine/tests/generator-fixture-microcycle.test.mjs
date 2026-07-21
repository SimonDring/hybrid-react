import assert from 'node:assert/strict';
import { generatePlan } from '@performance-os/engine';

let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };

// A soccer player, fixed start (Mon 2026-07-13), Saturday fixtures, trains Mon/Thu/Fri.
// team_fixtures/team_match_weekday are what applyTeamSchedule (Task 6) stamps.
// Mon/Thu/Fri (not the original Mon/Wed/Fri — 2026-07-21 coaching refinement: raising
// SCHEDULING_PENALTIES.md.heavyOffTargetDayPerStep 2→4 made Mon/Wed/Fri's UNSHAPED
// baseline coincidentally land heavy on the same day mdConstraints would already pick,
// so the non-vacuity check below started failing — not a scheduler bug, just this
// fixture's baseline happening to agree with the (now stronger) MD preference. Mon/Thu/Fri
// keeps the check honest and is a STRONGER demo: the unshaped baseline puts heavy on
// Friday itself (MD-1, the worst day), and shaping correctly moves it to Monday.
const profile = () => ({
  goal_type: 'sport', sport: 'soccer', sport_code: 'soccer', sport_intent: 'compete',
  sport_season: 'off_season', experience_level: 'intermediate', experience: { gym: 'intermediate' },
  sex: 'male', bodyweight_kg: 78, access: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
  availability: { days_per_week: 3, days: ['mon', 'thu', 'fri'] }, plan_start_date: '2026-07-13',
  lifts: {}, sport_days: ['tue', 'sat'],
  team_fixtures: [{ dateISO: '2026-07-18', weekdayIdx: 5 }, { dateISO: '2026-07-25', weekdayIdx: 5 }],
  team_match_weekday: 5,
});

// Flag OFF (default) → byte-identical to a plan with NO fixture fields.
const bare = { ...profile() }; delete bare.team_fixtures; delete bare.team_match_weekday;
ok(JSON.stringify(generatePlan(profile())) === JSON.stringify(generatePlan(bare)),
  'flag OFF: team_fixtures fields do not change the plan (byte-identical)');

// Flag ON → the Friday (MD-1) session is not the heavy/high-axial one.
const shaped = generatePlan(profile(), { fixtureMicrocycle: true });
const wk1 = shaped.phases[0].weeks[0];
const fri = wk1.sessions.find((s) => s.dayIdx === 4); // Friday = MD-1
ok(fri, 'a Friday session exists');
ok(!(fri.axialLoad >= 3 && /heav|strength/i.test(fri.title)), `Friday (MD-1) is not the heavy day (title "${fri.title}", axial ${fri.axialLoad})`);

// Supplementary non-vacuity check (added beyond the brief's verbatim test — see task-5-report.md
// "Concerns"): prove the wiring is genuinely exercised by confirming the shaped plan differs
// from the unshaped one — for THIS profile the unshaped baseline puts heavy on Friday itself
// (MD-1), so the Friday-not-heavy assertion above is non-vacuous BECAUSE shaping moved it.
const unshaped = generatePlan(profile());
ok(JSON.stringify(unshaped) !== JSON.stringify(shaped),
  'flag ON with fixtures genuinely reshapes the plan vs. the unshaped baseline (non-vacuity proof)');

// Flag ON but NO fixtures → byte-identical (additive-identity).
const noFix = { ...profile() }; delete noFix.team_fixtures; delete noFix.team_match_weekday;
ok(JSON.stringify(generatePlan(noFix, { fixtureMicrocycle: true })) === JSON.stringify(generatePlan(noFix)),
  'flag ON without fixtures → byte-identical');

console.log(`\ngenerator-fixture-microcycle: ${n}/${n} checks passed`);
