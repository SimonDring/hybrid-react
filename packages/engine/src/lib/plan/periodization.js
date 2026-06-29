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
 *  sport modules (src/lib/sports/); this file owns the BUILD profiles + season
 *  derivation and looks sports up via the registry. Adding a sport needs no edit here.
 */
import skb, { normalizeSportId } from '../sportKnowledge/index.js';
import { SPORT_BLOCKS } from '../sportKnowledge/blocks.js';

/**
 * Derive the current training season from the athlete's profile.
 * Uses event_date if present; falls back to sport_intent.
 *
 * @param {object} profile — needs: sport, event_date (opt), sport_intent (opt)
 * @returns {'off'|'pre'|'in'|'transition'|null}
 */
export function deriveSeason(profile = {}) {
  if (!profile.sport) return null;

  if (profile.event_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const event = new Date(profile.event_date + 'T00:00:00');
    if (isNaN(event.getTime())) return null;

    const daysOut = Math.round((event - today) / 86400000);
    if (daysOut < 0)   return 'transition';   // event has passed
    if (daysOut <= 56) return 'in';            // ≤8 weeks: race window
    if (daysOut <= 120) return 'pre';          // 8–17 weeks: pre-season
    return 'off';                              // >17 weeks: off-season
  }

  // No event date — use declared intent
  const intent = profile.sport_intent;
  if (intent === 'compete') return 'in';
  return 'off'; // 'recreational' | 'build_base' | anything else → off-season
}

// ── PERIODIZATION PROFILES ──────────────────────────────────────────────────
// Each entry: { totalWeeks, split: [{intent, weeks}] }
// 'intent' maps to PHASE_META in PlanGenerator (base | build | peak).
// deload is inserted automatically by PlanGenerator every 4th week within a phase.

// BUILD profiles only. Sport block templates moved to src/lib/sports/_schema.js
// (SPORT_BLOCKS) and the run-discipline variants to src/lib/sports/running.js.
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
    const gp = (skb.get(normalizeSportId(profile.sport)) || {}).gymProgramming || null;
    const season = deriveSeason(profile) || 'off';
    const disc = profile.run_discipline || null;
    const byD = disc && gp && gp.byDiscipline ? gp.byDiscipline[disc] : null;
    return (byD && byD.periodization && byD.periodization[season])
      || (gp && gp.periodization && gp.periodization[season])
      || SPORT_BLOCKS[season] || SPORT_BLOCKS.off;
  }

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
 * @returns {{ progress?, repeat?, recalibrate?, bridge?,
 *             profilePatch: object }}
 *
 * Exactly one of { progress, repeat, recalibrate, bridge } is true.
 * `profilePatch` is always present and ready to pass to updateProfile().
 */
export function continueBlock(profile = {}, answers = {}) {
  const today = new Date().toISOString().slice(0, 10);

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
        block_history: appendBlockHistory(profile, { outcome: 'bridge', answers })
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
        block_history: appendBlockHistory(profile, { outcome: 'repeat', answers })
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
      block_history: appendBlockHistory(profile, { outcome: 'progress', answers })
    }
  };
}

function appendBlockHistory(profile, entry) {
  const history = Array.isArray(profile.block_history) ? profile.block_history : [];
  return [
    ...history,
    {
      completed_date: new Date().toISOString().slice(0, 10),
      plan_weeks: profile.plan_weeks || null,
      plan_start_date: profile.plan_start_date || null,
      ...entry
    }
  ];
}

export default { resolvePeriodization, deriveSeason, continueBlock };
