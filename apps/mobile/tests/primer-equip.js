// tests/primer-equip.js
// F2: the functional activation primer must respect the user's equipment (no
// "Band Pull-Apart" for band-less users). F6: short sessions get a trimmed primer.
import { buildWeek } from '@performance-os/engine/lib/plan/strength.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const base = { gymDays: 3, style: 'functional', intent: 'base', phaseWeeks: 3, winp: 1, level: 'intermediate', sex: 'male' };
const primerItems = (session) => session.items.filter(i => /^P\d/.test(i.num || ''));

// ── T1: bodyweight user (no band) — full 60-min primer, band item swapped ──
const bw = buildWeek({ ...base, minutes: 60, access: ['bodyweight'] })[0];
assert(primerItems(bw).length === 4, 'T1a full primer is 4 items at 60 min');
assert(!bw.items.some(i => i.name === 'Band Pull-Apart'), 'T1b no Band Pull-Apart for a band-less user');
assert(bw.items.some(i => i.name === 'Scapular Wall Slide'), 'T1c Scapular Wall Slide swapped in instead');

// ── T2: user WITH a band — Band Pull-Apart kept ───────────────────────────
const band = buildWeek({ ...base, minutes: 60, access: ['band', 'bodyweight'] })[0];
assert(band.items.some(i => i.name === 'Band Pull-Apart'), 'T2 Band Pull-Apart kept when a band is available');

// ── T3: short (≤30 min) session uses the 2-item trimmed primer ────────────
const short = buildWeek({ ...base, minutes: 20, access: ['bodyweight'] })[0];
assert(primerItems(short).length === 2, 'T3a trimmed primer is 2 items at 20 min');
assert(!short.items.some(i => i.name === 'Band Pull-Apart'), 'T3b still no Band Pull-Apart in the trimmed primer');

// ── T4: non-functional styles get no primer ───────────────────────────────
const str = buildWeek({ ...base, style: 'strength', minutes: 60, access: ['barbell', 'bodyweight'] })[0];
assert(primerItems(str).length === 0, 'T4 strength sessions have no activation primer');

console.log('primer-equip tests done');
