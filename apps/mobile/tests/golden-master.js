// tests/golden-master.js
// PHASE 0 — the regression safety net for the engine refactor (docs/engine/02-REFACTOR-ROADMAP.md).
//
// Snapshots generatePlan(profile) across a representative archetype matrix and
// compares against a committed snapshot. Refactors that MUST NOT change behaviour
// (Phase 1 knowledge-base migration, Phase 2 sport-module extraction) are verified
// byte-identical here. Intentional behaviour changes (quick wins, Phase 3 recovery/
// load) regenerate the snapshot deliberately via UPDATE=1.
//
// Determinism: profiles are built through answersToProfile() (which anchors
// plan_start_date to "today"), and event dates are expressed as offsets from today,
// so the RELATIVE plan structure is identical on every run regardless of calendar
// date. generatePlan output contains no absolute dates (ranges are "Wks X–Y").
//
//   node tests/golden-master.js            compare against snapshot (capture if absent)
//   UPDATE=1 node tests/golden-master.js   regenerate the snapshot (intentional changes)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { applyInjuryRules } from '@performance-os/engine/lib/injury/injuryFilter.js';
import { applyTeamSchedule } from '@performance-os/engine/lib/plan/teamSchedule.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const SNAP_DIR = join(__dir, '__snapshots__');
const SNAP = join(SNAP_DIR, 'engine-golden-master.json');

// ── equipment presets ────────────────────────────────────────────────────────
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const DB = ['dumbbell', 'bodyweight'];
const BW = ['bodyweight'];

// Event date N days from now (kept inside season bands with ≥10-day margins so a
// run that straddles midnight can't flip a band — see periodization.deriveSeason).
const inDays = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
// answersToProfile only recognises known onboarding-answer fields, so an ad-hoc `discipline`
// (WP-49 Plan 2 T1's new build-discipline archetypes) is silently dropped by it — spread it back
// onto the profile afterwards, exactly as the app's own adapter call site would (the profile is
// the thing that ultimately carries `discipline` into generatePlan/profileToAthleteModel).
//
// M0 T2 (2026-07-14) extends the same trick to `athlete_model`: PlanGenerator.js reads D7's
// recoverability prior from `profile.athlete_model.learnedPriors.recoveryRate.value` and the
// position-modifier demand boost from `profile.athlete_model.sportingContext.position` — BOTH
// read the raw profile field directly, never through profileToAthleteModel's adapter (which does
// not forward learnedPriors/position at all — verified against packages/engine/src/lib/adapters/
// profileToAthleteModel.js). answersToProfilePatch has no `athlete_model` concept, so — same as
// `discipline` — it must be spread back on afterwards for these archetypes to actually arm anything.
const toProfile = (answers) => {
  const profile = answersToProfile(answers);
  const withDiscipline = answers.discipline ? { ...profile, discipline: answers.discipline } : profile;
  return answers.athlete_model ? { ...withDiscipline, athlete_model: answers.athlete_model } : withDiscipline;
};

// ── archetype matrix — decision-bearing branches, not exhaustive ───────────────
// Covers: 3 build styles × levels × frequency (incl. 1d/7d edges) × session length
// (incl. 20-min edge) × equipment (full/dumbbell/bodyweight); sport run
// sprint/middle/long + cycle + swim across off/in(taper)/pre/transition seasons;
// entered vs absent lifts; a female archetype.
// NOTE: session length is no longer a user input — the engine ignores any
// `sessionMinutes` here and sizes sessions by volume ÷ day count, capped at the
// internal 75-min ceiling. The minutes in the archetype keys are historical labels.
const MATRIX = {
  'build·strength·beginner·3d·45·full': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'beginner', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'build·strength·intermediate·4d·60·full': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: { squat: 140, bench: 100, deadlift: 180 } }),
  'build·strength·advanced·5d·75·full': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', daysPerWeek: 5, sessionMinutes: 75, days: ['mon', 'tue', 'wed', 'fri', 'sat'], equipment: FULL, sex: 'male', lifts: { squat: 180, bench: 130, deadlift: 230, ohp: 80 } }),
  'build·strength·intermediate·1d·60·full(edge)': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 1, sessionMinutes: 60, days: ['wed'], equipment: FULL, sex: 'male', lifts: {} }),
  'build·bodybuilding·intermediate·4d·60·full': A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'build·bodybuilding·advanced·6d·75·full': A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 6, sessionMinutes: 75, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], equipment: FULL, sex: 'female', lifts: {} }),
  'build·functional·intermediate·3d·45·dumbbell': A({ goalType: 'build', strengthStyle: 'functional', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], equipment: DB, sex: 'male', lifts: {} }),
  'build·functional·beginner·3d·20·bodyweight(edge)': A({ goalType: 'build', strengthStyle: 'functional', experienceLevel: 'beginner', daysPerWeek: 3, sessionMinutes: 20, days: ['mon', 'wed', 'fri'], equipment: BW, sex: 'male', lifts: {} }),
  'build·functional·advanced·7d·60·bodyweight(edge)': A({ goalType: 'build', strengthStyle: 'functional', experienceLevel: 'advanced', daysPerWeek: 7, sessionMinutes: 60, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], equipment: BW, sex: 'male', lifts: {} }),

  'sport·run-sprint·intermediate·off·4d': A({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·run-sprint·advanced·in·4d(taper)': A({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportIntent: 'compete', eventDate: inDays(30), experienceLevel: 'advanced', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: { squat: 170, deadlift: 210 } }),
  'sport·run-middle·intermediate·off·4d': A({ goalType: 'sport', sport: 'run', runDiscipline: 'middle', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·run-long·intermediate·off·4d': A({ goalType: 'sport', sport: 'run', runDiscipline: 'long', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·run-long·intermediate·pre·3d': A({ goalType: 'sport', sport: 'run', runDiscipline: 'long', sportIntent: 'compete', eventDate: inDays(90), experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·cycle·intermediate·off·3d': A({ goalType: 'sport', sport: 'cycle', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·cycle·intermediate·in·2d': A({ goalType: 'sport', sport: 'cycle', sportIntent: 'compete', eventDate: inDays(30), experienceLevel: 'intermediate', daysPerWeek: 2, sessionMinutes: 45, days: ['tue', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·cycle·intermediate·transition·3d': A({ goalType: 'sport', sport: 'cycle', sportIntent: 'compete', eventDate: inDays(-10), experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·swim·intermediate·off·3d': A({ goalType: 'sport', sport: 'swim', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {} }),
  'sport·swim·advanced·in·3d': A({ goalType: 'sport', sport: 'swim', sportIntent: 'compete', eventDate: inDays(30), experienceLevel: 'advanced', daysPerWeek: 3, sessionMinutes: 60, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'female', lifts: {} }),
  // Triathlon (SKB audit 08 T1): its own swim+bike+run gym-support module, no longer collapsed to
  // 'run'. NEW key, additive — pins the blended (pull + shoulder-prehab + single-leg/calf) plan so
  // it can't silently regress to a runner's leg-day.
  'sport·triathlon·intermediate·off·3d': A({ goalType: 'sport', skbSport: 'triathlon', sportIntent: 'recreational', sportGoal: 'build_base', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 60, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {}, sportDays: ['tue', 'sat'] }),
  // Team-sport cohort (WP-42b): the flip audit found ZERO team archetypes — the very
  // cohort WP-48 will flip had no snapshot protection. All three ride the legacy fill
  // today (gaa engine sport); their keys moving is the DELIBERATE signal of the flip.
  'sport·hurling·intermediate·off·3d': A({ goalType: 'sport', skbSport: 'hurling', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 60, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {}, sportDays: ['tue', 'sat'] }),
  'sport·gaelic_football·intermediate·in·3d': A({ goalType: 'sport', skbSport: 'gaelic_football', sportIntent: 'compete', sportSeason: 'in_season', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 60, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {}, sportDays: ['tue', 'sat'] }),
  'sport·field_hockey·advanced·off·4d': A({ goalType: 'sport', skbSport: 'field_hockey', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'advanced', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'female', lifts: {}, sportDays: ['wed', 'sat'] }),
  // Retire-legacy P3 (2026-07-09): soccer + rugby season-phased — soccer off-season rounds out
  // (upper), rugby stays balanced (no round-out). NEW keys pinning the team-sport season arc.
  'sport·soccer·intermediate·off·3d': A({ goalType: 'sport', skbSport: 'soccer', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 60, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {}, sportDays: ['tue', 'sat'] }),
  'sport·rugby·advanced·off·4d': A({ goalType: 'sport', skbSport: 'rugby', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'advanced', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {}, sportDays: ['wed', 'sat'] }),
  // P0-5 legacy-cohort rescue (audit B1): a CODE-LESS legacy GAA row — sport 'gaa' via the old
  // answer seed, NO skbSport → sport_code null, no stored athlete model. Resolves to the
  // gaelic_football generic prior and rides the category-led D11 path. NEW key, additive —
  // pins the rescue so this cohort can't silently regress to the neutral-bodybuilder fill.
  'sport·gaa-codeless·intermediate·off·3d(legacy)': A({ goalType: 'sport', sport: 'gaa', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 60, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {}, sportDays: ['tue', 'sat'] }),

  // Build-discipline cohort (WP-49 Plan 2 T1, additive): `discipline` feeds the athlete-model
  // diagnosis (disciplineDemandFor) but does NOT yet steer the plan (the D11 style==='sport'
  // gate that would apply the diagnosis opens in Task 3) — so these plans today are identical to
  // an equivalent-shape archetype without `discipline`. They exist here to pin that byte-identity
  // as the build flip proceeds task by task; NEW keys, additive to the matrix.
  'build·powerlifting·advanced·4d': { ...A({ goalType: 'build', experienceLevel: 'advanced', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: { squat: 180, bench: 130, deadlift: 230 } }), discipline: 'powerlifting' },
  'build·hypertrophy·intermediate·5d': { ...A({ goalType: 'build', experienceLevel: 'intermediate', daysPerWeek: 5, days: ['mon', 'tue', 'wed', 'fri', 'sat'], equipment: FULL, sex: 'male', lifts: {} }), discipline: 'hypertrophy' },
  'build·olympic·advanced·4d': { ...A({ goalType: 'build', experienceLevel: 'advanced', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: { squat: 150 } }), discipline: 'olympic' },

  // ── M0 T2 extension set (2026-07-14, docs/design/engine-v2/13-VALIDATION-STRATEGY.md §2.2) ──
  // Additive only — every archetype above is untouched. Fills the audit's "armed-production
  // paths" blind spot (TR-05/TR-11; audit 06): states real users reach that no archetype
  // exercised, because every existing profile happens to leave these seams unarmed.

  // Armed-D7 (audit 08 G13 / audit 06 TR-05): profile.athlete_model.learnedPriors.recoveryRate
  // is read DIRECTLY off the raw profile by PlanGenerator.js (never via profileToAthleteModel,
  // which does not forward learnedPriors) — the D7 progression/deload arm was previously only
  // ever exercised on the schema default (recoveryRate 1, band 'moderate', gate closed because
  // profile.athlete_model is normally absent → null → blockDeloadSteers() false). These two
  // pin the gate OPEN at both bands (verified empirically: unarmed !== armedLow !== armedHigh;
  // blockPlan.steered flips false→true) — low recoverability (<0.9, tighter deload cadence +
  // shorter blocks) and high (>1.1, longer). Reuses the rugby·advanced·off·4d shape (already
  // diagnosis-bearing) so only the prior differs.
  'sport·rugby·advanced·off·4d·armed-d7-low': { ...A({ goalType: 'sport', skbSport: 'rugby', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'advanced', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {}, sportDays: ['wed', 'sat'] }), athlete_model: { learnedPriors: { recoveryRate: { value: 0.75, source: 'learned', confidence: 'moderate' } } } },
  'sport·rugby·advanced·off·4d·armed-d7-high': { ...A({ goalType: 'sport', skbSport: 'rugby', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'advanced', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {}, sportDays: ['wed', 'sat'] }), athlete_model: { learnedPriors: { recoveryRate: { value: 1.2, source: 'learned', confidence: 'moderate' } } } },

  // TR-05 schema-default (M5-L1, audit 06): the state EVERY real onboarded user reaches —
  // createAthleteModel seeds learnedPriors.recoveryRate {value:1, source:'population'}. This
  // archetype carries that schema DEFAULT (source≠'learned'). It MUST be byte-identical to the
  // no-model 'sport·rugby·advanced·off·4d' row (population deload rhythm, steer OFF) — an
  // unlearned prior does NOT arm D7 (the source-gate at PlanGenerator.js:213). Before the fix
  // this armed the steer off zero learning (the TR-05 root defect); the regression guard is
  // packages/engine/tests/tr05-source-gate.test.mjs. NOTE: there is no un-suffixed rugby·advanced·
  // off·4d row in this matrix, so this pins the population plan directly for that shape.
  'sport·rugby·advanced·off·4d·schema-default-prior': { ...A({ goalType: 'sport', skbSport: 'rugby', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'advanced', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {}, sportDays: ['wed', 'sat'] }), athlete_model: { learnedPriors: { recoveryRate: { value: 1, source: 'population', confidence: 'low' }, volumeTolerance: { value: 1, source: 'population', confidence: 'low' } } } },

  // Measured-vs-prior pair (audit 07 SR-02 / audit 08 G1): the D1 measured-estimator seam.
  // ONE quality (maxStrength) can be "measured" — from profile.lifts via performanceMetrics —
  // every other quality is always prior-inferred (estimation.js). Identical profile in every
  // other respect; only `lifts` differs, isolating exactly this seam. bodyweight_kg is required
  // for both twins (the measured side needs it for the bodyweight-multiple scoring).
  'measured·strength·intermediate·4d·full·prior': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', bodyweight_kg: '82', lifts: {} }),
  'measured·strength·intermediate·4d·full·measured': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', bodyweight_kg: '82', lifts: { squat: 150, bench: 105, deadlift: 190, ohp: 75, pull: 10 } }),

  // Non-logging progressor (audit 07 SR-01 / audit 08 G9): pins the plan a non-logging
  // intermediate actually gets today — an athlete who enters no lifts and never logs a set.
  // The 12-week plan this profile resolves to CONTAINS weeks 5 and 6 (mid-phase, no deload/
  // taper edge), letting a later property test (M0 T3) diff them directly out of this one
  // snapshot. Verified empirically against the CURRENT (pre-M2) engine: week 5 and week 6's
  // items are byte-identical (flat load/reps within a phase) — this is the honest, un-fixed
  // SR-01 gap (13-VALIDATION-STRATEGY.md CA-3: the M2 exit gate, not this phase's job). Pinning
  // it here is what lets M2's fix show up later as a deliberate, reviewed delta.
  'progression·strength·intermediate·5d·full·nonlogging': A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 5, sessionMinutes: 60, days: ['mon', 'tue', 'wed', 'fri', 'sat'], equipment: FULL, sex: 'male', lifts: {} }),

  // Steered-path archetypes (audit 10 P1-4 "continuous rails") — position modifiers. NOTE: SKB
  // decisionRules (competition_within_h / matches_this_week / acwr / readiness / ...) are
  // evaluated ONLY by evaluateRules() from PlanService's REFLOW (packages/engine/src/lib/
  // sportKnowledge/rules.js), never from generatePlan() — golden-master.js calls generatePlan
  // directly and has no runtime context to trigger a decisionRule, so that half of this family
  // is out of this file's reach (a Task 3/reflow-property concern, not a golden-snapshot one;
  // documented rather than faked — Global Constraint 2). Position DOES flow through generatePlan
  // (profile.athlete_model.sportingContext.position -> demandProfile.js's primaryQualities
  // floor-boost), so these two pin genuinely different diagnoses than the equivalent no-position
  // archetypes already in the matrix (verified: rugby "Outside backs" -> aerobicCapacity vs the
  // no-position rugby row's maxStrength; soccer "Goalkeeper" -> explosiveStrength vs the
  // no-position soccer row's aerobicCapacity).
  'sport·rugby·advanced·off·4d·position-outside-backs': { ...A({ goalType: 'sport', skbSport: 'rugby', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'advanced', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {}, sportDays: ['wed', 'sat'] }), athlete_model: { sportingContext: { position: 'Outside backs (wings, fullback, centres)' } } },
  'sport·soccer·intermediate·off·3d·position-goalkeeper': { ...A({ goalType: 'sport', skbSport: 'soccer', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 60, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {}, sportDays: ['tue', 'sat'] }), athlete_model: { sportingContext: { position: 'Goalkeeper' } } },
};

// Legacy-rescue: zero-gap run/cycle (audit 04 B1 / audit 08 G6; rescued Wave A PR #173, proven
// by tests/legacy-cohort-rescue.js). Triathlon and code-less GAA are ALREADY pinned above
// (rows added pre-M0) — both already show meta.diagnosis present in the committed snapshot,
// confirming they land on D11, not the fill. "Zero-gap run/cycle" is the one rescued cohort
// with NO golden-snapshot pin yet: an athlete whose diagnosis finds no capability gap at all
// (prioritise.js returns [] — the literal audit-01 defect locus). generatePlan's documented
// opts.performanceModel override seam (the same one legacy-cohort-rescue.js uses) constructs
// it deterministically rather than relying on a naturally-maxed-out athlete. Keyed in
// OPTS_MATRIX (not MATRIX) because it needs a second generatePlan argument the plain archetypes
// don't; MATRIX carries the base answers so `toProfile` still runs the ordinary path.
const ZERO_GAP_PERFORMANCE_MODEL = { priorityAdaptations: [], limitingFactors: [] };
const OPTS_MATRIX = {
  'sport·run-middle·advanced·zero-gap': { performanceModel: ZERO_GAP_PERFORMANCE_MODEL },
  'sport·cycle·advanced·zero-gap': { performanceModel: ZERO_GAP_PERFORMANCE_MODEL },
};
MATRIX['sport·run-middle·advanced·zero-gap'] = A({ goalType: 'sport', sport: 'run', runDiscipline: 'middle', sportIntent: 'recreational', experienceLevel: 'advanced', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', bodyweight_kg: '80', lifts: { squat: 220, bench: 150, deadlift: 270, ohp: 100 } });
MATRIX['sport·cycle·advanced·zero-gap'] = A({ goalType: 'sport', sport: 'cycle', sportIntent: 'recreational', experienceLevel: 'advanced', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', bodyweight_kg: '80', lifts: { squat: 220, bench: 150, deadlift: 270, ohp: 100 } });

// Injured athletes across regions, INCLUDING the five bare rehab regions (audit 10 §5 /
// Simon ledger item 4: shin, quad, elbow, wrist, cervical have contraindication data —
// packages/engine/src/data/injury/profiles.js — but NO authored rehab exercises —
// packages/engine/src/data/rehabExercises.js). Do NOT author rehab content here (out of
// scope science) — pin whatever the CURRENT engine honestly does.
//
// CRITICAL scoping fact (verified against PlanGenerator.js:261-262's own comment and a grep for
// applyInjuryRules/applyPrevention call sites): generatePlan(profile) is INJURY-BLIND. Active-
// injury contraindication/rehab-session logic (packages/engine/src/lib/injury/injuryFilter.js)
// is applied only by the APP layer (PlanService.js's injuryFilteredPhases, reading a persisted
// injuries table), never inside generatePlan. So these archetypes pin generatePlan(baseAnswers)
// THEN apply the engine's own pure applyInjuryRules(week, [injury]) to one representative week —
// exactly the seam PlanService calls, exercised directly the way tests/legacy-cohort-rescue.js
// exercises other pure engine internals. knee/shoulder (authored rehab) sit alongside the five
// bare regions so the pin shows the full honesty spectrum: authored rehab session (knee,
// shoulder) · partial in-place substitution with no rehab to add (shin, quad, cervical — bare,
// below the full-replace threshold) · the explicit `unservable` safety-net banner (elbow, wrist —
// bare, above it). Severity 4 + phase 'protect' forces the most restrictive block set regardless
// of declared phase (injuryRules.js's severity>=4 rule) — the worst-case, most legible pin.
const INJURY_BASE_ANSWERS = A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: { squat: 140, bench: 100, deadlift: 180 } });
const INJURY_REGIONS = ['knee', 'shoulder', 'shin', 'quad', 'elbow', 'wrist', 'cervical'];
const INJURY_MATRIX = {};
for (const region of INJURY_REGIONS) {
  INJURY_MATRIX[`injured·${region}·intermediate·4d·full`] = { region, injury: { body_part_key: region, status: 'active', severity: 4, rehab_phase: 'protect', side: 'n/a' } };
}

// Phase 1 PR B — the flip (docs/superpowers/plans/2026-07-17-phase1-matchday-scheduling.md
// Task 8). PlanService.js now ALWAYS calls generatePlan(profile, { fixtureMicrocycle: true }),
// so this is the ONE archetype that legitimately moves on this PR's re-baseline: a team-fixture-
// bearing soccer athlete whose heavy/power/recovery gym work is placed relative to a real
// Saturday fixture instead of ignoring it. Built from a FIXED plan_start_date (2026-07-13, not
// today-anchored) + applyTeamSchedule (the same seam PlanService.activeProfile() runs) so MD
// placement is deterministic across runs — every other archetype in this file calls
// generatePlan(profile) directly with NO opts and carries no team_fixtures, so it stays on the
// flag-OFF-equivalent path (no team_fixtures/team_match_weekday ⇒ mdConstraints stays null ⇒
// byte-identical — additive-identity, proven by generator-fixture-microcycle.test.mjs) and must
// NOT move here.
//
// Kept in its own FIXTURE_MATRIX (not MATRIX) because the value is an already-built PROFILE
// (post-applyTeamSchedule), not an "answers" object toProfile()/answersToProfile() would recognise.
const FIXTURE_SOCCER = (() => {
  const base = {
    ...answersToProfile({
      ...BLANK_ANSWERS, goalType: 'sport', skbSport: 'soccer',
      sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'intermediate',
      daysPerWeek: 3, days: ['tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {},
    }),
    plan_start_date: '2026-07-13',
  };
  const schedule = {
    weeklyPattern: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({ day, type: i === 6 ? 'match' : 'gym' })),
    fixtures: [{ id: 'm', type: 'match', label: 'league', date: '2026-07-18' }],
  };
  return applyTeamSchedule(base, schedule, '2026-07-13');
})();
const FIXTURE_MATRIX = {
  'sport·soccer·fixture-md·intermediate·3d(flip)': FIXTURE_SOCCER,
};
OPTS_MATRIX['sport·soccer·fixture-md·intermediate·3d(flip)'] = { fixtureMicrocycle: true };

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Every archetype key the matrix knows, whichever of the four shapes it's stored in
// (plain MATRIX / MATRIX+OPTS_MATRIX / INJURY_MATRIX / FIXTURE_MATRIX). Keeps buildCurrent()
// and the in-process determinism check (below) walking exactly the same set.
const ALL_KEYS = [...Object.keys(MATRIX), ...Object.keys(INJURY_MATRIX), ...Object.keys(FIXTURE_MATRIX)];

// Generates one archetype's pinned value. Injury archetypes aren't a generatePlan()
// output at all — generatePlan is injury-blind (PlanGenerator.js's own comment: "runtime
// context (active injuries) is validated where it's known — the app layer"); the pin is
// one representative week AFTER the engine's own pure applyInjuryRules() — the same seam
// PlanService's injuryFilteredPhases calls — so the snapshot is the week an injured
// athlete would actually see, not the injury-blind baseline.
function generateArchetype(key) {
  if (key in INJURY_MATRIX) {
    const { injury } = INJURY_MATRIX[key];
    const basePlan = generatePlan(toProfile(INJURY_BASE_ANSWERS));
    const baseWeek = basePlan.phases[0].weeks[1];
    return applyInjuryRules(baseWeek, [injury]);
  }
  // FIXTURE_MATRIX values are already-built PROFILES (post-applyTeamSchedule), not "answers" —
  // toProfile()/answersToProfile() must NOT run on them a second time.
  if (key in FIXTURE_MATRIX) return generatePlan(FIXTURE_MATRIX[key], OPTS_MATRIX[key] || {});
  return generatePlan(toProfile(MATRIX[key]), OPTS_MATRIX[key] || {});
}

// Build the current snapshot (archetype → serialized plan), failing loudly if any
// archetype throws rather than silently dropping it.
function buildCurrent() {
  const out = {};
  let threw = 0;
  for (const key of ALL_KEYS) {
    try {
      out[key] = generateArchetype(key);
    } catch (e) {
      threw++;
      console.error('FAIL: archetype threw —', key, '—', e && e.message);
      process.exitCode = 1;
    }
  }
  if (threw) console.error(`(${threw} archetype(s) threw during generation)`);
  return out;
}

// First differing line between two pretty-printed JSON blobs (a readable diff hint).
function firstDiff(aStr, bStr) {
  const a = aStr.split('\n'), b = bStr.split('\n');
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      return `  L${i + 1}\n    snapshot: ${a[i] ?? '∅'}\n    current : ${b[i] ?? '∅'}`;
    }
  }
  return '  (length differs only)';
}

// Order-insensitive canonical serialization: recursively sort object keys so the snapshot is
// stable across engine refactors that only change key INSERTION order (which never affects plan
// behaviour). Genuine value changes still show as drift; harmless key reordering does not.
function stableStringify(value) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = sort(v[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(sort(value), null, 2);
}

const current = buildCurrent();

// In-process determinism: regenerating each archetype must be byte-identical. This
// is clock-independent (both calls within microseconds) and catches accidental
// nondeterminism a refactor might introduce (Set/Map iteration order, stray Date use)
// — independent of whether the committed snapshot is up to date.
for (const key of ALL_KEYS) {
  if (!(key in current)) continue;
  const again = JSON.stringify(generateArchetype(key));
  assert(again === JSON.stringify(current[key]), `deterministic: ${key}`);
}

const update = !!process.env.UPDATE;

if (!existsSync(SNAP) || update) {
  if (!existsSync(SNAP_DIR)) mkdirSync(SNAP_DIR, { recursive: true });
  writeFileSync(SNAP, stableStringify(current) + '\n');
  console.log(`${update ? 'UPDATED' : 'CAPTURED'} golden-master snapshot: ${Object.keys(current).length} archetypes → ${SNAP}`);
  console.log('golden-master done');
} else {
  const snapshot = JSON.parse(readFileSync(SNAP, 'utf8'));
  const snapKeys = Object.keys(snapshot), curKeys = Object.keys(current);
  assert(snapKeys.length === curKeys.length, `archetype count stable (snapshot ${snapKeys.length}, current ${curKeys.length})`);
  // Flag added/removed archetypes (a matrix change is intentional → run UPDATE=1).
  for (const k of curKeys) if (!(k in snapshot)) console.error('FAIL: new archetype not in snapshot (run UPDATE=1):', k);
  for (const k of snapKeys) if (!(k in current)) console.error('FAIL: snapshot archetype missing from matrix:', k);

  let drift = 0;
  for (const key of snapKeys) {
    if (!(key in current)) continue;
    const exp = stableStringify(snapshot[key]);
    const got = stableStringify(current[key]);
    if (exp === got) {
      console.log('PASS:', key);
    } else {
      drift++;
      console.error('FAIL: plan drifted —', key);
      console.error(firstDiff(exp, got));
      process.exitCode = 1;
    }
  }
  if (drift) console.error(`\n${drift} archetype(s) drifted. If intentional, regenerate: UPDATE=1 node tests/golden-master.js`);
  console.log('golden-master done');
}
