// tests/onboarding-season-window.js — retire-legacy P4: onboarding first/last game → profile → phase.
// Game dates are offsets from today so the derived phase is deterministic (plan_start_date anchors
// to today; onboarding clamps a past start to today).
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { deriveSeason } from '@performance-os/engine';
function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const iso = (offsetDays) => { const d = new Date(); d.setDate(d.getDate() + offsetDays); return d.toISOString().slice(0, 10); };
const mk = (extra) => answersToProfile({
  ...BLANK_ANSWERS, goalType: 'sport', skbSport: 'gaelic_football', sportIntent: 'compete',
  experienceLevel: 'intermediate', daysPerWeek: 3, days: ['mon', 'wed', 'fri'],
  equipment: ['barbell', 'dumbbell', 'bodyweight'], sportDays: ['tue', 'sat'], ...extra,
});

// the two dates round-trip onto the profile
const mid = mk({ firstGameDate: iso(-30), lastGameDate: iso(60) });
assert(mid.first_game_date === iso(-30) && mid.last_game_date === iso(60), 'T1 first/last game map to profile fields');

// deriveSeason reads the window: today is between first and last game → in-season
assert(deriveSeason(mid) === 'in', 'T2 mid-window profile → in-season (window derived end-to-end)');

// first game far out (beyond the pre-season ramp) → off-season
assert(deriveSeason(mk({ firstGameDate: iso(90), lastGameDate: iso(180) })) === 'off', 'T3 pre-window profile → off-season');

// first game ~4 weeks out (inside the 6-week ramp) → pre-season
assert(deriveSeason(mk({ firstGameDate: iso(28), lastGameDate: iso(150) })) === 'pre', 'T4 inside the ramp → pre-season');

// no window set → the existing intent/season path still applies (no regression)
const noWindow = mk({ sportSeason: 'off_season' });
assert(noWindow.first_game_date === null && deriveSeason(noWindow) === 'off',
  'T5 no window → null fields + intent/season path unchanged');
