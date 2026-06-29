// tests/sport-season-resolution.js — season key from the new onboarding model.
import { deriveSeason } from '@performance-os/engine/lib/plan/periodization.js';
const P = (o) => ({ sport: 'swim', ...o });
let fails = 0;
const eq = (got, want, msg) => { const ok = got === want; console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg + (ok ? '' : ` (got ${got} want ${want})`)); if (!ok) fails++; };

eq(deriveSeason(P({ sport_intent: 'compete', sport_season: 'in' })), 'in', 'compete in-season → in');
eq(deriveSeason(P({ sport_intent: 'compete', sport_season: 'off' })), 'off', 'compete off-season → off');
eq(deriveSeason(P({ sport_intent: 'compete' })), 'off', 'compete w/o season defaults off');
eq(deriveSeason(P({ sport_intent: 'recreational', sport_goal: 'build_base' })), 'off', 'build_base → off');
eq(deriveSeason(P({ sport_intent: 'recreational', sport_goal: 'get_stronger' })), 'off', 'get_stronger → off');
eq(deriveSeason(P({ sport_intent: 'recreational', sport_goal: 'stay_durable' })), 'in', 'stay_durable → in (maintenance)');
eq(deriveSeason({}), null, 'no sport → null');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exitCode = fails ? 1 : 0;
