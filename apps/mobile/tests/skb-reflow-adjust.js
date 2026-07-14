import { ruleVolumeAdjustment } from '@performance-os/engine/lib/sportKnowledge/reflowAdjust.js';
function assert(c,m){ if(!c){ console.error('FAIL:',m); process.exitCode=1; } else console.log('PASS:',m); }
const FB = { sport: 'gaelic_football' };
let a = ruleVolumeAdjustment(FB, {});                       assert(a.volumeMult === 1 && !a.forceDeload && a.ruleIds.length === 0, 'no signals → no-op (volumeMult 1, no deload)');
a = ruleVolumeAdjustment(FB, { readiness: 30 });           assert(Math.abs(a.volumeMult - 0.85) < 1e-9, 'low readiness → reduce_one_step (0.85)');
a = ruleVolumeAdjustment(FB, { acwr: 1.7 });               assert(a.forceDeload === true, 'acwr>1.5 → force_deload');
a = ruleVolumeAdjustment(FB, { illness: true });           assert(a.volumeMult <= 0.2, 'illness → withhold (<=0.2)');
a = ruleVolumeAdjustment({ sport: 'swimming' }, { season: 'in' }); assert(a.volumeMult === 1 && a.ruleIds.length === 0, 'swimming in-season → season EXCLUDED from reflow (no-op); baseline periodisation owns season, no double-count (Simon 2026-07-14)');
a = ruleVolumeAdjustment(FB, { matchesThisWeek: 2 }); assert(Math.abs(a.volumeMult - 0.55) < 1e-9, 'two matches → reduce_volume_pct 45% (volumeMult 0.55)');
a = ruleVolumeAdjustment({ sport: 'running' }, { season: 'in', readiness: 20 }); assert(a.volumeMult === 1 && !a.forceDeload, 'running (no decisionRules) → no-op');
console.log('skb-reflow-adjust tests done');
