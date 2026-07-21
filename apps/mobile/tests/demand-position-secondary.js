// tests/demand-position-secondary.js — Sprint 3 Task B1: a position's secondaryQualities
// (SKB data, previously dormant) floor the demand profile at 0.7 — the same treatment
// primaryQualities already get at 0.9 (PRIMARY_FLOOR, demandProfile.js). Uses rugby
// fixtures because they have positions whose secondary/primary lists sit BELOW their
// respective floors in the sport's base physicalProfile, so the floor actually moves them
// (not just re-stamps an already-satisfied value):
//   - Half-backs (scrum-half & fly-half): secondaryQualities includes rotationalPower,
//     authored at sport-level importance 5 → base 0.5 (unmapped SKB name → dropped side).
//     The secondary floor must raise it to 0.7.
//   - Outside backs (wings, fullback, centres): primaryQualities includes aerobicEndurance,
//     authored at sport-level importance 7 → base 0.7 (maps to aerobicCapacity → projected
//     side). The PRIMARY floor must raise it to 0.9 — proof the secondary addition didn't
//     regress the existing primary floor on the projected side.
//   - Front row (props & hooker): secondaryQualities includes strengthEndurance and
//     explosivePower, both already authored ABOVE 0.7 at sport level (7 and 8). The
//     secondary floor must NOT overwrite their evidence (it only raises, never re-stamps
//     an already-satisfied value) — same "only where it raises" contract as PRIMARY_FLOOR.
import { mapSkbQuality } from '@performance-os/engine/data/sportQualityMap.js';
import { buildDemandProfile, droppedDemandsFor } from '@performance-os/engine/lib/performance/demandProfile.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

// sanity on the fixtures' mappings (fails loudly if the SKB or the map ever drifts)
assert(mapSkbQuality('rotationalPower') === null, 'T0a rotationalPower is unmapped (dropped side)');
assert(mapSkbQuality('aerobicEndurance') === 'aerobicCapacity', 'T0b aerobicEndurance maps to aerobicCapacity');
assert(mapSkbQuality('strengthEndurance') === 'strengthEndurance', 'T0c strengthEndurance maps to itself');
assert(mapSkbQuality('explosivePower') === 'explosiveStrength', 'T0d explosivePower maps to explosiveStrength');

// ── 1. a genuine secondary-only raise, on the dropped side ──
const halfBacksDropped = droppedDemandsFor('rugby', 'Half-backs (scrum-half & fly-half)');
const rotPower = halfBacksDropped.find((d) => d.skbQuality === 'rotationalPower');
assert(rotPower && Math.abs(rotPower.importance - 0.7) < 1e-9,
  'T1 half-back rotationalPower (secondary, base 0.5) raised to the secondary floor 0.7');
assert(rotPower && rotPower.evidence.endsWith(':secondary'),
  'T2 the raise carries :secondary evidence');
// the sport-wide baseline (no position) must NOT be raised — the floor is position-scoped
const baseDropped = droppedDemandsFor('rugby', null);
const rotPowerBase = baseDropped.find((d) => d.skbQuality === 'rotationalPower');
assert(rotPowerBase && Math.abs(rotPowerBase.importance - 0.5) < 1e-9,
  'T3 no position → rotationalPower stays at its authored base (0.5), unfloored');

// ── 2. the primary floor still works on the projected side (no regression) ──
const outsideBacks = buildDemandProfile('rugby', 'Outside backs (wings, fullback, centres)');
const aerobic = outsideBacks.find((d) => d.qualityId === 'aerobicCapacity');
assert(aerobic && Math.abs(aerobic.importance - 0.9) < 1e-9,
  'T4 outside-back aerobicEndurance (primary, base 0.7) still raised to the primary floor 0.9');
assert(aerobic && !aerobic.evidence.endsWith(':secondary'),
  'T5 a primary-floor raise is never mislabelled as :secondary');

// ── 3. secondary quality already at/above 0.7: floor never re-stamps an already-satisfied value ──
const frontRow = buildDemandProfile('rugby', 'Front row (props & hooker)');
const se = frontRow.find((d) => d.qualityId === 'strengthEndurance');
const ex = frontRow.find((d) => d.qualityId === 'explosiveStrength');
assert(se && Math.abs(se.importance - 0.7) < 1e-9 && !se.evidence.endsWith(':secondary'),
  'T6 front-row strengthEndurance (secondary, already 0.7 at base) is left at its base evidence, not re-stamped');
assert(ex && Math.abs(ex.importance - 0.8) < 1e-9 && !ex.evidence.endsWith(':secondary'),
  'T7 front-row explosivePower→explosiveStrength (secondary, already 0.8 at base) is left at its base evidence, not re-stamped');
// the primary quality for the same position is unaffected by the secondary loop
const maxStr = frontRow.find((d) => d.qualityId === 'maxStrength');
assert(maxStr && maxStr.importance >= 0.9, 'T8 front-row maxStrength (primary) still floors at ≥0.9');

// ── 4. a genuine secondary-only raise, on the PROJECTED side (coverage: review follow-up) ──
// Soccer 'Striker / Forward' secondaryQualities include reactiveStrength — identity-mapped to
// the PM quality (T0e), authored at sport-level importance 6 → base 0.6, below the 0.7 floor.
// This is the projected-side mirror of T1's dropped-side raise: the floor must MOVE a mapped
// quality, not just re-stamp an already-satisfied one (which T6/T7 cover).
assert(mapSkbQuality('reactiveStrength') === 'reactiveStrength', 'T0e reactiveStrength maps to itself');
const striker = buildDemandProfile('soccer', 'Striker / Forward');
const reactive = striker.find((d) => d.qualityId === 'reactiveStrength');
assert(reactive && Math.abs(reactive.importance - 0.7) < 1e-9,
  'T12 striker reactiveStrength (secondary, base 0.6) raised to the secondary floor 0.7 on the projected side');
assert(reactive && reactive.evidence.endsWith(':secondary'),
  'T13 the projected-side raise carries :secondary evidence');
// the sport-wide baseline (no position) must NOT be raised — the floor is position-scoped
const soccerBase = buildDemandProfile('soccer', null);
const reactiveBase = soccerBase.find((d) => d.qualityId === 'reactiveStrength');
assert(reactiveBase && Math.abs(reactiveBase.importance - 0.6) < 1e-9,
  'T14 no position → soccer reactiveStrength stays at its authored base (0.6), unfloored');

// ── 5. no position → no floors anywhere (base projection only, byte-identical across calls) ──
const noPos1 = buildDemandProfile('rugby', null);
const noPos2 = buildDemandProfile('rugby', null);
assert(JSON.stringify(noPos1) === JSON.stringify(noPos2), 'T9 buildDemandProfile(\'rugby\', null) is deterministic');
assert(!noPos1.some((d) => d.evidence && d.evidence.includes(':secondary')),
  'T10 no position → no :secondary evidence anywhere in the projected profile');
assert(!baseDropped.some((d) => d.evidence && d.evidence.includes(':secondary')),
  'T11 no position → no :secondary evidence anywhere in the dropped ledger');
