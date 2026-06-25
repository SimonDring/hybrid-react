// tests/optimal-frequency.js — the slider's default day count, by goal+experience.
import { suggestOptimalFrequency } from '@performance-os/engine/lib/plan/frequency.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const inDays = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
const P = (o) => answersToProfile({ ...BLANK_ANSWERS, ...o });

const begStrength = suggestOptimalFrequency(P({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'beginner' }));
const advHyper    = suggestOptimalFrequency(P({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced' }));
const inSeason    = suggestOptimalFrequency(P({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportIntent: 'compete', eventDate: inDays(30), experienceLevel: 'intermediate' }));

assert(begStrength.optimalDays >= 3 && begStrength.optimalDays <= 4, `beginner strength optimal ~3 (got ${begStrength.optimalDays})`);
assert(advHyper.optimalDays >= 5 && advHyper.optimalDays <= 6, `advanced hypertrophy optimal ~5-6 (got ${advHyper.optimalDays})`);
assert(inSeason.optimalDays === 2, `in-season sprinter optimal 2 (got ${inSeason.optimalDays})`);

// Clamp invariants.
assert(begStrength.minDays === 2 && begStrength.maxDays === 7, 'min/max days are 2..7');
const everyone = [begStrength, advHyper, inSeason];
assert(everyone.every(r => r.optimalDays >= 2 && r.optimalDays <= 7), 'optimal always within 2..7');

console.log('optimal-frequency done');
