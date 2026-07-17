// tests/working-volume.js — counting reflects real stimulus.
import { countWeeklyVolume } from '@performance-os/engine/lib/plan/volume.js';
import { allocateGym } from '@performance-os/engine/lib/session/sessionBuilder.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// A prone Y raise must count ZERO toward back (was a full 1.0 set via pattern hpull).
const proneY = { items: [{ name: 'Prone Y Raise', sets: '3 × 12', volumeFactor: 0, tag: 'mobility' }] };
assert(countWeeklyVolume([proneY]).counts.back === 0, 'prone Y counts zero back (was a full set)');

// An isometric core item at volumeFactor 0.5 counts half.
const plank = { items: [{ name: 'Plank', sets: '3 × 30s', volumeFactor: 0.5 }] };
assert(countWeeklyVolume([plank]).counts.core === 1.5, 'plank 3 sets × 0.5 = 1.5 core');

// A loaded item with no factor stamped counts full (default 1).
const row = { items: [{ name: 'Barbell row', sets: '4 × 8' }] };
assert(countWeeklyVolume([row]).counts.back === 4, 'loaded row counts full (default factor 1)');

// The allocator stamps a volumeFactor on every built item.
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const specs = allocateGym({ targets: { core: 8, quads: 8, back: 8 }, slots: [{ minutes: 60, equip: FULL }], ctx: { style: 'functional', level: 'advanced', weekNum: 1, access: FULL } });
assert(specs[0].items.every(it => 'volumeFactor' in it), 'every allocated item carries volumeFactor');

console.log('working-volume done');
