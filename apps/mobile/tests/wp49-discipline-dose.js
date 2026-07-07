// tests/wp49-discipline-dose.js — WP-49 Plan 2 Task 4c part 2: a build DISCIPLINE doses its lifts
// in its OWN phase-progressing character, regardless of the per-day diagnosis quality, and a
// discipline ALWAYS steers (even an already-strong athlete with no capability gap — previously that
// fell to the legacy default scheme). Powerlifting mains are heavy low-rep with long rest and ramp
// base→peak; hypertrophy mains are higher-rep with short rest.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const mk = (style, extra = {}) => generatePlan({ ...answersToProfile(A({ goalType: 'build', strengthStyle: style, experienceLevel: 'advanced', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', ...extra })), plan_start_date: '2026-07-06' });
const repsOf = (str) => { const m = /(\d+)\s*[×x]\s*(\d+)/.exec(str || ''); return m ? Number(m[2]) : null; };
const mainOf = (week, rx) => { for (const s of week.sessions) for (const it of (s.items || []).filter((i) => i.section !== 'primer')) if (rx.test(it.name)) return it; return null; };
const loadWeeks = (plan) => plan.phases.flatMap((p) => p.weeks).filter((w) => !w.deload && !w.taper);

// ── A · powerlifting — heavy low-rep, long rest, phase-progressing ────────────
// This dose (4×5 @ RPE7 / 180 s → 4×4 @ RPE8) is proof of discipline-steering: the retired legacy
// fill gave a powerlifter a generic 3×8 / 120 s. A2 also proves the always-steer fix — this athlete
// has high 1RMs (no capability gap), yet still gets the heavy discipline dose.
{
  const plan = mk('strength', { lifts: { squat: 180, bench: 130, deadlift: 230 } }); // no capability gap
  const wks = loadWeeks(plan);
  const base = mainOf(wks[1], /bench press|back squat|deadlift/i);
  const late = mainOf(wks.find((w) => w.num >= 8) || wks[wks.length - 1], /bench press|back squat|deadlift/i);
  assert(base && base.restSec === 180, `A1 an already-strong powerlifter still gets the heavy discipline dose — mains rest 180 s (not the legacy 120) — got ${base && base.restSec}`);
  assert(base && repsOf(base.sets) <= 5, `A2 powerlifting mains are low-rep (≤5) — got ${base && base.sets}`);
  assert(base && late && repsOf(late.sets) <= repsOf(base.sets), `A3 reps ramp down base→peak (${base && base.sets} → ${late && late.sets})`);
}

// ── B · hypertrophy — higher-rep, short rest ──────────────────────────────────
{
  const base = mainOf(mk('bodybuilding').phases[0].weeks[1], /bench press|back squat|deadlift|overhead press/i);
  assert(base && base.restSec === 90, `B1 hypertrophy mains rest 90 s — got ${base && base.restSec}`);
  assert(base && repsOf(base.sets) >= 8, `B2 hypertrophy mains are higher-rep (≥8) — got ${base && base.sets}`);
}

// ── C · the dose is discipline-pinned — most competition-lift work is heavy low-rep ──
// (Some competition-lift names recur as accessory variations; the discipline character dominates.)
{
  const plan = mk('strength', { lifts: { squat: 180, bench: 130, deadlift: 230 } });
  const mains = loadWeeks(plan).flatMap((w) => w.sessions.flatMap((s) => (s.items || []).filter((it) => /^(bench press|back squat|deadlift)$/i.test(it.name))));
  const heavy = mains.filter((it) => repsOf(it.sets) <= 5 && it.restSec === 180).length;
  assert(mains.length > 0 && heavy / mains.length >= 0.8, `C1 ≥80% of competition-lift sets are heavy low-rep (≤5) with 180 s rest (${heavy}/${mains.length})`);
}

console.log(process.exitCode ? 'wp49-discipline-dose FAILURES' : 'PASS: wp49-discipline-dose — all gates');
