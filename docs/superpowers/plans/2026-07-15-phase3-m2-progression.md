# Phase 3 · M2 — Progression + Legacy-Fill Deletion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Execute M2 per `docs/superpowers/specs/2026-07-15-phase3-m2-progression-design.md` — M2a (progression becomes real, net-first, staged build→sports) then M2b (delete the legacy fill).

**Architecture:** Net first (T1 validators, report-only, no behaviour change) → progression core gated to powerlifting (T2) → extend hypertrophy/olympic/sports (T3–T5) → M2a review + PR (T6). M2b (T7) on a follow-up branch after M2a merges: isolated deletion + cohort-rescue proof. Branch `phase3-m2-progression-2026-07-15`.

**Tech stack:** `packages/engine` (pure ESM) + governed knowledge tables; node test suites (`npm test`, `test:engine`); golden master + M0 property suite + snapshot expected-delta guard.

## Global Constraints

1. **Net before behaviour** — T1's validators land and prove they fire (seeded defects) before T2 changes any plan.
2. **Staged, scoped re-baselines** — each behaviour task (`UPDATE=1`) moves ONLY its declared discipline's archetypes; commit carries an `EXPECTED-DELTA:` note (the M0 guard enforces it); ANY archetype outside scope that moves = STOP, report BLOCKED (TR-01 discipline).
3. **Reflow≡baseline is hard CI** (M0) — progression must not make a neutral-day reflow diverge from baseline; season/calendar stays out of reflow (do not regress the M0 invariant or the `prop-reflow-baseline` test).
4. **Purity** (Art 18) — no clock/randomness/I-O; creep is a pure deterministic function of completion history × governed knowledge × priors from `plan_start_date`. ESLint purity overlay green.
5. **Knowledge, not code** (Art 17) — creep rates, increments, ramp schemes, double-progression thresholds are **governed knowledge entries** (dose/programming domain) with provenance; edits bump `KNOWLEDGE_SET_VERSION` (the ratchet). No bare coaching literals in logic.
6. **Conservative posture (🔒 1)** — minimum-effective increments, hold-biased when uncertain, completion-gated, labelled estimated, any log displaces the estimate.
7. `npm test` + `npm run test:engine -w @performance-os/engine` + `npm run lint` green before every commit. Controller commits (one per task); authoring agents do NOT run git. Trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
8. No frozen-doc / V2-blueprint edits (read-only ratified reference). Reading list for every task: the spec, `docs/design/engine-v2/07-PROGRESSION.md`, and `13-VALIDATION-STRATEGY.md` §4.3.

---

### Task 1 — Progression-sanity + dose-coherence validators (report-only) · MODEL: Opus 4.8

**Files:** add validators to the D14 suite (`packages/engine/src/lib/validation/` — study `validators.js`/`contract.js`); seeded-defect fixtures in the engine-owned suite (`packages/engine/tests/*.test.mjs`).

- [ ] Read 13 §4.3 (both validators' intent, verbatim) + the current D14 suite (`validators.js`, `contract.js`, `validateWeek`) + EDS §35.1.
- [ ] Implement **progression-sanity** (report-only member of the suite): flags a flat block for a progressing athlete, unexplained dose regression, deload cadence outside recoverability bounds. Emits a report entry `{validator, severity, reason, tier}` — **never gates** (report-only; the ladder is M4).
- [ ] Implement **dose-coherence** (report-only): flags a prescription whose scheme (intensity/rep/tempo/rest) contradicts the quality its session objective names (the "3×12 for everyone" counter-case).
- [ ] **Seeded-defect fixtures (true-positive proof, 13 §8.2):** a hand-built flat-6-week plan MUST fire progression-sanity; a hand-built quality/scheme mismatch MUST fire dose-coherence. TDD: assert they fire, at the right tier, with a reason. Also assert a clean plan does NOT fire (false-positive guard).
- [ ] **No behaviour change:** report-only means the validators add to `meta.validation` report but never trim/veto — golden master must be **byte-identical** (validators don't change plans). Confirm zero snapshot drift.
- [ ] `npm test` + `test:engine` + `lint` green. Report → `.superpowers/sdd/m2-task1-report.md`.

### Task 2 — Progression core: estimator-driven creep, gated to POWERLIFTING · MODEL: Opus 4.8

**Files:** governed knowledge entries for creep rates / increments / ramps / double-progression thresholds (dose/programming knowledge — study `data/doseSchemes.js` + `lib/knowledge/entries.js`); the dose arm (D12 — `allocator.js` `scheme()` / `strength/` dose path); discipline gate (`disciplines/` or the style resolution).

- [ ] Read 07-PROGRESSION §1–§2 (Levels 1–2 estimator-driven creep; §2.8 ramps), §3 (hold/decay). Locate where per-week dose is assigned and how the week index is available (creep is a function of week-in-block × completion × governed rate).
- [ ] Author the governed knowledge: conservative minimum-effective creep rate per adaptation, the double-progression rep→load thresholds, the warm-up ramp scheme to near-maximal work — as **entries with provenance** (bump KSV). Values are the coaching knowledge; the code only reads them.
- [ ] Implement estimator-driven creep in the dose arm, **gated to powerlifting only** (other disciplines unchanged this task): a non-logging PL athlete's compound load/reps advance week-over-week at the governed conservative rate, **completion-gated** (advances only if prior weeks are marked complete in the profile's history; absent history → the fresh-plan default creep, conservative), **labelled estimated** (confidence tier in the item + trace). Accessories get double-progression; top sets get programmed warm-up ramps. **Any logged set displaces the estimate** (logged path unchanged).
- [ ] **Acceptance (the G9 target):** a new test asserts a non-logging PL intermediate's **week 6 ≠ week 5 in load or reps**, and that the advancement is labelled estimated with its driver in the trace. Add it to the engine suite.
- [ ] **Re-baseline POWERLIFTING archetypes only** (`UPDATE=1`): audit the delta key-by-key — only PL archetypes move, in the expected direction (progressive load/reps); every non-PL archetype byte-identical (else STOP/BLOCKED). Commit's `EXPECTED-DELTA:` note names them.
- [ ] Run the **progression-sanity validator** over the new PL plans — it must go **quiet** (the flat-block flag no longer fires for PL). This is M2a's acceptance instrument working.
- [ ] Reflow: confirm `prop-reflow-baseline` still hard-passes (creep is baseline; a neutral reflow still reproduces it). `npm test` + `test:engine` + `lint` green. Report → `.superpowers/sdd/m2-task2-report.md`.

### Task 3 — Extend progression to HYPERTROPHY · MODEL: Sonnet 5

- [ ] Read Task 2's report + the model it built. Author hypertrophy's creep/double-progression knowledge entries (its rep-range emphasis differs — reps-first double progression); enable the discipline through the same gated path (no new mechanism — extend the gate).
- [ ] Acceptance: a non-logging hypertrophy intermediate's week 6 ≠ week 5. Re-baseline **hypertrophy archetypes only** (expected-delta note; others byte-identical or STOP). Progression-sanity goes quiet for hypertrophy. Suite + lint green. Report → `m2-task3-report.md`.

### Task 4 — Extend progression to OLYMPIC · MODEL: Sonnet 5

- [ ] Same pattern for olympic (intensity-led; ramps matter most here — near-maximal singles/doubles need real programmed ascent, SR-10). Author its knowledge entries; enable through the gate.
- [ ] Acceptance: non-logging olympic week 6 ≠ week 5; ramps present on the competition lifts. Re-baseline **olympic archetypes only**. Suite + lint green. Report → `m2-task4-report.md`.

### Task 5 — Extend progression to SPORTS gym-support · MODEL: Opus 4.8

- [ ] Read 07 §2.5/§2.6 (block/season interaction). Extend creep to sport gym-support cohorts — **carefully**: progression must respect season phasing WITHOUT re-introducing the season-in-reflow double-count (the M0 fix). Season shapes the baseline plan (via seasonProgramming); creep advances within that; reflow stays live-state-only.
- [ ] Acceptance: a non-logging in-season sport athlete progresses across a block AND `prop-reflow-baseline` still hard-passes (neutral reflow ≡ baseline — no calendar leak). Re-baseline **sport archetypes only**. Suite + lint green. Report → `m2-task5-report.md`.

### Task 6 — M2a whole-branch review + PR · MODEL: Opus 4.8

- [ ] Generate the review package (`scripts/review-package <merge-base> HEAD`). Review: (a) every re-baseline is scoped + expected-delta-noted (no cross-cohort drift); (b) creep is conservative + completion-gated + labelled + purely deterministic (no clock/random); (c) rates/increments are governed knowledge, not literals (KSV bumped); (d) logged path unchanged; (e) reflow≡baseline still hard-passes; (f) the validators fire on seeded defects and go quiet on the progressed plans; (g) the G9 acceptance (week6≠week5) holds per discipline. Fix Critical/Important; record Minors.
- [ ] Update HANDOFF (M2a done, pending PR). `npm test` + `test:engine` + `lint` green. Push; open PR `feat(engine): Phase 3 M2a — progression becomes real (estimator-driven creep, build→sports)`. **Simon merges.**

### Task 7 — M2b: delete the legacy fill (SEPARATE branch off merged M2a) · MODEL: Opus 4.8

Runs only after M2a merges. Branch `phase3-m2b-fill-deletion-2026-07-15` off updated main.

- [ ] Read audit 04 B1 + `10-MIGRATION-ARCHITECTURE.md` (disposition) + the fill path (`allocator.js` deficit-fill branch + scoring economy + `diagnosisSteers` gate + dead scaffolding). Confirm via the goldens that **no cohort** currently routes to the fill (Wave A P0-5 rescued the last ones — triathlon/zero-gap/GAA on the D11 path).
- [ ] Delete the fill, its scoring economy, and the dead scaffolding it owns; make `diagnosisSteers` unconditional (every cohort diagnosis-first) or remove it. **M-SESS is the only construction path.**
- [ ] **Behaviour-neutral proof:** the cohort-rescue acceptance archetypes (triathlon, zero-gap run/cycle, code-less GAA) produce **byte-identical** plans (they were already on the D11 path); golden master byte-identical for them; if ANY plan moves, STOP — the fill was still serving someone.
- [ ] Isolated single deletion commit (git-revertible). Suite + `test:engine` + lint green. Whole-branch review (Opus). Push; PR `refactor(engine): Phase 3 M2b — delete the legacy volume-first fill (one selection engine, G6)`. **Simon merges.**
