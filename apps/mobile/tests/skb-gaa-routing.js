// tests/skb-gaa-routing.js — GAA players route to THEIR sport's SKB profile
// (deliberate change, 2026-07-04). The engine sport id is 'gaa' for BOTH Gaelic
// football and hurling, so skb.get('gaa') found nothing: the only structured
// decisionRules besides swimming's never fired for the athletes they were written
// for, and a legacy GAA profile got no demand profile → no diagnosis.
//
// The decision: never guess between the two codes. Onboarding already REQUIRES the
// exact SKB id (answers.skbSport) — it now PERSISTS as profile.sport_code, and every
// SKB lookup resolves through skbSportIdOf(profile): stored answer → dual-written
// athlete-model primarySport (profiles saved before sport_code) → legacy derivation.
// A code-less 'gaa' profile stays inert — deliberately — rather than getting the
// wrong sport's rules.

import assert from 'node:assert';
import { skbSportIdOf, skbSportIdFor } from '@performance-os/engine/lib/sportKnowledge/index.js';
import { evaluateRules } from '@performance-os/engine/lib/sportKnowledge/rules.js';
import { profileToAthleteModel } from '@performance-os/engine';
import { answersToProfilePatch, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

let pass = 0;
function ok(cond, msg) { assert(cond, msg); pass++; console.log('PASS:', msg); }

// ── onboarding persists the athlete's actual answer ──────────────────────────
const hurler = answersToProfilePatch({
  ...BLANK_ANSWERS, goalType: 'sport', skbSport: 'hurling', position: 'Midfield',
  sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 3,
  days: ['mon', 'wed', 'fri'], strengthAccess: 'full_gym',
});
ok(hurler.sport === 'gaa' && hurler.sport_code === 'hurling',
  "a hurler's profile keeps BOTH the engine sport ('gaa') and the exact answer (sport_code 'hurling')");
const runner = answersToProfilePatch({
  ...BLANK_ANSWERS, goalType: 'sport', skbSport: 'running_sprint',
  sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 3,
  days: ['mon', 'wed', 'fri'], strengthAccess: 'full_gym',
});
ok(runner.sport === 'run' && runner.run_discipline === 'sprint' && runner.sport_code === 'running_sprint',
  'the SKB bridge still derives the legacy fields AND persists the code');
const builder = answersToProfilePatch({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], strengthAccess: 'full_gym' });
ok(builder.sport_code === null, 'build athletes carry no sport_code');

// ── the profile-level derivation precedence ──────────────────────────────────
ok(skbSportIdOf({ sport: 'gaa', sport_code: 'hurling' }) === 'hurling', 'the stored answer wins');
ok(skbSportIdOf({ sport: 'gaa', athlete_model: { sportingContext: { primarySport: 'gaelic_football' } } }) === 'gaelic_football',
  'the dual-written athlete model disambiguates profiles saved before sport_code');
ok(skbSportIdOf({ sport: 'run', run_discipline: 'long' }) === 'running_long', 'legacy derivation is the floor');
ok(skbSportIdOf({ sport: 'gaa' }) === 'gaa' && skbSportIdFor('gaa') === 'gaa',
  "a code-less 'gaa' profile stays unresolved — inert, never the wrong code");

// ── the ACTIVATION: real runtime GAA profiles now fire their structured rules ─
const fired = evaluateRules({ sport: 'gaa', sport_code: 'hurling' }, { matchesThisWeek: 2 });
ok(fired.effects.some((e) => e.type === 'reduce_volume_pct'),
  'a hurler (runtime profile shape) fires hurling rules: 2 matches → volume cut');
const inert = evaluateRules({ sport: 'gaa' }, { matchesThisWeek: 2 });
ok(inert.effects.length === 0, 'a code-less gaa profile fires NOTHING (deliberate — no guessing)');

// ── the adapter: a coded GAA profile gets a real primarySport (→ demand → D4/D5) ─
const model = profileToAthleteModel(hurler, '2026-07-04');
ok(model.sportingContext.primarySport === 'hurling',
  "the athlete model's primarySport is the athlete's actual sport");

console.log(`\n${pass} skb-gaa-routing checks passed.`);
