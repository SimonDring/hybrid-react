// tests/sport-schema-loadfactors.js — sport-load constants + the per-sport load factors, which now
// live in the SKB gymSupport section (2026-07-09, legacy sportGymSupport removed).
import { DEFAULT_SEASON_VOLUME, SPORT_BLOCKS } from '@performance-os/engine/data/periodizationDefaults.js';
import { sportKnowledge as skb } from '@performance-os/engine';
let fails = 0;
const eq = (got, want, msg) => { const ok = got === want; console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg + (ok ? '' : ` (got ${got} want ${want})`)); if (!ok) fails++; };

eq(DEFAULT_SEASON_VOLUME.off, 0.90, 'off-season base pulled back to 0.90');
eq(DEFAULT_SEASON_VOLUME.in, 0.60, 'in-season base unchanged 0.60');
eq(SPORT_BLOCKS.off.split.some(s => s.intent === 'peak'), false, 'no-event off block has no peak segment');
eq(SPORT_BLOCKS.off.split.reduce((a, s) => a + s.weeks, 0), 12, 'off block still totals 12 weeks');
// per-sport systemicFactor now on the SKB gymSupport (relocated verbatim from the legacy modules)
eq(skb.get('swimming').gymSupport.systemicFactor, 0.95, 'swim systemicFactor 0.95');
eq(skb.get('running_middle').gymSupport.systemicFactor, 0.90, 'run systemicFactor 0.90');
eq(skb.get('cycling').gymSupport.systemicFactor, 0.95, 'cycle systemicFactor 0.95');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exitCode = fails ? 1 : 0;
