/**
 * athletePillars — the catalogue of "pillars of athleticism" a sport can draw on.
 *
 * Each pillar knows how to score itself from the user's data (via the signal
 * providers in ../lib/atlas/signals.js) and carries an ESTIMATED top-5% / elite
 * benchmark. Sports (see ./sports) pick which pillars they care about — so adding
 * a sport is just choosing from this list, not writing new scoring code.
 *
 * benchmarks are sport-science estimates, clearly surfaced as "estimated" in the
 * UI. Only `strength` is anchored to real published standards today.
 *
 *   score(ctx) -> 0..100 | null     ctx = { profile, caps, sessions, currentWeek,
 *                                            load, dailyMetrics, logs }
 *   fallback                        used when score() returns null (no data yet)
 */

import * as S from '../lib/atlas/signals.js';

export const PILLARS = {
  strength: {
    id: 'strength', label: 'Strength', fallback: 30, benchmarks: { top5: 80, elite: 92 },
    score: (ctx) => S.strength(ctx.profile)
  },
  aerobic: {
    id: 'aerobic', label: 'Aerobic engine', fallback: 40, benchmarks: { top5: 78, elite: 90 },
    score: (ctx) => S.aerobicEngine(ctx.load)
  },
  anaerobic: {
    id: 'anaerobic', label: 'Anaerobic power', fallback: 40, benchmarks: { top5: 80, elite: 92 },
    score: (ctx) => S.aerobicEngine(ctx.load)
  },
  recovery: {
    id: 'recovery', label: 'Recovery', fallback: 60, benchmarks: { top5: 82, elite: 90 },
    score: (ctx) => S.recovery(ctx.dailyMetrics, ctx.logs)
  },
  consistency: {
    id: 'consistency', label: 'Consistency', fallback: 40, benchmarks: { top5: 85, elite: 95 },
    score: (ctx) => S.consistency(ctx.profile, ctx.sessions, ctx.currentWeek)
  },
  core: {
    id: 'core', label: 'Core stability', fallback: 50, benchmarks: { top5: 80, elite: 92 },
    score: (ctx) => ctx.caps.cap('core')
  },
  explosive: {
    id: 'explosive', label: 'Explosive power', fallback: 45, benchmarks: { top5: 80, elite: 92 },
    score: (ctx) => S.explosivePower(ctx.profile, ctx.caps)
  },
  lower_power: {
    id: 'lower_power', label: 'Lower-body power', fallback: 50, benchmarks: { top5: 80, elite: 92 },
    score: (ctx) => S.muscleBalance(ctx.caps, ['quads', 'glutes', 'hamstrings'])
  },
  leg_power: {
    id: 'leg_power', label: 'Leg power', fallback: 50, benchmarks: { top5: 82, elite: 93 },
    score: (ctx) => S.muscleBalance(ctx.caps, ['quads', 'glutes'])
  },
  speed_strength: {
    id: 'speed_strength', label: 'Speed-strength', fallback: 50, benchmarks: { top5: 82, elite: 93 },
    score: (ctx) => S.muscleBalance(ctx.caps, ['glutes', 'hamstrings'])
  },
  durability: {
    id: 'durability', label: 'Durability', fallback: 50, benchmarks: { top5: 78, elite: 90 },
    score: (ctx) => S.muscleBalance(ctx.caps, ['hamstrings', 'calves', 'glutes'])
  },
  hip_stability: {
    id: 'hip_stability', label: 'Hip stability', fallback: 50, benchmarks: { top5: 78, elite: 88 },
    score: (ctx) => S.muscleBalance(ctx.caps, ['glutes', 'hamstrings'])
  },
  upper_pull: {
    id: 'upper_pull', label: 'Upper-body pull', fallback: 45, benchmarks: { top5: 80, elite: 92 },
    score: (ctx) => S.muscleBalance(ctx.caps, ['back', 'biceps'])
  },
  shoulder_health: {
    id: 'shoulder_health', label: 'Shoulder health', fallback: 55, benchmarks: { top5: 80, elite: 90 },
    score: (ctx) => ctx.caps.cap('shoulders')
  },
  upper_body: {
    id: 'upper_body', label: 'Upper body', fallback: 50, benchmarks: { top5: 80, elite: 92 },
    score: (ctx) => S.muscleBalance(ctx.caps, ['chest', 'back', 'shoulders'])
  },
  lower_body: {
    id: 'lower_body', label: 'Lower body', fallback: 50, benchmarks: { top5: 80, elite: 92 },
    score: (ctx) => S.muscleBalance(ctx.caps, ['quads', 'glutes', 'hamstrings'])
  }
};

export default PILLARS;
