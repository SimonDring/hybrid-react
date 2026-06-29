// tests/sport-schema-loadfactors.js — schema constants for sport-load awareness.
import { DEFAULT_SEASON_VOLUME, SPORT_BLOCKS } from '@performance-os/engine/lib/sports/_schema.js';
import swimming from '@performance-os/engine/lib/sports/swimming.js';
import running from '@performance-os/engine/lib/sports/running.js';
import cycling from '@performance-os/engine/lib/sports/cycling.js';
let fails = 0;
const eq = (got, want, msg) => { const ok = got === want; console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg + (ok ? '' : ` (got ${got} want ${want})`)); if (!ok) fails++; };

eq(DEFAULT_SEASON_VOLUME.off, 0.90, 'off-season base pulled back to 0.90');
eq(DEFAULT_SEASON_VOLUME.in, 0.60, 'in-season base unchanged 0.60');
eq(SPORT_BLOCKS.off.split.some(s => s.intent === 'peak'), false, 'no-event off block has no peak segment');
eq(SPORT_BLOCKS.off.split.reduce((a, s) => a + s.weeks, 0), 12, 'off block still totals 12 weeks');
eq(swimming.systemicFactor, 0.95, 'swim systemicFactor 0.95');
eq(running.systemicFactor, 0.90, 'run systemicFactor 0.90');
eq(cycling.systemicFactor, 0.95, 'cycle systemicFactor 0.95');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exitCode = fails ? 1 : 0;
