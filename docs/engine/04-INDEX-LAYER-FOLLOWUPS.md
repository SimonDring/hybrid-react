# Index Layer — outstanding follow-ups (specs)

_Specs for the three deliberately-deferred pieces after the index-layer build (framework §7)._
Date: 2026-06-29 · Method: code-level grounding against the shipped index layer + the framework
evidence base.

**Panel:** Sports Scientist · Exercise Physiologist · Performance Data Scientist · Senior Software Architect.

> **How to read this.** Each spec is graded by **risk** (behaviour-inert vs behaviour-changing) and
> names the real files + knowledge-base ids it touches. Recommendations carry **Evidence level**
> (L1 → L5) where relevant. Companions: [03-PHYSIOLOGICAL-FRAMEWORK.md](03-PHYSIOLOGICAL-FRAMEWORK.md)
> (the framework + §7 roadmap), [01-PANEL-REVIEW.md](01-PANEL-REVIEW.md), [02-REFACTOR-ROADMAP.md](02-REFACTOR-ROADMAP.md).

## §0 What shipped, what's left

Shipped: the framework doc + KB entries (#34); the personal-baseline util, the **core-7** indices
(Wellness, Sleep, Cardiovascular Recovery, Recovery, Training Load, Fatigue) + the Readiness
integrator, and the recovery-path cut-over (#36). Outstanding:

| Spec | What | Risk | Depends on |
|---|---|---|---|
| **A** | Recovery Capacity + Consistency indices (completes the 9) | Behaviour-inert (additive) | — |
| **B** | Evidence-based re-weighting of the Readiness integrator | **Behaviour-CHANGING (deliberate)** | A (Recovery Capacity informs it) |
| **C** | Surface the Readiness Index + confidence to real users | Behaviour-inert (display only) | — |

**Recommended order: A → C → B.** A and C are additive and low-risk and can land in either order
(or together). B changes plan adaptation, so it lands last, behind a flag, with intentional test
regeneration — once A and C let us *see* its effect first.

Each index keeps the uniform contract from [indices/contract.js](../../packages/engine/src/lib/indices/contract.js):
`{ value, confidence, band, contributors, missingInputs }`, and the confidence model
(`Σ(w·present·sourceReliability·baselineMaturity)/Σw`, `index.confidence.model`).

---

## §1 Spec A — Recovery Capacity + Consistency indices

**Goal.** Complete the 9-index suite. Both are *slow-moving* indices that **modulate**, not drive,
the daily call — so adding them is additive (the integrator's `value` stays the Recovery score in
this spec; B is where they start to weight in).

### A.1 Recovery Capacity Index — the trait ceiling (how much load can this athlete absorb)
- **Inputs & sources (all already in the app):**
  - chronic HRV baseline **level + stability** — rolling mean + CV of `daily_metrics.hrv_ms` (reuse [baseline.js](../../packages/engine/src/lib/baseline.js) `mean`; add a `coefficientOfVariation`).
  - chronic sleep adequacy — rolling mean of `daily_metrics.sleep_duration_min` vs `physio.sleep.targets`.
  - fitness / training age — `fitnessAge()` ([apps/mobile/src/lib/fitnessAge.js](../../apps/mobile/src/lib/fitnessAge.js)) and strength standing via `liftGoal` / `strengthStandards`.
  - `profile.age`, `profile.sex`, `profile.bodyweight_kg`.
- **Method.** A 0–100 capacity score: higher chronic HRV + stable CV + adequate chronic sleep +
  better fitness-age delta → higher capacity. Weight chronic HRV stability and fitness most.
- **Evidence.** HRV CV collapse = maladaptation (`physio.hrv.metric`, Plews 2013, L2); fitness buffers
  load (L4). **Update:** weekly/monthly. **New KB entry:** `index.recovery_capacity` (weights, L4).

### A.2 Consistency Index — behavioural reliability + a confidence multiplier
- **Inputs & sources:**
  - **adherence** — completed vs planned sessions. The runtime `sessions` map already carries
    `completed`/`skipped`/`started` + `withinEpoch` (see [PlanService.js](../../apps/mobile/src/lib/PlanService.js) `missed`/settled logic); planned count from the plan weeks.
  - **data completeness** — fraction of recent days with a `daily_metrics` row / check-in.
  - **routine regularity** — variance of logging cadence (sleep-onset SD is not captured yet → use
    check-in cadence + session-timing variance as the proxy; flag sleep-timing as a future input).
- **Method.** 0–100; high adherence + complete data + regular routine → high. **Use:** raises
  confidence and (in B) supports progressive overload; low biases conservative. **Update:** rolling
  weekly. **New KB entry:** `index.consistency` (L4).

### A.3 Wiring, files, tests
- **New:** `packages/engine/src/lib/indices/recoveryCapacityIndex.js`, `consistencyIndex.js`; export
  both from [indices/index.js](../../packages/engine/src/lib/indices/index.js); add them to the
  `readinessIndex` `indices` map as **reported contributors** (value still = Recovery score).
- **KB:** add `index.recovery_capacity`, `index.consistency` to [entries.js](../../packages/engine/src/lib/knowledge/entries.js).
- **Tests:** extend [tests/indices.js](../../apps/mobile/tests/indices.js) — value ranges, confidence
  with thin history, adherence maths; `tests/physiology-knowledge.js` — the 2 new ids validate.
- **Parity gate:** `readinessIndex.value` unchanged → all behaviour-lock tests + golden-master stay green.

---

## §2 Spec B — Evidence-based re-weighting of the Readiness integrator (behaviour-changing)

**Goal.** Move the integrator off the *behaviour-preserving calibration* and onto the framework's
evidence: subjective ≥ objective, **HRV-primary**, **sleep-heavy**, RHR corroborating, capacity-aware
(`index.readiness.weights`, anchored on Saw 2016 / Plews 2013 / Walsh 2021). This is the step that
makes the indices actually *change* the plan, so it is gated and staged.

### B.1 The changes
- Make `index.readiness.weights` **quantitative** (concrete weights) instead of descriptive, and have
  `readinessIndex` compose `value` from Sleep + Cardiovascular Recovery + Wellness + Fatigue,
  modulated by Recovery Capacity (Spec A) and acute Training Load — rather than aliasing the Recovery
  score.
- Adopt the framework's **≥67 green** cut (vs the current 70) in [contract.js](../../packages/engine/src/lib/indices/contract.js) `bandFromValue` and align `volumeFromScore` bands in [recovery.js](../../packages/engine/src/lib/recovery/recovery.js).

### B.2 Why it's delicate
`recovery.score` → `volumeModifier` → `deloadRecommendation`/`combinedMultiplier` → the adaptive
reflow. Changing the blend changes plan volume + deload timing for the same inputs. The behaviour-lock
tests ([recovery-load.js](../../apps/mobile/tests/recovery-load.js), [adaptive-deload.js](../../apps/mobile/tests/adaptive-deload.js)) and the **golden-master snapshot** encode the *old* numbers and **will change**.

### B.3 Rollout (do not skip)
1. **Flag it.** Gate the new weighting behind a profile/config flag (e.g. `profile.readiness_v2`),
   default off; old path remains the default until validated.
2. **Regenerate intentionally.** Update the locked tests with reviewed old→new expected values; regenerate
   the golden-master `__snapshots__` in a single, clearly-described commit (diff is the behaviour change).
3. **Validate.** Add a test that the new weighting moves readiness in the expected direction (e.g. a
   poor-HRV/poor-sleep day scores materially lower than under the flat blend).
4. **Future (L-future):** calibrate weights against logged session quality/performance (does Green
   predict better sessions?) — the framework's stated future-work item.
- **Files:** `recoveryIndex.js`/`readinessIndex.js`, `contract.js`, `recovery.js`, `entries.js`
  (`index.readiness.weights` value), the locked tests + `__snapshots__`.
- **Risk:** High — it is the only behaviour-changing spec. Land alone, behind the flag, after C ships so
  the effect is observable.

---

## §3 Spec C — Surface the Readiness Index + confidence to users (display only)

**Goal.** Take the Readiness Index from the hidden `/dev` panel to the real surfaces. Display only —
no engine/plan change.

### C.1 Produce it once in the store
`buildView` ([trainingStore.js](../../apps/mobile/src/stores/trainingStore.js)) already assembles every
input the integrator needs — `dailyMetrics` (+ prior), `objectiveScore` (`computeReadiness`), `dl`/`ac`
(daily loads), `setLogsBySession`, and recent session `recovery`. Add one call:
`readinessIndex({ metric: latestMetric, prior, objectiveScore, recentRecovery, dl, asOf: today, setLogs })`
and return it as `readiness` in the view-model (alongside the existing `load: loadView`).

### C.2 Render it
- **[Home.jsx](../../apps/mobile/src/screens/Home.jsx)** — the readiness hero shows the integrated value
  + band + a **confidence chip** ("based on N of M inputs").
- **[RecoveryDetail.jsx](../../apps/mobile/src/screens/RecoveryDetail.jsx)** — the full contributor
  breakdown (the `/dev` panel's rows: each sub-index value + confidence bar + missing inputs), reusing the
  approved theme tokens (`--moss`/`--ochre`/`--rust`).
- **[verdicts.js](../../apps/mobile/src/lib/verdicts.js)** — extend `readinessVerdict` to accept the index
  (value + confidence) and add a low-confidence caveat line; keep the existing call sites working (additive).
- These screens currently call `computeReadiness` directly ([Home.jsx], [RecoveryDetail.jsx],
  [Wearables.jsx](../../apps/mobile/src/screens/Wearables.jsx)); point them at the store's new `readiness`.

### C.3 Files, tests
- **Files:** `trainingStore.js` (compute + return `readiness`), `Home.jsx`, `RecoveryDetail.jsx`,
  `verdicts.js`. **No** change to `PlanService`/`adaptedPhases` or the frozen `PlanOutput`.
- **Tests:** extend [tests/verdicts.js](../../apps/mobile/tests/verdicts.js) for the confidence caveat.
- **Verify:** `npm run build`; reload the app and confirm Home + Recovery render the value + confidence
  and degrade gracefully (mirror the `/dev` scenarios). All locked tests stay green (display-only).

---

## §4 Sequencing summary

1. **Spec C** (display) + **Spec A** (the two indices) — both additive, parity-safe; can ship together.
2. **Spec B** (re-weighting) — last, behind a flag, with intentional golden-master regeneration, once A+C
   make the change observable. This is the moment the physiological framework starts steering the plan on
   its own evidence rather than reproducing the legacy blend.
