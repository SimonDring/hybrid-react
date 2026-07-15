# Phase 3 · M3 — Measured Diagnosis: Design Spec

**Status: DESIGN SPEC (immutable sprint record once merged) · 2026-07-15**
**Authority: DEVELOPMENT-PLAN §5.3 (V2 ratified). Executes `11-MIGRATION-PHASES.md`
§4 (M3), operationalising `03-PERFORMANCE-MODEL.md` §2/§5. Gated on 🔒 2 + 🔒 3 —
DIRECTION SIGNED (Simon, 2026-07-15): measured STRENGTH estimators from logged
lifts first; DEFER the new-quality vocabulary until it is measurable.**

## 1. The verb: *measure*

Today the engine estimates 9/10 capabilities from training-age priors — "a guess
wearing a lab coat" (SR-02). M3 makes the engine **measure** the athlete where
they give data, displacing the prior with real evidence and recording the
displacement (C8). Its one inviolable law is **additive-first**: an athlete who
gives no new data gets a **byte-identical plan** (the M0 `prop-additive-identity`
property is now load-bearing; the M0 measured-vs-prior golden pair is the
acceptance instrument).

## 2. Scope (per Simon's 🔒 answers)

**In — M3a (this spec's build):**
- **P1-1 · Measured strength estimators.** When the athlete has logged/tracked
  lifts, derive a **measured** capability estimate for the strength family via the
  **existing governed `STRENGTH_STANDARDS`** (the 🔒 2 anchor — reuse, not new
  science): logged e1RM → band → capability level, displacing the training-age
  prior, at higher confidence, **behind D1's same interface** (`estimation.js`).
  The displacement is recorded and explainable (C8; Art 16 — become personal as
  evidence accumulates, never oversell). Staged, confidence-tagged.
- **k>1 priorities for measured athletes (G1/G3).** With real capability spread,
  D5 can name more than one priority (the pin collapsed to k=1 on flat priors);
  a measured athlete with a strong squat but a poor press gets both diagnosed.
- **P1-9 · Silent-list burn-down** (Art 15) — the `droppedDemands` ledger + any
  trim/veto/deferral is surfaced, not silent (rides along; small).

**In — M3b (follow-up task, same phase):**
- **P1-2 · Athlete-signal confidence made operative** (TR-13): fix the exported
  confidence at source (`baselineMaturity` hard-coded 1), add a recency gate and
  trend smoothing, and gate the readiness cut magnitude by confidence + baseline
  maturity (the generalised ACWR-demotion discipline — one bad un-baselined entry
  must not swing volume 22%).

**Out — deferred by 🔒 3:**
- **P1-7 vocabulary expansion** (the 10 new qualities). NOT added this phase — a
  quality is added only when its paired assessment + dose-response + capture
  exists ("measure what you diagnose"). The `droppedDemands` honesty ledger keeps
  surfacing them meanwhile. Revisited when the data product (M5) provides capture.

## 3. Additive-first — the binding invariant

1. **No new data ⇒ byte-identical plan.** An athlete with no logged lifts is
   estimated exactly as today. Golden master: every archetype WITHOUT lift data is
   byte-identical; only the measured-vs-prior archetype's **measured twin**
   re-baselines (deliberately, expected-delta note). If a no-data archetype moves
   = STOP/BLOCKED (the estimator leaked into the prior path).
2. **Measured displaces inferred, and says so.** A measured estimate carries a
   higher confidence tier than a prior and is labelled `measured` with its source
   in the trace; the displaced prior is named in the rationale (Art 14/16).
3. **Confidence governs authority** (Art 13): a measured capability may drive
   diagnosis more strongly than a prior; a thin/stale measurement widens margins,
   never halts (Art 13 — uncertainty widens, never stops).

## 4. Rules (binding)

1. **Reuse governed knowledge** (🔒 2 anchor): the strength estimator maps through
   the existing `STRENGTH_STANDARDS` — no new coaching literals. If any anchor
   value is genuinely new, it is a governed entry with provenance (KSV bump).
2. **D1 interface unchanged** — the estimator is a new *source* behind
   `estimation.js`'s same output shape; downstream (D4/D5/…) is untouched except
   that it now receives measured values + confidence where data exists.
3. **Purity** (Art 18): estimation is a pure function of profile data (logged
   lifts are profile fields) × governed knowledge; no clock/randomness.
4. **Additive-first golden discipline** (§3.1): scoped, expected-delta-noted
   re-baselines; the M0 `prop-additive-identity` + measured-vs-prior pair are the
   gate. `npm test` + `test:engine` + `lint` green before every commit.
5. **Merges are Simon's** — the PR is his per-quality 🔒 2 sign-off point (the
   strength-family anchor); a quality without his sign-off stays prior-driven.

## 5. Exit gates (11 §4)

- **Additive-first proven:** a profile with no new data → byte-identical plan
  (golden + `prop-additive-identity`).
- **≥4 of 10 qualities measurable** from data the app can collect (the strength
  family clears this), and **k>1 priorities for measured athletes** (G1/G3).
- The silent list is empty or rendered.
- (M3b) one un-baselined bad wellness entry no longer swings volume unbounded;
  readiness confidence is operative (gates, not decoration).

## 6. Out of scope

The vocabulary expansion (🔒 3 defer); validation *enforcement* (M4 — the
validators stay report-only); the substrate/learning loop (M5); the allocator
re-seat + dead-scaffolding sweep (M6, incl. the M2b leftovers).
