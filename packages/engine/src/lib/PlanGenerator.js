/**
 * PlanGenerator — turns a user's onboarding profile into a full GYM training plan,
 * in the exact shape the screens render (see src/data/Plan.js):
 *
 *   generatePlan(profile) → { phases: [ { id, title, range, weeks: [...] } ], totalWeeks }
 *
 * The app is strength/gym focused: every training day is a gym day. A supported
 * sport biases the gym programming via resolveProgram (style · per-muscle emphasis
 * · volume scalar · exercise priority) and via the periodisation profile — there
 * are NO separate endurance sessions (wearables track the actual sport). The old
 * run/swim/cycle/triathlon builders + supplemental-strength + interference
 * scheduling were removed in the gym-only cleanup.
 *
 * Architecture:
 *   1. resolvePeriodization(profile) sizes the block + its phase split + deloads.
 *   2. Each week, the strength engine (src/lib/plan/strength.js) builds the gym
 *      sessions from the resolved per-muscle volume target.
 *   3. The scheduler lays them onto the chosen weekdays.
 *
 * Pure function of the profile → the same answers always produce the same plan,
 * and session keys (p{phase}_wk{week}_s{idx}) stay stable so completion maps.
 */

import * as strength from './plan/strength.js';
import { scheduleWeek } from './plan/scheduler.js';
import { despineWeek } from './plan/despine.js';
import { resolveLifts } from './liftProgression.js';
import { resolveProgram } from './strength/program.js';
import { resolvePeriodization } from './plan/periodization.js';
import { getGymLevel } from './Utils.js';
import { deriveConstraints, suggestGymDays } from './plan/constraints.js';
import { SESSION_CEILING_MIN, diagnosisSteers } from './session/sessionBuilder.js';
import { deriveBlockObjective, blockDeloadSteers, deloadsFromRecoverability, blockPlanToSplit } from './plan/blockObjective.js';
import { performanceModelForProfile } from './performance/forProfile.js';
import { profileToAthleteModel } from './adapters/profileToAthleteModel.js';
import * as SKB from './sportKnowledge/index.js';
import { validateWeek, explainValidation } from './validation/contract.js';
import { categoryPlanFor } from './session/categoryCoverage.js';
import { provenance } from '../version.js';
import { deriveWeeklyObjective } from './microcycle/weeklyObjective.js';
import { mdMapForWeek, mdConstraintsFrom } from './microcycle/fixtureWeeks.js';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
// Sensible rest-spaced defaults when the user didn't pick specific days.
const DEFAULT_DAYS = {
  1: ['wed'], 2: ['mon', 'thu'], 3: ['mon', 'wed', 'fri'],
  4: ['mon', 'tue', 'thu', 'sat'], 5: ['mon', 'tue', 'wed', 'fri', 'sat'],
  6: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], 7: [...DAY_ORDER]
};

// Choose the weekday slots for `n` sessions, honouring the user's preferred days and
// keeping gym off the athlete's sport days when there's room (suggestGymDays). If the
// user explicitly picked gym days we respect them; otherwise we suggest around sport.
// Choose `k` weekday keys from `pool` (any order) spread as evenly as possible around
// the 7-day week — maximising the SMALLEST gap between chosen days (counting the
// week-boundary wrap) so gym work isn't bunched. Ties break toward earlier days for
// determinism. e.g. pool = free days [mon,wed,fri,sun], k=3 → [mon,wed,fri].
function evenSpread(pool, k) {
  const idx = [...new Set(pool.map(d => DAY_ORDER.indexOf(d)).filter(i => i >= 0))].sort((a, b) => a - b);
  if (k >= idx.length) return idx.map(i => DAY_ORDER[i]);
  const combos = (arr, kk) => kk === 0 ? [[]] : arr.flatMap((v, i) => combos(arr.slice(i + 1), kk - 1).map(c => [v, ...c]));
  let best = idx.slice(0, k), bestGap = -1;
  for (const combo of combos(idx, k)) {
    const sorted = [...combo].sort((a, b) => a - b);
    let minGap = Infinity;
    for (let i = 0; i < sorted.length; i++) {
      const gap = i === 0 ? sorted[0] + 7 - sorted[sorted.length - 1] : sorted[i] - sorted[i - 1];
      minGap = Math.min(minGap, gap);
    }
    if (minGap > bestGap) { bestGap = minGap; best = sorted; }
  }
  return best.map(i => DAY_ORDER[i]);
}

// Pick the weekday slots for `n` gym sessions. Honour the user's available days but
// route AROUND sport days (swim/track/pool) when the available set allows — only land
// on a sport day when there genuinely aren't enough free days, and even-spread the
// rest so the week doesn't bunch. Blank availability falls back to suggestGymDays.
function chooseDays(availability, n, sportDays = []) {
  let days = (availability?.days || []).filter(d => DAY_ORDER.includes(d));
  days = [...new Set(days)].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const sport = new Set(sportDays);

  if (days.length === 0) {
    // No explicit picks → suggest spread around sport (existing behaviour).
    days = sportDays.length ? suggestGymDays({ sportDays, gymDays: n }) : (DEFAULT_DAYS[n] || DAY_ORDER.slice(0, n));
  } else {
    // Explicit availability → prefer free (non-sport) days, evenly spread; only borrow
    // sport days when there aren't enough free ones (those clash sessions are lightened
    // downstream by the scheduler via lightenItems).
    const free = days.filter(d => !sport.has(d));
    const clash = days.filter(d => sport.has(d));
    days = free.length >= n
      ? evenSpread(free, n)
      : [...free, ...clash.slice(0, n - free.length)].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  }
  return days.map(d => DAY_NAMES[d]);
}

const PHASE_META = {
  base:  { title: 'Base', tagline: 'Build the foundation — volume, technique and work capacity.', tags: ['Base', 'Foundation'],
           summary: 'Lay the foundation — consistent volume, solid technique, no chasing intensity yet.' },
  build: { title: 'Build', tagline: 'Add intensity and goal-specific work.', tags: ['Build', 'Intensity'],
           summary: 'Progressively harder sessions appear. Hold form and let recovery keep pace.' },
  peak:  { title: 'Peak & Sharpen', tagline: 'Sharpen toward your goal, then taper.', tags: ['Peak', 'Taper'],
           summary: 'Goal-specific work peaks, then volume drops so you arrive fresh.' }
};

function themeFor(intent, deload, taper, isRaceWeek) {
  if (isRaceWeek) return 'Race week — taper hard, stay sharp, arrive fresh.';
  if (taper) return 'Taper — volume drops, a little sharpness stays. Bank the rest.';
  if (deload) return 'Deload — volume cut. Recover and absorb the work.';
  return intent === 'base' ? 'Build base volume and movement quality.'
    : intent === 'build' ? 'Progress the intensity. Keep form honest.'
    : 'Sharpen and taper toward your goal.';
}

function gatesFor(intent, totalSessions) {
  if (intent === 'base') return [
    { label: `Hit ${totalSessions} sessions most weeks`, required: true },
    { label: 'Movements feel smooth and pain-free', required: false }
  ];
  if (intent === 'build') return [{ label: 'Absorb the added intensity without lingering soreness', required: true }];
  return [{ label: 'Sharp and recovered through the taper', required: true }];
}

// Build the week's gym sessions from the resolved program. Deload and taper are
// passed SEPARATELY: both cut volume, but a taper keeps intensity high (peaking)
// whereas a deload drops it (recovery). Goal tuning comes from program.
function buildGymWeek(count, ctx, profile, program, diag) {
  return strength.buildWeek({
    intent: ctx.intent, deload: ctx.deload, taper: ctx.taper, winp: ctx.winp, weekNum: ctx.weekNum,
    // Phase 3 M2 — estimator-driven creep (powerlifting T2 + hypertrophy T3 + olympic T4, gated in the allocator):
    //  • creepWeeks: completed prior WORKING weeks in this block (forward-projected for a fresh
    //    plan; completion-gated when profile.completed_weeks is present) — computed in the loop.
    //  • loggedLiftKeys: the lift keys the athlete has LOGGED (lift_log) — their compounds keep the
    //    fast autoregulation path, never crept (07-PROGRESSION §2.1: measured displaces inferred).
    creepWeeks: ctx.creepWeeks || 0,
    loggedLiftKeys: new Set(Object.keys((profile && profile.lift_log) || {})),
    phaseWeeks: ctx.phaseWeeks, blockFrac: ctx.blockFrac, minutes: ctx.minutes,
    level: getGymLevel(profile), access: profile.access || [], sex: profile.sex,
    bodyweight: profile.bodyweight_kg, forceVelocityAware: !!ctx.forceVelocityAware,
    gymDays: count, lifts: resolveLifts(profile),
    style: program.style, emphasis: program.emphasis, volumeScalar: program.volumeScalar,
    power: program.power, sport: program.sport, exercisePriority: program.exercisePriority || [],
    priorityByIntent: program.priorityByIntent || new Map(),
    priorityQualities: diag.priorityQualities, season: program.season, skbIds: diag.skbIds,
    categoryPlan: diag.categoryPlan, discipline: program.discipline || null,
    // Season-phased SKB (2026-07-09): the current-phase programming block + derived round-out
    // targets (null for un-migrated sports → the allocator's round-out pass is a no-op).
    programming: program.programming || null, roundOut: program.roundOut || null,
    // WP-49 T4b-2: which classic lift(s) the olympic athlete competes in (snatch|cj|both) — drives
    // the day emphasis. Default 'both' until the onboarding field lands (Task 6). Ignored off-olympic.
    competedLift: profile.olympic_lift || 'both',
    // WP-49 T5: the athlete's secondary-goal add-ons (posture/prehab/mobility/conditioning), layered
    // onto the accessory tail. Functional AUTO-carries conditioning — its distinctive layer, re-added
    // post-flip (functional otherwise maps to plain hypertrophy).
    secondaryGoals: resolveSecondaryGoals(profile)
  });
}

// The active secondary goals for a profile: the athlete's explicit menu selections, plus the
// conditioning goal that DEFINES the functional style (so functional ≠ plain hypertrophy).
function resolveSecondaryGoals(profile) {
  const chosen = Array.isArray(profile.secondary_goals) ? profile.secondary_goals.slice() : [];
  if (profile.strength_style === 'functional' && !chosen.includes('conditioning')) chosen.push('conditioning');
  return chosen;
}

export function generatePlan(profile = {}, opts = {}) {
  const program = resolveProgram(profile);
  // The diagnosis (D4/D5) that steers SPORT selection (D11). Derived from the profile (the
  // dual-written stored model rides profile.athlete_model and the adapter reads its richer
  // fields — WP-38); opts.performanceModel remains a caller override seam. Empty for build →
  // legacy path. asOf comes from the profile's start date (never the clock) — deterministic.
  const asOf = profile.plan_start_date || null;
  const perf = opts.performanceModel || performanceModelForProfile(profile, asOf);
  const skbSportId = program.sport ? (profileToAthleteModel(profile, asOf)?.sportingContext?.primarySport || null) : null;
  const diag = {
    priorityQualities: (perf && perf.priorityAdaptations) || [],
    // Category-led sports (WP-20 — swim): the SKB library's per-session coverage plan.
    categoryPlan: null,
    // Map(id → transferToSportRating): the library's authored transfer judgement per
    // movement (Sprint 9 19a) — membership grants §34 tier-4 standing, the rating values it.
    skbIds: skbSportId ? new Map((SKB.section(skbSportId, 'exerciseLibrary')?.exercises || []).map((e) => [e.id, e.transferToSportRating])) : new Map(),
  };
  const { busyDays, sportMuscles } = deriveConstraints(profile);
  const availability = profile.availability || {};
  const totalDays = Math.max(1, Math.min(7, availability.days_per_week || 3));
  diag.categoryPlan = categoryPlanFor(skbSportId, totalDays, { levelName: getGymLevel(profile), season: program.season });
  const minutes = SESSION_CEILING_MIN;   // session length is volume-driven; this is only the ceiling
  const totalSessions = totalDays;

  const { totalWeeks: total, split: templateSplit, deloads } = resolvePeriodization(profile);

  // Race taper: a dated event that lands within this block cuts volume in the final
  // 1–2 weeks (keeping some sharpness) so the athlete arrives fresh. An event months
  // out shapes the season/length via deriveSeason — not a taper now.
  // The taper window is anchored to plan_start_date, never the clock (Constitution
  // Art 18): a profile without a start date has no anchor, so it gets no race taper
  // rather than a plan that changes across midnight. Onboarding always sets one.
  const start = profile.plan_start_date ? new Date(profile.plan_start_date + 'T00:00:00') : null;
  const eventDate = profile.event_date ? new Date(profile.event_date + 'T00:00:00') : null;
  const planEnd = start ? new Date(start.getTime() + total * 7 * 86400000) : null;
  const isRace = !!(start && eventDate && !isNaN(eventDate.getTime()) && eventDate > start && eventDate <= new Date(planEnd.getTime() + 7 * 86400000));
  const taperWeeks = isRace ? (total >= 12 ? 2 : 1) : 0;
  const lastBuildWeek = total - taperWeeks;

  // WP-47 (D7 steer, gated): a diagnosed SPORT cohort WITH a recoverability prior gets its
  // block STRUCTURE (the phase split) AND deload RHYTHM from the diagnosis — the A9 step
  // (block shape from the diagnosis × recoverability, not the style enum). Gated + reversible;
  // no-prior profiles keep the template (BYTE-IDENTICAL). One blockPlan feeds both the steer
  // and meta.diagnosis. blockPlanToSplit returns null if it can't fit → template fallback.
  //
  // TR-05 (audit 06, M5-L1 hard rule): a schema-DEFAULT prior must NEVER arm the steer. Only a
  // GENUINELY-LEARNED prior (source==='learned', stamped by learning/promoteFromOutcomes on
  // promotion) arms — a population/staged default resolves to null → population deload rhythm,
  // byte-identical. createAthleteModel seeds recoveryRate {value:1, source:'population'} on every
  // real onboarded user; gating on value alone armed that population default off ZERO learning
  // (the exact TR-05 root defect this seam exists to prevent). The source check closes it.
  const lpRecovery = profile.athlete_model && profile.athlete_model.learnedPriors && profile.athlete_model.learnedPriors.recoveryRate;
  const steerRecoveryRate = (lpRecovery && lpRecovery.source === 'learned' && lpRecovery.value != null) ? lpRecovery.value : null;
  const blockPlan = deriveBlockObjective({
    priorityQualities: diag.priorityQualities,
    limitingFactors: perf.limitingFactors || [],
    season: program.season,
    eventCalendar: { isRace, taperWeeks },
    recoveryRate: steerRecoveryRate,
  });
  const d7Steers = blockDeloadSteers({ sport: program.sport, priorityQualities: diag.priorityQualities, recoveryRate: steerRecoveryRate });
  const split = (d7Steers && blockPlanToSplit(blockPlan.blocks, total)) || templateSplit;
  const deloadWeeks = d7Steers ? deloadsFromRecoverability(total, steerRecoveryRate) : (deloads || []);
  const deloadSet = new Set(deloadWeeks);

  // Phase 3 M2 T2 — estimator-driven creep completion source. A crept week advances only
  // over prior working weeks that were COMPLETED (07-PROGRESSION §2.1). A fresh plan has no
  // history → the conservative default is FORWARD PROJECTION (all prior working weeks in the
  // block assumed complete), which is what makes a planned-but-not-yet-trained athlete's
  // week 6 ≠ week 5. When profile.completed_weeks (an array of completed week numbers) is
  // present, creep is gated strictly to it. Pure + deterministic — reads profile, not the clock.
  const completedWeeks = Array.isArray(profile.completed_weeks) ? new Set(profile.completed_weeks) : null;

  const phases = [];
  let weekNum = 0;
  split.forEach((seg, pi) => {
    const meta = PHASE_META[seg.intent];
    const startWk = weekNum + 1;
    const weeks = [];
    let creepWeeks = 0;   // completed prior WORKING weeks in THIS block (resets each phase — block-scoped, 🔒 1)

    for (let winp = 1; winp <= seg.weeks; winp++) {
      weekNum++;
      const deload = deloadSet.has(weekNum);                 // periodisation-defined (periodization.js PROFILES)
      const taper = isRace && weekNum > lastBuildWeek;
      // Block-continuous volume ramp position (0→1 across the whole plan). Deload
      // weeks still drop to MEV in targets.js; this just stops the per-phase reset.
      const blockFrac = total > 1 ? (weekNum - 1) / (total - 1) : 0.5;
      const ctx = { intent: seg.intent, deload, taper, winp, weekNum, minutes, phaseWeeks: seg.weeks, blockFrac, creepWeeks, forceVelocityAware: !!opts.forceVelocityAware };

      const sportSpecs = buildGymWeek(totalDays, ctx, profile, program, diag);
      const dayNames = chooseDays(availability, sportSpecs.length, profile.sport_days || []);
      // Phase 1 — fixture-aware microcycle (flag-gated, default OFF). Baseline-owned: fixtures
      // are deterministic from plan_start_date (Art 18). No flag / no fixtures / no sport → null
      // mdConstraints → scheduleWeek runs exactly as today (additive-identity).
      let mdConstraints = null;
      if (opts.fixtureMicrocycle && skbSportId && (profile.team_fixtures || profile.team_match_weekday != null)) {
        const { matchesThisWeek, mdOffsetByWeekday } = mdMapForWeek({
          fixtures: profile.team_fixtures || [], matchWeekday: profile.team_match_weekday ?? null,
          planStartDate: profile.plan_start_date || null, weekNum,
        });
        const wobj = deriveWeeklyObjective({
          blockObjective: null, microcycles: SKB.section(skbSportId, 'microcycles'), matchesThisWeek,
        });
        if (wobj.value.fixtureAware) mdConstraints = mdConstraintsFrom(wobj.value.spacingConstraints, mdOffsetByWeekday);
      }
      let sessions = scheduleWeek({ sportSpecs, dayNames, busyDays, sportMuscles, mdConstraints });
      sessions = despineWeek(sessions, { priorityByIntent: program.priorityByIntent || new Map(), lifts: resolveLifts(profile), level: getGymLevel(profile), bodyweight: profile.bodyweight_kg });

      weeks.push({ num: weekNum, deload, taper, theme: themeFor(seg.intent, deload, taper, isRace && weekNum === total), sessions, provisional: pi > 0 });

      // Advance the block's creep counter for the NEXT week: a working (non-deload/-taper)
      // week counts once it is completed. Fresh plan (no completed_weeks) → forward
      // projection (every prior working week counts); with history → only completed weeks.
      if (!deload && !taper && (!completedWeeks || completedWeeks.has(weekNum))) creepWeeks++;
    }

    phases.push({
      id: pi + 1,
      title: meta.title,
      tagline: meta.tagline,
      range: `Wks ${startWk}–${weekNum}`,
      weekStart: startWk,
      weekEnd: weekNum,
      status: pi === 0 ? 'current' : 'provisional',
      tags: meta.tags,
      summary: meta.summary,
      gates: gatesFor(seg.intent, totalSessions),
      weeks
    });
  });

  // D14 (Art 19): the independent validation floor, surfaced on the plan. The
  // constructor already enforces these rules in-loop; this is the PROOF the built
  // plan complies — and the report any other construction path must produce.
  // Profile-known context only (equipment); runtime context (active injuries)
  // is validated where it's known (the app layer / tests).
  // planPhases lets the M4b plan-scoped OBSERVERS (progression-sanity, deload-presence)
  // run over the whole plan from inside the per-week validateWeek — they emit once, on
  // the plan's terminal week (observers.js#isPlanTerminalWeek). Report-only ('note'):
  // they never move a plan, so meta.validation stays byte-identical (goldens prove it).
  const vctx = { access: profile.access || [], planPhases: phases };
  let allPass = true, checked = 0;
  const problemWeeks = [];
  for (const phase of phases) {
    for (const week of phase.weeks) {
      checked++;
      const r = validateWeek(week, vctx);
      if (!r.pass) {
        allPass = false;
        // TR-02 / M4a T4: additive fields only (`resolutions` + `explain`) —
        // `week`/`counts`/`findings` are unchanged so any archetype that was
        // already clean (weeks: []) stays byte-identical; only a week that
        // WAS ALREADY reported as a problem gains the render-ready surface
        // (08-EXPLAINABILITY §5; 13-VALIDATION-STRATEGY §8.3 — the report is
        // a consumable surface, not just a pass/fail flag).
        problemWeeks.push({
          week: week.num, counts: r.counts,
          findings: r.findings.filter((f) => f.verdict !== 'pass'),
          resolutions: r.resolutions,
          explain: explainValidation(r),
        });
      }
    }
  }

  // WP-30a: the D4→D5 chain summary every screen (and the future `explain` read-model)
  // can cite — emitted reasons only, never re-derived. WP-42a display honesty: emitted
  // ONLY when the diagnosis actually STEERED this plan (the shared diagnosisSteers gate).
  // Build + team-sport cohorts now HAVE a diagnosis (goal demand / SKB), but their weeks
  // are legacy fill until WP-48/WP-49 flip them — a plan must never display reasoning it
  // ignored. The model output stays available via performanceModelForProfile (Atlas).
  const steers = diagnosisSteers({ style: program.style, sport: program.sport, priorityQualities: diag.priorityQualities, categoryPlan: diag.categoryPlan, discipline: program.discipline || null });
  const diagnosis = (steers && (diag.priorityQualities || []).length) ? {
    sport: program.sport || null,
    limitingFactors: (perf.limitingFactors || []).map((f) => ({ qualityId: f.qualityId, magnitude: f.magnitude, confidence: f.confidence, rationale: f.rationale })),
    priorityQualities: diag.priorityQualities.map((p) => ({ qualityId: p.qualityId, order: p.order, rationale: p.rationale })),
    // D7 (WP-47) — the block plan (same object that steered the split/deloads above when
    // gated; ADVISORY otherwise). `steered` flags whether it actually drove this plan's
    // structure or is inspection-only. One computation, reused here.
    blockPlan: { ...blockPlan, steered: d7Steers },
    // M3 T2 (P1-9, Art 15 — no silent truncation): the honesty ledger, already computed
    // on the Performance Model (derivePerformanceModel.js), now reaches the PLAN OUTPUT
    // too — authored SKB demand the projection couldn't home is declared here, with a
    // reason, instead of silently vanishing between the model and the plan a screen reads.
    // Report-only: this list is never consulted by construction (Art 18 purity intact).
    droppedDemands: (perf.droppedDemands || []).map((d) => ({ skbQuality: d.skbQuality, importance: d.importance, reason: d.reason })),
  } : null;
  return { phases, totalWeeks: total, meta: { validation: { pass: allPass, checked, weeks: problemWeeks }, provenance: provenance(), ...(diagnosis ? { diagnosis } : {}) } };
}

export default { generatePlan };
