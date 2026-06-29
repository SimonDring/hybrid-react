# SKB-driven onboarding + decision engine — design

_Date: 2026-06-29. Status: approved design (pre-implementation)._

## Context & goal

We shipped a **Sport Knowledge Base (SKB)** — evidence-tagged per-sport JSON profiles
(`packages/engine/src/data/sport-knowledge/`) with a schema + accessor
(`packages/engine/src/lib/sportKnowledge/`). It is currently **inert**: nothing reads it.

Goal: make the SKB the **single source of truth for sports** so that

1. Onboarding offers **only fully-authored sports**, and **a newly-authored sport appears
   automatically** once its JSON is committed.
2. The SKB **drives plan generation** (gym programming) and the **adaptive runtime**
   (decision rules, readiness weighting, load management).

Today a "sport" is defined in **three** disconnected places, which this work unifies:

- `apps/mobile/src/components/OnboardingWizard.jsx` — a hardcoded `SPORTS` list (run/cycle/swim).
- `packages/engine/src/lib/sports/*.js` — the thin engine modules the generator reads
  (`emphasis`, `priorityExercises`, `power`, `seasonModifiers`, `periodization`).
- `apps/mobile/src/data/sports/index.js` + `athletePillars.js` — the Atlas radar pillar map.

After this work, all three read the SKB. The thin `sports/*.js` modules and the Atlas
`data/sports/index.js` map are **retired**.

## Confirmed decisions

| # | Decision | Choice |
|---|---|---|
| 1 | How the SKB drives gym programming | Add a `gymProgramming` block to each profile; engine reads it; **retire** thin `sports/*.js` |
| 2 | Onboarding dropdown gate | **Fully authored** (`completeness().complete`); new authored JSON auto-appears |
| 3 | Integration depth | **Everything**: generation + decisionRules + readinessModel + loadManagement |
| 4 | Existing data | Back-compat map `swim→swimming`; `run`/`cycle` fall back to a generic plan gracefully |
| 5 | `trainingLoad.js` per-sport refactor | **In scope** |
| 6 | Atlas radar | **Fold in** — drive pillars from the SKB; retire `data/sports/index.js` |

## Architecture & data flow

```
SKB profiles (JSON)
  ├─ sportKnowledge.selectable() ─────→ Onboarding dropdown (complete sports only, data-driven chips)
  ├─ gymProgramming ──────────────────→ resolveProgram / resolvePeriodization → generatePlan
  ├─ decisionRules (structured) ──────→ evaluateRules() → PlanService weekly reflow
  ├─ readinessModel ──────────────────→ computeReadiness() weighting
  ├─ loadManagement ──────────────────→ trainingLoad thresholds + deload
  └─ atlas.pillars ───────────────────→ Atlas radar
```

**Single rule for adding a sport:** author a JSON, fill all sections (incl. `gymProgramming`),
commit. `completeness().complete` flips true → it appears in onboarding and is fully
engine-playable. No code changes anywhere.

## Component 1 — Schema additions (`sportKnowledge/schema.js`)

### 1a. `gymProgramming` (new required section)

The engine-facing block — the old `SportModule` shape, now living inside the profile:

```
gymProgramming: {
  emphasis:        { <muscle>: <multiplier> },     // engine muscle set only (chest/back/shoulders/
                                                    //   biceps/triceps/quads/hamstrings/glutes/calves/core)
  priorityExercises: [ <exerciseId>, ... ],         // ordered; scored ×1.35 in the allocator
  power:           <boolean>,
  seasonModifiers: { off, pre, in, transition },    // volume × per season
  periodization:   { off, pre, in, transition: BlockTemplate },
  byDiscipline?:   { <disc>: { emphasis?, priorityExercises?, periodization? } }
}
```

- Validated by logic ported from `sports/_schema.js` (`validateSportModule`). `SPORT_BLOCKS`
  and `DEFAULT_SEASON_VOLUME` move into the SKB layer (`sportKnowledge/blocks.js`).
- **`completeness()` now requires `gymProgramming`** → "fully authored" ⇒ "engine-playable".
- Grip/rotational distinctiveness (hurling) expresses through `priorityExercises`
  (farmer carry, wrist roller, rotational throws), since the engine's muscle set has no
  "forearm" landmark — `emphasis` stays within the engine's muscle vocabulary.

### 1b. Structured `decisionRules` (extend existing array)

Each rule keeps its human `if`/`then` (for display + provenance) and **adds** a
machine-readable pair from a **fixed vocabulary**:

```
{ id, if, then, confidence, source, evidenceLevel?,
  trigger: { signal, op, value },     // e.g. { signal:'competition_within_h', op:'<=', value:48 }
  effect:  { type, params } }         // e.g. { type:'reduce_volume_pct', params:{ pct:45 } }
```

**Signal vocabulary (v1):** `competition_within_h`, `matches_this_week`, `acwr`,
`readiness`, `cmj_drop_pct`, `illness`, `season`, `soreness_region` (param: region).

**Effect vocabulary (v1):**
- _Shipped (session/volume-level, applied by the reflow):_ `reduce_volume_pct`,
  `priming_only`, `force_deload`, `minimal_effective_volume`, `reduce_one_step`,
  `withhold`, `taper`.
- _Reserved (defined + validated, but evaluator no-ops this build — see scope boundary):_
  `exclude_soreness_above`, `reduce_region_eccentric`, `reduce_region_overhead`,
  `cap_high_speed` (the last is a sport-load lever the gym-only engine can't act on yet).

The schema validator checks `trigger.signal` and `effect.type` are in the vocabulary
(unknown ⇒ validation error — fail-fast, like the rest of the SKB). The evaluator applies
shipped effects and safely ignores reserved ones, so authoring a reserved effect is valid
and forward-compatible.

### 1c. Display fields on `meta`

`emoji` (chip icon), optional `disciplines: [{ key, label, hint }]` (drives the onboarding
sub-question for sports that have them — none of the current three do).

### 1d. `atlas.pillars`

`atlas: { pillars: [<pillarId from athletePillars.js>, ...] }` — a curated 6–8 pillar set
per sport (informed by `physicalProfile` importances; curated rather than auto-translated,
for radar quality). Replaces the `SPORTS` map in `apps/mobile/src/data/sports/index.js`.

## Component 2 — Authoring (the three complete sports)

Add `gymProgramming`, structured `trigger`/`effect` on every `decisionRule`, `meta.emoji`,
and `atlas.pillars` to `gaelic_football.json`, `hurling.json`, `swimming.json`. The five
stubs get none of these (they stay incomplete → hidden from onboarding, generic fallback if
ever force-selected). gymProgramming values: football = posterior-chain/power emphasis
(trap-bar, hip thrust, Nordic, Copenhagen, broad jump); hurling = same + rotational/grip
priority lifts; swimming = back/shoulder/core emphasis + pull/prehab priority, power for
starts.

## Component 3 — Onboarding (dynamic)

- `OnboardingWizard.jsx`: replace the hardcoded `SPORTS` with `sportKnowledge.selectable()`.
  Chips render from each profile's `label` + `meta.emoji`.
- Discipline sub-question renders only if the chosen profile has `meta.disciplines`.
- Intent question (compete/recreational/build_base) unchanged.
- `onboardingModel.js` validation: `sport` must be a selectable id.
- **Result today:** dropdown = Gaelic football · Hurling · Swimming.
- The app now imports the engine SKB accessor → **Vite must bundle the JSON** (import
  attributes; pre-verified with esbuild — re-verify with `npm run build`).

## Component 4 — Engine generation (SKB-driven; thin modules deleted)

- `strength/program.js#resolveProgram` and `plan/periodization.js#resolvePeriodization`
  read `sportKnowledge.get(id)?.gymProgramming` instead of `sports.get(id)`. Downstream
  logic (intents/equipment resolution, season volume, block templates) unchanged.
- **ID normalization:** `normalizeSportId(id)` with back-compat map
  `{ swim:'swimming', run:'running', cycle:'cycling' }`, applied wherever `profile.sport`
  is resolved. Onboarding writes canonical SKB ids.
- **Graceful fallback:** unknown / unauthored / stub sport (legacy run/cycle) → generic
  `build` programming, exactly as today.
- **Delete** `packages/engine/src/lib/sports/` (modules + `_schema.js` + `index.js`); move
  shared constants to `sportKnowledge/blocks.js`; update importers (`program.js`,
  `periodization.js`, `plan/constraints.js`) and the barrel.

## Component 5 — Adaptive runtime

### 5a. decisionRules → reflow

New `sportKnowledge`-adjacent `evaluateRules(profile, context)` returns an ordered list of
applicable effects. `PlanService` (the weekly reflow) builds `context` from data it already
has — `readiness`, `acwr`/`acwrSeries`, fixture proximity (`event_date`, `sport_days`),
`matches_this_week`, `illness`, `cmj` — evaluates the selected sport's rules, and applies
the effects to the **current week** (volume scalar, force/relax deload, priming, taper).
Pure, deterministic, sport-agnostic code reading sport-specific rules.

### 5b. readinessModel → Readiness

`computeReadiness(dailyMetrics, logs, readinessModel?)` accepts the sport's
`readinessModel` and weights the inputs it **has data for** (sleep/HRV/RHR) by the sport's
`importance` values. Falls back to the current equal-ish weighting when no model.

### 5c. loadManagement → trainingLoad

Refactor `trainingLoad.js`: the ACWR thresholds + deload policy (today module-level
constants `SWEET_LOW`/`EASE_FROM`/`HIGH` from `kb`) become **parameters** on `loadDecision`
/ `acwr` helpers, sourced from the sport's `loadManagement.acwr` when present, else the
global KB default. In-season volume already flows via `gymProgramming.seasonModifiers`.

## Component 6 — Atlas radar

`apps/mobile/src/lib/atlas/*` read `sportKnowledge.get(id).atlas.pillars` instead of the
local `data/sports/index.js` map; `sportConfigFor` resolves via `sportKnowledge` +
`normalizeSportId`. Pillar **scoring** (`athletePillars.js` + `signals.js`) is unchanged.
**Delete** `apps/mobile/src/data/sports/index.js`. Unknown sport → existing `build` pillar
fallback.

## Scope boundaries (explicit)

- **Rule effects are session/volume-level this build.** Effects that exclude *individual
  exercises* (`exclude_soreness_above`, `reduce_region_eccentric`/`_overhead`) need the
  engine's exercise catalogue (`strengthExercises.js`) to carry soreness-cost / region /
  eccentric tags it lacks today. Those effect types are **defined in the vocabulary but
  deferred** (the evaluator ignores unknown-but-valid effects gracefully) until a follow-up
  tags the catalogue. The shipped effects (taper, volume cut, deload, autoregulate,
  priming) deliver the core value.
- **Readiness factors limited to collected data.** Sport-specific soreness regions
  (hurling grip, swimming shoulder) are represented in the model but **dormant** until the
  app captures localized soreness. Documented honestly, not faked.
- **Stubs stay hidden.** rugby/soccer/running/cycling remain incomplete → not selectable.
  Authoring them is the natural follow-up (each just needs its sections + `gymProgramming`).

## Testing strategy

- **Schema/unit:** validates `gymProgramming` + structured rules + `atlas.pillars`;
  `selectable()` returns only complete sports; `normalizeSportId` mapping; rule-evaluator
  cases (match ≤48h → priming/taper; `matches_this_week≥2` → `reduce_volume_pct`; `acwr>1.5`
  → `force_deload`; `readiness` low → `reduce_one_step`; `illness` → `withhold`).
- **Generation golden-master:** the three sports produce sane, deterministic plans; legacy
  `run`/`cycle`/unknown → valid generic plan.
- **Regression:** retire `tests/sports.js`; update `program-resolution`, `periodization`,
  `training-load`, `sport-*` tests to the SKB; `knowledge.js` + `sport-knowledge.js` pass.
- **App E2E:** `npm run build` (Vite bundles the JSON) + `npm run dev` (onboarding shows the
  three sports; selecting one generates a plan).

## Risk register

| Risk | Mitigation |
|---|---|
| `trainingLoad.js` API change ripples to callers | Keep module-level defaults as fallback; change is additive params; run `training-load` test |
| Vite fails on JSON import attributes in the app bundle | Pre-verified via esbuild; re-verify `npm run build`; fallback to plain `.json` import if needed |
| Deleting thin modules breaks engine imports/tests | Move shared constants first; update all importers in one pass; full engine test sweep |
| Existing run/cycle users silently change plan | Intended + documented (graceful generic fallback); swim→swimming preserved |
| Onboarding chip layout with team-sport labels | Reuse existing `OptionGrid`/`Chip`; labels are short; verify in `dev` |

## File-change map

- **Schema/data:** `sportKnowledge/{schema.js,index.js,blocks.js(new)}`; the three full JSONs
  gain `gymProgramming`/structured rules/`meta.emoji`/`atlas.pillars`.
- **Engine generation:** `strength/program.js`, `plan/periodization.js`, `plan/constraints.js`,
  `packages/engine/index.js`; **delete** `lib/sports/`.
- **Adaptive:** `plan/trainingLoad.js`, `Readiness.js`, `PlanService.js`, new
  `sportKnowledge` rule-evaluator.
- **App:** `components/OnboardingWizard.jsx`, `lib/onboardingModel.js`, `lib/atlas/*`;
  **delete** `data/sports/index.js`.
- **Tests:** new evaluator/selectable/normalize tests; update sport/periodization/load tests;
  retire `tests/sports.js`.
