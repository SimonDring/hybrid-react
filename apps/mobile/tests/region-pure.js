// tests/region-pure.js
// A single-region (focused) day stays in its region — a working exercise on an
// Upper/Lower day must contribute to at least one in-region muscle, so cross-region
// spillover like a chest press on a leg day no longer happens. Hybrid lifts that train
// an in-region muscle (e.g. a Rack Pull on an Upper day trains the back) are fine, and
// factor-0 posture/prehab finisher work (tag 'mobility') is region-agnostic by design.
// Also: primaries lead each session and mobility/prehab work is sequenced last.
// See the region-pure exclusion + structureItems in allocator.js.
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { muscleContribution } from '@performance-os/engine/lib/plan/contributions.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const byName = {}; EXERCISES.forEach(e => byName[e.name.toLowerCase()] = e);
const UPPER_M = new Set(['chest', 'shoulders', 'triceps', 'back', 'biceps']);
const LOWER_M = new Set(['quads', 'hamstrings', 'glutes', 'calves']);
const LOWER_PAT = new Set(['squat', 'hinge', 'lunge', 'calf']);
const UPPER_PAT = new Set(['hpush', 'vpush', 'hpull', 'vpull']);
const exOf = (it) => byName[(it.name || '').toLowerCase()] || null;
const isMobility = (it) => it.tag === 'mobility';

const mk = (days) => {
  const A = {
    ...BLANK_ANSWERS, name: 'T', age: 30, sex: 'male', bodyweight_kg: 82,
    goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced',
    lifts: { squat: '160', bench: '110', deadlift: '200' }, daysPerWeek: days, sessionMinutes: 75,
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].slice(0, days), strengthAccess: 'full_gym'
  };
  return generatePlan(answersToProfile(A));
};
const eachSession = (plan, fn) => plan.phases.forEach(ph => (ph.weeks || []).forEach(w => (w.sessions || []).forEach(fn)));

// Region a focused session belongs to, from its PRIMARY patterns (null = mixed/full-body).
function sessionRegion(s) {
  let up = 0, lo = 0;
  for (const it of (s.items || [])) {
    const e = exOf(it); if (!e || e.role !== 'primary') continue;
    if (UPPER_PAT.has(e.pattern)) up++;
    if (LOWER_PAT.has(e.pattern)) lo++;
  }
  if (up && !lo) return 'upper';
  if (lo && !up) return 'lower';
  return null;
}

const p4 = mk(4);

// ── region purity: no WORKING item is entirely in the opposite region ──────────
let impure = 0, nFocused = 0;
eachSession(p4, (s) => {
  const region = sessionRegion(s);
  if (!region) return;
  nFocused++;
  for (const it of (s.items || [])) {
    if (isMobility(it)) continue;                         // prehab/mobility is region-agnostic
    const mc = muscleContribution(exOf(it) || {});
    const muscles = Object.keys(mc).filter(m => mc[m] > 0);
    if (!muscles.length) continue;
    const allOpposite = region === 'lower'
      ? muscles.every(m => UPPER_M.has(m))
      : muscles.every(m => LOWER_M.has(m));
    if (allOpposite) { impure++; if (impure <= 3) console.log(`  impure: ${s.title} · ${it.name} [${muscles.join(',')}]`); }
  }
});
assert(impure === 0, `no working item is entirely cross-region on a focused day (focused sessions ${nFocused}, impure ${impure})`);

// ── primaries lead: no primary appears after a non-primary item ────────────────
let primaryLate = 0;
eachSession(p4, (s) => {
  let seenNonPrimary = false;
  for (const it of (s.items || [])) {
    const e = exOf(it); if (!e) { seenNonPrimary = true; continue; }
    if (e.role === 'primary') { if (seenNonPrimary) primaryLate++; }
    else seenNonPrimary = true;
  }
});
assert(primaryLate === 0, `primaries always lead the session (late primaries ${primaryLate})`);

// ── mobility/prehab is sequenced last (no working item after a mobility item) ───
let mobilityMid = 0;
eachSession(p4, (s) => {
  let seenMobility = false;
  for (const it of (s.items || [])) {
    if (isMobility(it)) seenMobility = true;
    else if (seenMobility) mobilityMid++;
  }
});
assert(mobilityMid === 0, `mobility/prehab work is sequenced last (mid-session mobility ${mobilityMid})`);

// ── 3-day full-body → exclusion must NOT over-apply (days still mix regions) ────
let fbMixed = 0;
eachSession(mk(3), (s) => {
  const pats = (s.items || []).map(it => (exOf(it) || {}).pattern);
  if (pats.some(p => UPPER_PAT.has(p)) && pats.some(p => LOWER_PAT.has(p))) fbMixed++;
});
assert(fbMixed > 0, `3-day full-body plan still mixes regions (full-body days unaffected, found ${fbMixed})`);

console.log('region-pure tests done');
