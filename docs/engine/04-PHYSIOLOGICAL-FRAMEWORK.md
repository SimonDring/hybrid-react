# Universal Physiological Metrics Framework

_A manufacturer-independent physiological foundation for the deterministic S&C decision engine._
Date: 2026-06-28 · Method: expert-panel design + live literature grounding (systematic reviews / meta-analyses / consensus prioritised) + a code-level map of the existing readiness/recovery/load layer.

**Design panel:** Sports Scientist · Exercise Physiologist · Cardiovascular Physiologist ·
Sleep Researcher · Biostatistician · Elite S&C Coach · Performance Data Scientist.

**Mandate.** Define a canonical physiological data model that is **completely independent of any
wearable manufacturer**. The platform must never depend on a proprietary score (Garmin Body
Battery, WHOOP Recovery, Oura Readiness, Fitbit Readiness, Apple). Every training decision is
derived from **standardised raw physiological data**, normalised to the individual, with an
explicit confidence so the system keeps working — at reduced confidence — when data is partial.

> **How to read this.** Each recommendation is graded **Evidence level** (L1 systematic
> review/meta-analysis → L5 expert opinion) and **Confidence** (High/Moderate/Low); contradictory
> evidence is named. Every quantitative constant has a home in the evidence knowledge base
> ([entries.js](../../packages/engine/src/lib/knowledge/entries.js), ids like `physio.hrv.metric`)
> so the science is auditable and editable in one place — never a magic number in engine code.
> Companions: [01-PANEL-REVIEW.md](01-PANEL-REVIEW.md) (engine architecture review),
> [02-REFACTOR-ROADMAP.md](02-REFACTOR-ROADMAP.md) (build plan & contracts).

> **Role in the doc set.** This is the **physiological metrics model** — the manufacturer-independent
> readiness / recovery / load data model. A *foundational* spec governed by the
> **[Engine Design Specification](00-ENGINE-DESIGN-SPECIFICATION.md)** (the EDS); **the EDS wins** on
> any conflict. **Canonical home for:** the raw-metric schema, personal-baseline normalisation, the
> derived indices, decision bands, and graceful degradation. The EDS's Recovery Model (§33) and
> Confidence Model (§28) state the *principles* (e.g. subjective ≥ objective; confidence governs
> authority); this doc owns the *metrics* that realise them. Its deferred build specs live in
> [05-INDEX-LAYER-FOLLOWUPS.md](05-INDEX-LAYER-FOLLOWUPS.md). **Find elsewhere:** laws & decision
> architecture → [00](00-ENGINE-DESIGN-SPECIFICATION.md); evidence → [01](01-PANEL-REVIEW.md); build
> plan & contracts → [02](02-REFACTOR-ROADMAP.md); sport schema → [03](03-SPORT-KNOWLEDGE-BASE.md).
> Current implementation status lives in the running docs (`HANDOFF.md`, `CLAUDE.md`). See the [index](README.md).

---

## §0 Headline verdict

The app already does much of this well: it stores rich raw physiology in `daily_metrics`, and it
already derives evidence-based signals — HRV/RHR vs a 7-day baseline ([Readiness.js](../../packages/engine/src/lib/Readiness.js)),
a 60/40 subjective-over-objective recovery blend per Saw 2016 ([recovery.js](../../packages/engine/src/lib/recovery/recovery.js)),
and EWMA training load with ACWR **already demoted** to a soft input ([trainingLoad.js](../../packages/engine/src/lib/plan/trainingLoad.js)).
It does **not** trust any vendor readiness score as an output today. So this framework **formalises
and extends** a sound foundation rather than replacing a broken one.

Three structural upgrades make it "elite, manufacturer-independent":

1. **One canonical raw-metrics model** (§1) the whole platform speaks, grounded in the real
   `daily_metrics` / `session_logs` / `workouts` columns.
2. **A normalization layer** (§2) that maps any provider in and — critically — normalises every
   objective metric to the **individual's own rolling baseline**, never to population absolutes or
   a vendor score. This is the mechanism that earns manufacturer-independence.
3. **A 9-index suite** (§3) optimised for *training decisions*, each emitting a value **and a
   confidence**, degrading gracefully (§5) instead of going dark when data is missing.

**The deliberate design bet** is that wearables disagree on *absolute* values but are reasonably
self-consistent over time — so the trustworthy signal is the **intra-device trend**, and a
personal-baseline z-score makes the brand irrelevant by construction (`physio.normalization.personal_baseline`).

---

## §1 Phase 1 — Canonical raw-metrics model

Eight groups. Every metric maps to a real storage column where one exists (so the model is
grounded, not aspirational). `Rel.` = day-to-day reliability of the *measurement* on typical
consumer hardware; `Ev.` = evidence quality that the metric *informs training decisions*. Sport
metrics (velocity/power/pace) are **defined but not yet programmed** — the engine is gym-only today.

### 1.1 Cardiovascular

| Metric | Units | Typical | Elite | Freq | Source(s) | Manual alt | Rel. | Ev. | Stored as |
|---|---|---|---|---|---|---|---|---|---|
| Resting HR (waking) | bpm | 55–80 | 35–50 (endur.) | Daily | All wearables, chest strap | Palpation, 60 s | High | L2 | `daily_metrics.resting_hr` |
| Nocturnal HR (sleeping min) | bpm | 45–65 | 35–45 | Nightly | Ring, watch, strap | — | High | L2 | (derive from HR stream) |
| **HRV — rMSSD / lnRMSSD** | ms / ln(ms) | rMSSD 20–90 | higher, individual | Nightly/AM | Ring, watch, strap, ECG | HRV app (finger/strap) | Mod–High | L2 | `daily_metrics.hrv_ms` |
| HR recovery (HRR-60s) | bpm drop | >12 | >25 | Per session | Strap, watch | Manual count | Mod | L3 | (derive post-session) |
| SpO₂ (nocturnal avg) | % | 95–100 | 95–100 | Nightly | Ring, watch | Pulse oximeter | Mod | L4 | `daily_metrics.spo2_pct` |
| Respiratory rate | breaths/min | 12–20 (rest) | 12–16 (sleep) | Nightly | Ring, strap, watch | Manual count | Mod | L4 | `daily_metrics.breathing_rate` |
| Max HR | bpm | 208 − 0.7·age | individual | Static/test | Strap, watch | Field test | High | L2 | (profile / observed) |
| VO₂max estimate | ml·kg⁻¹·min⁻¹ | 30–45 | 65–85 | Weekly | Watch (HR+pace) | Cooper / submax test | Low–Mod | L2 | (profile proxy) |
| Blood pressure | mmHg | <120/80 | — | Ad hoc | — | Cuff | High | L3 | (manual, future) |

HRV is the **primary** vagal/autonomic marker (`physio.hrv.metric`); RHR is **corroborating**, weak
alone (`physio.rhr.role`).

### 1.2 Sleep

| Metric | Units | Typical | Elite | Freq | Source(s) | Manual alt | Rel. | Ev. | Stored as |
|---|---|---|---|---|---|---|---|---|---|
| Total sleep time | min | 420–540 | ≥480 | Nightly | Ring, watch, strap | Self-report h | Mod–High | L1 | `daily_metrics.sleep_duration_min` |
| Sleep efficiency | % | 85–95 | >90 | Nightly | Ring, watch | Diary | Mod | L2 | (derive: asleep/in-bed) |
| Sleep latency | min | 10–30 | 10–20 | Nightly | Ring, watch | Diary | Low–Mod | L3 | (derive) |
| Deep (SWS) | min / % TST | 13–23% | individual | Nightly | Ring, watch | — | **Low** | L3 | `daily_metrics.sleep_deep_min` |
| REM | min / % TST | 20–25% | individual | Nightly | Ring, watch | — | **Low** | L3 | `daily_metrics.sleep_rem_min` |
| Light | min / % TST | ~50% | — | Nightly | Ring, watch | — | Low | L4 | `daily_metrics.sleep_light_min` |
| Wake after sleep onset | min | <30 | <20 | Nightly | Ring, watch | Diary | Mod | L3 | `daily_metrics.sleep_awake_min` |
| Sleep regularity (onset/offset SD) | min | <60 | <45 | Rolling | Derived | Diary | Mod | L2 | (derive from timestamps) |
| Subjective sleep quality | 1–5 | — | — | Daily | — | Check-in | n/a | L1 | (maps to `daily_metrics` wellness) |

**Stage data (deep/REM/light) is low-reliability on wrist/ring** — use *trends*, never single-night
absolutes (see §6 limitations). Duration + efficiency + regularity carry the weight (`physio.sleep.targets`).

### 1.3 Activity

| Metric | Units | Typical | Freq | Source(s) | Manual alt | Rel. | Ev. | Stored as |
|---|---|---|---|---|---|---|---|---|
| Steps | count/day | 5k–12k | Daily | All | — | High | L3 | `daily_metrics.steps` |
| Active minutes (mod+vig) | min/day | ≥30 | Daily | All | Self-report | Mod | L2 | `daily_metrics.active_minutes` |
| Energy expenditure | kcal/day | 1800–3500 | Daily | All | Estimate | Low–Mod | L3 | `daily_metrics.calories_out` |
| Sedentary time | h/day | 6–10 | Daily | Watch, ring | — | Mod | L3 | (derive) |

Non-training activity matters as **background load** — a 15k-step rest day is not a rest day.

### 1.4 Training (internal + external load)

| Metric | Units | Freq | Source(s) | Manual alt | Rel. | Ev. | Stored as |
|---|---|---|---|---|---|---|---|
| Session duration | min/sec | Per session | App, watch | Timer | High | L2 | `session_logs.duration_sec` |
| Session-RPE (CR-10) | 0–10 | Per session | — | Check-in | Mod | L1 | (capture, future) |
| **Internal load = sRPE × min** | AU | Per session | Derived | — | Mod | L1 | (derive) |
| Edwards TRIMP (HR-zone) | AU | Per session | Strap, watch | — | Mod–High | L1 | `session_logs.hr_zones` |
| **External load = volume-load** (Σ sets·reps·kg) | kg | Per session | App log | — | High | L4 | (derive from set log) |
| HR-zone minutes (z1–z5) | min | Per session | Strap, watch | — | Mod | L2 | `session_logs.hr_zones` |
| Distance / pace / power *(sport — future)* | m, /km, W | Per session | Watch, meter | — | High | L2 | `workouts.distance_m` |

Internal load uses **sRPE×min and/or Edwards TRIMP** — validated and strongly correlated
(`load.internal.method`). External **volume-load** captures the mechanical dose HR misses
(`load.external.volume_load`).

### 1.5 Recovery (objective-derived + subjective)

| Metric | Units | Freq | Source | Rel. | Ev. | Stored as |
|---|---|---|---|---|---|---|
| Subjective recovery rating | 1–5 | Per session | Check-in | n/a | L1 | `session_logs.recovery` |
| Muscle soreness | 1–5 | Daily | Check-in | n/a | L1 | `daily_metrics.soreness` |
| HRV trend (vs baseline) | z / %Δ | Daily | Derived | Mod | L2 | (derive) |
| RHR trend (vs baseline) | z / %Δ | Daily | Derived | High | L2 | (derive) |

### 1.6 Wellness (subjective — the most sensitive load monitor)

| Metric | Units | Freq | Source | Ev. | Stored as |
|---|---|---|---|---|---|
| Mood | 1–5 | Daily | Check-in | L1 | `daily_metrics.mood` |
| Stress | 1–5 | Daily | Check-in | L1 | `daily_metrics.stress` |
| Energy | 1–5 | Daily | Check-in | L1 | `daily_metrics.energy` |
| Motivation | 1–5 | Daily | Check-in | L2 | (add) |
| Fatigue | 1–5 | Daily | Check-in | L1 | (derive/add) |
| Subjective sleep quality | 1–5 | Daily | Check-in | L1 | (add) |
| Illness flag | bool | Ad hoc | Check-in | L2 | `daily_metrics.illness` |
| Menstrual-cycle phase *(where relevant)* | phase | Daily | Manual/app | L3 | (future) |

Subjective wellness is **at least as sensitive** as objective markers for load response and is
cheap and fast (`readiness.subjective_priority`, Saw 2016, L1) — a Hooper-style 5-item check
(sleep, fatigue, stress, soreness, mood) is the backbone when no wearable exists.

### 1.7 Body composition

| Metric | Units | Typical (athlete) | Freq | Source | Rel. | Ev. | Stored as |
|---|---|---|---|---|---|---|---|
| Bodyweight | kg | — | Daily/weekly | Scale | High | L2 | `users.profile.bodyweight_kg` |
| Body fat % | % | M 6–13, F 14–20 | Weekly | Smart scale, calipers | Low–Mod | L3 | (future) |
| Fat-free mass | kg | — | Weekly | Derived | Low–Mod | L3 | (future) |
| Girths | cm | — | Monthly | Tape | Mod | L4 | (future) |

### 1.8 Environmental (context that scales load cost)

| Metric | Units | Freq | Source | Ev. | Notes |
|---|---|---|---|---|---|
| Ambient temperature | °C | Per session | Weather API, watch | L3 | heat raises HR/RPE for same work |
| Heat / humidity | % RH | Per session | Weather API | L3 | thermoregulatory load |
| Altitude | m | Per session | Watch, API | L3 | desaturation, HR↑ |
| Travel / timezone shift | h | Ad hoc | Manual, calendar | L3 | jet-lag → sleep + readiness hit |

---

## §2 Phase 2 — Normalization layer (the manufacturer-independence mechanism)

**Core principle (`physio.normalization.personal_baseline`, L2).** Every *objective* metric is
converted to the **individual's own rolling-baseline deviation** — a z-score or % change vs a
7–60-day personal reference — **never** to a population absolute or a vendor's proprietary score.

*Why this works:* validation studies show consumer devices disagree substantially on absolute
HRV/RHR/sleep, but each device is reasonably self-consistent with itself over time. Comparing
today's value to *this athlete's own history on the same device* cancels the brand offset. This is
exactly what [Readiness.js](../../packages/engine/src/lib/Readiness.js) already does for HRV/RHR — the
framework generalises it to every objective metric.

### 2.1 Provider → universal field map

| Universal field | Garmin | WHOOP | Oura | Apple Health | Fitbit | Polar |
|---|---|---|---|---|---|---|
| `hrv_rmssd_ms` | HRV (rMSSD, nightly) | HRV (rMSSD, nightly) | HRV (rMSSD, nightly) | HRV (SDNN — **convert/flag**) | HRV (nightly) | HRV (rMSSD) |
| `resting_hr_bpm` | RHR | RHR | Resting HR | Resting HR | RHR | RHR |
| `nocturnal_hr_bpm` | sleep HR | sleep HR | lowest sleep HR | — | sleep HR | sleep HR |
| `total_sleep_min` | sleep | sleep | sleep | sleep analysis | sleep | sleep |
| `sleep_efficiency_pct` | derived | derived | efficiency | derived | derived | derived |
| `spo2_pct` | Pulse Ox | — *(missing)* | SpO₂ avg | blood oxygen | SpO₂ | — |
| `respiratory_rate` | resp rate | resp rate | resp rate | resp rate | resp rate | — |
| `internal_load_au` | — (HR→TRIMP) | Strain (**ignore score**, use raw HR→TRIMP) | — | — | — | — (HR→TRIMP) |
| **Proprietary readiness** | Body Battery → **drop** | Recovery % → **drop** | Readiness → **drop** | — | Readiness → **drop** | Nightly Recharge → **drop** |

### 2.2 What the layer must do

- **Equivalent fields** — map to the universal schema above (units harmonised: ms, bpm, min, %).
- **Missing fields** — flag, don't fabricate (e.g. WHOOP has no spot SpO₂; Apple HRV is SDNN not
  rMSSD and must be reconciled or down-weighted; not all devices give respiratory rate).
- **Data-quality concerns** — record the **HRV method** (rMSSD vs SDNN vs proprietary), the
  **window** (nocturnal-average vs morning-spot vs 5-min), and whether staging is wrist-grade.
- **Per-source reliability weights** (`physio.source.reliability`, L2) scale **confidence, not the
  value**: ECG/chest-strap ≈ 1.0, finger-ring ≈ 0.95, wrist-optical ≈ 0.8, manual/subjective ≈ 0.7
  — ordered from the validation concordances (Oura ≈ 0.99, WHOOP ≈ 0.94, Garmin ≈ 0.87, Polar ≈ 0.82
  vs ECG; Dial 2025, Miller 2022).
- **Drop every proprietary score** — Body Battery / Recovery / Readiness / Nightly Recharge are
  black boxes and disagree across vendors; they are never inputs to a derived index. The app's
  legacy `daily_metrics.readiness_score` is retained only as one low-trust corroborator.
- **Missing values** feed the graceful-degradation ladder (§5).

---

## §3 Phase 3 — Derived performance indices (optimised for S&C decisions, not wellness)

Nine indices. Each is defined by **purpose · inputs · weighting rationale · evidence · method ·
confidence · update frequency · thresholds (§4)**. Every index emits a uniform contract:

```
{ value: 0–100, confidence: 0–1, band: 'green'|'amber'|'red', contributors: [...], missingInputs: [...] }
```

**Uniform confidence model (`index.confidence.model`, L5).**
`confidence = Σ(wᵢ · presentᵢ · sourceReliabilityᵢ · baselineMaturityᵢ) / Σ(wᵢ)`, where
`present ∈ {0,1}`, `sourceReliability` from §2.2, and `baselineMaturity = min(daysOfHistory / required, 1)`.
Missing inputs lower confidence; they never block output. Low confidence biases the verdict
**conservative** (toward "further assessment"), so weak data cannot drive aggressive load changes.

### 3.1 Sleep Index
- **Purpose:** quantify the night's restorative value.
- **Inputs / weights:** total sleep time vs personal need (0.40), efficiency (0.25), regularity
  (0.20), subjective quality (0.15); deep+REM proportion shown but **not weighted** (wrist-grade,
  low reliability).
- **Evidence:** sleep is the top recovery lever; 7–9 h, efficiency >85%, regularity matters
  (`physio.sleep.targets`, L1; Walsh 2021 consensus). **Update:** daily.

### 3.2 Cardiovascular Recovery Index
- **Purpose:** autonomic/parasympathetic recovery state.
- **Inputs / weights:** HRV (lnRMSSD vs 7-day rolling baseline + SWC) **0.55 — primary**; nocturnal/
  resting HR vs baseline 0.25 — corroborating; HR-recovery 0.10; respiratory-rate deviation 0.10.
- **Evidence:** `physio.hrv.metric` (L2, Plews 2013/Buchheit 2014), `physio.rhr.role` (L2, Bosquet
  2008 — RHR weak alone). **Update:** daily (morning/nocturnal). _(= today's objective half of
  [Readiness.js](../../packages/engine/src/lib/Readiness.js), formalised.)_

### 3.3 Recovery Index
- **Purpose:** overall recovered-ness = the body's autonomic + sleep + perceived state.
- **Inputs / weights:** subjective recovery/soreness **≥** objective (0.60 subjective / 0.40
  objective), where objective = Cardiovascular Recovery + Sleep.
- **Evidence:** subjective ≥ objective (`readiness.subjective_priority`, L1, Saw 2016).
  **Update:** daily. _(= today's [`assessRecovery`](../../packages/engine/src/lib/recovery/recovery.js),
  formalised + confidence-scored.)_

### 3.4 Training Load Index
- **Purpose:** how much training stress has been applied, acute vs chronic.
- **Inputs:** internal load (sRPE×min and/or Edwards TRIMP) + external volume-load; acute = 7-day
  EWMA, chronic = 28-day EWMA. Reports acute, chronic, and **week-on-week change**. The acute:chronic
  *ratio* is shown as **context only**, never a gate.
- **Evidence:** `load.internal.method` (L1), `load.external.volume_load` (L4); ACWR demoted —
  `load.acwr.validity` (L2, Impellizzeri 2019/2020: mathematical coupling → spurious correlation).
  **Update:** per session / daily. _(= today's [trainingLoad.js](../../packages/engine/src/lib/plan/trainingLoad.js)
  + [load.js](../../packages/engine/src/lib/load/load.js).)_

### 3.5 Fatigue Index
- **Purpose:** accumulated fatigue / overreaching risk.
- **Inputs:** acute load vs chronic **capacity** (§3.7); HRV suppression **+ collapsing HRV CV**
  (NFOR marker); RHR upward drift; subjective fatigue/soreness; performance decrement (e-1RM / bar
  velocity, when available). **Requires corroboration across markers.**
- **Evidence:** `index.fatigue.markers` (L2) — no single objective marker is reliable, so composite
  (Bosquet 2008, Plews 2013). **Update:** daily/rolling.

### 3.6 Wellness Index
- **Purpose:** the psychological/perceived dimension that leads physiology.
- **Inputs:** subjective only — mood, stress, energy, motivation, fatigue, soreness (Hooper-style),
  each vs personal baseline.
- **Evidence:** `readiness.subjective_priority` (L1, Saw 2016). **Update:** daily.

### 3.7 Recovery Capacity Index
- **Purpose:** a slow-moving **trait** — how much load this athlete can absorb (scales acceptable
  chronic load + deload sensitivity).
- **Inputs:** chronic sleep adequacy, chronic HRV baseline **level + stability**, training age /
  fitness (VO₂max proxy, strength standards), age, chronic stress.
- **Evidence:** L4 composite (fitness buffers load; HRV baseline reflects adaptation reserve).
  **Update:** weekly/monthly.

### 3.8 Consistency Index
- **Purpose:** behavioural reliability — and a confidence multiplier.
- **Inputs:** adherence (completed vs planned sessions), data completeness (inputs present),
  routine regularity (sleep + training-timing variance).
- **Use:** high consistency supports progressive overload and **raises confidence**; low biases
  conservative. **Evidence:** L4. **Update:** rolling weekly.

### 3.9 Readiness Index (top-level integrator)
- **Purpose:** the single "can I train hard today?" signal — **derived and explainable, never a
  vendor readiness score.**
- **Inputs / weights (`index.readiness.weights`, L4):** Recovery Index + Wellness Index + Sleep
  Index + Fatigue Index, **modulated** by Recovery Capacity (trait ceiling) and acute Training Load.
  Subjective ≥ objective; HRV is the primary objective marker; sleep heavy; RHR corroborating.
- **Output:** 0–100 + confidence + decision band (§4). **Update:** daily (morning). **Replaces all
  direct use of `daily_metrics.readiness_score`.**

---

## §4 Phase 4 — Decision thresholds (tuned for training decisions)

Bands map onto the engine's existing knobs so a future runtime consumes them with **no contract
shock**: readiness → `volumeModifier` (≈1.0 / 0.9 / 0.78) and the `deloadRecommendation`
(`force`/`defer`) already in [trainingLoad.js](../../packages/engine/src/lib/plan/trainingLoad.js).
Where a personal baseline exists, thresholds are expressed in personal SD; a population fallback is
used until the baseline matures. **The cut-points are L4/L5 heuristics layered on L1/L2 inputs —
stated honestly.**

### 4.1 Readiness Index → action

| Band | Score (or personal-baseline) | Verdict | Engine action |
|---|---|---|---|
| 🟢 Green | ≥ 67 (≈ ≥ baseline − 0.5 SD) | **Performance ready** | train as planned; if also "fresh", allow push |
| 🟡 Amber | 50–66 | proceed with caution | hold volume, cap top-end intensity (`volumeModifier` ≈ 0.9) |
| 🔴 Red | < 50 (≈ ≤ baseline − 1.5 SD) | **Recovery required** | cut volume/intensity, technique/recovery session (≈ 0.78) |
| ⚪ Further assessment | any, **confidence < 0.4** OR illness flag OR HRV CV-collapse | **Further assessment required** | default conservative; prompt check-in / flag possible NFOR |

### 4.2 Supporting-index triggers

| Signal | Threshold | Verdict |
|---|---|---|
| Fatigue Index Red **and** Recovery Index Red, sustained ≥ ~3 days | composite, corroborated | **Deload recommended** → `deloadRecommendation: 'force'` |
| Recovery/Readiness Green **and** load not high, athlete fresh | composite | allow planned deload to be **deferred** → `'defer'` |
| HRV ≤ baseline − 1.5 to 2 SD | personal SD | Cardiovascular Recovery Red |
| HRV CV collapse over weeks | rolling | **Further assessment** (possible NFOR — Plews 2013) |
| Sleep efficiency < 75% or TST < 6 h, sustained | `physio.sleep.targets` | Sleep Red → down-weight readiness |
| Training Load acute:chronic shown ≥ 1.5 | **context only** | corroborator, **never** a standalone gate (Impellizzeri) |

---

## §5 Phase 5 — Missing-data strategy (graceful degradation)

The framework must **reduce confidence, never refuse to recommend.**

**Fallback ladder (highest-trust first):**
1. **Full data** (HRV + sleep + subjective + load) → all indices at high confidence.
2. **No HRV** → lean on RHR-trend + sleep + subjective; Cardiovascular Recovery confidence drops
   (HRV is primary; RHR weak alone — `physio.rhr.role`).
3. **No sleep data** → substitute subjective sleep-quality rating; Sleep Index confidence reduced.
4. **No wearable at all** → fully subjective Hooper-style Wellness (sleep, fatigue, stress,
   soreness, mood). Still a valid Readiness Index — subjective measures are genuinely load-sensitive
   (Saw 2016) — but confidence is **capped (≈ ≤ 0.6)**.
5. **Nothing logged today** → carry the last known state forward with **decaying confidence**; after
   ~3 days, default to neutral "train as planned, please check in".

**Specific substitutions:** HRV → RHR-trend; sleep stages → total sleep + subjective quality;
objective recovery → subjective recovery; device load → session-RPE×min.

**Representing uncertainty.** Every index and the Readiness Index surfaces an explicit confidence
band ("based on 2 of 5 inputs"). Low confidence (a) widens the Amber zone and (b) routes borderline
cases to **"further assessment"** rather than an aggressive call — bounded conservatism, never a
blank screen.

---

## §6 Phase 6 — Scientific review

Evidence prioritised: systematic reviews / meta-analyses / consensus over single studies. Each row
mirrors a knowledge-base entry so every engine constant traces to a citation.

| Claim (KB id) | Level | Confidence | Key sources | Known limitations / conflicting evidence |
|---|---|---|---|---|
| Subjective ≥ objective for load monitoring (`readiness.subjective_priority`) | L1 | High | Saw, Main & Gastin 2016, *BJSM* (systematic review, 56 studies) | subjective is gameable / motivation-confounded; needs honest, habitual logging |
| HRV = lnRMSSD, 7-day rolling + SWC; CV-collapse = NFOR (`physio.hrv.metric`) | L2 | Moderate | Plews et al. 2013, *Sports Medicine*; Buchheit 2014, *Front. Physiol.* | both ↑ and ↓ HRV can signal maladaptation; position/breathing confounds; individual interpretation |
| HRV-guided > predefined training (`physio.hrv.guided_training`) | L1 | Moderate | Manresa-Rocamora 2020 (meta, VO₂max); Granero-Gallegos 2021 (systematic review + meta) | endurance-dominated evidence; VO₂max effect small; sparse resistance-training data |
| RHR corroborating, weak alone (`physio.rhr.role`) | L2 | Moderate | Bosquet et al. 2008, *BJSM* (systematic review) | short-term ↑ only, often within noise; sleeping HR more reliable than waking |
| Sleep targets 7–9 h / eff >85% / regularity (`physio.sleep.targets`) | L1 | High | Walsh et al. 2021, *BJSM* 55(7):356–368 (consensus); 2022–23 sleep-intervention reviews | individual need varies; **wrist/ring sleep-staging is unreliable** — use duration/efficiency/trend |
| Personal-baseline normalization (`physio.normalization.personal_baseline`) | L2 | Moderate | Plews 2013; Dial 2025 (*Physiol Rep*); Miller 2022 | requires 1–8 weeks to build a stable baseline; device-change resets it |
| Per-source reliability weights (`physio.source.reliability`) | L2 | Moderate | Dial 2025 (5 devices vs ECG, 536 nights); Miller 2022 (6 devices) | rankings are device-/firmware-specific and will drift as hardware updates |
| Internal load = sRPE×min / Edwards TRIMP (`load.internal.method`) | L1 | High | Foster 1998/2001; Haddad et al. 2017, *Front. Neurosci.* | sRPE timing/anchoring sensitive; TRIMP needs reliable HR; both miss pure mechanical load |
| External load = volume-load (`load.external.volume_load`) | L4 | Moderate | S&C practice; Bourdon et al. 2017 consensus | tonnage ignores bar speed / effort / proximity-to-failure |
| ACWR is a flawed predictor — context only (`load.acwr.validity`) | L2 | Low | Impellizzeri 2019/2020; Lolli et al.; Frontiers 2021 editorial | originally endorsed by IOC 2016 consensus — now widely contested; mathematical coupling |
| Fatigue is multi-marker, no single index (`index.fatigue.markers`) | L2 | Moderate | Bosquet 2008; Plews 2013 | overreaching definitions vary; performance tests intrusive |
| Readiness weighting heuristic (`index.readiness.weights`) | L4 | Moderate | anchored on Saw 2016 | exact weights are expert judgement, not directly validated |
| Confidence/degradation model (`index.confidence.model`) | L5 | Moderate | design principle | reliability weights are estimates; thresholds need field calibration |

**Future improvements:** per-athlete baseline learning (adaptive windows); validate the readiness
weights against logged performance (does Green predict better sessions?); add cycle-phase modelling
for female athletes; ingest bar-velocity for an objective performance-decrement marker; revisit
device reliability weights as hardware/firmware change.

---

## §7 Implementation roadmap (future — not built in this pass)

This document + the KB entries are the **foundation**; the code build is a clean follow-on that
preserves the frozen `PlanOutput` contract (see [02-REFACTOR-ROADMAP.md](02-REFACTOR-ROADMAP.md)).

1. **Normalization registry** — `packages/engine/src/data/providerMap.js` (provider→universal field
   map) + a `normalize(reading, source)` reading from `physio.source.reliability`. Replaces the
   per-edge-function parsing in `supabase/functions/{fitbit,strava,enrich}-*`.
2. **Personal-baseline utility** — generalise the HRV/RHR-vs-7-day-baseline logic in
   [Readiness.js](../../packages/engine/src/lib/Readiness.js) into a reusable `baselineDeviation(series, value)`.
3. **Index calculators** — `packages/engine/src/lib/indices/*.js`, one per index, each returning the
   `{ value, confidence, band, contributors, missingInputs }` contract; pure functions, `node tests/*.js`.
4. **Integrator** — a `readinessIndex()` that composes the nine and emits the decision band.
5. **Wire behind PlanService** — map the Readiness Index band onto the existing `volumeModifier` /
   `deloadRecommendation` inputs so plan adaptation consumes it with no behaviour shock; validate
   against the golden-master plan tests before cut-over.

## §8 What this supersedes (old → new)

| Today | Becomes |
|---|---|
| [Readiness.js](../../packages/engine/src/lib/Readiness.js) (HRV/RHR/sleep → objective score) | inputs to **Cardiovascular Recovery Index** + **Sleep Index** |
| [recovery.js](../../packages/engine/src/lib/recovery/recovery.js) `assessRecovery` (60/40 blend) | **Recovery Index** (formalised, confidence-scored) |
| [trainingLoad.js](../../packages/engine/src/lib/plan/trainingLoad.js) + [load.js](../../packages/engine/src/lib/load/load.js) | **Training Load Index** + **Fatigue Index** (ACWR → context only) |
| `daily_metrics.readiness_score` (vendor score) | **dropped as output** — one low-trust input at most; replaced by the derived **Readiness Index** |

---

## References

- Saw AE, Main LC, Gastin PB. **Monitoring the athlete training response: subjective self-reported
  measures trump commonly used objective measures: a systematic review.** *Br J Sports Med* 2016. (L1)
- Plews DJ, Laursen PB, Stanley J, Kilding AE, Buchheit M. **Training adaptation and HRV in elite
  endurance athletes: opening the door to effective monitoring.** *Sports Medicine* 2013. (L2)
- Buchheit M. **Monitoring training status with HR measures: do all roads lead to Rome?**
  *Front. Physiol.* 2014. (L2)
- Manresa-Rocamora A, et al. **HRV-based training for improving VO₂max: a systematic review with
  meta-analysis.** 2020. (L1) · Granero-Gallegos A, et al. **HRV-guided training: methodological
  systematic review with meta-analysis.** 2021. (L1)
- Bosquet L, Merkari S, Arvisais D, Aubert AE. **Is heart rate a convenient tool to monitor
  over-reaching? A systematic review of the literature.** *Br J Sports Med* 2008. (L2)
- Walsh NP, et al. **Sleep and the athlete: narrative review and 2021 expert consensus
  recommendations.** *Br J Sports Med* 2021;55(7):356–368. (L1)
- Foster C. **Monitoring training in athletes with reference to overtraining syndrome.** 1998 ·
  Foster C, et al. **A new approach to monitoring exercise training.** *J Strength Cond Res* 2001.
  · Haddad M, et al. **Session-RPE method for training-load monitoring: validity, ecological
  usefulness, and influencing factors.** *Front. Neurosci.* 2017. (L1)
- Impellizzeri FM, et al. **Acute:Chronic Workload Ratio: conceptual issues and fundamental
  pitfalls.** *Sports Medicine / BJSM* 2019–2020; Frontiers editorial 2021. (L2, contested)
- Bourdon PC, et al. **Monitoring athlete training loads: consensus statement.**
  *Int J Sports Physiol Perform* 2017. (L1)
- Dial MB, et al. **Validation of nocturnal resting heart rate and HRV in consumer wearables.**
  *Physiological Reports* 2025 (5 devices vs ECG, 536 nights). · Miller DJ, et al. **A validation of
  six wearable devices for estimating sleep, HR and HRV in healthy adults.** 2022. (L2)
