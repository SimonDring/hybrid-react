// tests/dose-schemes.js — WP-14: the dose model is governed knowledge.
//
// The allocator's rep/RPE scheme tables, rest prescription, and power dosing now
// live in data/doseSchemes.js keyed by (scheme key, phase) with per-block
// provenance, consumed through a style→scheme bridge. This pins (a) the bridge
// reproduces the old style-keyed values exactly (byte-identity is ALSO proven by
// the untouched golden masters), (b) every block carries provenance, (c) the
// quality keys line up with the quality registry for WP-21.

import { DOSE_SCHEMES, STYLE_SCHEME_BRIDGE, DEFAULT_SCHEME_KEY, POWER_DOSE, REST_SECONDS } from '@performance-os/engine/data/doseSchemes.js';
import allocator from '@performance-os/engine/lib/session/sessionBuilder.js';
const { scheme } = allocator;
import { getQuality } from '@performance-os/engine/data/qualities.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── Bridge fidelity: the exact pre-extraction values, spot-pinned per cell ────
const CASES = [
  // [style, intent, deload, taper, expected]
  ['strength', 'base', false, false, { main: '4 × 5', mainRpe: 'RPE 7' }],
  ['strength', 'peak', false, false, { main: '4 × 3', mainRpe: 'RPE 8→9' }],
  ['bodybuilding', 'build', false, false, { main: '4 × 10', accRpe: 'RPE 8→9' }],
  ['functional', 'base', false, false, { main: '3 × 8', acc: '3 × 10' }],
  ['sport', 'build', false, false, { main: '4 × 4', accRpe: 'RPE 7' }],
  ['sport', 'base', true, false, { main: '2 × 4', mainRpe: 'RPE 5' }],       // sport deload
  ['bodybuilding', 'base', true, false, { main: '2 × 5', mainRpe: 'RPE 6' }], // shared deload
  ['strength', 'peak', false, true, { main: '2 × 3', mainRpe: 'RPE 8' }],    // taper keeps intensity
  ['unknown-style', 'base', false, false, { main: '3 × 8', mainRpe: 'RPE 7' }], // → functional
  ['strength', 'no-such-intent', false, false, { main: '3 × 8', mainRpe: 'RPE 7' }], // → functional.base
];
for (const [style, intent, deload, taper, expected] of CASES) {
  const out = scheme(style, intent, deload, taper);
  const ok = Object.entries(expected).every(([k, v]) => out[k] === v);
  assert(ok, `scheme(${style}, ${intent}${deload ? ', deload' : ''}${taper ? ', taper' : ''}) → ${JSON.stringify(expected)} (got ${JSON.stringify(out)})`);
}
// Light-strength override (dumbbell-only mains shift to loadable ranges).
const light = scheme('strength', 'build', false, false, true);
assert(light.main === '4 × 8' && light.mainRpe === 'RPE 8', 'light-equipment strength keeps RPE, shifts mains to 4 × 8');

// ── Power + rest constants ────────────────────────────────────────────────────
assert(POWER_DOSE.sets === '4 × 4' && POWER_DOSE.rpe === 'RPE 7' && POWER_DOSE.restSec === 150,
  'power dose carries 4×4 @ RPE 7 / 150 s');
assert(REST_SECONDS.primaryHeavy === 180 && REST_SECONDS.supersetB === 20 && REST_SECONDS.accessoryDefault === 75,
  'rest table carries the exact pre-extraction seconds');

// ── Provenance + quality-registry alignment (the WP-21 seam) ──────────────────
for (const [key, block] of Object.entries(DOSE_SCHEMES)) {
  assert(block.evidence && block.evidence.confidence && block.evidence.source,
    `${key} scheme carries provenance (${block.evidence && block.evidence.confidence})`);
  for (const phase of ['base', 'build', 'peak', 'deload', 'taper']) {
    assert(block[phase] && block[phase].main && block[phase].mainRpe, `${key}.${phase} is a complete dose`);
  }
}
assert(Object.values(STYLE_SCHEME_BRIDGE).every((k) => DOSE_SCHEMES[k]), 'every bridged key exists');
assert(DOSE_SCHEMES[DEFAULT_SCHEME_KEY], 'default scheme key exists');
// Quality-id keys resolve in the quality registry (sportSupport is the documented
// transitional composite — deliberately not a quality).
for (const key of Object.keys(DOSE_SCHEMES)) {
  if (key === 'sportSupport') continue;
  assert(!!getQuality(key), `scheme key "${key}" is a registered quality (WP-21 doses by quality)`);
}
