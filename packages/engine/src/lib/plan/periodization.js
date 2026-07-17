// src/lib/plan/periodization.js
/**
 * periodization — science-backed block lengths, season derivation, and the
 * block-continuation branching logic that replaces the old hardcoded planLength()
 * + phaseSplit() in PlanGenerator.js.
 *
 * Evidence:
 *  Hypertrophy 5–6 wk mesocycle: Israetel / RP model (MEV→MAV→MRV ramp + deload)
 *  Strength 10–12 wk: Issurin block periodization (accumulation → transmutation)
 *  Functional 8 wk: Kraemer/Ratamess (neural + structural adaptation window)
 *  Sport off-season 10–12 wk: Bompa/Haff, Rønnestad 2015 (max-strength base)
 *  Sport pre-season 6 wk: Bosquet 2007 (volume taper window before competition)
 *  Sport in-season 4 wk rolling: maintenance dose (Ronnestad 2011, 2 ×/wk)
 *  Post-event transition 4 wk: deload + active recovery, Mujika 2010
 *
 *  Sport block templates + the run-discipline branching now live in the pluggable
 *  sport modules (src/data/sportGymSupport/); this file owns the BUILD profiles + season
 *  derivation and looks sports up via the registry. Adding a sport needs no edit here.
 */
import { gymSupportFor } from '../sportKnowledge/gymSupport.js';
import { seasonFromWindow } from './seasonWindow.js';
import { SPORT_BLOCKS, SEASON_PHASE_CUTOFF_DAYS } from '../../data/periodizationDefaults.js';
import { getDiscipline, resolveBuildDisciplineId } from '../../data/disciplines/index.js';

/**
 * Derive the current training season from the athlete's profile.
 * Uses event_date if present; falls back to sport_intent.
 *
 * The event window is measured from `asOf` (default: the profile's plan_start_date),
 * never the clock (Constitution Art 18) — the same plan must come out of the same
 * profile whatever day it's generated on. A profile with an event but no date anchor
 * falls through to the intent branch instead of guessing from the real calendar;
 * onboarding always sets plan_start_date, so that path is synthetic/dev only.
 *
 * @param {object} profile — needs: sport, event_date (opt), sport_intent (opt)
 * @param {string|null} asOf — ISO date the "days until event" is measured from
 * @returns {'off'|'pre'|'in'|'transition'|null}
 */
export function deriveSeason(profile = {}, asOf = profile.plan_start_date || null) {
  if (!profile.sport) return null;

  // Season-window mode (2026-07-09, P4): a season-based athlete states their first + last game;
  // the phase is where `today` falls in that competitive window. Takes precedence over a single
  // event_date (a team athlete has a season, not one race). Null when no window is set.
  const windowPhase = seasonFromWindow(profile, asOf);
  if (windowPhase) return windowPhase;

  if (profile.event_date && asOf) {
    const today = new Date(asOf + 'T00:00:00');
    today.setHours(0, 0, 0, 0);
    const event = new Date(profile.event_date + 'T00:00:00');
    if (isNaN(event.getTime()) || isNaN(today.getTime())) return null;

    const daysOut = Math.round((event - today) / 86400000);
    if (daysOut < 0)   return 'transition';                        // event has passed
    if (daysOut <= SEASON_PHASE_CUTOFF_DAYS.in)  return 'in';      // ≤8 weeks: race window (governed)
    if (daysOut <= SEASON_PHASE_CUTOFF_DAYS.pre) return 'pre';     // 8–17 weeks: pre-season (governed)
    return 'off';                                                  // >17 weeks: off-season
  }

  // No event date — use the explicit season (compete) or the training goal (recreational).
  const intent = profile.sport_intent;
  // A competitor without a stated season defaults to in-season maintenance: it's the
  // lower-volume, safer dose, and matches the pre-onboarding-rewrite contract.
  if (intent === 'compete') return profile.sport_season || 'in';     // 'in' | 'off'
  if (profile.sport_goal === 'stay_durable') return 'in';            // maintenance-style low volume
  return 'off';  // build_base | get_stronger | legacy | unset → off-season build
}

// ── PERIODIZATION PROFILES ──────────────────────────────────────────────────
// Each entry: { totalWeeks, split: [{intent, weeks}] }
// 'intent' maps to PHASE_META in PlanGenerator (base | build | peak).
// deload is inserted automatically by PlanGenerator every 4th week within a phase.

// BUILD profiles only. Sport block templates moved to src/data/sportGymSupport/_schema.js
// (SPORT_BLOCKS) and the run-discipline variants to src/data/sportGymSupport/running.js.
const PROFILES = {
  // RP hypertrophy mesocycle (Israetel): 4-week accumulation + 1 week peak + 1 deload
  hypertrophy: {
    totalWeeks: 6,
    split: [{ intent: 'base', weeks: 2 }, { intent: 'build', weeks: 3 }, { intent: 'peak', weeks: 1 }],
    deloads: [6]   // 5 weeks accumulation → 1 deload (RP mesocycle)
  },
  // Block periodization strength (Issurin): accumulation + transmutation + realisation
  strength: {
    totalWeeks: 12,
    split: [{ intent: 'base', weeks: 5 }, { intent: 'build', weeks: 5 }, { intent: 'peak', weeks: 2 }],
    deloads: [5, 10]   // end of accumulation + end of transmutation; peak realises
  },
  // Functional / desk-job balance: neural + structural adaptation + movement quality
  functional: {
    totalWeeks: 8,
    split: [{ intent: 'base', weeks: 3 }, { intent: 'build', weeks: 4 }, { intent: 'peak', weeks: 1 }],
    deloads: [4, 8]
  }
};

/**
 * Resolve the correct periodization profile for an athlete.
 *
 * @param {object} profile — goal_type, strength_style, sport, sport_intent, event_date
 * @returns {{ totalWeeks: number, split: Array<{intent, weeks}> }}
 */
export function resolvePeriodization(profile = {}) {
  const goalType = profile.goal_type || (profile.sport ? 'sport' : 'build');

  if (goalType === 'sport' && profile.sport) {
    const season = deriveSeason(profile) || 'off';
    // The per-season block templates come from the SKB gymSupport (each profile carries its own,
    // incl. the run-discipline variants — the SKB id already encodes the discipline). SPORT_BLOCKS
    // is the ultimate default for an unknown/unauthored sport (2026-07-09, legacy layer removed).
    const gs = gymSupportFor(profile);
    return (gs && gs.periodization && gs.periodization[season]) || SPORT_BLOCKS[season] || SPORT_BLOCKS.off;
  }

  // THE FLIP (WP-49 T4c): a build plan's periodisation comes from its DISCIPLINE module
  // (powerlifting/hypertrophy/olympic) — the legacy strength_style PROFILES are retired.
  // resolveBuildDisciplineId is the same goal→discipline mapping the plan + diagnosis use, so the
  // block length, phase split, and deloads agree with the rest of the plan. Build has no sport
  // season → the discipline's 'off' macrocycle (a build meet date would map to 'pre' — future).
  const discId = resolveBuildDisciplineId(profile);
  const disc = discId && getDiscipline(discId);
  if (disc && disc.periodization && disc.periodization.off) return disc.periodization.off;

  // Legacy fallback (unreachable post-flip — resolveBuildDisciplineId always resolves a discipline).
  const style = profile.strength_style;
  if (style === 'bodybuilding') return PROFILES.hypertrophy;
  if (style === 'strength')     return PROFILES.strength;
  return PROFILES.functional; // 'functional' or unset
}

/**
 * Decide what happens at the end of a completed block, based on a brief
 * check-in (max 4 questions from BlockCheckin.jsx).
 *
 * @param {object} profile — current profile (needs plan_start_date, plan_weeks, block_history)
 * @param {object} answers — { feel: 'easy'|'just_right'|'hard'|'too_hard',
 *                             changed: boolean, sameGoal: boolean, hitSessions: boolean }
 * @param {string} todayISO — the date the block check-in happened (YYYY-MM-DD).
 *   "Today" is genuine runtime input, so the (impure) caller supplies it — the
 *   engine never reads the clock (Constitution Art 18).
 * @returns {{ progress?, repeat?, recalibrate?, bridge?,
 *             profilePatch: object }}
 *
 * Exactly one of { progress, repeat, recalibrate, bridge } is true.
 * `profilePatch` is always present and ready to pass to updateProfile().
 */
export function continueBlock(profile = {}, answers = {}, todayISO) {
  if (!todayISO) throw new Error('continueBlock requires todayISO — the engine does not read the clock');
  const today = todayISO;

  // 1. Goal changed → send back to onboarding
  if (answers.sameGoal === false) {
    return { recalibrate: true, profilePatch: { onboarded: false } };
  }

  // 2. Life change (injury/illness/major event) → 2-week bridge recovery block
  if (answers.changed === true) {
    return {
      bridge: true,
      profilePatch: {
        plan_start_date: today,
        plan_weeks: 2,
        block_history: appendBlockHistory(profile, { outcome: 'bridge', answers }, today)
      }
    };
  }

  // 3. Struggling (felt too hard AND/OR missed most sessions) → repeat block
  const struggling = answers.feel === 'too_hard' || answers.hitSessions === false;
  if (struggling) {
    return {
      repeat: true,
      profilePatch: {
        plan_start_date: today,
        plan_weeks: profile.plan_weeks || 12,
        block_history: appendBlockHistory(profile, { outcome: 'repeat', answers }, today)
      }
    };
  }

  // 4. Normal progress → advance to next block (same goal profile, fresh start date)
  const { totalWeeks } = resolvePeriodization(profile);
  return {
    progress: true,
    profilePatch: {
      plan_start_date: today,
      plan_weeks: totalWeeks,
      block_history: appendBlockHistory(profile, { outcome: 'progress', answers }, today)
    }
  };
}

function appendBlockHistory(profile, entry, todayISO) {
  const history = Array.isArray(profile.block_history) ? profile.block_history : [];
  return [
    ...history,
    {
      completed_date: todayISO,
      plan_weeks: profile.plan_weeks || null,
      plan_start_date: profile.plan_start_date || null,
      ...entry
    }
  ];
}

export default { resolvePeriodization, deriveSeason, continueBlock };
