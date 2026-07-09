// tests/season-window.js — retire-legacy P4: deriveSeason from the competitive season window.
import { deriveSeason } from '@performance-os/engine';
import { seasonFromWindow, phaseBoundaryWeeks } from '@performance-os/engine/lib/plan/seasonWindow.js';
function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const asOf = '2026-07-01';
const base = { sport: 'gaa', sport_code: 'gaelic_football', plan_start_date: asOf };

// ── the four phases (pre=6wk ramp, transition=3wk after last game; GAA has no override → defaults) ──
assert(deriveSeason({ ...base, first_game_date: '2026-06-01', last_game_date: '2026-09-01' }) === 'in',
  'T1 in-season: today between first and last game');
assert(deriveSeason({ ...base, first_game_date: '2026-07-29', last_game_date: '2026-11-01' }) === 'pre',
  'T2 pre-season: today inside the 6-week ramp before the first game');
assert(deriveSeason({ ...base, first_game_date: '2026-10-01', last_game_date: '2026-12-01' }) === 'off',
  'T3 off-season: long before the pre-season ramp');
assert(deriveSeason({ ...base, first_game_date: '2026-01-01', last_game_date: '2026-06-20' }) === 'transition',
  'T4 transition: within 3 weeks after the last game');
assert(deriveSeason({ ...base, first_game_date: '2026-01-01', last_game_date: '2026-05-01' }) === 'off',
  'T5 off-season: well after the last game');

// ── precedence: the window wins over a single event_date ──
assert(deriveSeason({ ...base, first_game_date: '2026-06-01', last_game_date: '2026-09-01', event_date: '2026-07-05' }) === 'in',
  'T6 window takes precedence over a single event_date');

// ── the existing paths are untouched ──
assert(deriveSeason({ sport: 'run', event_date: '2026-07-15', plan_start_date: asOf }) === 'in',
  'T7 single event_date still works when no window');
assert(deriveSeason({ sport: 'gaa', sport_intent: 'compete', sport_season: 'off', plan_start_date: asOf }) === 'off',
  'T8 no window / no event → intent path (unchanged)');

// ── helpers ──
assert(seasonFromWindow({ ...base }, asOf) === null, 'T9 no first/last game → null (never throws)');
assert(seasonFromWindow({ ...base, first_game_date: '2026-09-01', last_game_date: '2026-06-01' }, asOf) === null,
  'T10 first game after last game → null (guarded)');
assert(phaseBoundaryWeeks(base).preWeeks === 6 && phaseBoundaryWeeks(base).transitionWeeks === 3,
  'T11 default phase-boundary weeks (pre 6 / transition 3)');
