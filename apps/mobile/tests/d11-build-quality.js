// tests/d11-build-quality.js — WP-42b: the BUILD style-identity gate, calibrated against
// today's legacy-fill output. Constitution Art 3: the goal belongs to the athlete — a
// bodybuilding plan must remain recognisably hypertrophy-focused through any re-seat.
// This is the nature-of-change gate the WP-49 build flip must keep green (the mirror of
// d11-runner-quality.js / d11-swim-quality.js for the majority cohort): if the flip turns
// a hypertrophy week into generic athlete training, THIS fails, not just a snapshot diff.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { countWeeklyVolume } from '@performance-os/engine/lib/plan/volume.js';
import { VOLUME_LANDMARKS } from '@performance-os/engine/data/muscleVolume.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const ASOF = '2026-07-06';

const planFor = (style, days, dayKeys) => generatePlan({
  ...answersToProfile(A({ goalType: 'build', strengthStyle: style, experienceLevel: 'intermediate', daysPerWeek: days, days: dayKeys, equipment: FULL, sex: 'male', bodyweight_kg: 80 })),
  plan_start_date: ASOF,
});

// A mid-block, non-deload working week (week 2 of the first phase).
const workWeek = (plan) => plan.phases[0].weeks.find((w) => !w.deload && !w.taper && w.num >= 2) || plan.phases[0].weeks[0];
const workingItems = (week) => week.sessions.flatMap((s) => (s.items || []).filter((it) => (it.volumeFactor ?? 1) > 0 && it.section !== 'primer'));
const repOf = (setsStr) => { const m = /×\s*(\d+)/.exec(setsStr || ''); return m ? Number(m[1]) : null; };

const bb = planFor('bodybuilding', 4, ['mon', 'tue', 'thu', 'fri']);
const st = planFor('strength', 4, ['mon', 'tue', 'thu', 'fri']);
const bbWeek = workWeek(bb);
const stWeek = workWeek(st);

// ── B1 · volume identity: within landmarks, never over MRV ────────────────────
{
  const counts = countWeeklyVolume(bbWeek.sessions).counts;
  const over = Object.entries(counts).filter(([m, v]) => VOLUME_LANDMARKS[m] && v > VOLUME_LANDMARKS[m].mrv + 0.01);
  assert(over.length === 0, `B1a no muscle over MRV (${over.map(([m, v]) => `${m}:${v.toFixed(1)}`).join(', ') || 'clean'})`);
  const atMev = Object.entries(counts).filter(([m, v]) => VOLUME_LANDMARKS[m] && v >= VOLUME_LANDMARKS[m].mev - 0.01);
  assert(atMev.length >= 6, `B1b broad hypertrophy coverage — ≥6 muscles at/above MEV (got ${atMev.length})`);
}

// ── B2 · rep-range identity: hypertrophy work lives at 6–15 reps ──────────────
{
  const reps = workingItems(bbWeek).map((it) => repOf(it.sets)).filter((r) => r != null);
  const inRange = reps.filter((r) => r >= 6 && r <= 15).length;
  assert(reps.length > 0 && inRange / reps.length >= 0.7,
    `B2 ≥70% of bodybuilding working sets at 6–15 reps (got ${Math.round((inRange / Math.max(1, reps.length)) * 100)}%)`);
}

// ── B3 · isolation work survives (the bodybuilding signature) ─────────────────
{
  const iso = workingItems(bbWeek).filter((it) => /curl|raise|extension|fly|pushdown|pullover|pec deck/i.test(it.name || ''));
  assert(iso.length >= 2, `B3 isolation work present (${iso.slice(0, 3).map((i) => i.name).join(', ') || 'NONE'})`);
}

// ── B4 · frequency identity: majors hit ≥2 sessions/week at 4 days ────────────
{
  for (const muscle of ['chest', 'back', 'quads']) {
    const sessionsHit = bbWeek.sessions.filter((s) => (countWeeklyVolume([s]).counts[muscle] || 0) > 0.5).length;
    assert(sessionsHit >= 2, `B4 ${muscle} trained in ≥2 sessions (got ${sessionsHit})`);
  }
}

// ── B5 · differentiated days ───────────────────────────────────────────────────
{
  const focuses = new Set(bbWeek.sessions.map((s) => (s.title || '').split('·')[1]?.trim()));
  assert(focuses.size >= 2, `B5 the week is a split, not identical days (${[...focuses].join(' / ')})`);
}

// ── B6 · no sport leakage ──────────────────────────────────────────────────────
{
  const power = workingItems(bbWeek).filter((it) => /jump|clean|snatch|throw|bound|sprint|pogo/i.test(it.name || ''));
  assert(power.length === 0, `B6 no power/plyo items in a build_muscle plan (${power.map((i) => i.name).join(', ') || 'clean'})`);
}

// ── S1/S2 · get_stronger identity: heavy mains lead; volume sits below bb ─────
{
  const reps = workingItems(stWeek).map((it) => repOf(it.sets)).filter((r) => r != null);
  assert(reps.some((r) => r <= 6), 'S1 strength week contains true low-rep (≤6) main work');
  const total = (w) => Object.values(countWeeklyVolume(w.sessions).counts).reduce((a, b) => a + b, 0);
  assert(total(bbWeek) > total(stWeek), `S2 bodybuilding weekly volume exceeds strength (${total(bbWeek).toFixed(0)} vs ${total(stWeek).toFixed(0)})`);
}
