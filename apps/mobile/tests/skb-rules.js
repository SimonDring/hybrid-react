// apps/mobile/tests/skb-rules.js
import { evaluateRules } from '@performance-os/engine/lib/sportKnowledge/rules.js';
function assert(c,m){ if(!c){ console.error('FAIL:',m); process.exitCode=1; } else console.log('PASS:',m); }
const P = { goal_type:'sport', sport:'gaelic_football' };
let r = evaluateRules(P, { matchesThisWeek: 2 });
assert(r.effects.some(e => e.type === 'reduce_volume_pct' && e.params.pct === 45), '2 matches → reduce 45%');
r = evaluateRules(P, { acwr: 1.7 });
assert(r.effects.some(e => e.type === 'force_deload'), 'acwr>1.5 → force_deload');
r = evaluateRules(P, { readiness: 30 });
assert(r.effects.some(e => e.type === 'reduce_one_step'), 'low readiness → reduce_one_step');
r = evaluateRules(P, { illness: true });
assert(r.effects.some(e => e.type === 'withhold'), 'illness → withhold');
r = evaluateRules(P, {});
assert(r.effects.length === 0, 'no triggers → no effects');
r = evaluateRules({ sport:'swimming' }, { season:'in' });
assert(r.effects.some(e => e.type === 'taper'), 'swimming in-season → taper');
r = evaluateRules({ sport:'gaelic_football' }, { travel: true });
assert(r.effects.some(e => e.type === 'reduce_one_step' && e.ruleId === 'long_travel_reduce_intensity'), 'travel → reduce_one_step');
console.log('skb-rules tests done');

// ── endurance activation (SKB review 2026-07-04) ─────────────────────────────
// The endurance profiles' decisionRules were prose-only — the reflow could not
// execute a single one. The review structured every rule with an executable
// signal (39 across 5 profiles); these gates keep them executable. Profiles are
// runtime-shaped (engine sport id + discipline), not SKB-id-shaped.
const END = [
  ['running_sprint', { sport: 'run', run_discipline: 'sprint' }],
  ['running_middle', { sport: 'run', run_discipline: 'middle' }],
  ['running_long', { sport: 'run', run_discipline: 'long' }],
  ['cycling', { sport: 'cycle' }],
  ['triathlon', { sport: 'run', sport_code: 'triathlon' }],  // tri binds engineSport 'run'; sport_code routes the knowledge
];
for (const [name, prof] of END) {
  r = evaluateRules(prof, { readiness: 30 });
  assert(r.effects.some(e => e.type === 'reduce_one_step'), `${name}: low readiness → autoregulate`);
  r = evaluateRules(prof, { illness: true });
  assert(r.effects.some(e => e.type === 'withhold'), `${name}: illness → withhold`);
  r = evaluateRules(prof, { acwr: 1.7 });
  assert(r.effects.some(e => e.type === 'force_deload'), `${name}: load spike → force_deload`);
  r = evaluateRules(prof, { season: 'in' });
  assert(r.effects.some(e => e.type === 'minimal_effective_volume'), `${name}: in-season → minimal effective volume`);
}
// race proximity: runners + cycling prime inside 24 h; taper window inside 14 days
r = evaluateRules({ sport: 'run', run_discipline: 'middle' }, { competitionWithinH: 20 });
assert(r.effects.some(e => e.type === 'priming_only'), 'race within 24h → priming only');
r = evaluateRules({ sport: 'cycle' }, { competitionWithinH: 200 });
assert(r.effects.some(e => e.type === 'taper'), 'event within the taper window → taper');
console.log('endurance activation gates done');
