// tests/skb-catalogue-join.js — Sprint 9 WP-19.0: the SKB exercise libraries JOIN
// the engine catalogue by id, loudly.
//
// Before this, cycling/swimming matched the catalogue 3/13 (naming drift:
// romanian_deadlift vs rdl…) so the SKB transfer boost was silently dead for them —
// the V12 name-join lesson, replayed at the knowledge layer. Ids are now normalised;
// any exercise the catalogue genuinely lacks sits on the EXPLICIT allowlist below
// with a reason. A new SKB entry that doesn't resolve fails this test — the join can
// never silently rot again.

import * as SKB from '@performance-os/engine/lib/sportKnowledge/index.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const CATALOGUE = new Set(EXERCISES.map((e) => e.id));

// Documented unmapped entries — knowledge the catalogue can't express YET. Each needs
// a reason; these sports don't flip to SKB-primary until their profiles are consumed
// (WP-23), except cycling's neck work which has no muscle-vocabulary home.
const ALLOWLIST = {
  cycling: {
    neck_isometrics: 'no neck muscle in the engine vocabulary; aero-position prehab — revisit at the next catalogue authoring pass',
  },
  rugby: {
    neck_isometrics: 'no neck muscle in the engine vocabulary; cervical strengthening is a rugby-specific modifiable concussion/neck-injury risk factor — reuses cycling\'s allowlisted id (revisit at the next catalogue authoring pass)',
  },
  gaelic_football: {
    trap_bar_jump: 'loaded jump — distinct movement, no catalogue entry; the power category is covered by hip_thrust + cable_woodchop (WP-48 flip audit)',
    resisted_sprint: 'a sprint, not a gym movement — belongs to future endurance programming',
  },
  hurling: {
    resisted_sprint: 'a sprint, not a gym movement — belongs to future endurance programming',
    cable_rotational_press: 'distinct movement, no catalogue entry; rotational power is covered by cable_woodchop (WP-48 flip audit)',
    wrist_roller: 'grip/forearm — no muscle-vocabulary home; the category is covered by farmer_carry (WP-48 flip audit)',
  },
  field_hockey: {
    trap_bar_jump: 'loaded jump — distinct movement; explosive power is covered by broad_jump (WP-48 flip audit)',
    cable_rotational_press: 'distinct movement; the trunk category is covered by pallof (WP-48 flip audit)',
    resisted_sprint: 'a sprint, not a gym movement — belongs to future endurance programming',
  },
};

// Sports whose SKB library must FULLY resolve (they are on, or next in line for,
// the D11/SKB-primary path).
const FLIP_SPORTS = ['running_long', 'running_middle', 'running_sprint', 'cycling', 'swimming', 'triathlon'];

const profiles = ['rugby', 'soccer', 'gaelic_football', 'hurling', 'field_hockey', 'swimming', 'cycling', 'triathlon', 'running_long', 'running_middle', 'running_sprint'];
let checked = 0;
for (const sid of profiles) {
  const lib = SKB.section(sid, 'exerciseLibrary');
  const exs = lib?.exercises || [];
  if (!exs.length) continue;
  const allow = ALLOWLIST[sid] || {};
  const unresolved = exs.map((e) => e.id).filter((id) => !CATALOGUE.has(id) && !allow[id]);
  const stale = Object.keys(allow).filter((id) => !exs.some((e) => e.id === id) || CATALOGUE.has(id));
  checked++;
  assert(unresolved.length === 0, `${sid}: every library id resolves or is allowlisted (unresolved: ${unresolved.join(', ') || 'none'})`);
  assert(stale.length === 0, `${sid}: allowlist entries are still real gaps (stale: ${stale.join(', ') || 'none'})`);
  if (FLIP_SPORTS.includes(sid)) {
    const gaps = exs.map((e) => e.id).filter((id) => !CATALOGUE.has(id));
    const nonNeck = gaps.filter((id) => id !== 'neck_isometrics');
    assert(nonNeck.length === 0, `${sid} (flip sport): library fully selectable (${exs.length - gaps.length}/${exs.length})`);
  }
}
assert(checked >= 8, `checked ${checked} SKB libraries`);
