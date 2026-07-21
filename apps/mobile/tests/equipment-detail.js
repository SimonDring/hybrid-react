// tests/equipment-detail.js — Sprint 3 Task C1: the equipment taxonomy + the
// OPTIONAL detailed-availability layer.
//
// The hard contract: with NO accessDetail the world is byte-identical to today —
// availableEquipDetailed(access, null).base === availableEquip(access), detail is
// null, and every exercise resolves exactly as availableEquip did (the golden
// master proves the whole-plan version of this; here we prove the primitive).
// When detail IS supplied it can only NARROW within a base the user detailed, and
// NEVER expand. This test pins each of those rules directly.
import {
  EXERCISES,
  availableEquip,
  EQUIPMENT_TAXONOMY,
  EQUIPMENT_DETAIL_KEYS,
  availableEquipDetailed,
  exerciseAvailable,
} from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const BASES = new Set(['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight']);
const byId = Object.fromEntries(EXERCISES.map(e => [e.id, e]));
const setsEqual = (a, b) => a.size === b.size && [...a].every(x => b.has(x));

// ── Taxonomy shape ────────────────────────────────────────────────────────────
const allItems = EQUIPMENT_TAXONOMY.flatMap(g => g.items);
assert(EQUIPMENT_TAXONOMY.length >= 4, 'taxonomy is grouped (≥4 coach walkthrough groups)');
assert(allItems.length >= 28 && allItems.length <= 34, `taxonomy has ~30 curated items (got ${allItems.length})`);
assert(allItems.every(it => BASES.has(it.base)), 'every item.base is one of the 7 real catalogue equip categories');
assert(new Set(allItems.map(it => it.key)).size === allItems.length, 'every taxonomy key is unique');
assert(allItems.every(it => typeof it.label === 'string' && it.label.length > 0), 'every item has a coach-authored label');
assert(EQUIPMENT_DETAIL_KEYS.length === allItems.length, 'EQUIPMENT_DETAIL_KEYS enumerates every item key');
// Every equipDetail an exercise references must be a real taxonomy key on the SAME base.
const keyBase = Object.fromEntries(allItems.map(it => [it.key, it.base]));
for (const ex of EXERCISES) {
  if (!ex.equipDetail) continue;
  assert(keyBase[ex.equipDetail] !== undefined, `${ex.id}.equipDetail '${ex.equipDetail}' is a real taxonomy key`);
  assert(keyBase[ex.equipDetail] === ex.equip, `${ex.id}.equipDetail base matches ex.equip (${ex.equip})`);
}

// ── No detail → identical to today ─────────────────────────────────────────────
for (const access of [['barbell', 'machine'], ['full_gym'], ['home_weights'], [], ['none'], ['dumbbell', 'band']]) {
  const { base, detail } = availableEquipDetailed(access, null);
  assert(setsEqual(base, availableEquip(access)), `no-detail base === availableEquip(${JSON.stringify(access)})`);
  assert(detail === null, `no-detail detail is null (${JSON.stringify(access)})`);
}
// Empty-array accessDetail behaves the same as null.
assert(availableEquipDetailed(['full_gym'], []).detail === null, 'empty accessDetail array → detail null');

// No detail → every exercise available EXACTLY as availableEquip's base gate says.
{
  const access = ['full_gym'];
  const avail = availableEquipDetailed(access, null);
  const have = availableEquip(access);
  const mismatches = EXERCISES.filter(ex => exerciseAvailable(ex, avail) !== have.has(ex.equip));
  assert(mismatches.length === 0, 'no-detail: exerciseAvailable === base.has(ex.equip) for every exercise');
  // spot-check hack_squat specifically (the brief's named case).
  assert(exerciseAvailable(byId.hack_squat, avail) === true, 'no-detail: hack_squat available on full_gym (unchanged)');
}

// ── With detail → narrowing only ───────────────────────────────────────────────
// User has full_gym but detailed their machines to a set that OMITS the leg curl machine.
{
  const access = ['full_gym'];
  const detailedMachines = ['leg_press_45', 'leg_extension_machine', 'calf_raise_machine']; // no leg_curl_machine
  const avail = availableEquipDetailed(access, detailedMachines);
  assert(avail.detail instanceof Set && avail.detail.size === 3, 'detail set built from declared items');
  // leg_curl is tagged equipDetail 'leg_curl_machine' on a DETAILED base (machine) that is missing → unavailable.
  assert(exerciseAvailable(byId.leg_curl, avail) === false, 'narrow: leg_curl unavailable when its machine omitted from a detailed base');
  // leg_ext IS in the detail set → available.
  assert(exerciseAvailable(byId.leg_ext, avail) === true, 'narrow: leg_ext available (its machine is in the detail set)');
  // A machine exercise with NO equipDetail tag is never narrowed — stays available.
  assert(byId.sl_leg_press.equipDetail === undefined, 'precondition: sl_leg_press carries no equipDetail tag');
  assert(exerciseAvailable(byId.sl_leg_press, avail) === true, 'untagged machine exercise on a detailed base stays available');
  // A tagged exercise on a base the user did NOT detail (bodyweight) is unaffected.
  assert(exerciseAvailable(byId.pullup, avail) === true, 'tagged exercise on an UNDETAILED base (bodyweight) stays available');
}

// User has full_gym and detailed their bodyweight rig WITHOUT a pull-up bar.
{
  const avail = availableEquipDetailed(['full_gym'], ['dip_station', 'plyo_box']); // bodyweight base detailed, no pullup_bar
  assert(exerciseAvailable(byId.pullup, avail) === false, 'narrow: pullup unavailable when pull-up bar omitted from a detailed bodyweight rig');
  assert(exerciseAvailable(byId.dip, avail) === true, 'narrow: dip available (dip_station is in the detail set)');
  // A plain bodyweight movement (push-up) has no equipDetail → never narrowed.
  assert(byId.pushup.equipDetail === undefined && exerciseAvailable(byId.pushup, avail) === true, 'push-up (untagged bodyweight) stays available');
}

// ── Detail never expands ───────────────────────────────────────────────────────
// A detail item whose BASE is not in access is dropped — it cannot grant the base.
{
  // access is bodyweight-only (empty → {'bodyweight','band'}); declaring a machine item can't add machines.
  const avail = availableEquipDetailed([], ['leg_press_45']);
  assert(!avail.base.has('machine'), 'no-expand: base has no machine from a bodyweight-only access');
  assert(avail.detail === null, 'no-expand: a machine detail item on non-machine access is dropped → detail null');
  // leg_ext (equip machine) stays unavailable purely on the base gate.
  assert(exerciseAvailable(byId.leg_ext, avail) === false, 'no-expand: machine exercise unavailable when machine base absent');
}
// Even if some detail survives, an exercise whose base is absent is unavailable.
{
  const avail = availableEquipDetailed(['bodyweight', 'band'], ['resistance_bands', 'leg_press_45']);
  assert(!avail.base.has('machine'), 'no-expand: machine still absent');
  assert(exerciseAvailable(byId.leg_curl, avail) === false, 'no-expand: leg_curl unavailable (machine base absent) despite a machine detail key');
}

console.log('equipment-detail done');
