// tests/recovery-honesty.js — WP-10: readiness scales INTENSITY as well as volume.
//
// Spec: docs/superpowers/specs/2026-07-04-recovery-honesty-design.md. On a low-
// readiness day the target RPE drops one step (knowledge: recovery.intensity_policy)
// and the suggested kg follow via the inverse-Epley %1RM in applyWeights; a travel
// "easy" day is both shorter (volumeCap) and lighter (rpeOffset) from
// recovery.travel_policy. Moderate/high readiness keeps intensity. The pure
// generator is untouched (no rpeOffset in its ctx) — golden masters prove that.

process.env.TZ = 'Europe/London';

const RealDate = Date;
const NOW = new RealDate('2026-07-06T10:00:00').getTime(); // a Monday
globalThis.Date = class extends RealDate {
  constructor(...args) { args.length ? super(...args) : super(NOW); }
  static now() { return NOW; }
};

const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; },
  clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
};

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const Database = (await import('../src/lib/Database.js')).default;
const Plan = await import('../src/lib/PlanService.js');
const { recoveryFromScore, assessRecovery } = await import('@performance-os/engine/lib/recovery/recovery.js');

// ── Contract: rpeOffset per band, from governed knowledge ────────────────────
assert(recoveryFromScore(85).rpeOffset === 0, 'high readiness → rpeOffset 0');
assert(recoveryFromScore(60).rpeOffset === 0, 'moderate readiness → rpeOffset 0 (volume already trims)');
assert(recoveryFromScore(40).rpeOffset === -1, 'low readiness → rpeOffset -1');
assert(recoveryFromScore(null).rpeOffset === 0, 'unknown readiness → rpeOffset 0');

// Saw 2016 pin (stale-audit check): low subjective + high objective ⇒ eased plan.
const sawBlend = assessRecovery({
  objectiveScore: 90,
  subjective: { sleepQuality: 1, soreness: 1, mood: 1, stress: 1, energy: 1 }
});
assert(sawBlend.volumeModifier < 1 && sawBlend.readinessLevel !== 'high',
  `low subjective outweighs high objective (0.6/0.4 blend): level=${sawBlend.readinessLevel}, vol=${sawBlend.volumeModifier}`);

// ── Reflow: same athlete, three readiness states ─────────────────────────────
Database.services.updateProfile({
  plan_start_date: '2026-07-06', plan_weeks: 8,
  goal_type: 'build', strength_style: 'strength',
  focus: ['gym'], primary: 'gym',
  experience: { gym: 'intermediate' },
  availability: { days_per_week: 3, session_minutes: 60, days: ['monday', 'wednesday', 'friday'] },
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
  sex: 'male', bodyweight_kg: 80,
  lift_log: { squat: { e1rm: 140 }, bench: { e1rm: 100 }, deadlift: { e1rm: 170 } },
  onboarded: true
});

const parseRpeNum = (s) => { const m = /RPE\s+(\d+(?:\.\d+)?)/i.exec(s || ''); return m ? Number(m[1]) : null; };
const parseKg = (s) => { const m = /([\d.]+)\s*kg/.exec(s || ''); return m ? Number(m[1]) : null; };

// MAIN-section items only: primers are app-side warm-up decoration (fixed light
// RPE below the floor) and are deliberately not intensity-scaled.
function currentWeekItems() {
  const phases = Plan.getPhases();
  const week = phases[0].weeks[0];
  return week.sessions.flatMap((s) => (s.items || []).filter((it) => it.section !== 'primer').map((it) => ({ ...it })));
}

Plan.setRuntime({ sessions: {}, recovery: recoveryFromScore(85), load: null });
const highItems = currentWeekItems();
Plan.setRuntime({ sessions: {}, recovery: recoveryFromScore(40), load: null });
const lowItems = currentWeekItems();
Plan.setRuntime({ sessions: {}, recovery: recoveryFromScore(60), load: null });
const modItems = currentWeekItems();

const byName = (items) => Object.fromEntries(items.map((it) => [it.name, it]));
const highBy = byName(highItems), lowBy = byName(lowItems), modBy = byName(modItems);
const shared = Object.keys(highBy).filter((n) => lowBy[n] && parseRpeNum(highBy[n].rpe) != null);
assert(shared.length >= 3, `enough shared RPE-carrying items to compare (${shared.length})`);

let allShifted = true, neverHeavier = true, strictDrops = 0, modUnchanged = true;
for (const n of shared) {
  const h = parseRpeNum(highBy[n].rpe), l = parseRpeNum(lowBy[n].rpe);
  // Above the floor: one step lower. At/below the floor: untouched (never raised).
  const expected = h > 5 ? Math.max(5, h - 1) : h;
  if (l !== expected) { allShifted = false; console.error(`  ↳ ${n}: high RPE ${h} → low RPE ${l} (expected ${expected})`); }
  const hw = parseKg(highBy[n].weight), lw = parseKg(lowBy[n].weight);
  if (hw != null && lw != null) {
    if (lw > hw) { neverHeavier = false; console.error(`  ↳ ${n}: kg ROSE (${hw} → ${lw})`); }
    if (lw < hw) strictDrops++;   // 2.5 kg rounding can absorb the ~3% drop on light loads
  }
  if (modBy[n] && parseRpeNum(modBy[n].rpe) !== h) modUnchanged = false;
}
assert(allShifted, 'low readiness: every above-floor RPE is one lower; floor never raises');
assert(neverHeavier, 'no suggested kg is ever HIGHER on a low-readiness day');
assert(strictDrops >= 1, `heavier lifts get strictly lighter suggestions (${strictDrops} dropped)`);
assert(modUnchanged, 'moderate readiness: target RPE unchanged (volume-only trim)');

// The eased week is flagged for the UI (surfacing = WP-30).
Plan.setRuntime({ sessions: {}, recovery: recoveryFromScore(40), load: null });
const easedWeek = Plan.getPhases()[0].weeks[0];
assert(easedWeek._intensityEased === 'low readiness — eased', `eased week carries the why (got '${easedWeek._intensityEased}')`);

// ── Travel: shorter AND lighter ──────────────────────────────────────────────
Plan.setRuntime({ sessions: {}, recovery: recoveryFromScore(85, { travel: true }), load: null });
const travelItems = currentWeekItems();
const travelBy = byName(travelItems);
const sharedT = Object.keys(highBy).filter((n) => travelBy[n] && parseRpeNum(highBy[n].rpe) != null && parseRpeNum(highBy[n].rpe) > 5);
assert(sharedT.length >= 1 && sharedT.every((n) => parseRpeNum(travelBy[n].rpe) === Math.max(5, parseRpeNum(highBy[n].rpe) - 1)),
  `travel easy day: target RPE one lower (${sharedT.length} compared)`);
const easedTravelWeek = Plan.getPhases()[0].weeks[0];
assert(easedTravelWeek._intensityEased === 'travel — eased', 'travel week carries the why');

// ── Train Now honesty ────────────────────────────────────────────────────────
Plan.setRuntime({ sessions: {}, recovery: recoveryFromScore(85), load: null });
const tnHigh = Plan.generateTrainNow({ minutes: 45 });
Plan.setRuntime({ sessions: {}, recovery: recoveryFromScore(40), load: null });
const tnLow = Plan.generateTrainNow({ minutes: 45 });
const mainOnly = (items) => (items || []).filter((it) => it.section !== 'primer');
const tnHighBy = byName(mainOnly(tnHigh.session.items)), tnLowBy = byName(mainOnly(tnLow.session.items));
const tnShared = Object.keys(tnHighBy).filter((n) => tnLowBy[n] && parseRpeNum(tnHighBy[n].rpe) != null && parseRpeNum(tnHighBy[n].rpe) > 5);
assert(tnShared.length >= 1 && tnShared.every((n) => parseRpeNum(tnLowBy[n].rpe) === Math.max(5, parseRpeNum(tnHighBy[n].rpe) - 1)),
  `Train Now on a low-readiness day is also one RPE lighter (${tnShared.length} compared)`);
