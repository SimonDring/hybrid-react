/**
 * dose — the D12 dose primitives (M-DOSE), extracted VERBATIM from allocator.js
 * (M6 sub-phase (b), extraction 1; 🔒 9, Simon 2026-07-16).
 *
 * The dose contract: given a SELECTED exercise + its resolved role + the style/phase
 * context, produce the dosed prescription — the rep/RPE/intensity scheme (`scheme`), the
 * working-set count (`roleSetCount`), the rest prescription (`restForRole`), and the fully
 * rendered item (`makeItem`) — plus the rep-math helpers (`capReps`/`floorReps`/`bumpReps`)
 * and the CNS tier that drives rest + supersetting (`cnsTier`).
 *
 * BYTE-IDENTICAL EXTRACTION: this is the exact code that lived in allocator.js; only its
 * home changed (the golden masters prove behaviour is unchanged). The dose MODEL itself is
 * governed knowledge (data/doseSchemes.js, WP-14); these functions are the thin application
 * layer over it.
 *
 * No circular import: allocator imports FROM here; this imports only data + leaf helpers,
 * never allocator.js.
 */

import { CORE_HOLDS } from '../../data/strengthExercises.js';
import { parseSetCount } from '../plan/volume.js';
import { styleFamily } from '../strength/styleFamily.js';
import { axialOf } from '../plan/axial.js';
import { DOSE_SCHEMES, STYLE_SCHEME_BRIDGE, DEFAULT_SCHEME_KEY, DISCIPLINE_DOSE_QUALITY, LIGHT_STRENGTH_MAINS, POWER_DOSE, REST_SECONDS, ISO_SETS, CORE_SETS } from '../../data/doseSchemes.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// CNS / recovery demand of an exercise — drives what may be supersetted and how much
// rest it gets. An explicit `cns` on the exercise wins; otherwise it's derived: heavy
// compounds + power work are 'high' (straight sets, full rest); axially-loaded
// accessories are 'moderate' (may pair only with light work); isolation / core / calf /
// health work is 'low' (the stuff that belongs in a superset). This is why a heavy
// Good morning / RDL no longer gets crammed into a light lift's rest gap.
export function cnsTier(ex) {
  if (!ex) return 'low';
  if (ex.cns) return ex.cns;
  if (ex.role === 'primary' || axialOf(ex) >= 2 || ex.quality === 'power') return 'high';
  if (axialOf(ex) >= 1) return 'moderate';
  if (ex.role === 'iso' || ex.pattern === 'core' || ex.pattern === 'calf' || ex.loadClass === 'health') return 'low';
  return 'moderate';
}

// Map the build style to its goalTag value — needed by the light-equipment override in
// `scheme` via styleFamily; the selection-side `styleGoalTag` stays in allocator.js.

// ---- rep / RPE / intensity scheme — the DOSE MODEL is governed knowledge now
// (data/doseSchemes.js, WP-14): schemes keyed by (scheme key, phase) with per-block
// provenance; this is a thin lookup through the style→scheme bridge, byte-identical
// to the old style-keyed tables (golden masters prove it). Taper keeps intensity
// (peaking — Bosquet 2007; Travis & Mujika 2020); deload drops it (recovery). ----
export function scheme(style, intent, deload, taper, light = false) {
  // P0-1 (audit TR-01): a discipline-id style resolves through its own dose pin
  // (DISCIPLINE_DOSE_QUALITY — the same scheme WP-49 T4c pins per-session), so the
  // fallback scheme and the pinned scheme never disagree. Before this, disciplines
  // fell through the legacy-keyed bridge to the functional scheme.
  const q = DOSE_SCHEMES[STYLE_SCHEME_BRIDGE[style] || DISCIPLINE_DOSE_QUALITY[style] || DEFAULT_SCHEME_KEY];
  if (taper) return q.taper;
  if (deload) return q.deload;
  let out = q[intent] || DOSE_SCHEMES[DEFAULT_SCHEME_KEY].base;
  // Max-strength mains need a barbell — light-equipment override (see the module).
  if (styleFamily(style) === 'strength' && light) {
    const h = LIGHT_STRENGTH_MAINS[intent] || LIGHT_STRENGTH_MAINS.fallback;
    out = { ...out, main: h.main, acc: h.acc };
  }
  return out;
}

const isoStr = (style) => (styleFamily(style) === 'bodybuilding' ? ISO_SETS.bodybuilding : ISO_SETS.default);
const coreStr = (light) => (light ? CORE_SETS.light : CORE_SETS.default);
const mainNote = (deload, taper) =>
  taper ? 'taper — keep the load, just fewer sets. Arrive fresh.'
    : deload ? 'deload — ~65% load, leave 3+ reps in the tank'
      : '+small load when the last set is ≤ target RPE';

// Power / plyometric prescription (quality:'power' exercises — jumps, pogos,
// cleans, sled). Dosed by QUALITY, not role: low reps, sub-maximal RPE (quality
// not failure), full recovery — and exempt from the female rep bump. This is how
// jumps/cleans develop rate-of-force-development instead of being run as a
// fatiguing 3×10 accessory.
const POWER_SETS = POWER_DOSE.sets;
const POWER_RPE = POWER_DOSE.rpe;
const POWER_REST = POWER_DOSE.restSec;
const POWER_NOTE = POWER_DOSE.note;
// POWER_DOSE is BALLISTIC/plyometric dosing (jumps, throws — de Villarreal 2009). The
// Olympic discipline's classic lifts share quality:'power' (they are power work) but must
// dose from their own discipline scheme (1–3 rep mains @ 180 s per doseCharacter) — never
// the flat 4×4. Discipline-tagged lifts are only selectable when their discipline is
// active (selectInterventions/bestExercise filters), so this predicate can only ever
// change olympic-discipline plans. power_clean (sprint-tagged, no discipline field)
// deliberately keeps POWER_DOSE — re-dosing it for sprint cohorts is a separate call.
export const olympicClassicLift = (ex) => ex.quality === 'power' && ex.discipline === 'olympic';

// Clamp the rep number(s) in a "sets" string to a per-exercise ceiling. Some
// movements have a hard rep ceiling far below the generic accessory/iso scheme —
// a Nordic curl is ~3–6 reps, not the 12–14 the iso scheme (plus female bump)
// would prescribe. Only applied to exercises that declare `repCap`; leaves
// time/hold rows ("2 × 30s") untouched.
export function capReps(setsStr, cap) {
  if (!cap) return setsStr;
  return setsStr.replace(/×\s*(\d+(?:[–-]\d+)?)/, (m, reps) => {
    const nums = reps.split(/[–-]/).map(n => Math.min(Number(n), cap));
    const uniq = [...new Set(nums)];
    return '× ' + (uniq.length > 1 ? uniq.join('–') : String(uniq[0]));
  });
}

// Raise the rep number(s) up to a per-exercise floor. A machine vertical-pull
// (lat pulldown) is not a maximal-strength movement — it shouldn't inherit the
// 3–5-rep "main" scheme; a floor keeps it in a sane strength-endurance range.
export function floorReps(setsStr, floor) {
  if (!floor) return setsStr;
  return setsStr.replace(/×\s*(\d+(?:[–-]\d+)?)/, (m, reps) => {
    if (/[sm]/.test(reps)) return m; // time/hold rows — leave alone
    const nums = reps.split(/[–-]/).map(n => Math.max(Number(n), floor));
    const uniq = [...new Set(nums)];
    return '× ' + (uniq.length > 1 ? uniq.join('–') : String(uniq[0]));
  });
}

// Subtle, evidence-based sex tuning applied by bumpReps; the selection-side
// `femaleRepBump` (which decides the delta) stays in allocator.js.
function bumpReps(sets, d) {
  if (!d) return sets;
  return String(sets).replace(/×\s*(\d+(?:–\d+)?)(?!\s*[sm])/, (m, reps) =>
    '× ' + reps.replace(/\d+/g, n => String(Number(n) + d)));
}

// Working-set count an exercise contributes, by its role + the current scheme.
// effectiveRole overrides ex.role when minLevelForPrimary demotes the exercise.
export function roleSetCount(ex, s, style, effectiveRole) {
  const role = effectiveRole != null ? effectiveRole : ex.role;
  if (ex.quality === 'power' && !olympicClassicLift(ex)) return parseSetCount(POWER_SETS);
  if (role === 'primary') return parseSetCount(s.main);
  if (ex.pattern === 'core') return 3;
  if (ex.pattern === 'calf') return parseSetCount('3 × 12');
  if (role === 'iso') return parseSetCount(isoStr(style));
  return parseSetCount(s.acc);   // accessory
}

// Rest prescription per role and style — surfaced as `restSec` on every item.
// The UI reads this field to show a static label and seed the rest timer.
// Superset B exercises get their value overridden to 20s in structureItems().
export function restForRole(ex, style, effectiveRole) {
  const role = effectiveRole != null ? effectiveRole : ex.role;
  if (ex.quality === 'power') return POWER_REST;
  if (role === 'primary') return (styleFamily(style) === 'strength' || style === 'sport') ? REST_SECONDS.primaryHeavy : REST_SECONDS.primaryOther;
  if (role === 'iso' || ex.pattern === 'core' || ex.pattern === 'calf') return REST_SECONDS.isoCoreCalf;
  // Accessory compound. A GENUINE high-CNS accessory (heavy RDL / Good morning / Rack
  // pull) now runs as a STRAIGHT SET, so it needs real rest — not the 75s that assumed
  // it would be tucked into another lift's rest gap; moderate accessories sit between.
  // A *demoted* primary (a barbell main programmed light for a less-experienced athlete)
  // keeps the lighter accessory rest — it's deliberately not loaded like a heavy main.
  if (ex.role === 'accessory') {
    const tier = cnsTier(ex);
    if (tier === 'high') return REST_SECONDS.accessoryHighCns;
    if (tier === 'moderate') return REST_SECONDS.accessoryModerateCns;
  }
  return REST_SECONDS.accessoryDefault;
}

// Build the rendered item for a chosen exercise at a given position in the slot.
export function makeItem(ex, idx, s, style, deload, repBump, effectiveRole, taper) {
  const role = effectiveRole != null ? effectiveRole : ex.role;
  const per = ex.unilateral ? ' ea.' : '';
  const num = LETTERS[Math.min(idx, LETTERS.length - 1)] + '1';
  // WP-49 T4c: a discipline scheme carries its own rest (doseCharacter.restSec) — a powerlifter's
  // mains rest 180 s even though the post-flip style id isn't the legacy 'strength'. Power work and
  // schemes without an explicit rest fall back to the role-based prescription (byte-identical).
  const schemeRest = (ex.quality !== 'power' || olympicClassicLift(ex)) && s && (role === 'primary' ? s.mainRestSec : s.accRestSec);
  const restSec = schemeRest || restForRole(ex, style, role);
  const cap = (str) => {
    const floored = ex.repFloor ? floorReps(str, ex.repFloor) : str;
    return ex.repCap ? capReps(floored, ex.repCap) : floored;
  };
  // Power / plyometric work: dosed by quality (low reps, full recovery), never
  // the role scheme and never the female rep bump. Deload/taper still thins it
  // via the allocator's slot budget; the prescription itself stays explosive.
  if (ex.quality === 'power' && !olympicClassicLift(ex)) {
    return { num, exId: ex.id, name: ex.name, sets: POWER_SETS + per, rpe: POWER_RPE, note: POWER_NOTE, restSec };
  }
  if (role === 'primary') {
    return { num, exId: ex.id, name: ex.name, sets: cap(s.main) + per, rpe: s.mainRpe, note: s.mainNote || mainNote(deload, taper), restSec };
  }
  if (ex.pattern === 'core') {
    const hold = CORE_HOLDS.has(ex.id) || /plank|hold|dead bug|copenhagen|hollow|bird dog/i.test(ex.name);
    return { num, exId: ex.id, name: ex.name, sets: hold ? coreStr(deload || taper) : '3 × 12' + per, rpe: 'RPE 6', note: '', restSec };
  }
  if (ex.pattern === 'calf' || role === 'iso') {
    const str = ex.pattern === 'calf' ? '3 × 12' : isoStr(style);
    return { num, exId: ex.id, name: ex.name, sets: cap(bumpReps(str + per, repBump)), rpe: s.accRpe, note: '', restSec };
  }
  return { num, exId: ex.id, name: ex.name, sets: cap(bumpReps(s.acc + per, repBump)), rpe: s.accRpe, note: '', restSec };
}

export default { cnsTier, scheme, olympicClassicLift, capReps, floorReps, roleSetCount, restForRole, makeItem };
