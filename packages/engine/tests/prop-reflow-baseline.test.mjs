// prop-reflow-baseline.test.mjs — Phase 3 M0 T3 property: REFLOW ≡ BASELINE WHEN
// NOTHING CHANGED, and FREEZE INVIOLABILITY (13-VALIDATION-STRATEGY §5.2 "Reflow ≡
// baseline when nothing changed"; 02 §2.15 D15; EDS D15; Constitution Art 10).
//
// THE TWO INVARIANTS:
//   (1) reflow(plan, liveState) with a liveState carrying NO completions, NO readiness
//       signal, NO load signal, NO injuries, NO overrides and NO freezes must reproduce
//       the baseline week EXACTLY — byte-identical. BOTH historical reflow/baseline
//       divergences were caught only AFTER the fact (TR-11); this property makes the
//       third impossible. Driven across a spread of profiles.
//   (2) Freeze inviolability: with a committed (started) session present, that frozen
//       session is byte-identical to its committed (baseline) form even while the reflow
//       reshapes the OTHER pending sessions around it (a projection touching a committed
//       session is a contract violation — 02 §2.15).
//
// ── M0 FINDING (Global Constraint 3 — surfaced, NOT weakened) ──────────────────────
// Invariant (1) FAILS for IN-SEASON / near-competition SPORT athletes. Reproducing
// profile: goal_type 'sport', sport 'run', run_discipline 'sprint', sport_intent
// 'compete', event_date ~48 days out (season resolves 'in') — see IN_SEASON_SPRINTER
// below. On a fully NEUTRAL liveState (no completions/readiness/load/injuries/freezes),
// reflow still diverges from baseline: reflowPhases evaluates the SKB decision rules
// (`ruleVolumeAdjustment`) from the PROFILE's season + competition proximity — NOT from
// live state — and the rule `inseason_minimal_effective_strength` fires a ×0.6 volume
// trim, which re-derives the horizon's sessions at reduced volume (and restructures
// their content/titles, e.g. "Lower" → "Lower Explosive"). §5.2 enumerates only
// {completions, readiness, injuries, freezes} as the "nothing changed" inputs; the SKB
// rule is a FIFTH, profile-derived input the property author did not carve out, so by
// §5.2's literal wording neutral-reflow ≠ baseline here. Whether this is a DEFECT
// (double-counting the taper the baseline already periodises) or INTENDED runtime
// sport-conservatism (WP-43 stamps `_ruleTrim` to make it visible) is Simon's call.
// This test PINS the divergence (asserts it is attributable to a fired SKB ruleId, and
// that FREEZE still holds through it) as an XFAIL — never gating the suite, and flipping
// to a HARD failure if the divergence ever silently disappears (forcing a re-tighten).
//
// ── WHY THIS TEST REBUILDS gymCtx / dateForSession ──
// reflow() (engine: reflowPhases) is a PURE policy that takes app-assembled context as
// explicit arguments — the L3 orchestrator (apps/mobile PlanService) builds `gctx` and
// the `dateFor` calendar map and passes them in. To exercise reflow WITHOUT booting the
// app (spec §2.1), this test reconstructs BOTH from engine exports ONLY, mirroring
// PlanService.gymCtx() and PlanService.dateForSession() line-for-line (kept in sync with
// those functions). No import from apps/mobile.
//
// Deterministic: `today` is derived from the profile's fixed plan_start_date (never the
// clock) and set to the Monday of week 1, so no session is ever "missed" and the neutral
// path is exercised honestly.
import {
  generatePlan, reflow, ruleVolumeAdjustment,
  resolveProgram, resolveLifts, performanceModelForProfile, profileToAthleteModel,
  sportKnowledge, SESSION_CEILING_MIN,
} from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
// (The M0 in-season-reflow FINDING is RESOLVED — 2026-07-14: the reflow now excludes
// calendar/season-schedule signals from its SKB rule evaluation (reflowAdjust.js
// REFLOW_EXCLUDED_SIGNALS), so season no longer drives a neutral reflow. reflow≡baseline
// is a HARD invariant below with no known exceptions; any profile-derived divergence now
// fails the suite.)

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// Profiles where NO SKB rule fires and reflow≡baseline MUST hold (hard-asserted).
const NEUTRAL_PROFILES = {
  'build-strength-3d': { goal_type: 'build', strength_style: 'strength', experience_level: 'intermediate', experience: { gym: 'intermediate' }, sex: 'male', bodyweight_kg: 82, access: FULL, availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] }, plan_start_date: '2026-07-13', lifts: { squat: 140, bench: 100, deadlift: 180 } },
  'build-bodybuilding-4d': { goal_type: 'build', strength_style: 'bodybuilding', experience_level: 'advanced', experience: { gym: 'advanced' }, sex: 'female', bodyweight_kg: 65, access: FULL, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: '2026-07-13', lifts: {} },
  'build-functional-bw-3d': { goal_type: 'build', strength_style: 'functional', experience_level: 'beginner', experience: { gym: 'beginner' }, sex: 'male', bodyweight_kg: 78, access: ['bodyweight'], availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] }, plan_start_date: '2026-07-13', lifts: {} },
  'build-olympic-4d': { goal_type: 'build', discipline: 'olympic', experience_level: 'advanced', experience: { gym: 'advanced' }, sex: 'male', bodyweight_kg: 90, access: FULL, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: '2026-07-13', lifts: { squat: 150 }, olympic_lift: 'both' },
  'sport-cycle-recreational-3d': { goal_type: 'sport', sport: 'cycle', sport_intent: 'recreational', experience_level: 'intermediate', experience: { gym: 'intermediate' }, sex: 'male', bodyweight_kg: 72, access: FULL, availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] }, plan_start_date: '2026-07-13', lifts: {} },
};

// The reproducing profile for the M0 FINDING — in-season sprinter (an SKB rule fires).
const IN_SEASON_SPRINTER = { goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'compete', event_date: '2026-08-30', experience_level: 'intermediate', experience: { gym: 'intermediate' }, sex: 'male', bodyweight_kg: 75, access: FULL, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: '2026-07-13', lifts: {} };

const ALL_PROFILES = { ...NEUTRAL_PROFILES, 'sport-run-sprint-inseason-4d': IN_SEASON_SPRINTER };

// ── calendar helpers — mirror apps/mobile PlanService.dateForSession() exactly ──
const DAY_IDX = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
const parseISO = (s) => { const d = new Date(s + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; };
function mondayOf(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function weekdayOfTitle(title) { const t = (title || '').toLowerCase(); for (const k in DAY_IDX) if (t.includes(k)) return DAY_IDX[k]; return null; }
function dateForSession(startDate, weekNum, title) {
  const wi = weekdayOfTitle(title);
  if (!startDate || wi == null) return null;
  const d = mondayOf(startDate);
  d.setDate(d.getDate() + (weekNum - 1) * 7 + wi);
  return d;
}

// ── gctx — mirror apps/mobile PlanService.gymCtx() exactly, engine exports only ──
function gymCtx(profile) {
  const program = resolveProgram(profile);
  const e = profile.experience || {};
  const level = e.gym || e.strength_functional || e.strength_physique || 'beginner';
  const minutes = SESSION_CEILING_MIN;
  const asOf = profile.plan_start_date || null;
  const perf = performanceModelForProfile(profile, asOf);
  const skbSportId = profile.sport ? (profileToAthleteModel(profile, asOf)?.sportingContext?.primarySport || null) : null;
  const skbIds = skbSportId ? new Map((sportKnowledge.section(skbSportId, 'exerciseLibrary')?.exercises || []).map((x) => [x.id, x.transferToSportRating])) : new Map();
  return {
    style: program.style, level, minutes,
    access: profile.access || [], sex: profile.sex, lifts: resolveLifts(profile),
    bodyweight: profile.bodyweight_kg,
    emphasis: program.emphasis, volumeScalar: program.volumeScalar,
    exercisePriority: program.exercisePriority || [], priorityByIntent: program.priorityByIntent || new Map(),
    sport: profile.sport || null, power: !!program.power,
    priorityQualities: (perf && perf.priorityAdaptations) || [], season: program.season, skbIds,
    skbSportId, discipline: program.discipline || null,
    competedLift: profile.olympic_lift || 'both',
  };
}

// The SKB volume adjustment reflowPhases will evaluate for this profile at week-1 neutral
// state — mirrors reflowPhases' own ruleCtx (season from gctx, competition proximity from
// the profile, no live-state signals). Used to ROUTE a profile to hard-assert vs XFAIL.
function neutralRuleAdj(profile, today) {
  const gctx = gymCtx(profile);
  const ruleCtx = {
    season: gctx.season || null, readiness: null, illness: false, travel: false, acwr: null,
    competitionWithinH: profile.event_date ? Math.max(0, (new Date(profile.event_date).getTime() - today.getTime()) / 3600000) : null,
  };
  return ruleVolumeAdjustment(profile, ruleCtx);
}

// Build the full neutral reflow input for a profile at week 1, "today" = plan start.
function neutralReflowInput(profile, plan, extra = {}) {
  const startDate = parseISO(profile.plan_start_date);
  const today = new Date(startDate); today.setHours(0, 0, 0, 0);
  return {
    phases: plan.phases, currentWeek: 1, today, gctx: gymCtx(profile), profile,
    sessions: {}, recovery: null, load: null, reverted: false, overrides: {}, activeInjuries: [],
    dateFor: (wn, title) => dateForSession(startDate, wn, title), totalWeeks: plan.totalWeeks,
    startDate, startISO: profile.plan_start_date,
    ...extra,
  };
}

// ── INVARIANT 1 — reflow ≡ baseline when nothing changed ────────────────────────────
for (const [name, profile] of Object.entries(ALL_PROFILES)) {
  const plan = generatePlan({ ...profile });
  const startDate = parseISO(profile.plan_start_date);
  const today = new Date(startDate); today.setHours(0, 0, 0, 0);
  const ruleAdj = neutralRuleAdj(profile, today);
  const skbFires = ruleAdj.volumeMult !== 1 || ruleAdj.forceDeload;

  // Post-fix invariant: NO profile-derived SKB rule may drive a neutral reflow. Season is
  // excluded (baseline owns it); if a calendar-class rule (competition taper / fixtures)
  // ever fires here, it is the SAME double-count class and must be caught, not tolerated.
  assert(!skbFires,
    `reflow≡baseline: ${name} — no profile-derived SKB rule fires in a neutral reflow` +
    (skbFires ? ` (fired: ${ruleAdj.ruleIds.join(',') || '(forceDeload)'} ×${ruleAdj.volumeMult} — a calendar-schedule signal is leaking into reflow; it belongs in baseline periodisation)` : ''));

  const { phases } = reflow(neutralReflowInput(profile, plan));
  const identical = JSON.stringify(phases) === JSON.stringify(plan.phases);

  // Neutral reflow ≡ baseline, byte-for-byte — for EVERY profile (incl. the in-season
  // sprinter that once diverged).
  assert(identical, `reflow≡baseline: ${name} — neutral reflow reproduces the baseline phases byte-identically`);
  // And specifically the horizon weeks (1 & 2), where any reshaping would land.
  const baseWeeks = plan.phases.flatMap((p) => (p.weeks || []).map((w) => [w.num, w]));
  const rflWeeks = new Map(phases.flatMap((p) => (p.weeks || []).map((w) => [w.num, w])));
  for (const [num, w] of baseWeeks) {
    if (num === 1 || num === 2) {
      assert(JSON.stringify(rflWeeks.get(num)) === JSON.stringify(w),
        `reflow≡baseline: ${name} — horizon week ${num} is byte-identical to baseline`);
    }
  }
}

// ── INVARIANT 2 — freeze inviolability (holds for EVERY profile, incl. the finding) ──
// A committed (started) session stays exactly its baseline form even while a low-readiness
// reflow reshapes the sessions around it. Asserted across ALL profiles — the freeze
// discipline must survive even the in-season-sprinter's SKB trim.
for (const [name, profile] of Object.entries(ALL_PROFILES)) {
  const plan = generatePlan({ ...profile });
  const w1 = plan.phases[0].weeks[0];
  if (!w1 || !w1.sessions || w1.sessions.length < 2) continue; // need ≥2 sessions
  const frozenIdx = 1; // second session of week 1
  const frozenKey = `p1_wk1_s${frozenIdx}`;
  const baselineFrozen = JSON.stringify(w1.sessions[frozenIdx]);

  // A low-readiness signal forces the neutral path open so non-frozen pending sessions
  // get re-derived. reflow reads volumeModifier/rpeOffset/sessionOverride/score.
  const recovery = { volumeModifier: 0.8, rpeOffset: -1, sessionOverride: null, score: 40 };
  const sessions = { [frozenKey]: { started: true, createdAt: profile.plan_start_date } };

  const { phases } = reflow(neutralReflowInput(profile, plan, { recovery, sessions }));
  const rflW1 = phases[0].weeks[0].sessions;

  assert(JSON.stringify(rflW1[frozenIdx]) === baselineFrozen,
    `freeze: ${name} — the committed (started) session is byte-identical to its baseline form under reflow`);

  // Non-vacuity: the reflow actually reshaped SOMETHING (else the freeze guarantee is untested).
  const anyMoved = rflW1.some((s, i) => i !== frozenIdx && JSON.stringify(s) !== JSON.stringify(w1.sessions[i]));
  assert(anyMoved || phases[0].weeks[0]._adapted === true,
    `freeze: ${name} — the reflow DID reshape non-frozen sessions (freeze check is non-vacuous)`);
}
