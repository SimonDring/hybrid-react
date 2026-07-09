// seasonWindow — derive the training phase from a season-based athlete's competitive WINDOW
// (first game → last game), for team/season sports (2026-07-09, retire-legacy P4). An individual
// gives their first + last game; a coach (future TEAM package) supplies the fixture schedule and the
// SAME logic runs per player. Phase boundaries (pre-season ramp, post-season transition) come from
// the sport's SKB meta, defaulting where unstated. Pure + deterministic (measured from `asOf`, never
// the clock — Constitution Art 18).
import * as SKB from '../sportKnowledge/index.js';
import { skbSportIdOf } from '../sportKnowledge/index.js';

export const DEFAULT_PRE_WEEKS = 6;
export const DEFAULT_TRANSITION_WEEKS = 3;

/** Pre-season ramp + post-season transition lengths (weeks) for a profile, from the SKB or defaults. */
export function phaseBoundaryWeeks(profile = {}) {
  const meta = (SKB.get(skbSportIdOf(profile)) || {}).meta || {};
  const pre = Number.isFinite(meta.preSeasonWeeks) ? meta.preSeasonWeeks : DEFAULT_PRE_WEEKS;
  const transition = Number.isFinite(meta.transitionWeeks) ? meta.transitionWeeks : DEFAULT_TRANSITION_WEEKS;
  return { preWeeks: pre, transitionWeeks: transition };
}

/**
 * The phase from the season window, or null when the profile has no window (first + last game).
 * @returns {'off'|'pre'|'in'|'transition'|null}
 */
export function seasonFromWindow(profile = {}, asOf = profile.plan_start_date || null) {
  if (!profile.first_game_date || !profile.last_game_date || !asOf) return null;
  const today = new Date(asOf + 'T00:00:00');
  const first = new Date(profile.first_game_date + 'T00:00:00');
  const last = new Date(profile.last_game_date + 'T00:00:00');
  if ([today, first, last].some((d) => isNaN(d.getTime())) || first > last) return null;
  const { preWeeks, transitionWeeks } = phaseBoundaryWeeks(profile);
  const preStart = new Date(first); preStart.setDate(preStart.getDate() - preWeeks * 7);
  const transEnd = new Date(last); transEnd.setDate(transEnd.getDate() + transitionWeeks * 7);
  if (today >= first && today <= last) return 'in';         // between first and last game
  if (today >= preStart && today < first) return 'pre';     // ramp before the first game
  if (today > last && today <= transEnd) return 'transition'; // short window after the last game
  return 'off';                                             // the long build period
}

export default { seasonFromWindow, phaseBoundaryWeeks, DEFAULT_PRE_WEEKS, DEFAULT_TRANSITION_WEEKS };
