// weekly-objective-contract.test.mjs — M6(c) phase 2: D8 Weekly Objective (microcycle) is
// independently testable behind its typed contract, and it CONSUMES the real SKB `microcycles`
// section (dormant at the pin). PARALLEL v0 — steers nothing, so the golden master is the separate
// proof no plan changed. Imports the engine barrel + a real SKB profile.
import { deriveWeeklyObjective } from '@performance-os/engine';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const rugby = require('../src/data/sport-knowledge/rugby.json');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const micro = rugby.microcycles;
const block = { trajectory: 'accumulation', volumeShape: 'ramp', intensityShape: 'moderate' };

// ── One match / week → the MD-anchored pattern, fixture-aware ──────────────────
{
  const w = deriveWeeklyObjective({ blockObjective: block, microcycles: micro, matchesThisWeek: 1 });
  assert(w.value.fixtureAware === true && w.value.fixtureDensity === 'oneMatchPerWeek',
    'one match/week selects the oneMatchPerWeek microcycle (fixture-aware)');
  assert(Array.isArray(w.value.spacingConstraints.avoidHeavyLiftingDays)
    && w.value.spacingConstraints.avoidHeavyLiftingDays.length > 0,
    'the spacing constraints carry the SKB avoid-heavy-lifting days (consumes the dormant section)');
  assert(w.value.weeklyTargets.trajectory === 'accumulation', 'weekly targets inherit from the block objective (D7)');
}

// ── Two matches → the congested pattern (stricter) ────────────────────────────
{
  const w = deriveWeeklyObjective({ blockObjective: block, microcycles: micro, matchesThisWeek: 2 });
  assert(w.value.fixtureDensity === 'twoMatchesPerWeek', 'two matches selects the congested microcycle');
}

// ── 3+ / tournament → the strictest recovery-first pattern ────────────────────
{
  const w = deriveWeeklyObjective({ blockObjective: block, microcycles: micro, matchesThisWeek: 4 });
  assert(w.value.fixtureDensity === 'tournamentOrCongested', '3+ matches selects the tournament/congested microcycle');
}

// ── No fixture signal → NOT fixture-aware (byte-identical no-reshape path) ─────
{
  const w = deriveWeeklyObjective({ blockObjective: block, microcycles: micro, matchesThisWeek: null });
  assert(w.value.fixtureAware === false && w.value.spacingConstraints === null,
    'no fixture signal → not fixture-aware; the block objective governs the week (no reshaping)');
}

// ── No sport microcycle (e.g. a build goal) → not fixture-aware ───────────────
{
  const w = deriveWeeklyObjective({ blockObjective: block, microcycles: null, matchesThisWeek: 1 });
  assert(w.value.fixtureAware === false, 'a goal with no SKB microcycle is never fixture-reshaped (build cohort byte-identical)');
}

// ── Purity ────────────────────────────────────────────────────────────────────
{
  const args = { blockObjective: block, microcycles: micro, matchesThisWeek: 1 };
  const a = deriveWeeklyObjective(args), b = deriveWeeklyObjective(args);
  assert(JSON.stringify(a) === JSON.stringify(b), 'deterministic — identical output for identical input');
}
