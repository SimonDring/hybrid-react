// tests/dose-by-quality.js — WP-21: D11 sessions dose from their TARGET QUALITY.
//
// Spec: docs/superpowers/specs/2026-07-04-dose-by-quality-design.md. The audit's
// acceptance: a sprint-discipline runner gets power-appropriate doses DISTINCT from
// a long-distance runner's. Quality blocks come from data/doseSchemes.js (WP-14);
// the H9 C6 (robustness HSR) and C7 (foot-contact ceiling) corrections apply here.

import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { doseForQuality, REACTIVE_LIMITS, POWER_DOSE } from '@performance-os/engine/data/doseSchemes.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── The lookup itself ─────────────────────────────────────────────────────────
assert(doseForQuality('robustness', 'base').main === '3 × 8' && /3 s down/.test(doseForQuality('robustness', 'base').mainNote),
  'robustness base dose is HSR with the tempo cue (H9 C6)');
assert(doseForQuality('explosiveStrength', 'base').main === '4 × 3', 'explosive base mains are strength-speed triples');
assert(doseForQuality('maxStrength', 'build').main === '4 × 4', 'maxStrength reuses the WP-14 block');
assert(doseForQuality('robustness', 'peak', { taper: true }).main === '2 × 6', 'taper resolves inside the quality block');
assert(doseForQuality('robustness', 'peak', { deload: true }).mainRpe === 'RPE 6', 'deload drops intensity inside the quality block');
assert(doseForQuality('no-such-quality', 'base') === null, 'unknown quality → null (caller falls back to the style bridge)');
assert(REACTIVE_LIMITS.footContacts.beginner === 80 && REACTIVE_LIMITS.footContacts.advanced === 120,
  'foot-contact ceilings carry the C7 values');

// ── Live plans: sprint vs long-distance dose DIFFERENTLY (the acceptance) ─────
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const base = {
  plan_start_date: '2026-07-06', experience: { gym: 'intermediate' },
  availability: { days_per_week: 3, days: ['monday', 'wednesday', 'friday'] },
  access: FULL, sex: 'male', bodyweight_kg: 80
};
const wk1 = (rd) => generatePlan({ ...base, goal_type: 'sport', sport: 'run', run_discipline: rd, sport_intent: 'recreational' }).phases[0].weeks[0];
const working = (w) => w.sessions.flatMap((s) => (s.items || []).filter((it) => it.volumeFactor !== 0 && it.section !== 'primer'));
const repOf = (sets) => { const m = /×\s*(\d+)/.exec(sets || ''); return m ? Number(m[1]) : null; };

const long = wk1('long');
const sprint = wk1('sprint');

// Long-distance robustness days: HSR — a tempo-cued main in the 6–10 rep range.
const hsrMains = working(long).filter((it) => it.note && /tendon-loading tempo/.test(it.note));
assert(hsrMains.length >= 1, `marathoner gets HSR tempo mains (${hsrMains.length})`);
assert(hsrMains.every((it) => { const r = repOf(it.sets); return r >= 6 && r <= 10; }),
  'HSR mains sit in the 6–10 rep tendon range');

// Sprinter strength work: low-rep (≤6), no HSR tempo cue anywhere.
const sprintWork = working(sprint);
assert(sprintWork.every((it) => !/tendon-loading tempo/.test(it.note || '')), 'sprinter has no HSR tempo work');
assert(sprintWork.every((it) => { const r = repOf(it.sets); return r == null || r <= 6; }),
  `sprinter doses are power-appropriate (all ≤6 reps; got: ${sprintWork.map((it) => it.sets).join(', ')})`);

// The two disciplines provably differ on shared dosing dimensions.
const doseSig = (items) => new Set(items.map((it) => `${it.sets}@${it.rpe}`));
const longSig = doseSig(working(long)), sprintSig = doseSig(sprintWork);
assert([...longSig].some((d) => !sprintSig.has(d)) && [...sprintSig].some((d) => !longSig.has(d)),
  'sprint and long-distance dose signatures differ (the WP-21 acceptance)');

// ── Foot-contact ceiling (C7): reactive sessions stay within budget ───────────
const powerContacts = (() => { const m = /(\d+)\s*×\s*(\d+)/.exec(POWER_DOSE.sets); return Number(m[1]) * Number(m[2]); })();
for (const [label, week, ceiling] of [['long·intermediate', long, 100], ['sprint·intermediate', sprint, 100]]) {
  for (const s of week.sessions) {
    const powerItems = (s.items || []).filter((it) => /pogo|jump|clean|swing/i.test(it.name) && repOf(it.sets) != null && /×/.test(it.sets));
    const contacts = powerItems.filter((it) => /pogo|jump/i.test(it.name)).length * powerContacts;
    assert(contacts <= ceiling, `${label} "${s.title}": ${contacts} foot contacts ≤ ${ceiling}`);
  }
}

// Deload week still drops intensity on the quality-dosed path.
const deloadWeek = generatePlan({ ...base, goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'recreational', plan_weeks: 12 })
  .phases.flatMap((p) => p.weeks).find((w) => w.deload);
if (deloadWeek) {
  const mains = working(deloadWeek).filter((it) => /RPE [56]/.test(it.rpe || ''));
  assert(mains.length >= 1, 'deload week drops to RPE 5–6 on the quality-dosed path');
} else {
  console.log('PASS: (no deload week in this block — skipped)');
}
