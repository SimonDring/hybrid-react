# Running SKB profiles (sprint / middle / long) — design

**Date:** 2026-06-29
**Status:** approved (design); implementation pending
**Author:** Simon + Claude

## Goal

Add three fully-authored Sport Knowledge Base (SKB) profiles — one per running
discipline — and wire them into the engine's SKB registry:

- `running_sprint`  — 100–400 m
- `running_middle`  — 800 m–5 km
- `running_long`    — 10 km–marathon/ultra

These **replace** the single scaffold `running.json`. The replacement is the
design the existing scaffold itself anticipated — its `_note` reads
*"sprint/middle/long differ markedly … model as disciplines when authored."*

## Why three separate documents (not one)

The three events sit at completely different points on the energy-system and
force–velocity spectrum, with different signature injuries and different gym
philosophies. A single profile would have to average them into mush. The SKB
already has a precedent for splitting closely-related activities into separate
sports: Gaelic football and hurling are modelled as **distinct** profiles. We
follow that precedent here.

Rejected alternative: one `running.json` whose `positions` array holds
sprinter/middle/distance archetypes (the way `swimming.json` holds its event
archetypes). The user wants separate documents, and the GAA precedent supports
it — so three files.

## Background — what the SKB is and the format we replicate

- The SKB lives at `packages/engine/src/data/sport-knowledge/*.json` — pure-data,
  evidence-tagged per-sport profiles. The accessor/registry is
  `packages/engine/src/lib/sportKnowledge/index.js`; the contract/validator is
  `packages/engine/src/lib/sportKnowledge/schema.js`.
- Every profile declares all **21 top-level sections** (see `SECTIONS` in
  `schema.js`): `meta`, `physicalProfile`, `energySystems`, `movementProfile`,
  `injuryProfile`, `positions`, `assessments`, `developmentPriorities`,
  `seasonalModel`, `microcycles`, `gymPhilosophy`, `exerciseLibrary`,
  `injuryPreventionLibrary`, `decisionRules`, `loadManagement`, `readinessModel`,
  `coachDashboard`, `athleteDashboard`, `validation`, `references`, `kpiFramework`.
- The fully-authored reference profiles are `swimming.json`, `gaelic_football.json`
  and `hurling.json`. **Swimming is the closest analogue** (individual endurance
  sport) and is the structural template for all three running files.
- "SKB link integrated into the engine" means the documented *add-a-sport*
  procedure (docs/engine/03-SPORT-KNOWLEDGE-BASE.md): a new JSON file + one import
  + one `PROFILES` array entry in `index.js`, then the validator test passes.
  Nothing in the app consumes the SKB at runtime yet, so no plan-generation
  rewiring is in scope.

## The three profiles — distinct backbones

| | Sprint (100–400 m) | Middle (800 m–5 k) | Long (10 k–marathon/ultra) |
|---|---|---|---|
| `id` | `running_sprint` | `running_middle` | `running_long` |
| `label` | Running — sprint (100–400 m) | Running — middle distance (800 m–5 km) | Running — long distance (10 km+) |
| Energy split (aerobic/glycolytic/atpPc) | 15 / 55 / 30 | 75 / 20 / 5 | 97 / 2 / 1 |
| Lead qualities | explosivePower, maxStrength, sprintSpeed, acceleration, reactiveStrength | aerobicEndurance, anaerobicEndurance, relativeStrength, reactiveStrength | aerobicEndurance, durability, relativeStrength, reactiveStrength |
| Signature injuries | hamstring strain (acute high-force), quad strain, hip flexor, patellar tendon | mixed: hamstring, Achilles, patellofemoral, calf, bone stress | overuse-dominant: Achilles tendinopathy, bone stress / RED-S, patellofemoral, ITB, plantar fascia, calf |
| Gym philosophy | heavy max strength + Olympic/power lifts + maximal plyometrics; high transfer of strength & RFD | strength-for-economy (heavy, low-rep) + reactive/plyo for stiffness; balanced against running volume | minimal-fatigue heavy strength for economy + tendon/calf loading; low/no plyometrics; prehab-led; must never compromise running |
| Distinct KPIs | sprint times, CMJ / RFD, Nordic hamstring strength | race time, critical speed / VO₂, running economy | race time, durability/availability, bone-stress & energy-availability flags |

### Per-discipline notes (the substance each file must capture)

**Sprint (`running_sprint`)**
- ATP-PC/glycolytic-dominant; aerobic contribution small and rising toward 400 m.
- Physical profile: explosive power, max & relative strength, sprint speed,
  acceleration and reactive strength all rated very high; aerobic endurance low.
- Movement: triple extension, maximal-velocity mechanics, block starts, very high
  ground-reaction forces; sagittal-dominant with acute high-force loading.
- Injuries are **acute and high-force** — hamstring strain is the signature injury
  (biceps femoris, high-speed running mechanism), plus quad/hip-flexor and patellar
  tendon. This contrasts sharply with the overuse profile of distance running.
- Gym transfers: heavy squat/trap-bar/hip-thrust, Olympic/power lifts, sprint-
  specific plyometrics (depth jumps, bounds), Nordic curls. Plyometric emphasis
  high.
- `positions`: model as event archetypes — 100 m, 200 m, 400 m (the 400 m carries
  the largest anaerobic/lactate-tolerance demand).

**Middle distance (`running_middle`)**
- Aerobically biased but with a decisive glycolytic/lactate-tolerance component
  (greatest at 800 m, declining toward 5 k).
- Physical profile: aerobic and anaerobic endurance both high, running economy and
  reactive strength important, relative strength supports economy without mass.
- Injuries: a mix of acute and overuse — hamstring, Achilles, patellofemoral,
  calf, early bone stress.
- Gym: heavy low-rep strength for economy (Rønnestad/Beattie/Blagrove) plus
  reactive/plyometric work for tendon stiffness; carefully balanced against high
  running volume. Moderate plyometric emphasis.
- `positions`: 800 m (most anaerobic), 1500 m, 3–5 k (most aerobic).

**Long distance (`running_long`)**
- Almost entirely aerobic.
- Physical profile: aerobic endurance and **durability** (tissue tolerance to high
  mileage) lead; relative strength and reactive strength support economy and tendon
  stiffness; explosive/max strength low priority.
- Injuries: **overuse-dominant** — Achilles tendinopathy, bone stress (tibia,
  metatarsal, femoral neck) with **RED-S / low energy availability** as a key
  systemic risk, patellofemoral pain, ITB syndrome, plantar fasciopathy, calf.
- Gym: minimal-fatigue heavy strength for economy + tendon/calf loading and
  injury prevention; **low or no plyometrics**; prehab-led; strength must never
  add fatigue that degrades running. Plyometric emphasis low.
- `positions`: 10 k, half/marathon, ultra/trail (durability + fuelling emphasis).

## Schema conformance (hard requirements)

1. **All 21 sections present** in each file (validator fails otherwise).
2. **Energy systems sum to ~100** (±2) — the splits above all sum to 100.
3. **Physical-profile importances are 1..10.**
4. **Provenance on every authored item** — each decision rule, injury, KPI and
   readiness factor carries `confidence` (high/moderate/low),
   `evidenceLevel` (L1..L5) and a non-empty `source`.
5. **KPI limits** — ≤8 athlete-dashboard KPIs, ≤15 coach-dashboard KPIs;
   `performanceScore.components` weights sum to 1.000.
6. **Privacy rule (binding)** — any KPI whose `metric` is a raw vital
   (`hrv`, `sleep`, `resting_hr`, …) must have `coachDashboard:false` and
   `teamDashboard:false`. Raw-vital KPIs may be `athleteDashboard:true` only.
7. **Decision rules** — ≥6 well-formed IF/THEN rules per file with provenance.
8. **Completeness** — to register as flagships each file must clear the
   `completeness()` RICH bars in `index.js`: physicalProfile.qualities ≥12,
   positions ≥3, assessments ≥4, injuryProfile.common ≥3,
   exerciseLibrary.exercises ≥8, injuryPreventionLibrary ≥2, decisionRules ≥6,
   references ≥6, kpiFramework.kpis ≥8.

## Wiring changes

`packages/engine/src/lib/sportKnowledge/index.js`:
- Remove the `running` import and its `PROFILES` entry.
- Add three imports (`running_sprint.json`, `running_middle.json`,
  `running_long.json`) and three `PROFILES` entries.

## Test changes

`apps/mobile/tests/sport-knowledge.js`:
- Registry-coverage list (line ~17): drop `'running'`, add `'running_sprint'`,
  `'running_middle'`, `'running_long'`.
- Scaffold loop (line ~50): drop `'running'` (it is no longer a scaffold).
- `FLAGSHIPS` (line ~23): add the three running ids so the completeness + KPI-limit
  + decision-rule assertions cover them.
- Add **distinctness assertions** proving the three are genuinely different sports,
  in the spirit of the existing GAA/swimming checks, e.g.:
  - `running_sprint` weights `explosivePower` higher than `running_long`;
  - `running_long` weights `aerobicEndurance` higher than `running_sprint`;
  - `running_sprint` energy split is glycolytic/ATP-PC-led
    (`atpPcPct` high) while `running_long` is ~97 % aerobic;
  - `running_long` carries a bone-stress / durability-oriented injury or KPI that
    `running_sprint` does not.

## Evidence / citation policy

Cite only **real** literature, at the granularity the existing files use
(author + year + journal-level descriptor, no fabricated DOIs or page numbers).
Where evidence is thin, label **expert consensus** with `confidence:'low'` /
`evidenceLevel:'L4'`/`'L5'`. Contested science (exact ACWR thresholds) tagged
`low` so the engine treats it as a soft input. Citations drawn from:

- Gastin 2001 — energy-system contribution during maximal exercise (event splits).
- Rønnestad & Mujika 2014; Beattie 2014/2017; Blagrove 2018 — strength training &
  running economy / performance (esp. middle & long).
- Petersen 2011 / Nordic-hamstring trials; Askling — hamstring strain prevention
  (sprint).
- Morin & Samozino; Haugen — sprint mechanics / force–velocity (sprint).
- Mountjoy IOC RED-S consensus 2018/2023; Bennell — bone stress & low energy
  availability (long).
- Alfredson; Silbernagel — Achilles tendinopathy eccentric loading.
- Barton — patellofemoral pain.
- Saunders 2004 — running economy.
- Saw 2016 (subjective wellness); Milewski 2014 (sleep); Foster (sRPE);
  Plews 2013 (HRV trends).
- Gabbett 2016 + Impellizzeri 2020 / Lolli 2019 — ACWR (tagged low / contested).

## Verification

- `node apps/mobile/tests/sport-knowledge.js` — all three validate, hit flagship
  completeness, pass privacy + KPI-limit + decision-rule checks, and prove distinct.
- `node apps/mobile/tests/sports.js` — regression for the separate gym-biasing
  layer (`src/lib/sports/running.js` keys off `run_discipline`; untouched here).

## Out of scope (YAGNI)

- No discipline-aware SKB lookup wired into PlanService or any consumer — nothing
  consumes the SKB at runtime yet.
- No changes to the gym-biasing layer (`src/lib/sports/running.js`), the plan
  generator, or onboarding.
- No schema changes to `schema.js`.
