// tests/provenance.js — WP-27: every engine output carries its provenance stamp
// (audit WP-27; TAS traceability). A plan or reflow result must say WHICH engine
// and WHICH knowledge set produced it, so a stored plan can always be traced back
// to the logic + science that generated it.

import assert from 'node:assert';
import { generatePlan, reflowPhases, ENGINE_VERSION, KNOWLEDGE_SET_VERSION, provenance } from '@performance-os/engine';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let pass = 0;
function ok(cond, msg) {
  assert(cond, msg);
  pass++;
  console.log('PASS:', msg);
}

const SEMVER = /^\d+\.\d+\.\d+$/;
ok(SEMVER.test(ENGINE_VERSION), `ENGINE_VERSION is semver (${ENGINE_VERSION})`);
ok(SEMVER.test(KNOWLEDGE_SET_VERSION), `KNOWLEDGE_SET_VERSION is semver (${KNOWLEDGE_SET_VERSION})`);

// package.json stays in sync with the constant — one version, two homes.
const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../packages/engine/package.json'), 'utf8'));
ok(pkg.version === ENGINE_VERSION, `package.json version matches ENGINE_VERSION (${pkg.version})`);

// The stamp itself.
const stamp = provenance();
ok(stamp.engineVersion === ENGINE_VERSION && stamp.knowledgeSetVersion === KNOWLEDGE_SET_VERSION,
  'provenance() = { engineVersion, knowledgeSetVersion }');

// Every generated plan is stamped.
const plan = generatePlan(answersToProfile({ ...BLANK_ANSWERS, goal: 'stronger', gym_days: 3 }));
ok(plan.meta && plan.meta.provenance
  && plan.meta.provenance.engineVersion === ENGINE_VERSION
  && plan.meta.provenance.knowledgeSetVersion === KNOWLEDGE_SET_VERSION,
  'generatePlan output carries meta.provenance');

// Every reflow output is stamped.
const today = new Date(2026, 5, 10); // fixed clock — determinism (Art 18)
const gctx = { style: plan.gctx?.style || 'strength', level: 'beginner', emphasis: {}, volumeScalar: 1 };
const reflowed = reflowPhases({
  phases: plan.phases, currentWeek: 1, today, gctx: plan.phases[0].gctx || gctx,
  profile: answersToProfile({ ...BLANK_ANSWERS, goal: 'stronger', gym_days: 3 }),
  sessions: {}, recovery: null, load: null, reverted: false, overrides: {},
  activeInjuries: [], dateFor: () => null, totalWeeks: plan.totalWeeks,
  startDate: null, startISO: null
});
ok(reflowed.provenance
  && reflowed.provenance.engineVersion === ENGINE_VERSION
  && reflowed.provenance.knowledgeSetVersion === KNOWLEDGE_SET_VERSION,
  'reflowPhases output carries provenance');

console.log(`\n${pass} provenance checks passed.`);
