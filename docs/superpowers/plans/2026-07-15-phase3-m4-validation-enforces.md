# Phase 3 · M4a — Validation Disposes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Execute M4a per `docs/superpowers/specs/2026-07-15-phase3-m4-validation-enforces-design.md` — id-level contraindication vocabulary, injury-veto + lawfulness ENFORCE (🔒 5), the conflict-order pass in D14, and a rendered validation report. Safety-only enforcement (Simon 2026-07-15).

**Architecture:** T1 id-vocab (prereq) → T2 veto+lawfulness enforce → T3 conflict-order pass → T4 render report → T5 review + PR. Branch `phase3-m4-validation-enforces-2026-07-15`.

**Tech stack:** `packages/engine` (pure ESM) + governed knowledge; node suites; golden master + M0 property suite + snapshot expected-delta guard. Key files: `packages/engine/src/lib/validation/{contract.js,validators.js,progression.js}`, `packages/engine/src/lib/injury/injuryFilter.js`, `apps/mobile/src/lib/PlanService.js` (`ENFORCE_INJURY_VETOES` at :294).

## Global Constraints

1. **Enforcement is SAFETY-ONLY** (Simon 2026-07-15): only injury-contraindication + lawfulness verdicts dispose (trim/veto). Every other validator stays report-only/flag; a non-safety validator must NOT gate this phase.
2. **True-positive proof** (13 §8.2): each enforcing validator ships seeded-defect fixtures — a contraindicated exercise smuggled in MUST be vetoed at the safety tier with a reason; a clean plan must NOT be vetoed (FP guard).
3. **Conflict order = Constitution v1.1** (tier 1 = Arts 8/11/18/19/21/22): higher tier wins absolutely; confidence modulates within a tier only; every multi-verdict resolution leaves a record.
4. **Veto keyed on identity, not names** (TR-10): the contraindication join uses ids/patterns; this also satisfies the open `applyInjuryVetoes` identity-keying chip.
5. **Scoped re-baselines:** enforcement changes injured/contraindicated plans deliberately (generatePlan is injury-blind; the veto acts at the shipped/filtered surface — the injured golden archetypes that pin post-filter output re-baseline). ONLY injured/contraindicated archetypes may move; uninjured byte-identical (STOP if not). Every re-baseline carries an `EXPECTED-DELTA:` note (the M0 guard). `prop-reflow-baseline` + `prop-additive-identity` stay green.
6. **Purity + no silent truncation** (Art 18/15): every veto/trim/resolution recorded + surfaceable; determinism from plan_start_date. No clock/random.
7. `npm test` + `npm run test:engine -w @performance-os/engine` + `npm run lint` green before every commit. Controller commits; authoring agents do NOT run git. Trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. No frozen-doc / engine-v2 edits. Reading list every task: the spec + the cited design doc.

---

### Task 1 — id-level contraindication vocabulary (TR-10) · MODEL: Opus 4.8

**Files:** the injury→contraindication join (`injuryFilter.js` + wherever `blockedNameRegexes`/name matching lives), governed contraindication knowledge (injuryTaxonomy / a contraindication map keyed on exercise id + movement pattern).

- [ ] Read spec §2.1 + audit TR-10 (06) + K2 (docs/reviews/2026-07-09-knowledge-architecture-review.md) + the current name-regex join. Establish HOW injuries currently block exercises (name regex) and where the exercise id/pattern is available.
- [ ] Replace the name-regex safety join with an **id/pattern-keyed** contraindication: each injury region → contraindicated movement patterns / exercise ids, as **governed knowledge** (provenance; KSV bump if a science table changes). A novel exercise is matched by its pattern/id, never missed by a name gap.
- [ ] **Behaviour-preserving where it should be:** for existing exercises the id-join must reproduce today's blocking (the injury-classification pin is the guard — a changed classification is a reviewed diff, not silent). Audit the injury-classification pin: intended changes (newly-caught exercises the regex missed) are deliberate + noted; no unintended un-blocking. `prop-*` green.
- [ ] Suite + lint green. Report → `.superpowers/sdd/m4-task1-report.md` (the join before/after; which exercises are newly-caught; pin delta).

### Task 2 — Injury veto + lawfulness ENFORCE (🔒 5 / I5) · MODEL: Opus 4.8

**Files:** `PlanService.js` (`ENFORCE_INJURY_VETOES`), `contract.js`/`validators.js` (the D14 enforcement path from Wave A P0-3), the engine suite.

- [ ] Read spec §2.2 + the P0-3 veto mechanism (Wave A — `applyInjuryVetoes`, `enforceInjuryVetoes` option) + injuryFilter unservable path (P0-2). Confirm the veto now keys on Task 1's id vocabulary (not names) and removes by item identity (the review chip).
- [ ] **Flip `ENFORCE_INJURY_VETOES` → true** (default on). A plan item matching an active contraindication is vetoed at D14: removed, recorded by name in the report at the safety tier. A region with no safe work → the honest unservable outcome (P0-2), never a contraindicated session. Lawfulness-class validators enforce alongside (safety & law tier).
- [ ] **Seeded-defect proof** (engine suite): a contraindicated exercise smuggled into a week MUST be vetoed at the safety tier with a reason; an injured athlete with safe alternatives keeps a valid (non-contraindicated) session; a clean/uninjured plan is NOT vetoed (FP guard). Include a duplicate-title/duplicate-item case (the identity-keying chip).
- [ ] **Scoped re-baseline:** injured/contraindicated archetypes re-baseline (the veto now removes contraindicated work at the shipped surface); UNINJURED archetypes byte-identical (STOP if not). Audit key-by-key; EXPECTED-DELTA note. `prop-reflow-baseline` + `prop-additive-identity` green.
- [ ] Suite + lint green. Report → `m4-task2-report.md` (what the veto now removes; the unservable cases; re-baseline scope).

### Task 3 — The conflict-order resolution pass inside D14 (C1) · MODEL: Opus 4.8

**Files:** `contract.js`/`validators.js` (the D14 suite — add the resolution pass), the engine suite.

- [ ] Read 02 §3 (the ratified pass) + Constitution v1.1 conflict order + audit 02 §3 (the "winner is whichever line runs later" defect). The tier order + tier-1 membership are already partly in contract.js (SAFETY & LAW etc.) — make the resolution EXPLICIT.
- [ ] Implement the resolution pass: when ≥2 verdicts/violations conflict on the same item/slot, resolve by tier — **higher tier wins absolutely; confidence modulates only WITHIN a tier**; emit a **resolution record** into the report (which verdict won, which tier, why). Never resolve across tiers on confidence (02 §3.2 — the absolute-across-tiers invariant).
- [ ] **Property test** (engine suite, per 13 §5.2): the resolution pass never resolves across tiers by confidence; a safety verdict always beats a lower-tier one regardless of confidence; a resolution record exists whenever ≥2 conflicted. Seeded conflict fixtures.
- [ ] **Behaviour:** the pass changes outcomes only where a conflict was previously resolved by line-order and the tier order disagrees — audit any golden movement (likely limited to contraindication-vs-objective cases already covered by T2's enforcement); scope + expected-delta note; uninvolved archetypes byte-identical.
- [ ] Suite + lint green. Report → `m4-task3-report.md`.

### Task 4 — Render the validation report (TR-02) · MODEL: Sonnet 5

**Files:** the `meta.validation` shape (`PlanGenerator.js`/`contract.js`), a consumer registration (13 §8.3), possibly an app-side render hook (keep minimal — structured output is the deliverable, not UI polish).

- [ ] Read spec §2.4 + TR-02 (audit 06) + 08-EXPLAINABILITY §5 (the report as a first-class renderable) + 13 §8.3 (consumers declared; zero-consumer = build fail).
- [ ] Ensure `meta.validation` is a **consumable, structured surface**: every trim/veto/resolution with reason + tier, shaped for a screen to render (athlete-facing "why your plan was trimmed"). Register at least one declared consumer; add the **zero-consumer check** (a validation product with no declared consumer fails CI — the TR-02 lesson made structural).
- [ ] **No coaching change:** this is a surfacing change. If `meta.validation` is additive to the plan output, audit it's ONLY the new/expanded report field (no plan/dose/priority change); expected-delta note. Golden otherwise byte-identical.
- [ ] Acceptance: a vetoed/trimmed plan exposes the reason + tier on `meta.validation` in a render-ready shape; the zero-consumer check fails when a product has no consumer. Suite + lint green. Report → `m4-task4-report.md`.

### Task 5 — M4a review + PR · MODEL: Opus 4.8

- [ ] Review package (`scripts/review-package <merge-base> HEAD`). Verify: (a) **only safety enforces** — no non-safety validator gates; (b) the veto keys on id/pattern (not names) + item identity; seeded defects prove true-positives + the FP guard; (c) the unservable case is honest (never ships contraindicated); (d) the conflict pass resolves by tier absolutely, never across tiers on confidence, with records; (e) re-baselines scoped to injured/contraindicated archetypes, uninjured byte-identical, `prop-*` green; (f) the report renders with a declared consumer + zero-consumer CI check; (g) purity. Fix Critical/Important; record Minors.
- [ ] Update HANDOFF (M4a done — the injury-veto flip is Simon's I5 sign-off; note the M4b validator build-out follow-up). Push; PR `feat(engine): Phase 3 M4a — validation disposes (injury veto + lawfulness enforce, conflict-order pass, report renders)`. **Simon merges** (his I5 / safety-enforcement sign-off).
