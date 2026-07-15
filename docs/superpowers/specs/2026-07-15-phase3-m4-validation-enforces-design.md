# Phase 3 · M4 — Validation Disposes: Design Spec

**Status: DESIGN SPEC (immutable sprint record once merged) · 2026-07-15**
**Authority: DEVELOPMENT-PLAN §5.3 (V2 ratified). Executes `11-MIGRATION-PHASES.md`
§5 (M4), operationalising `02-COACHING-PIPELINE.md` §3 (the conflict-order pass),
`08-EXPLAINABILITY.md`, and `13-VALIDATION-STRATEGY.md` §8. Gated on the
enforcement posture — SIGNED (Simon, 2026-07-15): safety-critical validators
enforce on defect proof; 🔒 5 injury-veto flipped ON, id-keyed.**

## 1. The verb: *dispose*

Art 19's verb does not happen today (audit's most-emphasised gap): 5/16
validators, report-only at both boundaries, the report reaches no screen, nothing
is vetoed. M4 makes construction *propose* and validation *dispose*: the
safety-critical validators enforce, the conflict order becomes an explicit pass,
and the report reaches a human.

## 2. Scope — M4a (this spec)

Per Simon's 🔒 (2026-07-15): safety-critical only enforces now (we have no
production false-positive window; safety validators are proven by seeded defects —
removing contraindicated work is never wrong).

1. **P2-4 · id-level contraindication vocabulary (TR-10).** Retire the fragile
   exercise-**NAME regex** safety join — a novel exercise name could ship to an
   injured athlete. Contraindication is keyed on **exercise id / movement pattern**
   (governed knowledge), so the join is exhaustive and reviewable. Prerequisite
   for safely enforcing the veto.
2. **🔒 5 · Injury veto ENFORCES (I5).** Flip `ENFORCE_INJURY_VETOES` **on** by
   default, keyed on the id vocabulary: a plan item matching an active
   contraindication is **vetoed at D14** (removed + recorded by name in the
   report). A region with no safe work surfaces the honest **unservable** outcome
   (already built, P0-2) — never a contraindicated session. Lawfulness class
   enforces alongside (safety & law tier). The M4a exit gate:
   **injury + lawfulness classes enforce.**
3. **C1 · The conflict-order resolution pass inside D14** (02 §3). Make the
   Constitution's tier order (Safety > Sport > Recoverability > Intent > Objective
   > Optimisation) an **explicit, testable pass**: competing verdicts/violations
   tagged with their tier; higher tier wins absolutely; confidence modulates only
   *within* a tier; a **resolution record** enters the report (the audit's "the
   winner is whichever line runs later" defect closed). Deterministic.
4. **TR-02 · Render the validation report.** The D14 report becomes a **consumable
   surface** — a structured `meta.validation` a screen can render (every trim/veto
   with its reason + tier). A validation product with **zero declared consumers
   fails the build** (13 §8.3 — computed-but-unread is a detected defect). This is
   the "athletes see why their plan was trimmed" value.

## 3. Out of scope — M4b / later

- The broader validator build-out (sport-protection, MEV-floor, deload-presence
  as new **report-only** members) — a follow-up (M4b), each with seeded defects;
  they stay report-only/flag (Simon: only safety enforces now).
- **Promotion of non-safety validators to gate** — needs a measured
  false-positive window from real usage (13 §8.1); deferred until production data
  exists. The *mechanism* (report → flag → gate ladder, demotion-on-breach) is
  built; promotions past report-only wait for data.
- P2-3 coach-override v1 (`validateProposal` round-trip) — needs M5's override
  schema direction (11 §5 entry gate); folds into M5.
- P2-6 explainability *persistence* (persist per-item rationale, ship `explain()`)
  — needs the trace substrate (M5); M4a renders what's already computed.

## 4. Rules (binding)

1. **Enforcement is safety-only** (Simon 2026-07-15): only injury-contraindication
   + lawfulness verdicts *dispose* (trim/veto). Every other validator stays
   report-only/flag. A non-safety validator must NOT gate this phase.
2. **True-positive proof** (13 §8.2): each enforcing validator ships with
   **seeded-defect fixtures** — a contraindicated exercise smuggled in MUST be
   vetoed, at the safety tier, with a reason. And a clean plan must NOT be vetoed
   (false-positive guard).
3. **The conflict order is the Constitution's** (v1.1, tier 1 = Arts 8/11/18/19/
   21/22): higher tier wins absolutely; confidence modulates within a tier only;
   every multi-verdict resolution leaves a record.
4. **Veto keyed on identity, not names** (the M0/Wave-A discipline + TR-10): the
   contraindication join uses ids/patterns; the review follow-up chip
   (`applyInjuryVetoes` identity-keying) is satisfied by this phase.
5. **Enforcement changes injured/contraindicated plans deliberately.** generatePlan
   is injury-blind; the veto acts at the shipped/filtered surface, so the injured
   golden archetypes (which pin the post-filter output) re-baseline — scoped,
   expected-delta-noted; uninjured archetypes byte-identical (STOP if not).
   `prop-reflow-baseline` + `prop-additive-identity` stay green.
6. **Purity + no silent truncation** (Art 18, Art 15): every veto/trim/resolution
   is recorded and surfaceable; determinism holds.
7. `npm test` + `test:engine` + `lint` green before every commit. **Merges are
   Simon's** (the injury-veto flip is his I5 sign-off; safety enforcement is a
   product decision).

## 5. Exit gates (11 §5, scoped to M4a)

- **Injury + lawfulness classes enforce** (a contraindicated exercise is vetoed;
  the unservable case is honest).
- **The validation report renders** — `meta.validation` is a consumable surface
  with declared consumers (G11 / TR-02 closed); a zero-consumer product fails CI.
- **The conflict order is an explicit, tested pass** with resolution records.
- The report→flag→gate ladder + demotion mechanism exist (promotions past
  report-only await production data).

## 6. Out of scope (beyond M4b)

The learning loop + data product (M5); the allocator re-seat + the M6 governance
sweep (which owns the tracked leftovers: the signal-confidence gate constants,
`styleObjective`, `SELECTION_SCORING`, the deferred taper/fixture signals).
