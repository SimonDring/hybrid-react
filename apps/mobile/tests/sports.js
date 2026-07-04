// tests/sports.js
// PHASE 2 — the pluggable sport layer: every module obeys the SportModule contract,
// the resolvers read sports from the registry (parity with the old hardcoded maps),
// and a brand-new scaffold sport produces a valid plan with ZERO core-engine edits.
// See docs/engine/02-REFACTOR-ROADMAP.md (Phase 2).
import sports from '@performance-os/engine/data/sportGymSupport/index.js';
import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';
import { resolvePeriodization } from '@performance-os/engine/lib/plan/periodization.js';
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// ── registry validity + coverage ──────────────────────────────────────────────
const v = sports.validate();
assert(v.ok, `every sport module is valid (${v.errors.join(' | ') || 'no errors'})`);
for (const id of ['run', 'cycle', 'swim', 'rugby', 'soccer', 'gaa']) {
  assert(sports.has(id), `registry contains "${id}"`);
}
assert(sports.get('kabaddi') === undefined, 'unknown sport returns undefined (generic fallback)');

// ── resolveProgram parity with the former hardcoded maps ───────────────────────
const rl = resolveProgram({ goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'recreational' });
assert(rl.style === 'sport' && rl.emphasis.calves === 1.4 && rl.emphasis.chest === 0.45, 'run-long emphasis unchanged (calves 1.4, chest 0.45)');
assert(rl.exercisePriority.includes('nordic_curl'), 'run-long still prioritises nordic_curl');
const rsp = resolveProgram({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'recreational', access: ['full_gym'] });
assert(rsp.emphasis.glutes === 1.35 && rsp.exercisePriority[0] === 'hang_clean', 'run-sprint emphasis/priority unchanged (glutes 1.35, opens hang_clean)');
const sw = resolveProgram({ goal_type: 'sport', sport: 'swim', sport_intent: 'recreational', access: ['full_gym'] });
assert(sw.emphasis.back === 1.3 && sw.exercisePriority.includes('face_pull'), 'swim emphasis/priority unchanged');
const cy = resolveProgram({ goal_type: 'sport', sport: 'cycle', sport_intent: 'recreational' });
assert(cy.emphasis.quads === 1.3 && cy.volumeScalar === 0.855, 'cycle emphasis unchanged; off-season volume pulled back (0.90×0.95 = 0.855)');
const cyIn = resolveProgram({ goal_type: 'sport', sport: 'cycle', sport_intent: 'compete', event_date: soon });
assert(cyIn.season === 'in' && cyIn.volumeScalar === 0.57, 'in-season volume scalar (0.60×0.95 = 0.57)');
// run with no declared discipline → balanced "run" fallback map
const rNo = resolveProgram({ goal_type: 'sport', sport: 'run', sport_intent: 'recreational' });
assert(rNo.emphasis.calves === 1.30 && rNo.exercisePriority[0] === 'nordic_curl', 'run (no discipline) uses the fallback map');

// ── resolvePeriodization parity ────────────────────────────────────────────────
assert(resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'recreational' }).totalWeeks === 6, 'run-sprint off → 6-week block');
assert(resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'middle', sport_intent: 'recreational' }).totalWeeks === 10, 'run-middle off → 10-week block');
assert(resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'recreational' }).totalWeeks === 12, 'run-long off → generic 12-week block');
assert(resolvePeriodization({ goal_type: 'sport', sport: 'cycle', sport_intent: 'compete', event_date: soon }).totalWeeks === 4, 'cycle in-season → 4-week block');
assert(resolvePeriodization({ goal_type: 'sport', sport: 'swim', sport_intent: 'recreational' }).totalWeeks === 12, 'swim off → 12-week block');

// ── extensibility: a SCAFFOLD sport plans with zero core edits ─────────────────
const rugbyProfile = {
  goal_type: 'sport', sport: 'rugby', focus: ['gym'], primary: 'gym',
  availability: { days_per_week: 3, session_minutes: 60, days: ['mon', 'wed', 'fri'] },
  access: FULL, experience: { gym: 'intermediate' },
  plan_start_date: new Date().toISOString().slice(0, 10)
};
const rugbyProg = resolveProgram(rugbyProfile);
assert(rugbyProg.style === 'sport' && rugbyProg.exercisePriority.length > 0, 'rugby (scaffold) resolves to a sport program with priorities');
let rugbyPlan = null, threw = null;
try { rugbyPlan = generatePlan(rugbyProfile); } catch (e) { threw = e; }
assert(!threw, `rugby plan generates without error (${threw ? threw.message : 'ok'})`);
assert(rugbyPlan && rugbyPlan.phases.length > 0, 'rugby plan has phases');
const rugbySessions = rugbyPlan ? rugbyPlan.phases.flatMap(p => p.weeks).flatMap(w => w.sessions) : [];
assert(rugbySessions.length > 0 && rugbySessions.every(s => s.items.length > 0), 'rugby plan has non-empty sessions');

// ── unknown sport still produces a valid (generic) plan, no crash ──────────────
const unknown = { ...rugbyProfile, sport: 'kabaddi' };
let unkPlan = null, unkThrew = null;
try { unkPlan = generatePlan(unknown); } catch (e) { unkThrew = e; }
assert(!unkThrew && unkPlan && unkPlan.phases.length > 0, 'unknown sport falls back to a valid generic plan');

console.log('sports tests done');
