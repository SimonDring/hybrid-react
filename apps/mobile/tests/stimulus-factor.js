// tests/stimulus-factor.js — stimulus factor by load class × athlete level.
import { stimulusFactor } from '@performance-os/engine/lib/strength/stimulus.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const ex = (loadClass) => ({ id: 'x', loadClass });

assert(stimulusFactor(ex(undefined), 'advanced') === 1, 'default class = loaded = 1.0 at every level');
assert(stimulusFactor(ex('loaded'), 'beginner') === 1, 'loaded beginner = 1.0');
assert(stimulusFactor(ex('bodyweightStrength'), 'beginner') === 1 && stimulusFactor(ex('bodyweightStrength'), 'advanced') === 0.2, 'bodyweightStrength 1.0 → 0.2');
assert(stimulusFactor(ex('isoCore'), 'beginner') === 0.5 && stimulusFactor(ex('isoCore'), 'advanced') === 0.15, 'isoCore 0.5 → 0.15');
assert(stimulusFactor(ex('health'), 'beginner') === 0 && stimulusFactor(ex('health'), 'advanced') === 0, 'health = 0 everywhere');
assert(stimulusFactor(ex('isoCore'), undefined) === 0.3, 'missing level defaults to intermediate');

console.log('stimulus-factor done');
