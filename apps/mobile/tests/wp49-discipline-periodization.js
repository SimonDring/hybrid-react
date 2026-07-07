// tests/wp49-discipline-periodization.js — WP-49 Plan 2 Task 4c: a build plan's PERIODISATION
// (block length, phase split, deload weeks) comes from its DISCIPLINE module, not the retired
// legacy strength_style PROFILES. Powerlifting runs a 12-week accumulation→intensification→peak;
// hypertrophy a 10-week volume-accumulation; olympic a 12-week technical+strength macrocycle
// (previously olympic fell through to the functional 8-week default — a bug).
import { resolvePeriodization } from '@performance-os/engine';
import { getDiscipline } from '@performance-os/engine/data/disciplines/index.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const per = (style) => resolvePeriodization(answersToProfile(A({ goalType: 'build', strengthStyle: style, daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL })));

// Each build style's periodization === its discipline module's `off` block, verbatim.
for (const [style, discId] of [['strength', 'powerlifting'], ['bodybuilding', 'hypertrophy'], ['functional', 'hypertrophy'], ['olympic', 'olympic']]) {
  const p = per(style);
  const off = getDiscipline(discId).periodization.off;
  assert(p.totalWeeks === off.totalWeeks, `${style} → ${discId}: totalWeeks ${off.totalWeeks} (got ${p.totalWeeks})`);
  assert(JSON.stringify(p.split) === JSON.stringify(off.split), `${style} → ${discId}: phase split matches the discipline`);
  assert(JSON.stringify(p.deloads) === JSON.stringify(off.deloads), `${style} → ${discId}: deload weeks match the discipline`);
}

// The olympic bug specifically: it must NOT be the functional 8-week default.
assert(per('olympic').totalWeeks === 12, 'olympic gets its own 12-week macrocycle (not the functional 8-week default)');

// A barbell-less strength athlete falls back to hypertrophy → hypertrophy periodization.
const noBar = resolvePeriodization(answersToProfile(A({ goalType: 'build', strengthStyle: 'strength', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: ['dumbbell', 'bodyweight'] })));
assert(noBar.totalWeeks === getDiscipline('hypertrophy').periodization.off.totalWeeks, 'barbell-less strength → hypertrophy periodization (matches the discipline fallback)');

console.log(process.exitCode ? 'wp49-discipline-periodization FAILURES' : 'PASS: wp49-discipline-periodization — all gates');
