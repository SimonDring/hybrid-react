# Running SKB profiles (sprint / middle / long) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three fully-authored Sport Knowledge Base profiles — `running_sprint`, `running_middle`, `running_long` — replacing the single `running.json` scaffold, and register them in the SKB so the validator test passes.

**Architecture:** Each profile is a pure-data JSON file in `packages/engine/src/data/sport-knowledge/`, modeled section-for-section on the fully-authored `swimming.json` (the closest analogue — an individual endurance sport). They are registered via one import + one `PROFILES` entry each in `sportKnowledge/index.js`. No runtime consumer or engine rewiring — the SKB is not consumed at runtime yet.

**Tech Stack:** Plain ES-module JSON data; Node (≥20.10 for JSON import attributes; runtime here is Node 26); the existing hand-rolled validator in `packages/engine/src/lib/sportKnowledge/schema.js`; node-run test `apps/mobile/tests/sport-knowledge.js`.

## Global Constraints

- **Schema:** every profile declares all **21 top-level sections** (`SECTIONS` in `schema.js`). Missing a section fails the validator.
- **Energy split sums to ~100 (±2):** sprint `15/55/30`, middle `75/20/5`, long `97/2/1` (aerobic/glycolytic/atpPc).
- **Provenance on every authored item:** each injury, decision rule, KPI, readiness factor and assessment carries `confidence` (`high`/`moderate`/`low`), `evidenceLevel` (`L1`..`L5`) and a non-empty `source`.
- **Importances are 1..10** (physicalProfile qualities and kpiFramework.kpis).
- **KPI limits:** ≤8 `athleteDashboardKpis`, ≤15 `coachDashboardKpis`; `performanceScore.components` weights sum to **1.000**.
- **Privacy rule (binding):** any KPI whose `metric` is a raw vital (`hrv`, `sleep`, `resting_hr`, …) MUST have `coachDashboard:false` AND `teamDashboard:false`. Raw-vital KPIs may be `athleteDashboard:true` only. Enforced by the validator.
- **Completeness (flagship) bars** (`RICH` in `index.js#completeness`): physicalProfile.qualities ≥12, positions ≥3, assessments ≥4, injuryProfile.common ≥3, exerciseLibrary.exercises ≥8, injuryPreventionLibrary ≥2, decisionRules ≥6, references ≥6, kpiFramework.kpis ≥8.
- **Evidence honesty:** real citations only (author + year + journal-level descriptor), no fabricated DOIs/page numbers. Thin areas → label "expert consensus", `confidence:'low'`. Contested science (exact ACWR thresholds) → `confidence:'low'`.
- **Commits are user-gated:** root `CLAUDE.md` says commit only when the user asks. Each task lists a commit step for rhythm, but only run it once the user approves.

## Authoring contract (shared shapes — applies to all three files)

Mirror `swimming.json` **exactly** for the field shapes of every section; only the *values* differ per discipline. Concretely:

- `meta` — `sport`, `category`, `teamOrIndividual:"individual"`, `indoorOutdoor:"outdoor"`, `contactLevel:"none"`, `playersPerSide:1`, season/offseason weeks, frequency strings, `sessionDurationMin:{match,pitch,gym}`, `notes`.
- `physicalProfile.qualities` — use the **same 18 quality keys as swimming** (`maxStrength`, `relativeStrength`, `explosivePower`, `reactiveStrength`, `sprintSpeed`, `acceleration`, `deceleration`, `changeOfDirection`, `aerobicEndurance`, `anaerobicEndurance`, `repeatSprintAbility`, `mobility`, `stability`, `rotationalPower`, `gripStrength`, `neckStrength`, `balance`, `coordination`) **plus** a `durability` key (the current `running.json` scaffold uses it). 19 qualities → clears the ≥12 bar. Each: `{importance, why, confidence, evidenceLevel, source}`.
- `energySystems` — `{aerobicPct, glycolyticPct, atpPcPct, workToRestRatio, matchDemands, heartRateProfile, fatigueProfile, confidence, evidenceLevel, source, notes}`.
- `movementProfile` — same keys as swimming (`primaryPatterns`, `planes`, `jointLoading`, `groundContacts`, `landingDemands`, `throwing`, `jumping`, `cutting`, `rotating`, `overheadActions`, `collisions`, `repeatedImpacts`, `asymmetricLoading`, `dominantMuscleGroups`, `commonDeficiencies`).
- `injuryProfile` — `{common:[…], summary}`; each injury: `{name, incidence, severity, mechanism, highRiskTissues[], riskFactors:{modifiable[],nonModifiable[]}, rtpConsiderations, confidence, evidenceLevel, source}`.
- `positions` — event archetypes; same field shape as swimming positions.
- `assessments` — `{name, category, essential, purpose, frequency, targets:{elite,beginner,youth}, equipment[], wearableEstimable, confidence, evidenceLevel, source}`.
- `developmentPriorities` — `youth`/`development`/`senior`/`elite`/`masters`, each `{highest[],lowest[],trainingEmphasis,commonMistakes[]}`.
- `seasonalModel` — `offSeason`/`preSeason`/`competition`/`playoffs`/`recovery`, each with objective/emphasis/gym frequency/volume/intensity/fatigueTolerance/recoveryEmphasis/testingRecommendations.
- `microcycles` — `oneMatchPerWeek`/`twoMatchesPerWeek`/`tournamentOrCongested` (reframe "match" as "key quality run / race") with the swimming key set.
- `gymPhilosophy` — `transfersWell[]`, `limitedValue[]`, `essentialMovementPatterns[]`, `accessoryPriorities[]`, plus the single-string fields (`singleLegEmphasis`, `olympicLiftingSuitability`, `plyometricEmphasis`, `coreTrainingPhilosophy`, `neckTraining`, `gripTraining`, `rotationalTraining`, `isometricTraining`, `tempoRecommendations`, `velocityRecommendations`).
- `exerciseLibrary` — `{categories[], exercises:[…]}`; each exercise mirrors swimming's full field set. **Reuse real exercise ids** already used by the gym layer where sensible: `nordic_curl`, `rdl`, `trap_bar_dl`, `back_squat`, `hip_thrust`, `power_clean`, `hang_clean`, `depth_jump`, `broad_jump`, `sled_push`, `double_leg_pogo`, `sl_pogo_jump`, `bounding_a_skip`, `split_squat`, `step_up`, `glute_bridge_single_leg`, `sl_calf`, `tibialis_raise`, `lateral_band_walk`, `copenhagen`, `pallof`, `dead_bug`, `sl_hinge`.
- `injuryPreventionLibrary` — `{injury, riskFactors[], warningSigns[], preventativeExercises[], recommendedFrequency, suitableSeason, exercisesToAvoid[], monitoringRecommendations[], evidenceLevel, source, confidence}`.
- `decisionRules` — `{id, if, then, priority, confidence, evidenceLevel, source, appliesTo[]}`.
- `loadManagement` — `{acwr:{model,sweetSpotLow,sweetSpotHigh,highRiskAbove,confidence,evidenceLevel,source}, weeklyProgressionGuideline, gymVolumeRanges:{offSeason,preSeason,inSeason,taper}, minimumEffectiveVolume, maximumAdaptiveVolume, maximumRecoverableVolume, deloadRecommendations, progressionRules, regressionRules, missedSessionRules, confidence, evidenceLevel, source}`.
- `readinessModel` — `{factors:[{name,metric,importance,thresholds:[{when,modifier}],confidence,evidenceLevel,source}], notes}`.
- `coachDashboard` / `athleteDashboard` — same key shapes as swimming (derived/availability only on the coach side — never raw vitals).
- `validation` — `{strongEvidence[], weakEvidence[], areasRequiringExpertJudgement[], areasRequiringFutureResearch[], potentialRisksIfMisimplemented[]}`.
- `references` — `[{key, citation, governingBody, type}]`.
- `kpiFramework` — `{kpis:[…], athleteDashboardKpis:[…], coachDashboardKpis:[…], performanceScore:{range,philosophy,components:[{kpi,weight,rationale}],guardrails[],explainability}, gamification:[…]}`. Private KPIs (`sleep`/`hrv`/`resting_hr`) MUST be `coachDashboard:false, teamDashboard:false`.

### Shared real references (draw ≥6 per file from this pool, + discipline-specific)

Gastin 2001 (energy-system contribution by event duration); Rønnestad & Mujika 2014 and Beattie 2014/2017 and Blagrove 2018 (strength training → running economy/performance); Saunders 2004 (running economy); Saw 2016 (subjective wellness); Milewski 2014 (sleep); Foster (session-RPE); Plews 2013 (HRV trends); Gabbett 2016 + Impellizzeri 2020 / Lolli 2019 (ACWR, contested); Soligard/IOC 2016 (load consensus). Discipline-specific: **sprint** → Petersen 2011 (Nordic hamstring RCT), Morin & Samozino / Haugen (sprint mechanics, force–velocity); **middle** → Billat (interval training), Jones (critical speed); **long** → Mountjoy IOC RED-S consensus 2018/2023, Bennell (bone stress fractures), Alfredson / Silbernagel (Achilles eccentric loading), Barton (patellofemoral).

### Per-discipline values

**physicalProfile importances** (the discipline fingerprint — assign these exact values):

| quality | sprint | middle | long |
|---|---|---|---|
| maxStrength | 8 | 6 | 5 |
| relativeStrength | 8 | 8 | 8 |
| explosivePower | 10 | 6 | 4 |
| reactiveStrength | 9 | 8 | 7 |
| sprintSpeed | 10 | 6 | 4 |
| acceleration | 10 | 5 | 3 |
| deceleration | 5 | 3 | 2 |
| changeOfDirection | 3 | 2 | 2 |
| aerobicEndurance | 3 | 9 | 10 |
| anaerobicEndurance | 7 | 9 | 5 |
| repeatSprintAbility | 4 | 5 | 3 |
| mobility | 7 | 6 | 6 |
| stability | 7 | 7 | 7 |
| rotationalPower | 4 | 3 | 2 |
| gripStrength | 2 | 2 | 2 |
| neckStrength | 2 | 2 | 2 |
| balance | 4 | 4 | 4 |
| coordination | 8 | 7 | 6 |
| durability | 3 | 6 | 9 |

**energySystems:** sprint `aerobic 15 / glycolytic 55 / atpPc 30` (ATP-PC for 100 m, glycolytic for 200–400 m; `confidence:'moderate', evidenceLevel:'L2', source:'Gastin 2001 (event-duration energy contribution)'`). middle `75 / 20 / 5` (`moderate/L2/Gastin 2001`). long `97 / 2 / 1` (`high/L2/Gastin 2001`).

**positions:** sprint → `100 m (pure speed/power)`, `200 m (speed + speed-endurance)`, `400 m (speed-endurance / lactate tolerance)`. middle → `800 m (anaerobic-biased)`, `1500 m (mixed aerobic/anaerobic)`, `3000–5000 m (aerobic-biased)`. long → `10 km`, `Half / Marathon`, `Ultra / Trail`.

**injuryProfile.common (≥3 each):**
- sprint: hamstring strain (high-speed running, biceps femoris) — `confidence:'high', evidenceLevel:'L2', source:'Askling; hamstring-strain literature'`; quadriceps (rectus femoris) strain; hip-flexor strain; (patellar tendinopathy). Summary: acute high-force, hamstring-led.
- middle: hamstring strain; Achilles tendinopathy; patellofemoral pain; tibial bone stress. Summary: mixed acute + overuse.
- long: Achilles tendinopathy (`Alfredson/Silbernagel`); bone stress fracture + low energy availability / RED-S note (`Mountjoy IOC 2018; Bennell`); patellofemoral pain (`Barton`); ITB syndrome; plantar fasciopathy. Summary: overuse-dominant, bone-stress/RED-S systemic risk.

**gymPhilosophy.plyometricEmphasis:** sprint "high (maximal-intent depth jumps, bounds, sprint-specific)"; middle "moderate (reactive/stiffness, dosed against run volume)"; long "low (low-dose pogo/skips for stiffness; avoid high-impact volume on top of mileage)". Olympic lifting: sprint "valuable (power clean/hang clean for triple-extension RFD)"; middle "optional"; long "low priority". Single-leg emphasis: high for middle/long (unilateral running mechanics, hip/calf), moderate-high for sprint.

**exerciseLibrary (≥8 each):** sprint leans `power_clean`/`hang_clean`, `back_squat`, `hip_thrust`, `trap_bar_dl`, `depth_jump`, `broad_jump`, `sled_push`, `bounding_a_skip`, `nordic_curl`, `double_leg_pogo`, `pallof`. long leans `nordic_curl`, `rdl`, `trap_bar_dl`, `split_squat`, `sl_calf`, `tibialis_raise`, `step_up`, `lateral_band_walk`, `copenhagen`, `dead_bug`, `pallof`, `glute_bridge_single_leg` (heavy-but-low-volume + tendon/calf + prehab; minimal plyo). middle blends both.

**kpiFramework distinct metrics (drives the distinctness test):**
- sprint kpis include `metric:'nordic_hamstring'` (eccentric hamstring strength); do **not** include `energy_availability`. Also `metric:'cmj'`/RSI (power), `sprint_time`/`race_time`.
- long kpis include `metric:'energy_availability'` (RED-S / bone health, athlete+coach availability framing); do **not** include `nordic_hamstring`. Also `critical_speed`, `running_economy`, `durability`/availability.
- middle: `critical_speed`, `running_economy`, may include `nordic_hamstring` and/or `energy_availability` (unconstrained by the test). Aerobic % must sit strictly between sprint and long (it does: 75).
- All three: `readiness`, `consistency`, `availability`, `session_rpe`, `acwr`, plus private `sleep`/`hrv`/`resting_hr` (coach=false, team=false).

---

### Task 1: Verification harness (worktree-correct engine resolution + standalone validator)

The worktree has **no `node_modules`**, and per project memory a naive setup resolves `@performance-os/engine` to the *main* repo (which would hide our edits). Create a workspace symlink pointing at the **worktree's** engine, and a small standalone validator the authoring tasks reuse.

**Files:**
- Create (symlink): `node_modules/@performance-os/engine` → `../../packages/engine`
- Create: `scratchpad/validate-skb.mjs` (throwaway; lives in the session scratchpad, not the repo)

- [ ] **Step 1: Create the engine symlink (worktree → worktree, not main)**

```bash
cd /Users/simondring/Code/hybrid-react/.claude/worktrees/mystifying-jepsen-26a856
mkdir -p node_modules/@performance-os
ln -sf ../../packages/engine node_modules/@performance-os/engine
```

- [ ] **Step 2: Write the standalone validator**

Path: `/private/tmp/claude-501/-Users-simondring-Code-hybrid-react--claude-worktrees-mystifying-jepsen-26a856/f2b73c5e-daf4-45c0-a988-09cc0d8b9fca/scratchpad/validate-skb.mjs`

```js
import { validateSportProfile } from '@performance-os/engine/lib/sportKnowledge/schema.js';
import { readFileSync } from 'node:fs';

const path = process.argv[2];
const p = JSON.parse(readFileSync(path, 'utf8'));
const errs = validateSportProfile(p);

// mirror of index.js#completeness RICH bars
const RICH = {
  'physicalProfile.qualities': v => Object.keys(v || {}).length >= 12,
  'positions':                 v => (v || []).length >= 3,
  'assessments':               v => (v || []).length >= 4,
  'injuryProfile.common':      v => (v || []).length >= 3,
  'exerciseLibrary.exercises': v => (v || []).length >= 8,
  'injuryPreventionLibrary':   v => (v || []).length >= 2,
  'decisionRules':             v => (v || []).length >= 6,
  'references':                v => (v || []).length >= 6,
  'kpiFramework.kpis':         v => (v || []).length >= 8,
};
const dig = (o, k) => k.split('.').reduce((a, c) => (a == null ? a : a[c]), o);
const thin = Object.keys(RICH).filter(k => !RICH[k](dig(p, k)));

console.log(path);
console.log('structural errors:', errs.length ? errs : 'none');
console.log('thin sections:', thin.length ? thin : 'none — flagship complete');
process.exitCode = errs.length || thin.length ? 1 : 0;
```

- [ ] **Step 3: Prove the harness works against a known-good file**

Run: `node <scratchpad>/validate-skb.mjs packages/engine/src/data/sport-knowledge/swimming.json`
Expected: `structural errors: none` and `thin sections: none — flagship complete`. (If `@performance-os/engine` fails to resolve, the symlink is wrong; re-do Step 1.)

---

### Task 2: Author `running_sprint.json`

**Files:**
- Create: `packages/engine/src/data/sport-knowledge/running_sprint.json`

**Interfaces:**
- Produces: a SportProfile with `id:"running_sprint"` consumed by Task 5's `index.js` import and the distinctness assertions (`explosivePower`, `aerobicEndurance`, `durability` importances; `energySystems.atpPcPct`/`aerobicPct`; a `nordic_hamstring` KPI and **no** `energy_availability` KPI).

- [ ] **Step 1: Author the file** — all 21 sections, mirroring `swimming.json` shapes, using the sprint column of the values tables above. `id:"running_sprint"`, `schemaVersion:"1.0.0"`, `label:"Running — sprint (100–400 m)"`, `lastReviewed:"2026-06-29"`. Energy `15/55/30`. Include ≥3 positions, ≥3 injuries (hamstring-led), ≥4 assessments (incl. 30 m flying sprint + Nordbord/eccentric hamstring + CMJ/RSI), ≥8 exercises (power/plyo-led), ≥2 prehab entries (hamstring, hip-flexor/quad), ≥6 decision rules (incl. `low_readiness_autoregulate`, `illness_no_training`, `acwr` spike, `taper`, `race_day_priming_only`, `hamstring_soreness_reduce_max_velocity`, `no_heavy_lower_before_speed`), ≥6 references, ≥8 KPIs (incl. `nordic_hamstring`, `cmj`, `race_time`; private `sleep`/`hrv`/`resting_hr` coach=false). `performanceScore.components` weights sum to 1.000; ≤8 athlete / ≤15 coach KPIs.

- [ ] **Step 2: Validate standalone**

Run: `node <scratchpad>/validate-skb.mjs packages/engine/src/data/sport-knowledge/running_sprint.json`
Expected: `structural errors: none` and `thin sections: none — flagship complete`. Fix any reported errors/thin sections inline and re-run until clean.

- [ ] **Step 3: Commit** (user-gated)

```bash
git add packages/engine/src/data/sport-knowledge/running_sprint.json
git commit -m "feat(skb): author running_sprint flagship profile"
```

---

### Task 3: Author `running_middle.json`

**Files:**
- Create: `packages/engine/src/data/sport-knowledge/running_middle.json`

**Interfaces:**
- Produces: a SportProfile with `id:"running_middle"`; `energySystems.aerobicPct` strictly between sprint (15) and long (97) — value 75.

- [ ] **Step 1: Author the file** — 21 sections, middle column. `id:"running_middle"`, `label:"Running — middle distance (800 m–5 km)"`, `lastReviewed:"2026-06-29"`. Energy `75/20/5`. positions 800/1500/3-5k; injuries mixed (hamstring, Achilles, PFP, tibial bone stress); assessments incl. critical speed / lactate / VO₂ + CMJ + eccentric hamstring; exercises blend strength-for-economy + reactive; ≥6 decision rules (shared monitoring set + `achilles_soreness_reduce_plyo`, `inseason_minimal_effective_strength`); KPIs incl. `critical_speed`, `running_economy` (+ may include `nordic_hamstring`/`energy_availability`); private vitals coach=false; weights sum to 1.000.

- [ ] **Step 2: Validate standalone**

Run: `node <scratchpad>/validate-skb.mjs packages/engine/src/data/sport-knowledge/running_middle.json`
Expected: `structural errors: none`; `thin sections: none — flagship complete`. Fix + re-run until clean.

- [ ] **Step 3: Commit** (user-gated)

```bash
git add packages/engine/src/data/sport-knowledge/running_middle.json
git commit -m "feat(skb): author running_middle flagship profile"
```

---

### Task 4: Author `running_long.json`

**Files:**
- Create: `packages/engine/src/data/sport-knowledge/running_long.json`

**Interfaces:**
- Produces: a SportProfile with `id:"running_long"`; `explosivePower` importance 4 (< sprint 10), `aerobicEndurance` 10 (> sprint 3), `durability` 9 (> sprint 3); `energySystems` `97/2/1`; an `energy_availability` KPI and **no** `nordic_hamstring` KPI.

- [ ] **Step 1: Author the file** — 21 sections, long column. `id:"running_long"`, `label:"Running — long distance (10 km+)"`, `lastReviewed:"2026-06-29"`. Energy `97/2/1`. positions 10k/half-marathon/ultra; injuries overuse-dominant with a bone-stress + RED-S entry (`Mountjoy IOC 2018; Bennell`) and Achilles (`Alfredson`); assessments incl. critical speed/threshold, calf endurance, single-leg, energy-availability/bone-health screen; exercises = heavy-low-volume strength + calf/tendon + prehab, minimal plyo; ≥6 decision rules (shared set + `bone_stress_warning_offload_refer`, `low_energy_availability_flag`, `achilles_soreness_reduce_calf_plyo`, `no_heavy_strength_before_key_run`); KPIs incl. `energy_availability`, `critical_speed`, `running_economy`, `durability` (NO `nordic_hamstring`); private vitals coach=false; weights sum to 1.000.

- [ ] **Step 2: Validate standalone**

Run: `node <scratchpad>/validate-skb.mjs packages/engine/src/data/sport-knowledge/running_long.json`
Expected: `structural errors: none`; `thin sections: none — flagship complete`. Fix + re-run until clean.

- [ ] **Step 3: Commit** (user-gated)

```bash
git add packages/engine/src/data/sport-knowledge/running_long.json
git commit -m "feat(skb): author running_long flagship profile"
```

---

### Task 5: Register the three, drop `running.json`, update + run the SKB test

**Files:**
- Modify: `packages/engine/src/lib/sportKnowledge/index.js` (imports + `PROFILES`)
- Delete: `packages/engine/src/data/sport-knowledge/running.json`
- Modify: `apps/mobile/tests/sport-knowledge.js` (coverage list, FLAGSHIPS, scaffold loop, + distinctness block)

**Interfaces:**
- Consumes: `running_sprint`/`running_middle`/`running_long` from Tasks 2–4.

- [ ] **Step 1: Update the test FIRST (it should fail before the wiring exists)**

In `apps/mobile/tests/sport-knowledge.js`:

Registry-coverage list (was `['gaelic_football', 'hurling', 'rugby', 'soccer', 'running', 'cycling', 'swimming']`):
```js
for (const id of ['gaelic_football', 'hurling', 'rugby', 'soccer', 'running_sprint', 'running_middle', 'running_long', 'cycling', 'swimming']) {
  assert(skb.has(id), `registry contains "${id}"`);
}
```

FLAGSHIPS (was `['gaelic_football', 'hurling', 'swimming']`):
```js
const FLAGSHIPS = ['gaelic_football', 'hurling', 'swimming', 'running_sprint', 'running_middle', 'running_long'];
```

Scaffold loop (was `['rugby', 'soccer', 'running', 'cycling']`):
```js
for (const id of ['rugby', 'soccer', 'cycling']) {
```

Add a distinctness block after the swimming checks (around line 47):
```js
// ── running disciplines are genuinely DISTINCT events, not one 'running' profile ──
const rsp = skb.get('running_sprint');
const rmd = skb.get('running_middle');
const rlg = skb.get('running_long');
assert(rsp.physicalProfile.qualities.explosivePower.importance > rlg.physicalProfile.qualities.explosivePower.importance,
  `sprint weights explosive power higher than long (${rsp.physicalProfile.qualities.explosivePower.importance} > ${rlg.physicalProfile.qualities.explosivePower.importance})`);
assert(rlg.physicalProfile.qualities.aerobicEndurance.importance > rsp.physicalProfile.qualities.aerobicEndurance.importance,
  `long weights aerobic endurance higher than sprint (${rlg.physicalProfile.qualities.aerobicEndurance.importance} > ${rsp.physicalProfile.qualities.aerobicEndurance.importance})`);
assert(rlg.physicalProfile.qualities.durability.importance > rsp.physicalProfile.qualities.durability.importance,
  `long weights durability higher than sprint (${rlg.physicalProfile.qualities.durability.importance} > ${rsp.physicalProfile.qualities.durability.importance})`);
assert(rsp.energySystems.atpPcPct > rlg.energySystems.atpPcPct && rlg.energySystems.aerobicPct > rsp.energySystems.aerobicPct,
  `sprint is ATP-PC/glycolytic-led, long aerobic-dominant (sprint atpPc ${rsp.energySystems.atpPcPct} vs long ${rlg.energySystems.atpPcPct}; long aerobic ${rlg.energySystems.aerobicPct} vs sprint ${rsp.energySystems.aerobicPct})`);
assert(rmd.energySystems.aerobicPct > rsp.energySystems.aerobicPct && rmd.energySystems.aerobicPct < rlg.energySystems.aerobicPct,
  `middle sits between sprint and long on the aerobic axis (${rsp.energySystems.aerobicPct} < ${rmd.energySystems.aerobicPct} < ${rlg.energySystems.aerobicPct})`);
const sprintMetrics = rsp.kpiFramework.kpis.map(k => k.metric);
const longMetrics = rlg.kpiFramework.kpis.map(k => k.metric);
assert(sprintMetrics.includes('nordic_hamstring') && !longMetrics.includes('nordic_hamstring'),
  'sprint carries a Nordic-hamstring eccentric-strength KPI that long does not');
assert(longMetrics.includes('energy_availability') && !sprintMetrics.includes('energy_availability'),
  'long carries an energy-availability (RED-S/bone) KPI that sprint does not');
```

- [ ] **Step 2: Run the test — expect failure (running.json still wired; new ids absent)**

Run: `node apps/mobile/tests/sport-knowledge.js`
Expected: FAILs on `registry contains "running_sprint"` (and friends) — the new ids are not yet in the registry.

- [ ] **Step 3: Wire the registry + delete the scaffold**

In `packages/engine/src/lib/sportKnowledge/index.js`, replace the single running import:
```js
import running from '../../data/sport-knowledge/running.json' with { type: 'json' };
```
with three:
```js
import runningSprint from '../../data/sport-knowledge/running_sprint.json' with { type: 'json' };
import runningMiddle from '../../data/sport-knowledge/running_middle.json' with { type: 'json' };
import runningLong from '../../data/sport-knowledge/running_long.json' with { type: 'json' };
```
And the `PROFILES` array (was `[gaelicFootball, hurling, rugby, soccer, running, cycling, swimming]`):
```js
const PROFILES = [gaelicFootball, hurling, rugby, soccer, runningSprint, runningMiddle, runningLong, cycling, swimming];
```
Then delete the scaffold:
```bash
git rm packages/engine/src/data/sport-knowledge/running.json
```

- [ ] **Step 4: Run the SKB test — expect PASS**

Run: `node apps/mobile/tests/sport-knowledge.js`
Expected: every line `PASS`, ending `sport-knowledge tests done`, exit code 0. Fix any failures in the JSON files or test inline and re-run.

- [ ] **Step 5: Regression — the separate gym-biasing layer is untouched**

Run: `node apps/mobile/tests/sports.js`
Expected: all PASS (this layer keys off `run_discipline` and `src/lib/sports/running.js`, which we did not change). If it can't resolve `@performance-os/engine`, the symlink from Task 1 covers it; if it needs another workspace package, symlink that package the same way.

- [ ] **Step 6: Grep for stale references to the old scaffold id**

Run: `grep -rn "sport-knowledge/running.json\|get('running')\|get(\"running\")" packages apps/mobile/src apps/mobile/tests | grep -v node_modules`
Expected: no matches (the only consumer was `index.js`, now updated). If anything turns up, fix it.

- [ ] **Step 7: Commit** (user-gated)

```bash
git add packages/engine/src/lib/sportKnowledge/index.js apps/mobile/tests/sport-knowledge.js
git rm packages/engine/src/data/sport-knowledge/running.json
git commit -m "feat(skb): register running disciplines, retire running scaffold, cover with tests"
```

---

## Self-review (planner)

**Spec coverage:**
- Three flagship files → Tasks 2/3/4. ✓
- Replace running.json + wire index.js → Task 5 (Steps 3, delete). ✓
- Test updates (coverage/FLAGSHIPS/scaffold/distinctness) → Task 5 Step 1. ✓
- Schema conformance (21 sections, provenance, energy sum, KPI limits, privacy, completeness) → Global Constraints + standalone validator (Tasks 2–4 Step 2) + registry test (Task 5 Step 4). ✓
- Evidence policy (real citations, provenance, contested→low) → Global Constraints + references pool. ✓
- Verification (sport-knowledge.js + sports.js regression) → Task 5 Steps 4–5. ✓
- Worktree engine-resolution hazard → Task 1. ✓
- Out-of-scope (no consumer/engine rewiring) → stated in Architecture; no task touches PlanService or `src/lib/sports/`. ✓

**Placeholder scan:** validator code, index.js diff and test diff are shown in full. The JSON file *bodies* are specified by exact values (importance table, energy splits, named positions/injuries/KPIs/decision rules) + "mirror swimming.json shapes" rather than 900 lines of pre-pasted JSON — appropriate for large data-authoring where one reference file (`swimming.json`) fixes every field shape. No "TBD"/"handle edge cases"/"similar to Task N".

**Type/name consistency:** ids `running_sprint`/`running_middle`/`running_long` used identically across index.js, the test, and the authoring tasks. KPI metrics `nordic_hamstring` / `energy_availability` and quality keys `explosivePower`/`aerobicEndurance`/`durability` match between the authoring value tables and the distinctness assertions. PROFILES variable names (`runningSprint`…) consistent between import and array.
