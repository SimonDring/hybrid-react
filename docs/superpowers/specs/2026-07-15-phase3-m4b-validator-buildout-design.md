# Phase 3 · M4b — Validator Build-Out (report-only): Design Spec

**Status: DESIGN SPEC (immutable sprint record once merged) · 2026-07-15**
**Authority: DEVELOPMENT-PLAN §5.3; executes `11-MIGRATION-PHASES.md` §5 (M4) backlog P1-3
(validator build-out wave 1) + `13-VALIDATION-STRATEGY.md` §4.3/§8. Follows M4a (safety
enforces). ALL validators land REPORT-ONLY — no non-safety validator gates this phase
(Simon 2026-07-15). Promotion past report-only needs a measured production FP window
(deferred). Autonomous-lane: additive, low-risk (plans unchanged).**

## 1. What this produces

The EDS §35.1 validator suite grows from the M4a set toward the exit-gate target (≥12
validators exist). Five new validators, **each report-only** (they emit findings into the
D14 report; they do NOT trim/veto/gate), **each with seeded-defect fixtures** (13 §8.2 —
true-positive proof it fires on a real violation, and a false-positive guard it stays quiet
on a clean plan):

1. **Sport-protection** (tier 2) — flags a gym prescription that would knowingly reduce
   sport capacity (Art 2): heavy spinal/CNS work stacked into a match/heavy-sport week; the
   gym competing with the sport rather than serving it.
2. **MEV-floor** (tier 3) — flags a priority quality dosed BELOW its minimum-effective
   volume (the mirror of the MRV ceiling): a quality named a priority but under-stimulated.
3. **Dose-coherence** (tier 4 honesty) — flags a prescription whose scheme contradicts its
   session objective's target quality (intensity zone / rep range / tempo / rest mutually
   incoherent with the named quality) — the "3×12 for everyone" class (SR-14).
4. **Progression-sanity** (tier 4 honesty) — flags week-over-week / block-over-block dose
   movement that isn't explicable: an unexplained regression, a flat block for a
   progressing athlete, or a deload cadence outside recoverability bounds (SR-01). (This is
   also the M2 acceptance instrument — it should go quiet for the right reasons.)
5. **Deload-presence** (tier 3) — flags a block that runs past the governed accumulation
   window with no deload (recoverability, Art 9).

## 2. Rules (binding)

1. **REPORT-ONLY.** Every new validator emits a finding at its tier with a reason; NONE
   trims/vetoes/gates. Only the M4a safety tier (injury + lawfulness) disposes. A new
   validator that removes/trims anything = defect.
2. **Plans unchanged → goldens byte-identical** (or additive report-field only): report-only
   validators add findings to `meta.validation`, they never change a plan. If a golden moves
   beyond an additive report field, STOP — the validator is gating, not reporting.
3. **True-positive + false-positive proof** (13 §8.2): each validator ships seeded-defect
   fixtures — a week that violates exactly its rule MUST produce its finding at its tier; a
   clean plan must NOT. Non-vacuous (each fixture proven to flip the finding).
4. **Tier-tagged** per the M4a conflict order (EDS §37): each validator declares its tier so
   the resolution pass places it correctly; confidence caps its verdict (Art 13).
5. **Knowledge, not literals** where a magnitude steers the flag (MEV floors, accumulation
   windows, dose-response ranges): cite governed knowledge; a genuinely new coaching
   magnitude is a governed entry (KSV) or explicitly a seed with an authority cap — do NOT
   bury a new literal (the M6 governance discipline).
6. **The report renders them** (M4a TR-02): the new findings flow through `explainValidation`
   to the report surface (each with reason + tier); the zero-consumer check still passes.
7. Purity (Art 18); `npm test` + `test:engine` + `lint` green. **Merge:** low-risk/report-only,
   autonomous-lane per the standing charter — merge if clean; anything surprising pauses.

## 3. Out of scope

Promotion of any validator past report-only (needs a production FP window — Simon/data,
deferred); the false-positive-budget instrumentation (the ladder mechanism exists from M4a;
measuring the budget needs real traffic); the coach-override seam + explain-persist (M5);
the M6 governance sweep.
