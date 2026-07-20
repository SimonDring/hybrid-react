// Guards the double-count: matches_this_week must be EXCLUDED from the runtime reflow (baseline
// owns fixtures). A congested-week rule that would cut 50% at runtime is neutralised in reflow.
import assert from 'node:assert/strict';
import { ruleVolumeAdjustment } from '@performance-os/engine';
import { REFLOW_EXCLUDED_SIGNALS } from '@performance-os/engine/lib/sportKnowledge/reflowAdjust.js';

let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };
ok(REFLOW_EXCLUDED_SIGNALS.includes('matches_this_week'), 'reflow excludes matches_this_week');

const soccer = { sport: 'soccer', sport_code: 'soccer' };
// WITHOUT the exclusion, a 2-match week fires the congested cut. WITH the default exclusion it does not.
const excluded = ruleVolumeAdjustment(soccer, { matchesThisWeek: 2 });
ok(excluded.volumeMult === 1 && !excluded.forceDeload, 'default reflow: 2-match week does NOT cut volume');
const notExcluded = ruleVolumeAdjustment(soccer, { matchesThisWeek: 2 }, { excludeSignals: [] });
ok(notExcluded.volumeMult < 1, 'sanity: without exclusion the congested rule DOES fire (proves the guard is real)');
console.log(`\nreflow-excludes-fixtures: ${n}/${n} checks passed`);
