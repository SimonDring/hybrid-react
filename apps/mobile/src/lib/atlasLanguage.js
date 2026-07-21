/**
 * atlasLanguage — plain-English rendering of the engine's D4 limiting factor.
 * The engine's diagnosis is unchanged and un-softened (Art 14: the numbers stay
 * available in `detail`); this layer changes the REGISTER: gaps are framed against
 * the athlete's own trajectory, and the elite SKB bar is presented as a long-term
 * benchmark, never as this block's target (Simon's call, 2026-07-20 — relative
 * framing now, demand scaling is a separately-designed future change).
 */
import { QUALITY_LABELS } from './atlas.js';

// quality id → why it matters, per register. Extend as qualities appear in SKBs.
const WHY = {
  maxStrength: (sport) => `${sport} is won in the moments where you have to produce force — this is the base under all of them.`,
  explosiveStrength: (sport) => `The first step, the jump, the hit — ${sport} pays for power delivered fast.`,
  reactiveStrength: (sport) => `Every bounce, cut and landing in ${sport} runs through this spring.`,
  strengthEndurance: (sport) => `${sport} asks you to repeat efforts when you're tired — this is what keeps quality up late on.`,
  aerobicCapacity: (sport) => `The engine that lets you do it again, all game, all season.`,
  anaerobicCapacity: (sport) => `${sport}'s hardest minutes are paid for here.`,
  hypertrophy: () => `More muscle is the raw material the other qualities are built from.`,
  mobility: () => `Range you don't have is range you can't load — mobility unlocks the rest.`,
  stability: () => `Control is what lets you express strength safely at speed.`,
  robustness: () => `The quality that keeps you on the pitch while others rehab.`,
};

const label = (id) => (QUALITY_LABELS[id] || id);

export function explainFocus(lf, { sportLabel = 'your sport' } = {}) {
  const gap = Math.max(0, lf.demandImportance - lf.capabilityLevel);
  const met = gap <= 0;
  const l = label(lf.qualityId).toLowerCase();

  const headline = met
    ? `Strong where it counts: ${l} — keep it topped up`
    : `Your biggest opportunity: ${l}`;

  let meaning;
  if (met) meaning = `You already meet what ${sportLabel} asks of your ${l}. The job now is maintaining it while you build elsewhere.`;
  else if (gap <= 0.08) meaning = `You're close — this is about sharpening what you have, not rebuilding it.`;
  else if (gap <= 0.25) meaning = `There's a real gap here for ${sportLabel}, and it's very trainable from where you are.`;
  else meaning = `This is the biggest lever you have. Closing it will move everything else — expect steady gains for months, not weeks.`;
  if (!met) {
    if (lf.trainability >= 0.8) meaning += ` You're at a stage where this quality responds fast.`;
    else if (lf.trainability <= 0.5) meaning += ` At your training age it builds slowly — consistency wins, not intensity spikes.`;
  }
  if (!met && lf.injuryRisk > 1) meaning += ` Your injury history makes this one worth extra respect.`;

  const whyItMatters = (WHY[lf.qualityId] || (() => `It's one of the qualities ${sportLabel} demands most.`))(sportLabel);

  const pct = (x) => Math.round(Math.max(0, Math.min(1, x)) * 100);
  const detail = `Current level ${pct(lf.capabilityLevel)} (${lf.confidence} confidence) against a long-term benchmark of ${pct(lf.demandImportance)} — the elite profile for ${sportLabel}, a direction of travel, not this block's target. Engine diagnosis: ${lf.rationale}`;

  return { headline, meaning, whyItMatters, detail };
}
