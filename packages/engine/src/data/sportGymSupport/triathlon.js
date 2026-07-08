// src/data/sportGymSupport/triathlon.js
/**
 * Triathlon — gym strength support. WHY THIS FILE EXISTS (audit 2026-07-08,
 * docs/engine/08-SKB-CONSUMPTION-AND-SEASON-AUDIT.md):
 *
 * Before this module, a triathlete had NO gym-support entry, so onboarding bound
 * `triathlon → engineSport 'run'` and the athlete was programmed as a MIDDLE-DISTANCE
 * RUNNER — chest 0.55, shoulders 0.80, a lower-body-only priority list, and (via the
 * allocator's `demotePress` for run/cycle) pressing demoted out entirely. The result
 * was a spine-heavy, upper-body-blind plan (trap-bar deadlift most days, no pull, no
 * press) that ignored the SWIM — a third of the sport and its only upper-body driver.
 *
 * Triathlon is swim + bike + run. The gym plan must serve all three:
 *   • SWIM  → upper-back + shoulder + scapular/rotator-cuff work (propulsion + shoulder
 *             health). Swimming is PULL- and internal-rotation-dominant, so the priority
 *             is PULLING + external-rotation/scapular prehab, NOT heavy bench/OHP
 *             (the SKB triathlon `gymPhilosophy.limitedValue` de-prioritises those to
 *             avoid worsening swimmer's-shoulder). A little horizontal push is kept for
 *             antagonist balance.
 *   • BIKE  → quad + glute strength (economy; Rønnestad & Sunde 2010).
 *   • RUN   → single-leg strength + calf/Achilles capacity + eccentric hamstring; the
 *             run is the binding tissue ceiling (impact, on pre-fatigued legs).
 *
 * The emphasis below is a demand-weighted BLEND of the swim / bike / run modules, with
 * the swim's upper-body signal FLOORED (not averaged away) because it is the athlete's
 * sole upper-body / shoulder-health stimulus. The priorityExercises LEAD with pulls +
 * cuff/scapular prehab + single-leg/calf durability — deliberately NOT a bilateral
 * barbell hinge — so the plan stops looking like a runner's leg day.
 *
 * Evidence: Millet 2009 (tri physiology); Beattie 2017 (strength → endurance economy);
 * swimmer's-shoulder ER:IR — Batalha 2012/2015, Bak 2010; Warden 2014 (tri bone stress).
 */
import { DEFAULT_SEASON_VOLUME, SPORT_BLOCKS } from './_schema.js';

/** @type {import('./_schema.js').SportModule} */
export const triathlon = {
  id: 'triathlon',
  label: 'Triathlon',
  power: true,            // dosed low-amplitude plyos for run economy/stiffness
  systemicFactor: 0.85,   // three concurrent endurance disciplines → largest gym pullback
  seasonModifiers: DEFAULT_SEASON_VOLUME,
  periodization: SPORT_BLOCKS,

  // Demand-weighted blend of swim (back/shoulders/cuff), bike (quads/glutes) and run
  // (posterior chain / calf / single-leg). back > chest reflects pull-dominance; chest
  // is kept at a real 0.80 (antagonist balance + some push) rather than the runner's
  // 0.55; calves elevated for the run tissue ceiling; core high for the aero position.
  emphasis: {
    back: 1.10, shoulders: 1.05, chest: 0.80, biceps: 0.85, triceps: 0.85,
    quads: 1.15, hamstrings: 1.15, glutes: 1.15, calves: 1.15, core: 1.20
  },

  // Ordered ×1.35 priority. LEADS with swim pulls + shoulder-health prehab, then run
  // single-leg/calf/eccentric-hamstring durability, then a spine-friendly hinge/quad,
  // core, and ONE moderate press for balance. No bilateral barbell deadlift/squat is
  // boosted here (the allocator may still add a single squat/hinge anchor — that's fine;
  // what we prevent is the priority list STACKING the spine three days a week).
  priorityExercises: [
    'pullup', 'chest_supported_row', 'face_pull', 'sl_ext_rotation', 'straight_arm_pd',
    'sl_calf', 'copenhagen', 'sl_hinge', 'split_squat', 'nordic_curl',
    'hip_thrust', 'sl_leg_press', 'pallof', 'dead_bug', 'db_bench'
  ],

  // Descriptive (for future injury/conditioning modules; not yet consumed).
  movementDemands: ['overhead swim pull', 'sustained aero-position trunk endurance', 'repetitive run impact'],
  injuryPatterns: ['achilles', 'calf', 'knee', 'shoulder', 'low_back'],
  keyMuscles: ['lats', 'posterior shoulder', 'calves', 'glutes', 'hamstrings', 'quads'],
  performanceDeterminants: ['run durability (calf/Achilles)', 'swim-shoulder health (ER:IR)', 'leg strength economy', 'core/aero endurance']
};

export default triathlon;
