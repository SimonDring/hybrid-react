// tests/selection.js
// Assertion tests for the 2026-06-27 sports-science engine improvements (P1–P6).
// Encodes the post-change invariants so a regression is caught loudly. Plain
// asserts in the golden-master style; run: node tests/selection.js
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { EXERCISES, LEVELS } from '@performance-os/engine/data/strengthExercises.js';
import { applyWeights } from '@performance-os/engine/lib/liftProgression.js';

let passes = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else { passes++; }
}

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const DB = ['dumbbell', 'bodyweight'];
const inDays = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
const A = (o) => answersToProfile({ ...BLANK_ANSWERS, ...o });

const PROFILES = {
  cyclist:      A({ goalType: 'sport', sport: 'cycle', sportIntent: 'compete', eventDate: inDays(30), experienceLevel: 'advanced', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', bodyweight_kg: 80 }),
  runnerFemale: A({ goalType: 'sport', sport: 'run', runDiscipline: 'middle', sportIntent: 'compete', eventDate: inDays(30), experienceLevel: 'advanced', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'female', bodyweight_kg: 62 }),
  swimmer:      A({ goalType: 'sport', sport: 'swim', sportIntent: 'compete', eventDate: inDays(30), experienceLevel: 'advanced', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', bodyweight_kg: 82 }),
  strengthFull: A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', bodyweight_kg: 85, lifts: { squat: 180, bench: 130, deadlift: 230 } }),
  strengthDB:   A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: DB, sex: 'female', bodyweight_kg: 69 }),
  hypertrophy:  A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 5, days: ['mon', 'tue', 'wed', 'fri', 'sat'], equipment: FULL, sex: 'female', bodyweight_kg: 70 })
};
const PLANS = Object.fromEntries(Object.entries(PROFILES).map(([k, p]) => [k, { profile: p, plan: generatePlan(p) }]));

const EX = new Map(EXERCISES.map(e => [e.name.toLowerCase(), e]));
const exOf = (n) => EX.get(String(n || '').toLowerCase()) || null;
const reps = (s) => { const m = /×\s*(\d+)/.exec(s || ''); return m ? Number(m[1]) : null; };
const weeks = (plan) => plan.phases.flatMap(p => p.weeks);
const workingSessions = (plan) => weeks(plan).filter(w => !w.deload && !w.taper).flatMap(w => w.sessions);
const allSessions = (plan) => weeks(plan).flatMap(w => w.sessions);
const allItems = (plan) => allSessions(plan).flatMap(s => s.items || []);

// ── P1: a heavy primary is never buried behind an accessory/core filler ─────────
// The session opens on its anchor (group A — a sport-priority lift or the build
// split's compound, by design). AFTER the anchor, block class must be non-decreasing
// (power<primary<accessory<isoCore), so no main sorts behind a lone accessory/filler.
function leadClass(item, ex, level, demotePress) {
  if (!ex) return 2;
  if (ex.quality === 'power') return 0;
  if (ex.loadClass === 'health') return 4;
  if (ex.pattern === 'core' || ex.loadClass === 'isoCore') return 3;
  let role = ex.role;
  if (demotePress && role === 'primary' && ex.pattern === 'hpush') role = 'accessory';
  if (ex.minLevelForPrimary && role === 'primary' && level < (LEVELS[ex.minLevelForPrimary] ?? 0)) role = 'accessory';
  return role === 'primary' ? 1 : 2;
}
for (const [name, { profile, plan }] of Object.entries(PLANS)) {
  const level = LEVELS[profile.experience.gym] ?? 2;
  const demotePress = profile.goal_type === 'sport' && (profile.sport === 'run' || profile.sport === 'cycle');
  let ok = true;
  for (const s of workingSessions(plan)) {
    const groups = new Map();
    for (const it of s.items || []) {
      if (it.tag === 'mobility' || !/^[A-H]$/.test(it.group || '')) continue;
      const c = leadClass(it, exOf(it.name), level, demotePress);
      groups.set(it.group, Math.min(groups.has(it.group) ? groups.get(it.group) : 9, c));
    }
    const seq = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(x => x[1]);
    // Skip the anchor (group A, seq[0]); the rest must be non-decreasing in class.
    for (let i = 2; i < seq.length; i++) if (seq[i] < seq[i - 1]) { ok = false; break; }
  }
  assert(ok, `P1 ordering: ${name} never buries a primary behind an accessory after the anchor`);
}

// ── P2: per-exercise rep caps + power scheme ────────────────────────────────────
for (const [name, { plan }] of Object.entries(PLANS)) {
  let capOk = true, powerOk = true;
  for (const it of allItems(plan)) {
    const ex = exOf(it.name); if (!ex) continue;
    if (ex.repCap && reps(it.sets) > ex.repCap) capOk = false;       // Nordic ≤6, GHR ≤8
    if (ex.quality === 'power' && reps(it.sets) !== 4) powerOk = false; // 4×4, never female-bumped to 6
  }
  assert(capOk, `P2 rep cap: ${name} never exceeds a per-exercise repCap (Nordic/GHR)`);
  assert(powerOk, `P2 power scheme: ${name} plyometrics use 4×4 (not bumped to a hypertrophy scheme)`);
}

// ── P3: pulling prescription ────────────────────────────────────────────────────
for (const [name, { plan }] of Object.entries(PLANS)) {
  const ok = allItems(plan).filter(it => /lat pulldown/i.test(it.name)).every(it => reps(it.sets) >= 6);
  assert(ok, `P3 pulldown floor: ${name} never prescribes lat pulldown below 6 reps`);
}
{ // weighted pull-up gets added load when the athlete's pull e1RM exceeds bodyweight
  const heavy = [{ name: 'Pull-up', sets: '4 × 4', rpe: 'RPE 8' }];
  applyWeights(heavy, { pull: 140 }, 'advanced', 80);
  assert(heavy[0].weight && heavy[0].weight.startsWith('+'), 'P3 pull-up load: strong athlete gets an added-load target');
  const light = [{ name: 'Pull-up', sets: '3 × 12', rpe: 'RPE 7' }];
  applyWeights(light, { pull: 80 }, 'beginner', 80);
  assert(!light[0].weight, 'P3 pull-up load: sub-bodyweight case stays bodyweight (no negative load)');
}

// ── P4: endurance-sport pressing demoted; swim untouched ────────────────────────
for (const name of ['cyclist', 'runnerFemale']) {
  const plan = PLANS[name].plan;
  const pressCapOk = allSessions(plan).every(s => (s.items || []).filter(it => exOf(it.name)?.pattern === 'hpush' && it.tag !== 'mobility').length <= 1);
  // A demoted bench is an accessory: it never carries the primary's 180s rest. (Rep
  // count alone can't tell — a taper drops accessory reps too — but rest does.)
  const benchOk = allItems(plan).filter(it => /^bench press$/i.test(it.name)).every(it => it.restSec !== 180);
  assert(pressCapOk, `P4 press cap: ${name} has ≤1 horizontal-press slot per session`);
  assert(benchOk, `P4 no heavy bench: ${name} bench is an accessory (not a heavy 180s-rest primary)`);
}
{ // swim control: pressing is sport-specific for swimmers and must remain heavy
  const hasHeavyPress = allItems(PLANS.swimmer.plan).some(it => {
    const ex = exOf(it.name);
    return ex && (ex.pattern === 'hpush' || ex.pattern === 'vpush') && ex.role === 'primary' && reps(it.sets) <= 5;
  });
  assert(hasHeavyPress, 'P4 swim control: swimmers still get a heavy press primary');
}

// ── P5: variety — the prone Y/T/W trio never stacks in one session ──────────────
for (const [name, { plan }] of Object.entries(PLANS)) {
  const ok = allSessions(plan).every(s => (s.items || []).filter(it => /^Prone [YTW] Raise$/.test(it.name)).length <= 1);
  assert(ok, `P5 variety: ${name} never stacks 2+ of the prone Y/T/W raise trio in one session`);
}

// ── P6: edges — no-barbell strength reps + honest focus labels ──────────────────
{ // DB-only "strength" mains shift to a trainable rep range (≥6), not 4×4
  const ok = workingSessions(PLANS.strengthDB.plan).flatMap(s => s.items || [])
    .filter(it => /^DB bench press$/i.test(it.name)).every(it => reps(it.sets) >= 6);
  assert(ok, 'P6 no-barbell strength: DB-only mains use ≥6 reps (a 4×4 can\'t be loaded on DBs)');
}
for (const [name, { plan }] of Object.entries(PLANS)) {
  let labelOk = true;
  for (const s of allSessions(plan)) {
    const focus = (s.title || '').split('·').pop().trim();
    const pats = new Set((s.items || []).map(it => exOf(it.name)?.pattern).filter(Boolean));
    if (focus === 'Push' && !(pats.has('hpush') || pats.has('vpush'))) labelOk = false;
    if (focus === 'Pull' && !(pats.has('hpull') || pats.has('vpull'))) labelOk = false;
  }
  assert(labelOk, `P6 labels: ${name} never labels a session Push/Pull without that movement present`);
}

console.log(process.exitCode ? `selection: FAILURES above` : `PASS: selection — ${passes} assertions across ${Object.keys(PLANS).length} profiles`);
