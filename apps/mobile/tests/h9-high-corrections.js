// tests/h9-high-corrections.js — the two HIGH findings from the seed-evidence review
// (docs/engine/06-SEED-EVIDENCE-REVIEW.md C1/C2), pinned.
//
// C1: the cardio→gym translation is sport-aware. Reactive/plyometric work transfers
//     to aerobic economy only for impact locomotion (tendon stiffness — Blagrove
//     2018, Barnes 2015); cycling/swimming have no stretch-shortening cycle, and
//     their gym support is heavy strength (Rønnestad 2010; Aagaard 2011). The old
//     sport-agnostic map injected pogos into a live cyclist's plan.
// C2: robustness's ideal patterns include its own tagged drivers (squat/carry), and
//     the lunge pattern carries a robustness tag — the tag×map mismatch silently
//     excluded a hamstring-injured runner's best remaining robustness work.

import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { cardioGymSupport, QUALITY_MOVEMENT } from '@performance-os/engine/data/qualityMovementMap.js';
import { exerciseQualities } from '@performance-os/engine/data/exerciseQualities.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── C1: the translation itself ───────────────────────────────────────────────
assert(JSON.stringify(cardioGymSupport('aerobicCapacity', 'run')) === JSON.stringify(['robustness', 'reactiveStrength']),
  'aerobic support for RUN keeps reactive work (SSC transfer is real for impact locomotion)');
assert(JSON.stringify(cardioGymSupport('aerobicCapacity', 'cycle')) === JSON.stringify(['robustness', 'maxStrength']),
  'aerobic support for CYCLE is heavy strength, not reactive (no SSC)');
assert(JSON.stringify(cardioGymSupport('aerobicCapacity', 'swim')) === JSON.stringify(['robustness', 'maxStrength']),
  'aerobic support for SWIM is heavy strength, not reactive');
assert(JSON.stringify(cardioGymSupport('aerobicCapacity', null)) === JSON.stringify(['robustness', 'reactiveStrength']),
  'no-sport default unchanged (back-compat)');
assert(JSON.stringify(cardioGymSupport('anaerobicCapacity', 'cycle')) === JSON.stringify(['strengthEndurance', 'maxStrength']),
  'anaerobic translation unaffected');

// ── C2: tag × map coherence for robustness ───────────────────────────────────
const rob = QUALITY_MOVEMENT.robustness.movementPatterns;
assert(rob.includes('squat') && rob.includes('carry'),
  `robustness ideal patterns include its tagged drivers squat + carry (got: ${rob.join(',')})`);
const lungeTag = exerciseQualities('bulgarian_split_squat') || exerciseQualities('walking_lunge');
assert(lungeTag && (lungeTag.qualities || []).some((q) => q.id === 'robustness'),
  'lunge-pattern exercises now carry a robustness tag (the map lunge requirement has drivers)');

// ── Live plans: the cyclist loses plyometrics, the runner keeps them ─────────
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const base = {
  plan_start_date: '2026-07-06', experience: { gym: 'intermediate' },
  availability: { days_per_week: 3, days: ['monday', 'wednesday', 'friday'] },
  access: FULL, sex: 'male', bodyweight_kg: 80
};
const names = (plan) => plan.phases.flatMap((ph) => ph.weeks.flatMap((w) => w.sessions.flatMap((s) => (s.items || []).map((it) => (it.name || '').toLowerCase()))));
const JUMPY = /pogo|jump|hop|bound|plyo|depth/;

const cyclist = names(generatePlan({ ...base, goal_type: 'sport', sport: 'cycle', sport_intent: 'recreational' }));
assert(!cyclist.some((n) => JUMPY.test(n)), 'cyclist plan contains NO plyometric/jump work anywhere');
assert(cyclist.some((n) => /squat|leg press/.test(n)), 'cyclist plan contains heavy leg strength (squat)');

const runner = names(generatePlan({ ...base, goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'recreational' }));
assert(runner.some((n) => JUMPY.test(n)), 'runner plan KEEPS reactive/plyometric work (non-vacuity)');
assert(runner.some((n) => /split squat|lunge|step-up|squat|carry/.test(n)),
  'runner durability days gain squat/lunge/carry work (C2 coherence)');
