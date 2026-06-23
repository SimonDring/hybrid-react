/**
 * atlas/pillars — compute the user's athlete profile for their sport.
 *
 * Resolves the profile → its sport config → scores each of that sport's pillars
 * from the user's data, and works out the biggest gap to elite (the "focus") with
 * a plain-language reason drawn from the gym engine's emphasis. This is the bridge
 * that turns what the decision engine is doing into something visible.
 *
 *   computePillars(profile, { sessions, logs, dailyMetrics, load, currentWeek })
 *     -> { sport, label, family, estimated, pillars: [{ id, label, score, top5,
 *          elite, gap }], focus: { id, label, score, elite, why } }
 *
 * Pure — pass the data in. The Atlas screen reads it from the store; tests pass
 * fixtures.
 */

import { PILLARS } from '../../data/athletePillars.js';
import { sportConfigFor } from '../../data/sports/index.js';
import { muscleCapabilities } from './signals.js';
import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';
import { MUSCLE_LABELS } from '@performance-os/engine/data/muscleVolume.js';

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// The muscles the gym engine is emphasising most — names the "why" behind a gap.
function emphasisedMuscles(profile) {
  const prog = resolveProgram(profile);
  return Object.entries(prog.emphasis || {})
    .filter(([, v]) => v > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([m]) => (MUSCLE_LABELS[m] || m).toLowerCase());
}

export function computePillars(profile = {}, data = {}) {
  const { sessions = {}, logs = [], dailyMetrics = [], load = null, currentWeek = null } = data;
  const config = sportConfigFor(profile);
  const caps = muscleCapabilities(profile, sessions, currentWeek);
  const ctx = { profile, caps, sessions, currentWeek, load, dailyMetrics, logs };

  const pillars = config.pillars.map(id => {
    const def = PILLARS[id];
    const raw = def.score(ctx);
    const score = Math.round(clamp(raw == null ? def.fallback : raw));
    return { id, label: def.label, score, top5: def.benchmarks.top5, elite: def.benchmarks.elite, gap: def.benchmarks.elite - score };
  });

  // The focus = the pillar furthest from elite — where the engine spends its effort.
  const focusP = pillars.slice().sort((a, b) => b.gap - a.gap)[0];
  const muscles = emphasisedMuscles(profile);
  const why = focusP
    ? `${focusP.label} is your biggest gap to elite right now` +
      (muscles.length ? `, so your plan is leaning into ${muscles.join(' and ')}.` : '.')
    : null;

  return {
    sport: config.key,
    label: config.label,
    family: config.family,
    estimated: true,
    pillars,
    focus: focusP ? { id: focusP.id, label: focusP.label, score: focusP.score, elite: focusP.elite, why } : null
  };
}

export default { computePillars };
