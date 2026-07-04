// tests/sport-load-scalar.js — the sport-load volume scalar.
import { sportLoadScalar, sportDayFactor } from '@performance-os/engine/lib/strength/sportLoad.js';
import swimming from '@performance-os/engine/data/sportGymSupport/swimming.js';
let fails = 0;
const near = (got, want, msg, tol = 0.005) => { const ok = Math.abs(got - want) <= tol; console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg + (ok ? '' : ` (got ${got} want ${want})`)); if (!ok) fails++; };
const days = (n) => Array.from({ length: n }, (_, i) => ['mon','tue','wed','thu','fri','sat','sun'][i]);

near(sportDayFactor(2), 1.0, 'dayFactor ≤2 = 1.0');
near(sportDayFactor(3), 0.92, 'dayFactor 3 = 0.92');
near(sportDayFactor(4), 0.85, 'dayFactor 4 = 0.85');
near(sportDayFactor(5), 0.78, 'dayFactor ≥5 = 0.78');

// in-season swim ×3/wk: 0.60 × 1.0 × 0.92 × 0.95 = 0.524
near(sportLoadScalar({ sport_intent: 'compete', sport_days: days(3) }, { season: 'in', mod: swimming }), 0.524, 'in-season swim ×3');
// off-season build_base ×3/wk: 0.90 × 1.0 × 0.92 × 0.95 = 0.786
near(sportLoadScalar({ sport_intent: 'recreational', sport_goal: 'build_base', sport_days: days(3) }, { season: 'off', mod: swimming }), 0.786, 'off build_base swim ×3');
// off get_stronger ×2/wk: 0.90 × 0.90 × 1.0 × 0.95 = 0.7695
near(sportLoadScalar({ sport_intent: 'recreational', sport_goal: 'get_stronger', sport_days: days(2) }, { season: 'off', mod: swimming }), 0.7695, 'off get_stronger swim ×2');
// clamp floor: in-season swim ×5/wk would be 0.60×0.78×0.95=0.4446 → clamp 0.5
near(sportLoadScalar({ sport_intent: 'compete', sport_days: days(5) }, { season: 'in', mod: swimming }), 0.5, 'floor clamps to 0.5');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exitCode = fails ? 1 : 0;
