# Build Discipline Engine — Plan 2: The Flip

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route build goals through the diagnosis-first engine driven by the discipline knowledge (from Plan 1), retire the legacy volume-first path, add the onboarding discipline picker + secondary-goals menu, and migrate existing users — so a build athlete's plan is shaped by their diagnosis against their chosen discipline.

**Architecture:** Build the discipline path **keyed on a new `profile.discipline` field** so every existing golden archetype (which uses the legacy `strength_style`) stays BYTE-IDENTICAL through Tasks 1–5 — the new path is exercised by *new* discipline archetypes added additively to the golden. Task 6 is THE FLIP: map `strength_style → discipline`, remove the legacy path, and re-baseline the (now intentionally changed) existing build archetypes, while asserting sports stay byte-identical.

**Tech Stack:** ES-module JS engine (`packages/engine`), Node test files (`apps/mobile/tests/*.js`), the golden-master + knowledge-set-ratchet harness, React onboarding (`apps/mobile/src`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-07-build-discipline-engine-design.md`. Plan 1 (the knowledge foundation) is merged: `getDiscipline(id)`, `DISCIPLINES`, `getSecondaryGoal(id)`, `SECONDARY_GOALS` are exported from `@performance-os/engine`; the Olympic lifts + discipline modules + secondary-goals menu exist. Current KSV: **1.14.0**.
- **The byte-identity contract INVERTS at Task 6.** Tasks 1–5: the change must move NO existing plan — assert 0 non-`knowledgeSetVersion` lines changed in the golden for the EXISTING archetype keys (new discipline archetype keys are additive and expected). Task 6: existing build archetypes CHANGE (audited per discipline); **sports + non-build archetypes must stay byte-identical** (a regression assertion).
- **KSV/ratchet:** bump `KNOWLEDGE_SET_VERSION` + `UPDATE=1 node tests/knowledge-set-ratchet.js` on any `packages/engine/src/data/**` or `entries.js` change. Logic-only changes (lib/) do NOT bump. Chain from 1.14.0.
- **Determinism (Art 18):** no clock/random in decision paths (asOf is passed).
- **Theme/security (Task 6 UI):** real theme vars only (`--bg-surface`, `--txt-muted`, `--rust`, `--moss`, `--ochre`, etc. — NEVER `--card-bg`/`--border`/`--accent-bg`); all writes via SyncService/store; no `.env` commits.
- Full suite green (`cd apps/mobile && npm test`) at the end of each task. Branch: `feat/wp49-build-flip`.
- **The discipline set (spec §1):** `build muscle → hypertrophy`, `get stronger → powerlifting`, `functional → hypertrophy + conditioning secondary goal`, Olympic is new. Discipline ids: `hypertrophy`, `powerlifting`, `olympic`.

---

### Task 1: Discipline demand → the diagnosis (keyed on `profile.discipline`)

**Files:**
- Create: `packages/engine/src/lib/performance/disciplineDemand.js`
- Modify: `packages/engine/src/lib/performance/derivePerformanceModel.js`
- Modify: `apps/mobile/tests/golden-master.js` (add discipline archetypes to the matrix)
- Test: `apps/mobile/tests/wp49-discipline-diagnosis.js`

**Interfaces:**
- Produces: `disciplineDemandFor(model) → {qualityId:0..1} | null` — reads the athlete model's discipline (via `model.disciplineId` or the mapped goal outcome) and returns that discipline module's `demand` vector, else null.
- Consumes (Task 2+): the discipline path is active when `disciplineDemandFor(model)` is non-null.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/wp49-discipline-diagnosis.js
import { generatePlan } from '@performance-os/engine';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
let pass=0; function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1} else pass++ }
const FULL=['barbell','dumbbell','machine','cable','band','kettlebell','bodyweight'];
const A=o=>({...BLANK_ANSWERS,...o});
// A profile carrying a `discipline` gets a diagnosis whose lead quality is the discipline's.
const pl = generatePlan({ ...answersToProfile(A({goalType:'build',experienceLevel:'advanced',daysPerWeek:4,days:['mon','tue','thu','fri'],equipment:FULL,sex:'male',lifts:{squat:140,bench:100,deadlift:180}})), discipline:'powerlifting' });
assert(pl.meta.diagnosis && pl.meta.diagnosis.priorityQualities.length>0, 'a powerlifting-discipline build profile gets a diagnosis');
// (existing archetypes have no `discipline` → unchanged; the byte-identical gate below proves it)
console.log(process.exitCode ? 'wp49-discipline-diagnosis FAILURES' : `PASS: wp49-discipline-diagnosis — ${pass} assertions`);
```

- [ ] **Step 2: Run to verify FAIL** — `node apps/mobile/tests/wp49-discipline-diagnosis.js`. Expected: FAIL — a build profile currently has no `meta.diagnosis` (the diagnosisSteers gate excludes build; that gate is opened in Task 3). NOTE: this test's assertion cannot pass until Task 3 opens the gate. So for Task 1, change the assertion to check the MODEL, not the plan: assert `disciplineDemandFor(model)` returns the powerlifting demand. Rewrite Step 1 to import `disciplineDemandFor` from `@performance-os/engine/lib/performance/disciplineDemand.js` and build a model via the adapter (`profileToAthleteModel`), then assert `disciplineDemandFor(model).maxStrength === 1.0`. (The plan-level diagnosis assertion belongs in Task 3.)

- [ ] **Step 3: Implement `disciplineDemand.js`**

```js
import { getDiscipline } from '../../data/disciplines/index.js';
// The goal-outcome ↔ discipline map (back-compat until Task 6 makes discipline primary).
const OUTCOME_DISCIPLINE = { build_muscle:'hypertrophy', get_stronger:'powerlifting', olympic_weightlifting:'olympic' };
export function disciplineIdFor(model) {
  if (model && model.disciplineId && getDiscipline(model.disciplineId)) return model.disciplineId;
  const outcome = (Array.isArray(model && model.goals) && model.goals[0] && model.goals[0].outcome) || null;
  return OUTCOME_DISCIPLINE[outcome] || null;
}
export function disciplineDemandFor(model) {
  const d = getDiscipline(disciplineIdFor(model));
  return d ? { ...d.demand } : null;
}
export default { disciplineDemandFor, disciplineIdFor };
```
Then in `derivePerformanceModel.js`, where `goalDemandProfile(goalOutcome)` is called (line ~21): prefer the discipline demand when present. Verify the exact current expression first, then:
```js
import { disciplineDemandFor } from './disciplineDemand.js';
// … existing: const goalOutcome = …; const dp = sc.primarySport ? buildDemandProfile(...) : goalDemandProfile(goalOutcome);
const disc = disciplineDemandFor(m);
const buildDemand = disc ? demandVectorToProfile(disc) : goalDemandProfile(goalOutcome);
const dp = sc.primarySport ? buildDemandProfile(sc.primarySport, sc.position||null) : buildDemand;
```
`demandVectorToProfile` must match the SHAPE `goalDemandProfile` returns (inspect `goalDemand.js:goalDemandProfile` — it maps `{qualityId:weight}` to the demand-profile array/objects the diagnosis reads). Reuse `goalDemandProfile`'s internal transform: the cleanest is to make `goalDemandProfile` accept a raw vector, or export the transform. Read `goalDemand.js` and follow its exact output shape so `dp` stays type-identical.

- [ ] **Step 4: Wire the athlete model to carry `disciplineId`**

The adapter `profileToAthleteModel(profile, asOf)` must copy `profile.discipline` → `model.disciplineId`. Read `packages/engine/src/lib/adapters/profileToAthleteModel.js`, find where goals/outcome are set, add `disciplineId: profile.discipline || null` to the model. (No behaviour change for profiles without `discipline`.)

- [ ] **Step 5: Add discipline archetypes to the golden matrix (additive)**

In `apps/mobile/tests/golden-master.js` MATRIX, add (keys clearly marked as new build-discipline archetypes; use the `A()` helper + set `discipline`):
```js
'build·powerlifting·advanced·4d': { ...A({goalType:'build',experienceLevel:'advanced',daysPerWeek:4,days:['mon','tue','thu','fri'],equipment:FULL,sex:'male',lifts:{squat:180,bench:130,deadlift:230}}), discipline:'powerlifting' },
'build·hypertrophy·intermediate·5d': { ...A({goalType:'build',experienceLevel:'intermediate',daysPerWeek:5,days:['mon','tue','wed','fri','sat'],equipment:FULL,sex:'male',lifts:{}}), discipline:'hypertrophy' },
'build·olympic·advanced·4d': { ...A({goalType:'build',experienceLevel:'advanced',daysPerWeek:4,days:['mon','tue','thu','fri'],equipment:FULL,sex:'male',lifts:{squat:150}}), discipline:'olympic' },
```
(`answersToProfile` may strip unknown fields — if so, spread `discipline` back on AFTER `answersToProfile`, matching how the test builds profiles. Verify the archetype actually carries `discipline` into `generatePlan`.)

- [ ] **Step 6: Byte-identical for EXISTING keys + regen; commit**

```bash
# bump KSV 1.14.0 -> 1.15.0 (new data-read path via disciplineDemand — it's lib/, but golden matrix + a new consumed seam; if ONLY lib/ changed, no bump needed. disciplineDemand.js is lib/, not data/. So NO KSV bump unless you touched data/. Confirm: git diff --name-only shows only lib/ + tests → skip the bump.)
cd apps/mobile && UPDATE=1 node tests/golden-master.js >/dev/null && UPDATE=1 node tests/build-parity.js >/dev/null
cd /Users/simondring/Code/hybrid-react
# EXISTING archetypes must be unchanged; NEW keys are additive. Assert no EXISTING key's plan moved:
node --input-type=module -e "
import { readFileSync } from 'node:fs'; import { execSync } from 'node:child_process';
const cur=JSON.parse(readFileSync('apps/mobile/tests/__snapshots__/engine-golden-master.json','utf8'));
execSync('git show origin/main:apps/mobile/tests/__snapshots__/engine-golden-master.json > /tmp/old.json');
const old=JSON.parse(readFileSync('/tmp/old.json','utf8'));
let moved=0; for(const k of Object.keys(old)) if(JSON.stringify(cur[k])!==JSON.stringify(old[k])){moved++;console.log('MOVED existing key:',k)}
console.log('existing archetypes moved (want 0):',moved,'| new discipline keys added:',Object.keys(cur).length-Object.keys(old).length);
"   # Expect: 0 moved, 3 added.
cd apps/mobile && npm test   # green incl. wp49-discipline-diagnosis.js
cd /Users/simondring/Code/hybrid-react && git add -A && git commit -m "WP-49 (Plan 2 T1): discipline demand feeds the diagnosis (keyed on profile.discipline); existing plans byte-identical"
```

---

### Task 2: Discipline-driven `resolveProgram` for the discipline cohort

**Files:**
- Modify: `packages/engine/src/lib/strength/program.js` (add a discipline branch BEFORE the legacy style branch, guarded by `profile.discipline`)
- Test: `apps/mobile/tests/wp49-discipline-program.js`

**Interfaces:**
- Consumes: `getDiscipline(profile.discipline)`, `resolveIntents` (existing), `volumeToleranceOf`.
- Produces: for a `profile.discipline` profile, `resolveProgram` returns `{ goalType:'build', style:<discipline id>, discipline, emphasis, exercisePriority (from discipline.priorityLifts), priorityByIntent, volumeScalar, power (from discipline.demand.explosiveStrength>0.6), level }`. Profiles WITHOUT `discipline` fall through to the unchanged legacy branch.

- [ ] **Step 1: Write the failing test** — assert `resolveProgram({...build..., discipline:'powerlifting'}).exercisePriority` leads with the powerlifting priority lifts (back_squat/bench/deadlift), and `.power===false`; and `resolveProgram({...build..., discipline:'olympic'}).power===true`. Import `resolveProgram` from `@performance-os/engine`.
- [ ] **Step 2: Run RED** — the discipline branch doesn't exist; `resolveProgram` returns the legacy style shape (no `discipline`, wrong priority order).
- [ ] **Step 3: Implement** — in `program.js`, immediately after the sport branch and before `let style = profile.strength_style`, add:
```js
const disc = profile.discipline ? getDiscipline(profile.discipline) : null;
if (disc) {
  const equip = availableEquip(profile.access || []);
  const lvlNum = LEVELS[level] ?? LEVELS.intermediate;
  // priority from the discipline's ordered lifts (filtered to what the athlete can do)
  const { list, byIntent } = resolveDisciplineLifts(disc, equip, lvlNum);   // see below
  return {
    goalType:'build', style: disc.id, discipline: disc.id,
    emphasis: emphasisFromAccessoryPatterns(disc),   // gentle per-muscle from accessoryPatterns; {} if none
    volumeScalar: 1.0 * volumeToleranceOf(profile),
    power: (disc.demand.explosiveStrength || disc.demand.power || 0) >= 0.6,
    sport:null, season:null, level, exercisePriority:list, priorityByIntent:byIntent,
  };
}
```
Implement `resolveDisciplineLifts(disc, equip, lvlNum)` (map `disc.priorityLifts` to the `{list, byIntent}` shape `resolveIntents` produces — reuse `resolveIntents`/the existing priority machinery; the priority lifts become the priority list, competency-filtered) and `emphasisFromAccessoryPatterns(disc)` (return `{}` for v1 unless a pattern clearly maps to a muscle-emphasis; keep minimal — YAGNI). Verify the `{list, byIntent}` shape against what the allocator consumes (`ctx.exercisePriority`, `ctx.priorityByIntent`).
- [ ] **Step 4: Run GREEN.**
- [ ] **Step 5: Byte-identical for existing keys** (existing archetypes have no `discipline` → legacy branch → unchanged; the 3 discipline archetypes' programs change but their plans are still legacy-selected until Task 3 — regen the golden, assert 0 EXISTING keys moved; the 3 discipline keys MAY move as their program changes — that's expected/additive). Full suite green. Commit.

---

### Task 3: Open the diagnosis gate for the discipline cohort (steer selection)

**Files:**
- Modify: `packages/engine/src/lib/plan/allocator.js` (`diagnosisSteers`)
- Modify: `packages/engine/src/lib/PlanGenerator.js` (pass the discipline cohort to `diagnosisSteers`)
- Test: `apps/mobile/tests/wp49-discipline-steers.js`

**Interfaces:**
- Consumes: `diagnosisSteers({ style, sport, priorityQualities, categoryPlan, discipline })`.
- Produces: a discipline-cohort build plan carries `meta.diagnosis` and its selection is diagnosis-driven (priority qualities + discipline priority lifts), NOT legacy greedy fill.

- [ ] **Step 1: Write the failing test** — assert `generatePlan(powerliftingProfile).meta.diagnosis` exists AND the plan's main lifts are drawn from the powerlifting priority lifts (squat/bench/deadlift lead the sessions); assert a NON-discipline build profile still has NO `meta.diagnosis` (unchanged).
- [ ] **Step 2: Run RED** — the gate requires `style==='sport'`.
- [ ] **Step 3: Implement** — extend `diagnosisSteers` to also return true for the discipline cohort:
```js
export function diagnosisSteers({ style, sport, priorityQualities = [], categoryPlan = null, discipline = null } = {}) {
  if (discipline && priorityQualities.length > 0) return true;   // WP-49: build disciplines steer, like the D11 sports
  return style === 'sport' && ((priorityQualities.length > 0 && D11_SPORTS.has(sport)) || !!categoryPlan);
}
```
In `PlanGenerator.js`, the `diagnosisSteers({...})` call (search it) must pass `discipline: program.discipline || null`. Confirm `program.discipline` is set by Task 2's resolveProgram.
- [ ] **Step 4: Run GREEN.**
- [ ] **Step 5: Golden** — existing archetypes unchanged (no discipline). The 3 discipline archetypes' PLANS now change (diagnosis-steered) — regen, assert 0 EXISTING keys moved, and **audit the 3 discipline plans by hand**: does the powerlifting plan lead with S/B/D? does hypertrophy spread volume across muscles? does Olympic feature the classic lifts (now selectable because `ctx.discipline==='olympic'` un-gates them)? Record the audit in the commit message. Full suite green. Commit.

---

### Task 4: Discipline periodisation + dose

**Files:**
- Modify: `packages/engine/src/lib/plan/periodization.js` (`resolvePeriodization` — discipline branch)
- Modify: the dose seam (`packages/engine/src/data/doseSchemes.js` consumer or `allocator.js` where `doseForQuality`/scheme is chosen) to honour the discipline's `doseCharacter`
- Test: `apps/mobile/tests/wp49-discipline-periodization.js`

**Interfaces:**
- Consumes: `getDiscipline(profile.discipline).periodization`, `.doseCharacter`.
- Produces: a discipline profile's `resolvePeriodization` returns the discipline's block template; its main-lift dose reflects `doseCharacter` (powerlifting low-rep/long-rest, hypertrophy moderate-rep/short-rest, Olympic low-rep explosive).

- [ ] **Step 1: Write the failing test** — assert `resolvePeriodization(powerliftingProfile)` equals the powerlifting discipline's `periodization.off` template (weeks + deloads), and that a generated powerlifting plan's main lifts use a low-rep scheme (e.g. reps ≤ 5) while a hypertrophy plan's use a moderate scheme (reps ≥ 6). Import via `@performance-os/engine`.
- [ ] **Step 2: Run RED.**
- [ ] **Step 3: Implement** — in `resolvePeriodization`, before the legacy `strength_style` branch, add: `const disc = profile.discipline ? getDiscipline(profile.discipline) : null; if (disc) { const season = 'off'; /* build has no season; meet overlay handled by the existing race-taper when event_date present */ return disc.periodization[season] || disc.periodization.off; }`. For dose: read where the allocator selects the rep/RPE/rest scheme; thread the discipline's `doseCharacter` in for main/accessory roles (follow the existing `doseForQuality`/scheme-selection pattern — verify it first; keep the change minimal and role-keyed).
- [ ] **Step 4: Run GREEN.**
- [ ] **Step 5: Golden** — existing unchanged; the 3 discipline plans update (periodisation + dose) — regen, assert 0 existing moved, audit the 3. Full suite green. Commit. (KSV bump only if you edited `data/doseSchemes.js`; if the dose is threaded via lib/ logic, no bump.)

---

### Task 5: Secondary-goal accessory injection

**Files:**
- Create: `packages/engine/src/lib/plan/secondaryGoalInjection.js`
- Modify: `packages/engine/src/lib/plan/allocator.js` (call the injection in the accessory-fill phase only)
- Modify: `packages/engine/src/lib/PlanGenerator.js` (thread `profile.secondaryGoals` into the allocator ctx)
- Test: `apps/mobile/tests/wp49-secondary-goals.js`

**Interfaces:**
- Consumes: `getSecondaryGoal(id)` for each of `profile.secondaryGoals`.
- Produces: the accessory tail of a session gains the secondary goals' corrective work + gentle emphasis; the MAIN lifts + their dose are provably unchanged vs the same profile without secondary goals.

- [ ] **Step 1: Write the failing test** — for a powerlifting profile, generate the plan WITH `secondaryGoals:['posture']` and WITHOUT. Assert: (a) the main/primary items (the priority lifts + their sets) are IDENTICAL between the two (secondary goals never touch the main work); (b) the WITH plan's accessory tail contains posture corrective work (a face_pull / rear-delt / thoracic item) the WITHOUT plan lacks. This directly encodes the spec §5 hard rule.
- [ ] **Step 2: Run RED** — secondary goals aren't wired; the two plans are identical.
- [ ] **Step 3: Implement** — `secondaryGoalInjection(items, { goals, slot, ... })` biases ONLY the accessory/finisher slots (never role==='primary', never the discipline priority lifts), adding each active goal's `accessoryPreferences` where room remains and applying `emphasisModifier` only to accessory scoring. Call it in the allocator's accessory-fill phase (after the primary/priority anchors are placed). Thread `ctx.secondaryGoals` from PlanGenerator. Authority order (spec §5): safety > discipline main work > diagnosis priorities > secondary corrective — so injection runs LAST and only in leftover accessory budget.
- [ ] **Step 4: Run GREEN** — main work identical, accessory tail differs.
- [ ] **Step 5: Golden** — existing archetypes (no secondaryGoals) unchanged; add ONE archetype with a secondary goal to the matrix (additive) to pin the behaviour. Full suite green. Commit.

---

### Task 6: THE FLIP — map legacy styles, remove the legacy path, onboarding + migration

**Files:**
- Modify: `packages/engine/src/lib/strength/program.js` (remove the legacy style branch), `periodization.js` (remove per-style PROFILES for build), `packages/engine/src/data/goalDemand.js` (retire / re-point to disciplines), `priorityIntents.js` (BUILD_INTENTS removal if now unused)
- Modify: `apps/mobile/src/screens/onboarding/*` (discipline picker replacing the style choice + secondary-goals multi-select) — real theme vars only
- Modify: `apps/mobile/src/lib/onboardingModel.js` (map + carry `discipline` + `secondaryGoals`), the migration for existing profiles
- Modify: `apps/mobile/tests/golden-master.js` (existing build archetypes now carry a `discipline` mapped from their old style)
- Test: `apps/mobile/tests/wp49-build-flip.js`, `apps/mobile/tests/wp49-sports-unchanged.js`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: EVERY build profile now routes through the discipline path; the legacy volume-first build path is deleted; existing users are migrated (`strength_style → discipline`).

- [ ] **Step 1: Write the failing tests**
  - `wp49-sports-unchanged.js`: snapshot a set of SPORT + NON-build archetype plans; assert generating them is byte-identical to a captured baseline (this is the regression guard — sports must NOT move in the flip).
  - `wp49-build-flip.js`: a legacy-shaped profile (`strength_style:'strength'`, NO `discipline`) now produces a diagnosis-driven powerlifting plan (`meta.diagnosis` present; main lifts = S/B/D) — because the mapping routes it to the discipline path.
- [ ] **Step 2: Run RED** — a `strength_style` profile still hits the legacy path (no diagnosis).
- [ ] **Step 3: Implement the mapping + removal**
  - In `resolveProgram`/`resolvePeriodization`/`derivePerformanceModel`, when `profile.discipline` is absent, DERIVE it from the legacy style: `strength → powerlifting`, `bodybuilding → hypertrophy`, `functional → hypertrophy` (and add `conditioning` to secondaryGoals). Put this map in ONE place (`disciplineIdFor` in disciplineDemand.js — extend it to read `profile.strength_style`), so every consumer routes legacy profiles to a discipline.
  - DELETE the legacy build branch in `resolveProgram` (the `strength_style → emphasis/BUILD_INTENTS` block), the per-style `PROFILES` build branch in `resolvePeriodization`, and retire `GOAL_DEMAND`/`goalDemandProfile` if now unused (or re-point it at the discipline demands). Remove `BUILD_INTENTS` if dead. Verify with a grep that nothing else imports the removed symbols.
  - Onboarding (`apps/mobile`): replace the strength-style question with a discipline picker (hypertrophy/powerlifting/Olympic + short descriptions) and add the secondary-goals multi-select; write `discipline` + `secondaryGoals` to the profile via the store→Sync path. Real theme vars only.
  - Migration: existing stored profiles have `strength_style` but no `discipline` — the `disciplineIdFor` fallback (above) handles them at read time, so no destructive data migration is required; onboarding re-writes `discipline` on next edit. (Confirm no code hard-requires `discipline` to be present.)
- [ ] **Step 4: Run GREEN** — both new tests pass.
- [ ] **Step 5: THE GOLDEN RE-BASELINE (intentional + audited)**
  - Update the golden matrix: existing `build·strength·*` / `build·bodybuilding·*` / `build·functional·*` archetypes now carry the mapped `discipline` (or rely on the legacy-style fallback). Regenerate with `UPDATE=1`.
  - **Sports regression:** run `wp49-sports-unchanged.js` → the sport/non-build archetypes are byte-identical. Also assert via the by-key diff that ONLY build archetype keys moved.
  - **Audit every moved build archetype:** for each, read the new plan and confirm it reads as a coherent programme for its mapped discipline (powerlifting = S/B/D-centred, weak-lift-targeted; hypertrophy = per-muscle-balanced volume; Olympic = classic lifts + positions). Record the audit summary in the commit message. This replaces the byte-identical gate for build.
  - KSV bump for any `data/` change (goalDemand retirement) + ratchet re-baseline.
- [ ] **Step 6: Full suite + commit + open PR (do NOT merge — controller finishes the branch after the final review)**

```bash
cd apps/mobile && npm test   # all green
cd /Users/simondring/Code/hybrid-react && git add -A
git commit -m "WP-49 (Plan 2 T6): FLIP build to the discipline engine + remove the legacy volume-first path (audited golden re-baseline; sports byte-identical)"
```

---

## Self-Review

**Spec coverage:** §4 flip mechanics → Tasks 1–4; §5 secondary goals → Task 5; §6 removal/migration + onboarding → Task 6; §7 testing (large intentional golden re-baseline + sports byte-identical) → Task 6 Step 5 (+ per-task byte-identical-for-existing gates); §8 phasing → the task order. §2/§3/§9 (knowledge + Olympic catalogue) delivered in Plan 1.

**The inverted contract is explicit:** Tasks 1–5 keep existing archetypes byte-identical (the discipline path is keyed on the new field / new archetypes); Task 6 is the deliberate flip with a sports-unchanged regression + a per-discipline audit. This is the single riskiest task — its Step 5 audit is mandatory, not optional.

**Placeholder scan:** helper functions (`resolveDisciplineLifts`, `emphasisFromAccessoryPatterns`, `demandVectorToProfile`, `secondaryGoalInjection`) are named with a described contract; each task says to verify the exact shape against the real consumer before writing (the `{list,byIntent}` and demand-profile shapes especially). No "handle edge cases" placeholders.

**Type consistency:** `disciplineIdFor`/`disciplineDemandFor` (Task 1) reused in Task 6's legacy mapping; `program.discipline` (Task 2) consumed by `diagnosisSteers`'s `discipline` param (Task 3); `ctx.secondaryGoals` (Task 5) threaded from PlanGenerator.

**Executor notes:**
- KSV bumps ONLY on `data/**` or `entries.js` edits — most of Plan 2 is lib/ logic (no bump); Task 6's goalDemand retirement does bump. Don't over-bump.
- If any Task 1–5 byte-identical-for-existing check shows an EXISTING key moved, STOP — the discipline path leaked into a legacy profile (a mapping fired too early); fix the guard before continuing.
- Task 6 changes live plans for every build user — the audit + sports-regression are the gate. Surface the audit to the human before merge.
