// tests/season-team.js — retire-legacy P3: the team/field sports are season-phased too.
import { resolveProgram } from '@performance-os/engine';
function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const prog = (sport, code, season) => resolveProgram({
  goal_type: 'sport', sport, sport_code: code, sport_intent: 'compete', sport_season: season,
  access: ['full_gym'], experience_level: 'intermediate',
});

// each team sport has a season-phased programming block off + in
for (const [sport, code] of [['rugby', 'rugby'], ['soccer', 'soccer'], ['gaa', 'gaelic_football'], ['gaa', 'hurling'], ['gaa', 'field_hockey']]) {
  assert(prog(sport, code, 'off').programming?.roundOutSessionsPerWeek === 1, `T1 ${code} off has a round-out session`);
  assert(prog(sport, code, 'in').programming?.roundOutSessionsPerWeek === 0, `T2 ${code} in has NO round-out session`);
}

// soccer / GAA under-develop upper → round-out adds push+pull
const soc = prog('soccer', 'soccer', 'off');
assert(soc.roundOut.patterns.includes('horizontal_push') && soc.roundOut.patterns.includes('horizontal_pull'),
  'T3 soccer off-season round-out adds upper (push+pull)');
const gaa = prog('gaa', 'gaelic_football', 'off');
assert(gaa.roundOut.patterns.includes('horizontal_push'), 'T4 GAA off-season round-out adds upper');

// rugby is already balanced (nothing below the under-developed threshold) → no round-out targets
const rug = prog('rugby', 'rugby', 'off');
assert(rug.roundOut.patterns.length === 0, 'T5 rugby is already balanced → empty round-out (correct)');

// off-season floors the emphasis; in-season keeps the sport-specific vector
assert(prog('soccer', 'soccer', 'off').emphasis.chest >= 0.9 && prog('soccer', 'soccer', 'in').emphasis.chest < 0.9,
  'T6 soccer off floors chest ≥0.9; in keeps the sport-specific value');
