# Phase 3 · M3 — Measured Diagnosis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Execute M3 per `docs/superpowers/specs/2026-07-15-phase3-m3-measured-diagnosis-design.md` — measured strength estimators from logged lifts (additive-first), k>1 priorities for measured athletes, silent-list burn-down (M3a); then athlete-signal confidence made operative (M3b).

**Architecture:** M3a (T1 estimators + T2 silent-list) → M3a review + PR; M3b (T3 signal confidence) → PR. Branch `phase3-m3-measured-diagnosis-2026-07-15`. The binding invariant is **additive-first**: no new data ⇒ byte-identical plan (M0 `prop-additive-identity` + the measured-vs-prior golden pair are the gate).

**Tech stack:** `packages/engine` (pure ESM) + governed knowledge; node suites; golden master + M0 property suite + snapshot expected-delta guard.

## Global Constraints

1. **Additive-first (the law):** an athlete with NO logged lifts is estimated exactly as today → byte-identical plan. In every re-baseline, ONLY archetypes that HAVE the new data may move (the measured-vs-prior measured twin); any no-data archetype moving = STOP/BLOCKED. `prop-additive-identity` must stay green.
2. **Reuse governed knowledge** (🔒 2 anchor): the strength estimator maps logged e1RM → capability via the existing `STRENGTH_STANDARDS` (`data/strengthStandards.js`), consumed as `estimation.js` already does for the prior. No new coaching literals; any genuinely-new anchor value is a governed entry w/ provenance + KSV bump.
3. **Measured displaces inferred, labelled** (C8; Art 14/16): a measured estimate carries a higher confidence tier than a prior, is stamped `measured` with source, and names the displaced prior in the rationale.
4. **D1 interface unchanged** — new source behind estimation.js's same output shape; D4/D5 untouched except they now receive measured values + confidence.
5. **Purity** (Art 18): pure function of profile data × governed knowledge; no clock/randomness. Determinism from plan_start_date.
6. `npm test` + `npm run test:engine -w @performance-os/engine` + `npm run lint` green before every commit. Controller commits; authoring agents do NOT run git. Trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. No frozen-doc / engine-v2 edits (read-only). Reading list every task: the spec + `docs/design/engine-v2/03-PERFORMANCE-MODEL.md` §2/§5.

---

### Task 1 — Measured strength estimators + k>1 priorities · MODEL: Opus 4.8

**Files:** `packages/engine/src/lib/performance/estimation.js` (the estimator), whatever profile field carries logged lifts (find it — e.g. `lift_log` / tracked-lift fields; check the athlete model + how M0's measured-vs-prior archetype sets lifts), `diagnose.js`/`prioritise.js` (D4/D5 — for k>1), the engine suite.

- [ ] Read 03-PERFORMANCE-MODEL §5 (measurement; the estimator classes + confidence) + §2.1 (a quality carries an assessment method) + spec §2/§3. Read estimation.js fully: how it derives the current (prior-based) strength capability from STRENGTH_STANDARDS + training-age priors, and its output shape + confidence field. Find where logged-lift data lives on the profile and how M0's `measured·strength·*` / measured-vs-prior archetype populates it.
- [ ] Implement the **measured strength estimator**: when logged lifts are present, compute the strength-family capability from the logged e1RM against `STRENGTH_STANDARDS` (the same bands used for display/prior), **displacing** the prior, at a **higher confidence tier**, stamped `measured` + source, displaced-prior named in the rationale. When NO logged lifts → the existing prior path, unchanged (additive-first).
- [ ] **k>1 priorities (G1/G3):** confirm/enable D5 to name >1 priority when measured capability spread justifies it (the pin collapsed to k=1 on flat priors — with real spread, a strong-squat/weak-press athlete surfaces both). Do NOT force k>1 when the spread doesn't justify it.
- [ ] **Acceptance (engine suite):** (a) additive-first — a profile WITHOUT lifts is byte-identical to prior behaviour (assert the estimate + a generated plan match the no-data baseline); (b) a MEASURED profile (strong squat, weak press) gets a measured capability that differs from the prior, labelled `measured`, displaced prior named; (c) that measured athlete gets k>1 priorities. Use the M0 measured-vs-prior archetype shape.
- [ ] **Scoped re-baseline:** `UPDATE=1` — audit key-by-key: ONLY archetypes WITH logged lifts (the measured twin of the measured-vs-prior pair, + any golden archetype that carries lift data) may move, in the expected direction; EVERY no-lift archetype byte-identical. Out-of-scope move = STOP/BLOCKED. `prop-additive-identity` green. EXPECTED-DELTA note.
- [ ] Suite + lint green. Report → `.superpowers/sdd/m3-task1-report.md` (incl.: which archetypes carry lift data + moved; the additive-first proof; the 🔒 2 anchor used).

### Task 2 — Silent-list burn-down (P1-9) · MODEL: Sonnet 5

**Files:** wherever `droppedDemands` + trims/vetoes/deferrals are produced (demandProfile.js has droppedDemands; validation report; PlanService surfacing).

- [ ] Read spec §2 (P1-9) + Art 15. Ensure every silent truncation/deferral/cap the engine makes is present in a surfaceable list on the plan output (`droppedDemands` already exists — extend the pattern to any remaining silent trims). Report-only surface; no behaviour/gating change.
- [ ] **No behaviour change:** golden byte-identical (this is a surfacing/reporting change, not a plan change). If goldens move because the surfaced list is IN the plan output, that is an additive report field — audit it's ONLY the new list field, expected-delta note, no coaching change.
- [ ] Acceptance: a profile with a known dropped demand (e.g. rugby strengthEndurance / an un-homed quality) shows it in the surfaced list with a reason. Suite + lint green. Report → `m3-task2-report.md`.

### Task 3 — M3a review + PR · MODEL: Opus 4.8

- [ ] Review package (`scripts/review-package <merge-base> HEAD`). Verify: (a) **additive-first holds** — independently generate a no-lift profile and confirm byte-identical to prior; `prop-additive-identity` green; only lift-bearing archetypes re-baselined; (b) the 🔒 2 anchor genuinely reuses STRENGTH_STANDARDS (no smuggled literals); (c) measured displaces prior with higher confidence + labelled + displaced-prior named; (d) k>1 only when spread justifies; (e) D1 interface unchanged downstream; (f) purity; (g) silent list surfaced, no behaviour change. Fix Critical/Important; record Minors.
- [ ] Update HANDOFF (M3a done, pending PR — this is Simon's 🔒 2 strength-anchor sign-off point). Push; PR `feat(engine): Phase 3 M3a — measured strength diagnosis (additive-first, k>1 priorities)`. **Simon merges** (his 🔒 2 sign-off).

### Task 4 — M3b: athlete-signal confidence operative (P1-2) · MODEL: Opus 4.8

Runs after M3a merges (or on the same branch if Simon prefers one PR — controller decides at the time). Branch `phase3-m3b-signal-confidence-2026-07-15` off updated main.

- [ ] Read TR-13 (audit 06) + SR-04/SR-08 (audit 07) + `03-PERFORMANCE-MODEL` §5 (confidence) + the readiness/recovery index code (`lib/indices/`, `recoveryIndex.js`, `readinessValidation.js`). Fix the exported confidence at source (`baselineMaturity` hard-coded 1 → real maturity from data history), add a recency gate (a stale driving daily-metrics row is down-weighted) and trend smoothing (one entry ≠ the trend), and gate the readiness cut magnitude by confidence + baseline maturity (one un-baselined bad entry must not swing volume 22%).
- [ ] **Impact:** readiness drives reflow (runtime), not baseline generatePlan — so the golden master (generatePlan) is likely byte-identical; the reflow/readiness tests move deliberately. Confirm which, scope the re-baseline, expected-delta note. `prop-reflow-baseline` still green.
- [ ] Acceptance: a single un-baselined bad wellness entry produces a bounded, confidence-gated adjustment (not a 22% swing); a mature-baseline entry retains authority. Suite + lint green. Whole-branch review (Opus). PR `feat(engine): Phase 3 M3b — athlete-signal confidence operative (TR-13/SR-04)`. **Simon merges.**
