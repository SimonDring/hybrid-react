# Phase 2 — Aerobic loading + a fitness–fatigue ("form") model (2026-07-20)

**Goal.** Give the athlete a real **form** model (fitness vs fatigue vs form) derived from
their whole training load — gym *and* aerobic (Strava) — and a governed, honest aerobic-load
method to feed it. Built the house way: **additive-first, parallel-advisory, flag-OFF,
byte-identical** until a deliberate flip. Parent roadmap:
`docs/superpowers/specs/2026-07-17-sport-data-integration-roadmap-design.md` (§Phase 2).

**Autonomous-session note (2026-07-20).** Authored + built in an autonomous overnight run at
Simon's direction ("run Phase 2 to completion, then PR + merge to main"). Because the
coaching-philosophy calls are Simon's, this phase ships the **mechanism only, flag-OFF** — no
live plan changes — exactly as PR A did. Every judgment call I made is documented in
§Decisions; the **flip** (letting form steer plans / aerobic load change ACWR / the D9
dose-shrink) is Simon's, listed in §The flip (Simon's).

## The science (real, cited — not invented)

- **Aerobic load = Banister TRIMP** (Banister 1991; Morton, Fitz-Clarke & Banister 1990):
  `TRIMP = duration_min × HRr × weight(HRr, sex)`, where `HRr = (HRavg − HRrest)/(HRmax − HRrest)`
  and `weight = 0.64·e^(1.92·HRr)` (male) / `0.86·e^(1.67·HRr)` (female). Falls back to a
  duration proxy when HR is absent. Confidence **moderate** (established; per-individual
  HRmax/HRrest estimation adds error). Sources: [TrainingImpulse](https://www.trainingimpulse.com/banisters-trimp-0),
  [Global Performance Insights](https://www.globalperformanceinsights.com/post/understanding-trimp-a-guide-to-heart-rate-training-impulse).
- **Form = CTL / ATL / TSB** (TrainingPeaks Performance Manager / Coggan, from Banister's
  impulse-response): CTL = 42-day EWMA of daily load (**fitness**); ATL = 7-day EWMA
  (**fatigue**); TSB = CTL − ATL (**form**). EWMA:
  `X_today = X_yesterday·e^(−1/τ) + load_today·(1 − e^(−1/τ))`, τ = 42 (CTL) / 7 (ATL).
  Confidence **low** — the model is well-established but the *time constants are population
  defaults*, per-individual calibration is contested ⇒ capped at **soft input** (Art 13; DAAS
  §4.2 propagation rule). Source: [TrainingPeaks — Science of the Performance Manager](https://www.trainingpeaks.com/learn/articles/the-science-of-the-performance-manager/).

## Architecture — a new parallel analytical product (DAAS §2.3.1 recovery/load family)

The form model is a **pure engine computation** (D17-adjacent analytical product) that runs
**app-side in `trainingStore.buildView`** on the athlete's load history and is exposed as a
**readout** — it does NOT enter `generatePlan` or the reflow, so every plan is byte-identical.

```
workouts + session_logs
  → aerobicLoad() per workout (Banister TRIMP; NEW, governed)   ← the form model's load basis
  → daily load series (form's own basis; the live ACWR path is UNCHANGED — still duration×3)
  → computeForm(series) → { ctl, atl, tsb, band, confidence, rationale }   (NEW, governed)
  → formView on the store → formVerdict() plain language → TrainingLoad screen card
```

**Why the form model uses its own load basis (not live ACWR):** keeping the live
`workoutLoad` proxy unchanged is what makes plans byte-identical. The form model is the "new
way" (real TRIMP); when Simon flips, `trainingLoad.workoutLoad` adopts `aerobicLoad()` and the
two bases converge. Documented, not hidden (DAAS §3.6 — a visible seam, not a smoothed lie).

## Decisions (mine, this session — Simon to confirm)

1. **Form model is a READOUT only** (parallel-advisory, flag-OFF). It steers nothing until the
   flip. Rationale: additive-first; no coaching change ships without Simon's review.
2. **Confidence caps:** aerobic TRIMP `moderate`, form model `low` → **soft input at most**,
   never a gate (Art 13). The rendering states the basis ("based on your watch's HR, less
   reliable than a chest strap") when HR quality is low (DAAS §4.2 worked example).
3. **HRmax estimate:** `208 − 0.7·age` (Tanaka 2001) when no observed max; **HRrest** from the
   athlete's recent `daily_metrics.resting_hr` (falls back to a population 60 bpm, confidence
   lowered). Both governed.
4. **The steering seam is built but OFF.** `deloadRecommendation` gains an optional `form`
   corroboration term (sustained deeply-negative TSB strengthens a deload case) — wired,
   default-OFF (reflow passes no form yet), byte-identical. The flip is a one-line change.
5. **D9 dose-shrink (hard aerobic day → smaller lifting session) is DESIGNED, NOT BUILT** — it
   changes dose and is the sharpest coaching call. Left to the flip.
6. **Raw HR never crosses to a coach** (Art 11) — form is a derived signal; only its
   derived/banded form (fresh/neutral/fatigued) is coach-eligible, and only via the existing
   `player_status` derived surface (not widened here).

## Build (additive-first, flag-OFF, byte-identical) — tasks

- **T1 · aerobic load method.** `packages/engine/src/lib/load/aerobicLoad.js` — pure
  `aerobicLoad(workout, { restHr, maxHr, sex, age })` → Banister TRIMP or duration fallback +
  a confidence tag. Governed `load.aerobic.trimp` in `entries.js` (KSV bump). Pure; tests.
- **T2 · form model.** `packages/engine/src/lib/load/form.js` — pure `computeForm(dailySeries,
  { asOf })` → `{ ctl, atl, tsb, band, confidence, rationale }` (CTL 42 / ATL 7 EWMA; band from
  governed TSB thresholds). Governed `load.form.model`. Pure; deterministic (dates as args);
  tests incl. the EWMA recurrence + empty/sparse series.
- **T3 · verdict + contract.** `apps/mobile/src/lib/verdicts.js` `formVerdict(form)` → plain
  language (fresh/neutral/fatigued, confidence-qualified); a typed `FormOutput` shape. Tests.
- **T4 · store readout.** `trainingStore.buildView` computes `formView` from workouts +
  session_logs via `aerobicLoad` + `computeForm`, exposes it alongside `loadView`. **No reflow
  / no plan change.** Test: plan output byte-identical; `formView` present + correct on a
  seeded athlete.
- **T5 · steering seam (OFF).** `deloadRecommendation` (`trainingLoad.js`) gains an optional
  `form` corroboration term, default-OFF (byte-identical). Test: OFF = identical; ON (unit) =
  corroborates only with low readiness/poor recovery (never forces alone — Art 13).
- **T6 · UI readout.** A Form card on `apps/mobile/src/screens/TrainingLoad.jsx` (CTL/ATL/TSB +
  `formVerdict`), REAL theme vars only. Browser-verified.
- **T7 · verification gate.** Full suite green; golden + manifest re-baseline **stamp-only**
  (form is not read by `generatePlan`); `prop-*` green; `npm run dev` + browser check.

## The flip (Simon's — a later, separate PR)

1. `trainingLoad.workoutLoad` adopts `aerobicLoad()` (live ACWR gains real aerobic fidelity —
   a behaviour change; scoped golden/ACWR re-baseline).
2. `reflow` passes `form` into `deloadRecommendation` (form corroborates deloads).
3. **D9 dose-shrink** — accumulated aerobic fatigue shrinks that day's lifting `fatigueBudget`
   (`sessionObjective.js` → `selectInterventions`). The sharpest call; needs Simon's sign-off.
4. Confirm the aerobic-TRIMP HRmax/HRrest estimates + the TSB band cut-points as governed
   knowledge (they ship PROVISIONAL/low-confidence here).

**Flip considerations surfaced by the Phase 2 whole-branch review (Simon's calls at the flip):**
- **Corroborator tiering (coaching call).** The default-OFF seam currently makes low-confidence
  `form:'fatigued'` an EQUAL-tier corroborator to the moderate-confidence `lowReadiness`/
  `poorRecovery` inside the `loadDeload` branch — so `(ACWR-deload + form-fatigued)` could force a
  deload even against high readiness + good recovery (two low-confidence signals outvoting two
  higher-confidence ones). At the flip, decide whether form should be a weaker/half-weight
  corroborator (Art 13) — needs your explicit sign-off.
- **Readout fidelity (engineering, at the flip).** `aerobicDailyLoads` currently discards
  `aerobicLoad`'s per-workout `confidence`/`method` (only `.load` is used), and `restHr` is a
  single latest value applied to every historical workout — so form confidence today is purely
  history-maturity and old TRIMP scores carry drift. Wire per-date restHr + propagate HR-data
  quality into `formView.confidence` when the readout goes live.
- **Two `deloadRecommendation` callers** (`reflow.js`, `PlanService.js`) — the flip must pass
  `form` to the live one, and give the force branch a form-specific reason string.

## Governance guardrails

Engine pure (Art 18); knowledge is cited/confidence-tagged data, not literals; additive-first
(byte-identical until the flip, proven by `prop-*` + stamp-only golden); raw vitals never cross
a person boundary (Art 11); confidence governs authority (Art 13) — form is soft-input-capped.

## Verification

Each task green on `npm test` + engine `prop-*` + `npm run lint`; the form readout eyeballed in
the browser on `/tracking/load`; golden re-baseline scoped stamp-only + `EXPECTED-DELTA` note.
