// tests/sport-generate-skb.js
// Golden-master determinism test for the three SKB-authored sports:
// gaelic_football, hurling, and swimming.
//
// Verifies:
//   1. Each sport produces non-empty phases AND at least one non-empty gym session.
//   2. Generating twice for the same profile yields byte-identical JSON (determinism).
//   3. Migration parity: legacy sport:'swim' profile produces the SAME plan as
//      sport:'swimming' (normalizeSportId normalises swim → swimming).

import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Full-gym equipment preset — mirrors sport-generate.js
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// Build a sport profile in the exact shape sport-generate.js / generatePlan expects:
// goal_type, sport, sport_season, experience, availability, access.
// Recreational intent + intermediate experience + full gym + 4 days/week.
function sportProfile(sportId) {
  return {
    goal_type: 'sport',
    sport: sportId,
    sport_season: 'off',
    sport_intent: 'recreational',
    experience: { gym: 'intermediate' },
    availability: { days_per_week: 4, session_minutes: 60, days: [] },
    access: FULL,
  };
}

const SKB_SPORTS = ['gaelic_football', 'hurling', 'swimming'];

for (const sport of SKB_SPORTS) {
  const profile = sportProfile(sport);
  let plan;
  try {
    plan = generatePlan(profile);
  } catch (e) {
    console.error('FAIL: generatePlan threw for', sport, '—', e && e.message);
    process.exitCode = 1;
    continue;
  }

  // 1a. Non-empty phases
  assert(
    Array.isArray(plan.phases) && plan.phases.length > 0,
    `${sport}: plan has non-empty phases (got ${plan.phases?.length ?? 0})`
  );

  // 1b. At least one non-empty gym session in the first phase/week
  const firstWeek = plan.phases[0]?.weeks[0];
  assert(
    firstWeek && Array.isArray(firstWeek.sessions) && firstWeek.sessions.length > 0,
    `${sport}: first week has at least one gym session (got ${firstWeek?.sessions?.length ?? 0})`
  );

  // 1c. Each session in the first week has items (non-empty)
  const emptySessions = (firstWeek?.sessions || []).filter(s => !Array.isArray(s.items) || s.items.length === 0);
  assert(
    emptySessions.length === 0,
    `${sport}: no empty sessions in week 1 (${emptySessions.length} empty)`
  );

  // 2. Determinism — generating twice produces byte-identical JSON
  const again = generatePlan(profile);
  assert(
    JSON.stringify(plan) === JSON.stringify(again),
    `${sport}: deterministic — two calls yield identical JSON`
  );
}

// 3. Migration parity: sport:'swim' (legacy alias) must produce the SAME plan
// as sport:'swimming' (canonical SKB id), because normalizeSportId('swim') === 'swimming'.
const legacyProfile  = sportProfile('swim');
const canonProfile   = sportProfile('swimming');
const legacyPlan     = generatePlan(legacyProfile);
const canonPlan      = generatePlan(canonProfile);

// The plan JSON should be byte-identical because resolveProgram normalises the id
// before the SKB lookup, and the raw sport id in the plan output is the caller-supplied
// value.  We compare only the structure that comes from the engine (phases/weeks/sessions
// exercise IDs, volume, sets) — not the top-level sport field itself — by comparing the
// phases subtree.
assert(
  JSON.stringify(legacyPlan.phases) === JSON.stringify(canonPlan.phases),
  `migration parity: sport:'swim' phases === sport:'swimming' phases`
);
assert(
  legacyPlan.totalWeeks === canonPlan.totalWeeks,
  `migration parity: sport:'swim' totalWeeks (${legacyPlan.totalWeeks}) === sport:'swimming' (${canonPlan.totalWeeks})`
);

console.log('sport-generate-skb tests done');
