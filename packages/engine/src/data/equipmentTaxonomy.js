/**
 * Equipment taxonomy — "what a lead S&C coach looks for on a gym walkthrough".
 *
 * The onboarding equipment answer is COARSE: full_gym / home_weights / a few
 * direct keys, resolved by `availableEquip` into the 7 BASE categories
 * (barbell·dumbbell·machine·cable·band·kettlebell·bodyweight). That is all the
 * baseline plan has ever needed, and it stays the source of truth.
 *
 * This table adds an OPTIONAL, finer layer: the specific stations, bars and
 * machines a coach would tick off walking a facility ("45° leg press? GHD?
 * pull-up bar? safety bar?"). It exists so a user CAN, later, tell us the detail
 * of what they actually have — and when they do, selection can NARROW within a
 * base category they detailed. It can NEVER expand access: detail is a filter on
 * top of the base categories, not a new grant.
 *
 * ── The availability contract (degrade-to-today) ─────────────────────────────
 *   • Absent detail (accessDetail null / empty) ⇒ behaviour is EXACTLY today's:
 *     a base category the user has is assumed fully equipped. `detail` is null.
 *   • Present detail ⇒ narrowing applies ONLY within the bases the user detailed
 *     (a base has "detail" iff accessDetail names ≥1 item of that base). An
 *     exercise tagged with an `equipDetail` on such a base is available only when
 *     its specific item is in accessDetail. An exercise WITHOUT an `equipDetail`
 *     tag is never narrowed. An exercise whose base the user did NOT detail is
 *     never narrowed (that base stays "assumed fully equipped").
 *   • Detail NEVER expands: an item counts only if its base is in `access`.
 *
 * Each item: { key (stable id — NEVER rename), label (coach's name for it),
 * base (one of the 7 catalogue equip values), defaultFor ([access tier, …] the
 * item is typically present in — advisory metadata, does not gate anything) }.
 *
 * Nothing in the plan path reads this table yet — it is authored knowledge, wired
 * to the pure helpers below, ready for a later reviewed change to consume
 * accessDetail. With no accessDetail anywhere, the engine is byte-identical.
 */

import { availableEquip } from './strengthExercises.js';

export const EQUIPMENT_TAXONOMY = [
  {
    group: 'Racks & bars',
    items: [
      { key: 'squat_rack',      label: 'Squat rack / power rack', base: 'barbell',    defaultFor: ['full_gym', 'home_weights'] },
      { key: 'pullup_bar',      label: 'Pull-up bar / rig',       base: 'bodyweight', defaultFor: ['full_gym'] },
      { key: 'trap_bar',        label: 'Trap / hex bar',          base: 'barbell',    defaultFor: ['full_gym'] },
      { key: 'safety_bar',      label: 'Safety squat bar',        base: 'barbell',    defaultFor: ['full_gym'] },
      { key: 'smith_machine',   label: 'Smith machine',           base: 'machine',    defaultFor: ['full_gym'] },
      { key: 'bench_adjustable', label: 'Adjustable bench',       base: 'dumbbell',   defaultFor: ['full_gym', 'home_weights'] },
      { key: 'landmine',        label: 'Landmine attachment',     base: 'barbell',    defaultFor: ['full_gym'] },
    ],
  },
  {
    group: 'Presses',
    items: [
      { key: 'chest_press_plate',        label: 'Plate-loaded chest press',   base: 'machine',    defaultFor: ['full_gym'] },
      { key: 'chest_press_selectorised', label: 'Selectorised chest press',   base: 'machine',    defaultFor: ['full_gym'] },
      { key: 'shoulder_press_machine',   label: 'Shoulder press machine',     base: 'machine',    defaultFor: ['full_gym'] },
      { key: 'dip_station',              label: 'Dip station / parallel bars', base: 'bodyweight', defaultFor: ['full_gym'] },
    ],
  },
  {
    group: 'Pulls',
    items: [
      { key: 'lat_pulldown',      label: 'Lat pulldown station', base: 'cable',   defaultFor: ['full_gym'] },
      { key: 'seated_row_machine', label: 'Seated row machine',  base: 'machine', defaultFor: ['full_gym'] },
    ],
  },
  {
    group: 'Lower-body machines',
    items: [
      { key: 'leg_press_45',         label: '45° leg press',          base: 'machine', defaultFor: ['full_gym'] },
      { key: 'leg_press_horizontal', label: 'Horizontal leg press',   base: 'machine', defaultFor: ['full_gym'] },
      { key: 'hack_squat_machine',   label: 'Hack squat machine',     base: 'machine', defaultFor: ['full_gym'] },
      { key: 'pendulum_squat',       label: 'Pendulum squat',         base: 'machine', defaultFor: [] },
      { key: 'leg_curl_machine',     label: 'Leg curl machine',       base: 'machine', defaultFor: ['full_gym'] },
      { key: 'leg_extension_machine', label: 'Leg extension machine', base: 'machine', defaultFor: ['full_gym'] },
      { key: 'calf_raise_machine',   label: 'Calf raise machine',     base: 'machine', defaultFor: ['full_gym'] },
      { key: 'hip_thrust_machine',   label: 'Hip thrust machine',     base: 'machine', defaultFor: [] },
      { key: 'ghd',                  label: 'GHD (glute-ham developer)', base: 'machine', defaultFor: ['full_gym'] },
    ],
  },
  {
    group: 'Cables & stacks',
    items: [
      { key: 'cable_stack_single', label: 'Single cable stack',      base: 'cable', defaultFor: ['full_gym'] },
      { key: 'cable_stack_dual',   label: 'Dual adjustable cable',   base: 'cable', defaultFor: ['full_gym'] },
    ],
  },
  {
    group: 'Conditioning & accessories',
    items: [
      { key: 'resistance_bands',    label: 'Resistance bands',       base: 'band',       defaultFor: ['full_gym', 'home_weights'] },
      { key: 'kettlebells',         label: 'Kettlebells',            base: 'kettlebell', defaultFor: ['full_gym', 'home_weights'] },
      { key: 'dumbbell_rack_heavy', label: 'Heavy dumbbell rack',    base: 'dumbbell',   defaultFor: ['full_gym'] },
      { key: 'plyo_box',            label: 'Plyo box',               base: 'bodyweight', defaultFor: ['full_gym'] },
      { key: 'sled',                label: 'Prowler / sled',         base: 'machine',    defaultFor: ['full_gym'] },
      { key: 'rings_trx',           label: 'Gymnastic rings / TRX',  base: 'bodyweight', defaultFor: ['full_gym'] },
    ],
  },
];

// Flat key → base lookup, derived once from the taxonomy. Used to work out which
// BASE categories a given accessDetail set actually details.
const KEY_TO_BASE = Object.freeze(
  Object.fromEntries(EQUIPMENT_TAXONOMY.flatMap(g => g.items.map(it => [it.key, it.base])))
);

// Every valid detail key (for validation / UI enumeration).
export const EQUIPMENT_DETAIL_KEYS = Object.freeze(Object.keys(KEY_TO_BASE));

/**
 * availableEquipDetailed(access, accessDetail) → { base: Set, detail: Set|null }
 *
 * `base` is EXACTLY today's availableEquip(access) — the 7-category grant.
 * `detail` is the set of specific items the user declared, filtered to items
 * whose base is actually in `access` (detail never expands). With no usable
 * detail it is null → callers degrade to today's base-only behaviour.
 */
export function availableEquipDetailed(access = [], accessDetail = null) {
  const base = availableEquip(access);
  if (!accessDetail || accessDetail.length === 0) return { base, detail: null };
  // Keep only declared items whose base the user actually has (never expand).
  const detail = new Set(
    accessDetail.filter(k => KEY_TO_BASE[k] && base.has(KEY_TO_BASE[k]))
  );
  return { base, detail: detail.size ? detail : null };
}

/**
 * exerciseAvailable(ex, avail) — is this catalogue exercise available given a
 * detailed-availability object { base, detail } from availableEquipDetailed?
 *
 * Rule (degrade-to-today):
 *   1. base gate — the exercise's base category must be in `access`.
 *   2. no equipDetail tag ⇒ base gate is the whole story (never narrowed).
 *   3. no detail provided ⇒ base assumed fully equipped ⇒ available.
 *   4. detail provided but NOT for this exercise's base ⇒ that base stays fully
 *      equipped ⇒ available.
 *   5. detail provided for this base ⇒ narrow: available iff the exercise's
 *      specific equipDetail item is in `detail`.
 */
export function exerciseAvailable(ex, avail) {
  const { base, detail } = avail;
  if (!base.has(ex.equip)) return false;          // (1) base gate — never expand
  if (!ex.equipDetail) return true;               // (2) untagged — unaffected by detail
  if (!detail) return true;                        // (3) no detail at all — assume fully equipped
  // (4) did the user detail THIS exercise's base? (any declared item of that base)
  let baseDetailed = false;
  for (const key of detail) {
    if (KEY_TO_BASE[key] === ex.equip) { baseDetailed = true; break; }
  }
  if (!baseDetailed) return true;                  // base not detailed — assume fully equipped
  return detail.has(ex.equipDetail);               // (5) narrow within a detailed base
}

export default { EQUIPMENT_TAXONOMY, EQUIPMENT_DETAIL_KEYS, availableEquipDetailed, exerciseAvailable };
