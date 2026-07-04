/**
 * coachNote — the auto-generated "educator" summary shown at the top of Home.
 *
 * Turns the user's resolved programme + where they are in the plan into a short,
 * plain-language note: WHAT this block is doing, WHY, and HOW it translates into
 * their sport. Pure and deterministic — same inputs, same copy. When the AI coach
 * lands (Stage 5) it can swap the copy behind this same signature.
 *
 *   buildCoachNote(profile, ctx) -> { tag, eyebrow, headline, body, translatesTo, footer }
 *   ctx = { phaseTitle, weekNum, totalWeeks, isDeload }  (all optional)
 */

import { resolveProgram } from '@performance-os/engine';

const SPORT_NOUN = { run: 'running', cycle: 'cycling', swim: 'swimming' };
const SPORT_TITLE = { run: 'Running', cycle: 'Cycling', swim: 'Swimming' };
const SEASON_TAG = { off: 'off-season', pre: 'pre-season', in: 'in-season', transition: 'transition' };

const STYLE_TAG = { strength: 'Strength', bodybuilding: 'Building muscle', functional: 'Functional' };

// Season → headline + the "what we're doing & why" line (sport goals).
const SEASON_COPY = {
  off: {
    head: 'Building your base',
    what: (s) => `You're off-season, so we're loading strength and volume while your ${s} stays easy.`
  },
  pre: {
    head: 'Sharpening for your season',
    what: (s) => `Pre-season — we keep the strength but start pointing it at your ${s}.`
  },
  in: {
    head: 'Holding your edge',
    what: () => `In-season — a maintenance dose of strength so racing, not lifting, drives the fatigue.`
  },
  transition: {
    head: 'Recharging',
    what: () => `Between blocks — lighter work to recover while keeping the engine ticking over.`
  }
};

// Style → headline + line (build goals).
const STYLE_COPY = {
  strength: { head: 'Getting you stronger', what: () => 'This block drives the main lifts toward your next strength milestone.' },
  bodybuilding: { head: 'Building muscle', what: () => 'This block works each muscle near its productive ceiling to add size.' },
  functional: { head: 'Building usable strength', what: () => 'This block balances strength with control, core and mobility.' }
};

// Per-sport, per-muscle benefit phrases for the "how it helps" line.
const MUSCLE_PHRASE = {
  run: { calves: 'springier calves and Achilles', hamstrings: 'more durable hamstrings', glutes: 'more powerful hips', quads: 'stronger legs', core: 'a steadier core', back: 'a taller, stronger posture' },
  cycle: { quads: 'more power to the pedals', glutes: 'stronger hips for the climbs', hamstrings: 'a smoother pedal stroke', core: 'a stabler position on the bike', calves: 'stronger ankles' },
  swim: { back: 'a stronger pull', shoulders: 'healthier, more powerful shoulders', triceps: 'more push through each stroke', biceps: 'a stronger catch', core: 'a tighter bodyline', chest: 'a stronger press' }
};
const SPORT_OUTCOME = {
  run: 'a more economical, injury-resistant stride',
  cycle: 'more sustainable power on the bike',
  swim: 'a stronger, more efficient stroke'
};
const STYLE_OUTCOME = {
  strength: 'More force now means more power and resilience in everything else you do.',
  bodybuilding: 'More muscle now is more strength, shape and metabolic engine later.',
  functional: 'Better control and core now means moving well, pain-free, day to day.'
};

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// The two most-emphasised muscles for this sport, as a benefit phrase.
function translatesForSport(sport, emphasis) {
  const phrases = MUSCLE_PHRASE[sport] || {};
  const top = Object.entries(emphasis || {})
    .filter(([m, v]) => v > 1 && phrases[m])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([m]) => phrases[m]);
  const outcome = SPORT_OUTCOME[sport] || 'better performance in your sport';
  if (!top.length) return `Stronger, more resilient muscles mean ${outcome}.`;
  const joined = top.length > 1 ? `${top[0]} and ${top[1]}` : top[0];
  return `${cap(joined)} mean ${outcome}.`;
}

export function buildCoachNote(profile = {}, ctx = {}) {
  const program = resolveProgram(profile);
  const { phaseTitle, weekNum, totalWeeks, isDeload } = ctx;

  let tag, headline, body, translatesTo;

  if (program.goalType === 'sport' && program.sport) {
    const sport = program.sport;
    const noun = SPORT_NOUN[sport] || 'sport';
    const seasonCopy = SEASON_COPY[program.season] || SEASON_COPY.off;
    tag = `${SPORT_TITLE[sport] || cap(sport)} · ${SEASON_TAG[program.season] || 'base'}`;
    headline = seasonCopy.head;
    body = seasonCopy.what(noun);
    translatesTo = translatesForSport(sport, program.emphasis);
  } else {
    const styleCopy = STYLE_COPY[program.style] || STYLE_COPY.strength;
    tag = STYLE_TAG[program.style] || 'Strength';
    headline = styleCopy.head;
    body = styleCopy.what();
    translatesTo = STYLE_OUTCOME[program.style] || STYLE_OUTCOME.strength;
  }

  // A deload week reframes the whole note — back off so the work lands.
  if (isDeload) {
    headline = 'Deload week';
    body = "A lighter, deliberate week — we back off so the last few weeks land and you come back fresher.";
  }

  let footer = null;
  if (weekNum != null && totalWeeks) {
    const block = phaseTitle ? ` · ${phaseTitle}` : '';
    footer = `Week ${weekNum} of ${totalWeeks}${block}${isDeload ? ' · deload' : ''}`;
  }

  return { tag, eyebrow: 'Why this week', headline, body, translatesTo, footer };
}

export default { buildCoachNote };
