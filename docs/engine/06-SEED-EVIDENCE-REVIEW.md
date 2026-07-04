# 06 — Seed-Evidence Review (H9)

**Scope:** the sports-science review pass mandated by the Phase 3 audit (H9;
§10.4 item 1). Since Sprint 8 the seed-tagged quality / fatigue / transfer
coefficients in the engine's data tables **steer live run & cycle plans** through
the D9→D10→D11 session layer, yet none of them had been reviewed by a human since
they were pattern-derived in Sprints 5–7. Every one carries an honest
`needsReview: true`. This document is that review.

**Reviewer stance:** S&C literature check only. **No engine or data code was
changed** — this is a reviewer's report. Findings are staged for a later,
deliberate data-edit PR.

**Files reviewed (all under `packages/engine/src/data/` unless noted):**
1. `exerciseQualities.js` — class rules, pattern defaults, per-exercise overrides,
   force-velocity + fatigue-cost tags.
2. `qualities.js` — the 10 qualities' `doseResponse` + `fatigueCost`.
3. `qualityMovementMap.js` — quality→movement-pattern map + `CARDIO_GYM_SUPPORT`.
4. `packages/engine/src/lib/plan/selectInterventions.js` — the D11 weights
   (`FATIGUE_BUDGET`, fatigue units, transfer weights, SKB boost, 2/pattern cap).

**How these data feed a live plan (consumption chain, so impact ratings are
grounded):**
- The diagnosis emits **priority qualities**. For an endurance athlete the top
  demand is `aerobicCapacity` (running_long / cycling both rate it importance 10),
  which is not gym-trainable, so `CARDIO_GYM_SUPPORT` translates it into gym
  qualities. A long-distance runner's other top gym priorities are `durability`
  (→`robustness`, importance 9), `relativeStrength` (→`maxStrength`, 8),
  `reactiveStrength` (7) and `stability` (7). **So a runner's gym sessions are
  dominated by robustness + reactiveStrength + maxStrength targets.**
- `sessionObjective.js` (D9) turns a target quality into an intensity zone +
  **fatigue budget**, both read from `qualities.js` `doseResponse` / `fatigueCost`.
- `movementRequirements.js` (D10) reads `qualityMovementMap.js` to turn the target
  quality into required **movement patterns** (minus injury-contraindicated ones).
- `selectInterventions.js` (D11) scores candidates by **tier** (EDS §34) then by
  **transfer-per-fatigue** = quality-match ÷ fatigue-cost, gated by the fatigue
  budget and a 2-per-pattern cap. Tier-1/2 compounds are *filtered to the required
  patterns*. `tierOf`/`valueOf` read the `exerciseQualities.js` tags directly.

Because tier-1/2 compounds are filtered to the D10 required patterns, a **tag ×
movement-map mismatch silently removes an exercise from selection** even though it
is a legitimate driver of the target quality. This is the single most consequential
class of defect found, and it is invisible without cross-referencing the two tables
— exactly what this review does below (§3).

---

## 1. `exerciseQualities.js` — quality / force-velocity / fatigue tags

### 1.1 Findings

**F1 — `lunge` pattern default is internally contradictory. [MED]**
`PATTERN_TAGS.lunge` = `maxStrength (primary)` + `hypertrophy/stability (secondary)`
but `forceVelocity: 'controlled-hypertrophy'`, `fatigueCost: COST.hypertrophy`,
`confidence: 'low'`. A "max-strength **primary**" driver tagged at
controlled-hypertrophy velocity with a hypertrophy fatigue cost is self-contradicting:
the quality role says one thing, the F–V/cost say another. Unilateral loaded strength
(Bulgarian split squat, step-up, walking lunge) is a genuine strength stimulus for
runners/cyclists (unilateral force expression, Speirs 2016 — single-leg vs back squat
transfer to sprint/COD). *Correction:* either demote the quality role to
`hypertrophy` primary / `maxStrength` secondary (consistent with the
hypertrophy velocity/cost), OR keep `maxStrength` primary and lift the F–V to
`maximal-force` and cost to `COST.maxForce` for the loaded lunges. Recommend the
latter for barbell/DB lunges, the former for bodyweight. *Impact:* MED — changes
whether split-squats are offered as tier-1 strength work for run/cycle.

**F2 — `calf` pattern default omits `robustness`/`reactiveStrength` as the lead. [MED, run]**
`PATTERN_TAGS.calf` = `strengthEndurance (primary)` + `robustness (secondary)`. For a
runner the calf complex (soleus/gastroc + Achilles) is primarily a **robustness /
tendon-stiffness / reactive** tissue, not an endurance muscle: isolated calf work for
runners targets Achilles load tolerance and stiffness (Kongsgaard 2009 heavy-slow
resistance for tendon; Lauersen 2014 eccentric/heavy loading for injury prevention).
Tagging it `strengthEndurance` primary undersells its robustness role and — combined
with F7 below — means the `calf` pattern can never serve a `reactiveStrength` session
even though `reactiveStrength`'s movement map *requires* `calf`. *Correction:* make
`robustness` the primary and `strengthEndurance` secondary for the calf pattern; add
`reactiveStrength` secondary to single-leg / plyometric calf variants. *Impact:* MED
(HIGH-adjacent for runners) — calf work is a staple of a runner's gym plan.

**F3 — `hinge` pattern default treats hip-thrust like a maximal-force grind. [LOW]**
`PATTERN_TAGS.hinge` = `maxStrength primary` at `maximal-force`. Fine for
deadlift/RDL/good-morning, but `hip_thrust` (also `pattern: 'hinge'`) is a glute
accessory, not a spinal-loaded maximal grind, and `glute_bridge` even less so. No
override corrects them. *Correction:* add hip-thrust / glute-bridge overrides →
`hypertrophy` primary, `robustness` secondary, `controlled-hypertrophy`,
`COST.hypertrophy`. *Impact:* LOW — mis-tag inflates their fatigue cost and mis-labels
their quality, but they are secondary content.

**F4 — `sled_push` retains `reactiveStrength` secondary from the power class rule. [LOW]**
`sled_push` matches `ex.quality === 'power'` → `explosiveStrength (primary)` +
`reactiveStrength (secondary)`; the override only changes `forceVelocity` to
`speed-strength`. A sled push is a pure-concentric horizontal push with **no
stretch-shortening cycle** — reactive strength is not a component
(Cross 2014 sled sprinting = concentric horizontal force). *Correction:* override
`qualities` to `explosiveStrength (primary)` + `maxStrength (secondary)` (heavy sled)
or `strengthEndurance`; drop `reactiveStrength`. *Impact:* LOW — secondary tag, and it
is a sprint-only (`run_sprint`) exercise.

**F5 — Nordic / GHR force-velocity vs. contraction mismatch. [LOW]**
`nordic_curl` / `glute_ham_raise` overrides are excellent on quality (`robustness`
primary — Nordics are the canonical eccentric-hamstring injury-prevention exercise,
Petersen 2011 / van Dyk 2019) but tag `forceVelocity: 'maximal-force'`, whereas
`robustness`'s movement map declares `contraction: 'eccentric-emphasis'`. Not
wrong enough to change selection (F–V isn't a hard filter for these), but the two
tables disagree about the same exercise's character. *Correction:* consider an
`eccentric` F–V token, or accept the mismatch as cosmetic. *Impact:* LOW.

**F6 — Class-rule collapse of `quality: 'power'` is sound *because* overrides rescue it. [OK]**
The `ex.quality === 'power'` rule lumps concentric-explosive (box/broad jump) with
reactive-SSC (depth jump, pogo, bounding) under `explosiveStrength primary /
reactiveStrength secondary`. The per-exercise overrides then correctly promote
`depth_jump`, `double_leg_pogo`, `sl_pogo_jump`, `bounding_a_skip` to
`reactiveStrength primary`, and `seated_box_jump` / `broad_jump` correctly stay
concentric-explosive (seated box jump = no countermovement = pure concentric RFD;
Cormie 2011). **This is defensible and can clear review.** One residual: the plyometric
exercises are all filed under `pattern: 'squat'` in `strengthExercises.js`; that is a
`strengthExercises.js` taxonomy choice (out of this file's scope) but see F7/§3 for how
it interacts with the movement map.

### 1.2 Fatigue-cost structural issue

**F7 — The 3-D fatigue vector is collapsed to its max, flattening most exercises to
"3 units". [MED — distorts transfer-per-fatigue directly]**
`selectInterventions.fatigueScalar` = `max(neural, metabolic, mechanical)` mapped
`low/mod/high → 1/2/3`. Applied to the `COST` presets:

| class | neural | metabolic | mechanical | → units (max) |
|---|---|---|---|---|
| maxForce | high | moderate | high | **3** |
| specialist | high | low | high | **3** |
| olympic | high | moderate | moderate | **3** |
| plyo | high | low | high | **3** |
| hypertrophy | low | high | moderate | **3** |
| endurance | low | moderate | moderate | **2** |
| isometric | moderate | low | low | **1** |
| mobility | low | low | low | **1** |

Five of eight classes collapse to an identical 3 units. A heavy squat, an Olympic
pull, a depth jump and a set of leg extensions therefore cost the **same** fatigue in
the transfer-per-fatigue denominator — which is exactly the distinction the
three-dimensional model was built to preserve. It is *particularly* wrong for
concurrent (endurance) athletes, where **metabolic** fatigue is the dimension that
competes with the aerobic session (Rønnestad & Mujika 2014 — separate strength and
endurance by fatigue channel), yet metabolic detail is discarded by the max operator.
*Correction:* replace `max()` with a weighted sum (or a channel-specific cost that the
concurrent-training context can weight), e.g. `neural*1 + metabolic*1 + mechanical*1`
normalised, so hypertrophy (metabolic-heavy) and maxForce (neural/mechanical-heavy)
separate. This is an *algorithm* change in `selectInterventions.js`, not a data edit —
flag for WP-15/WP-21. *Impact:* MED — reorders within-tier selection and changes how
many exercises fit a fatigue budget.

**F8 — `qualities.js` and `exerciseQualities.js` disagree on the same fatigue costs. [LOW]**
`qualities.maxStrength.fatigueCost` = `{neural:high, metabolic:low, mechanical:moderate}`
but `COST.maxForce` = `{neural:high, metabolic:moderate, mechanical:high}`. Two tables
describe the fatigue of "heavy strength work" and give different vectors. Only
`COST.*` (exerciseQualities) reaches `fatigueScalar`; `qualities.*.fatigueCost` feeds
D9's coarse `fatigueLevel`. They should be reconciled to one source of truth.
*Impact:* LOW today (different consumers) but a latent inconsistency.

---

## 2. `qualities.js` — dose-response review

Verdict up front: the dose-response table is **mostly defensible**; it reads like a
competent textbook central-tendency table. Two entries deserve tightening.

| quality | seed doseResponse | literature check | rating |
|---|---|---|---|
| maxStrength | ≥85% 1RM, 1–5, RIR 1–3, full 3–5 min | Standard strength prescription (ACSM 2009; Schoenfeld 2021 strength loading). ✓ | **CLEAR** |
| hypertrophy | 60–80% 1RM, 6–12, RIR 0–3, 60–120 s | The classic "hypertrophy zone" is a defensible central tendency, but the modern evidence base is **wider**: hypertrophy is load-independent from ~30–85% 1RM when sets are taken near failure (Schoenfeld 2017 meta), and **longer rest (≥2 min) is superior** for hypertrophy via preserved volume (Schoenfeld 2016 JSCR). The 60–120 s rest is dated. | **MED** — widen load note; lift rest floor to ~2 min |
| explosiveStrength | 30–60% 1RM maximal intent, 2–5, "stop when bar speed drops", full 2–3 min | Sound (Cormie 2011; velocity-based auto-regulation). Prereq `maxStrength` correct (Suchomel 2016). ✓ | **CLEAR** |
| reactiveStrength | BW–light high-SSC, 3–6 ground contacts, full 2–3 min | Per-set contacts + rest are right for high-intensity reactive work. Missing a **session foot-contact ceiling** (novice ≤80, advanced ≤120 contacts; de Villarreal 2009 plyometric dosing meta) and a **48–72 h spacing** note — high-SSC work is the most injurious to under-dose-manage. Prereq `maxStrength` correct. | **MED** — add contact-volume ceiling + spacing |
| strengthEndurance | 40–60% 1RM, 15–30, RIR 1–2, short 30–60 s | Standard local-muscular-endurance prescription. ✓ | **CLEAR** |
| aerobicCapacity | zone 2, 60–75% HRmax, 20–60 min continuous | Broadly correct; "zone 2" is more precisely defined at/below the first ventilatory threshold (~<75% HRmax or <70% HRR). Gym does not train this directly, low stakes. | **CLEAR** (low stakes) |
| anaerobicCapacity | near-maximal, 6–12 × 20–60 s, work:rest ~1:3 | Standard glycolytic-interval prescription. ✓ | **CLEAR** (low stakes) |
| mobility | end-range low load, 2–4 × 30–60 s or 8–12 slow | Consistent with loaded-stretch / end-range strengthening. ✓ | **CLEAR** |
| stability | low load / anti-movement, 3–5 × 20–40 s holds or 8–12, RIR 2–3, 45–60 s | Reasonable for anti-movement trunk / single-leg control. ✓ | **CLEAR** |
| robustness | progressive, tissue-specific, 6–15, RIR 1–3, moderate rest | **Vague — this is a non-dose.** Robustness's own adaptations are `tendon_remodelling` / `tissue_tolerance` / `bone_density`, which have *specific* evidence-based protocols: heavy-slow resistance (Kongsgaard 2009: 3–4 × 6–15 at high load, 3 s/3 s tempo) **or** long-duration isometrics (Rio 2015: 5 × 45 s at ~70% MVIC). "Progressive, tissue-specific" gives the dose engine nothing to act on. Given robustness is a runner's #2 gym priority, this is the highest-value dose to specify. | **MED** — specify HSR tempo + isometric alternative |

`fatigueCost` per quality: internally reasonable ordinal values; note the F8
reconciliation issue with `COST.*`.

`recoveryTimeH`: 48 h for max/explosive, **72 h for reactive & robustness** (both
mechanical-high, tendon-loading) — this is a nice, defensible touch (tendon protein
synthesis / net collagen turnover peaks ~72 h; Magnusson 2010). Clear.

`prerequisites`: `explosiveStrength` and `reactiveStrength` both require
`maxStrength` — correct (force precedes power; Suchomel 2016). Clear.

---

## 3. `qualityMovementMap.js` — tag × map coherence (the live finding)

**Method:** for each quality Q, I list the exercises that `exerciseQualities.js` tags
as a primary/secondary driver of Q (via pattern default + class rule + override), note
the movement `pattern` each carries, and compare against
`QUALITY_MOVEMENT[Q].movementPatterns`. A **mismatch** is either (a) a required pattern
with **no tagged driver**, or (b) a **tagged driver whose pattern is excluded** from
the map (so D11 filters it out of tier-1/2). Both silently degrade selection.

### 3.1 Coherence matrix

| Quality | Map requires | Tagged drivers (pattern) | Mismatches |
|---|---|---|---|
| **maxStrength** | squat, hinge, hpush, vpush, hpull, vpull | squat/hinge/hpush/vpush/hpull/vpull (P); **lunge (P via default)** | ⚠️ lunge is tagged maxStrength-primary but **not** in the map → loaded split-squats excluded from tier-1 strength sessions |
| **hypertrophy** | squat, hinge, lunge, hpush, vpush, hpull, vpull, iso | all those patterns (S) + iso (P) | ✅ coherent |
| **explosiveStrength** | squat, hinge | box/broad jump, pogo, clean (squat/hinge); **bounding_a_skip (lunge), sled_push (lunge)** | ⚠️ bounding & sled are explosive-tagged but pattern `lunge` ∉ map → excluded |
| **reactiveStrength** | squat, **calf** | depth_jump/pogo (squat, P via override); **no calf-pattern exercise is tagged reactiveStrength** | 🔴 `calf` required but **zero** reactive drivers carry it — half the map is dead; also bounding (lunge) excluded |
| **strengthEndurance** | **lunge**, carry, calf, iso | carry (P), calf (P), tibialis (iso, P), kb_swing (S) | ⚠️ `lunge` required but **no lunge exercise is tagged strengthEndurance** (lunge default = maxStrength) |
| **aerobicCapacity** | carry, lunge (gym-support note) | n/a — cardio quality, translated via `CARDIO_GYM_SUPPORT` | see §3.3 |
| **anaerobicCapacity** | carry, lunge (gym-support note) | n/a — translated | see §3.3 |
| **mobility** | mobility | mobility/health (P) | ✅ coherent |
| **stability** | core, carry, iso | core (P), isoCore (P), carry (S), prehab-iso overrides (P) | ✅ coherent |
| **robustness** | hinge, lunge, calf, iso | **squat (S)**, hinge (S), **carry (S)**, core (S), calf (S), nordic (iso, P), GHR (hinge, P), strength-class (S) | 🔴 **the live finding**: `squat` and `carry` are tagged robustness drivers but ∉ map; and `lunge` **is** in the map but has **no** robustness driver |

### 3.2 The robustness case (the audit's named live finding — confirmed)

`robustness` movement map = `[hinge, lunge, calf, iso]`. Under a hamstring injury the
`hinge` pattern is subtracted (D10), leaving **`[lunge, calf, iso]`**. But:
- `squat` (tagged robustness **secondary** — squats build lower-limb/tendon/bone load
  tolerance) is **excluded** because squat ∉ the map. A hamstring-injured runner who
  *can* squat is denied their best remaining robustness driver.
- `carry` (tagged robustness **secondary** — loaded carries are a classic
  bone/connective-tissue robustness tool) is likewise excluded.
- `lunge` **remains** in the map but **no exercise is tagged robustness on the lunge
  pattern**, so that required pattern contributes nothing.

Net: after injury subtraction, robustness selection leans on `calf` + `iso` (nordic)
only, having thrown away squat and carry — the opposite of what an S&C coach would
program for tissue robustness. **This is a HIGH-impact coherence defect** because
robustness is a top-2 gym target for every endurance athlete.

*Correction (data):* align the two tables. Either add `squat` and `carry` to
`robustness.movementPatterns` (and add a robustness tag to the lunge pattern), or —
cleaner — treat the movement map as *ideal* patterns and **stop hard-filtering tier-1/2
to it** when it would empty the candidate set (an algorithm safeguard). Minimum data
fix: `robustness.movementPatterns: ['squat', 'hinge', 'lunge', 'calf', 'carry', 'iso']`
and add `robustness (secondary)` to `PATTERN_TAGS.lunge`.

### 3.3 `CARDIO_GYM_SUPPORT` is sport-agnostic but reactive transfer is not. [HIGH]

```
aerobicCapacity   → [robustness, reactiveStrength]
anaerobicCapacity → [strengthEndurance, maxStrength]
```

`aerobicCapacity → reactiveStrength` is **correct for running** (plyometric / reactive
work improves running economy via tendon stiffness — Rønnestad & Mujika 2014; Blagrove
2018; Barnes 2015) but **wrong for cycling and swimming**, which have **no
stretch-shortening cycle and no impact loading**. Cycling's own SKB rates
`reactiveStrength` importance **3** (lowest-tier) precisely because there is no SSC
demand; yet because a cyclist's #1 demand is `aerobicCapacity` (importance 10), this
map **injects plyometrics/pogos into a cyclist's gym plan** — contraindicated content
driven by a global constant. The evidence-based cycling gym prescription is heavy
strength + explosive concentric (Rønnestad 2010; Aagaard 2011), i.e.
`[maxStrength, explosiveStrength]`, not reactive work.

*Correction:* make `CARDIO_GYM_SUPPORT` **sport-aware** (or at least
impact-sport vs non-impact-sport aware):
`aerobicCapacity → [robustness, reactiveStrength]` for running/impact sports;
`aerobicCapacity → [robustness, maxStrength]` (or `explosiveStrength`) for
cycling/swimming. This is the same class of gap H5 names (the fixed-10 vocabulary
can't carry sport context) — surface it now. *Impact:* **HIGH** — it changes what a
live cyclist is prescribed, toward contraindicated plyometrics.

### 3.4 Lesser map notes
- `explosiveStrength.movementPatterns: [squat, hinge]` excludes unilateral/lunge
  explosive work (bounding, sled) — see matrix. Add `lunge` if unilateral power is
  wanted for run/cycle. [MED]
- `strengthEndurance` requires `lunge` with no driver; either drop `lunge` from the map
  or tag a lunge variant strengthEndurance. [LOW]
- `reactiveStrength` requires `calf` with no driver — tie to F2 (tag single-leg/pogo
  calf work reactive) or drop `calf` from the map. [MED, run]

---

## 4. `selectInterventions.js` — the D11 weights

| Weight | Value | Assessment | Rating |
|---|---|---|---|
| `FATIGUE_BUDGET` | `{low:4, moderate:6, high:8}` | Arbitrary but produces sensible session sizes (~2–4 exercises given F7's ~3-unit costs). No literature anchors a "fatigue unit budget"; defensible as a **heuristic**, tag **low confidence**. | LOW |
| Fatigue units | `{low:1, moderate:2, high:3}` from a 3-level ordinal, combined by `max()` | The `max()` collapse (F7) is the real problem — it nulls the 3-D model and equalises 5 of 8 exercise classes at 3 units. | **MED** (via F7) |
| Transfer weights | primary 2 / secondary 1 / support 0.5 | Monotonic and reasonable as an ordinal transfer proxy. Note a "support" (off-target) exercise still scores 0.5, so a low-fatigue prehab (0.5/1 = 0.5) can out-value a secondary compound (1/3 = 0.33) — but **tier sorting dominates value**, so this only bites within a tier; acceptable. | LOW |
| SKB boost | ×1.5 for SKB-listed exercises | Pure guess; only breaks within-tier ordering (SKB items already share a tier). Low stakes, but wholly unjustified numerically — tag low confidence. | LOW |
| 2-per-pattern cap | ≤2 exercises per movement pattern | Sound variety guard (stops "3 deadlifts"); consistent with EDS §34 primary+secondary compound. | **CLEAR** |
| Stopping rule | stop when `fatigue ≥ budget && picks ≥ 1` | Reasonable minimum-effective-dose behaviour; guarantees ≥1 pick. | **CLEAR** |

**Cross-cutting note (echoes audit §10.6 assumption 3):** D11 gates on the **MRV
muscle ledger** (hypertrophy science, low-confidence L5 in the KB) as the binding
ceiling on a *sport-support* session, while the fatigue budget is the softer signal.
For endurance athletes recoverability (fatigue) is arguably the truer ceiling and MRV
the sanity check — but that's an architecture question (WP-21), not a seed-data defect.
Recorded here so the weights review is complete.

---

## 5. Deliverables

### 5.1 (a) Proposed corrections, ready to apply

| # | File | Entry | Change | Impact |
|---|---|---|---|---|
| C1 | qualityMovementMap.js | `CARDIO_GYM_SUPPORT.aerobicCapacity` | Make sport-aware: `[robustness, reactiveStrength]` for impact sports (run); `[robustness, maxStrength/explosiveStrength]` for cycle/swim | **HIGH** |
| C2 | qualityMovementMap.js + exerciseQualities.js | `robustness.movementPatterns`; `PATTERN_TAGS.lunge` | Add `squat`, `carry` to robustness patterns; add `robustness (secondary)` to lunge default (so tagged drivers aren't filtered out) | **HIGH** |
| C3 | exerciseQualities.js + qualityMovementMap.js | `calf` pattern default; `reactiveStrength.movementPatterns` | Make `robustness` the calf primary (`strengthEndurance` secondary); tag single-leg/pogo calf work `reactiveStrength` secondary — closes the empty `calf` requirement | **MED** (HIGH for run) |
| C4 | selectInterventions.js | `fatigueScalar` | Replace `max()` with a weighted sum so hypertrophy(metabolic) ≠ maxForce(neural/mechanical); preserves the 3-D model | **MED** |
| C5 | exerciseQualities.js | `PATTERN_TAGS.lunge` | Resolve the maxStrength-primary vs controlled-hypertrophy-velocity contradiction (loaded → maximal-force/COST.maxForce; bodyweight → hypertrophy primary) | **MED** |
| C6 | qualities.js | `robustness.doseResponse` | Specify HSR (3–4×6–15, 3 s/3 s tempo, high load) + isometric alt (5×45 s @ ~70% MVIC) instead of "progressive, tissue-specific" | **MED** |
| C7 | qualities.js | `reactiveStrength.doseResponse` | Add session foot-contact ceiling (novice ≤80 / advanced ≤120; de Villarreal 2009) + 48–72 h spacing | **MED** |
| C8 | qualities.js | `hypertrophy.doseResponse` | Widen load note (~30–85% near-failure; Schoenfeld 2017); lift rest floor to ≥2 min (Schoenfeld 2016) | **MED** |
| C9 | qualityMovementMap.js | `explosiveStrength.movementPatterns` | Add `lunge` so unilateral explosive (bounding, sled) is selectable | MED |
| C10 | exerciseQualities.js | add `hip_thrust`, `glute_bridge` overrides | → `hypertrophy` primary / `robustness` secondary, `COST.hypertrophy` | LOW |
| C11 | exerciseQualities.js | `sled_push` override | Drop `reactiveStrength`; → `explosiveStrength` P / `maxStrength` S | LOW |
| C12 | qualities.js ↔ exerciseQualities.js | `fatigueCost` vectors | Reconcile `qualities.*.fatigueCost` with `COST.*` to one source of truth | LOW |
| C13 | qualityMovementMap.js | `strengthEndurance.movementPatterns` | Drop `lunge` (no driver) or tag a lunge variant strengthEndurance | LOW |
| C14 | exerciseQualities.js | nordic/GHR F–V | Optional `eccentric` F–V token vs the `eccentric-emphasis` contraction in the map | LOW |

### 5.2 (b) `needsReview` flags that can be cleared as-is (reviewed, correct)

These entries were checked and are **defensible against the literature** — their
`needsReview` flags can be cleared without a data change:

- **Plyometric override logic** (F6): `depth_jump` / `double_leg_pogo` / `sl_pogo_jump`
  / `bounding_a_skip` → `reactiveStrength` primary; `seated_box_jump` / `broad_jump` →
  `explosiveStrength` primary. Correct SSC vs concentric split (Cormie 2011).
- **Olympic-derivative overrides**: `hang_clean` / `power_clean` → `explosiveStrength`
  primary, `maxStrength` secondary, `strength-speed`, `COST.olympic` (Suchomel 2016).
- **`kb_swing`** → ballistic hip-hinge, `explosiveStrength` primary (Lake & Lauder 2012).
- **Nordic / GHR** *quality* tags → `robustness` primary (Petersen 2011; van Dyk 2019)
  (the F–V token is a cosmetic nit, C14).
- **Prehab overrides** (`face_pull`, `band_face_pull`, `sl_ext_rotation`,
  `cable_ext_rotation_90`, `lateral_band_walk`, `sl_hip_abduction`) → `stability`
  primary / `robustness` secondary. Appropriate for cuff/glute-med prehab.
- **dose-response**: `maxStrength`, `explosiveStrength`, `strengthEndurance`,
  `mobility`, `stability`, `anaerobicCapacity`, `aerobicCapacity` — all defensible
  central-tendency prescriptions.
- **`recoveryTimeH`** (48/72 h) and **`prerequisites`** (power requires maxStrength)
  across all qualities — correct.
- **2-per-pattern cap** and **stopping rule** in D11 — sound heuristics.

### 5.3 (c) Overall safety verdict

**Safe to keep steering live run/cycle plans while corrections land — with two
caveats that should be prioritised.** The seed data is honest, competently
pattern-derived, and correct on the majority of individual tags and doses; nothing
found produces a *dangerous* prescription (no injurious load, no contraindicated
progression for an uninjured athlete). The `needsReview` flags are doing their job and
the `/dev` surfacing should stay until the correction PR lands.

**However, two findings rise to "fix before WP-21 doses from this data":**

1. **C1 — `CARDIO_GYM_SUPPORT` injects plyometrics into cyclists/swimmers.** This is
   the one finding that yields *contraindicated* content (reactive/impact work for a
   non-impact sport whose own SKB rates it lowest-priority). It actively mis-serves a
   live cohort.
2. **C2 — the robustness tag×map incoherence** discards squat + carry (a runner's/
   injured athlete's best robustness drivers) and requires a lunge pattern that has no
   driver — degrading the #2 gym priority for every endurance athlete, worst under
   injury subtraction exactly when robustness matters most.

Everything else (C3–C14) is genuine improvement but not a safety blocker: the doses are
conservative, the fatigue-model flattening (F7/C4) makes selection *coarser*, not
*unsafe*, and the remaining tag fixes change *which good exercise* is picked, not
*whether a bad one* is. Recommend landing C1 + C2 as a fast follow, then C3–C8 with
WP-21, then the LOW items opportunistically.

---

*Reviewed against: Schoenfeld 2016/2017/2021 (hypertrophy load & rest); Helms et al.
(RIR/RPE prescription); Israetel/RP (MEV–MRV volume landmarks); de Villarreal 2009 &
Cormie 2011 (plyometric/power dosing); Rønnestad & Mujika 2014, Blagrove 2018, Aagaard
2011, Barnes 2015 (concurrent / endurance-strength transfer); Kongsgaard 2009, Rio
2015, Magnusson 2010, Lauersen 2014 (tendon/robustness loading); Petersen 2011 & van
Dyk 2019 (Nordic hamstring); Suchomel 2016 (strength precedes power); Speirs 2016
(unilateral vs bilateral transfer); Lake & Lauder 2012 (KB swing); Cross 2014 (sled).
Citations are from the reviewer's knowledge, not fetched. Evidence levels are the
reviewer's; confidence tags for the resulting KB entries are set in WP-15.*
