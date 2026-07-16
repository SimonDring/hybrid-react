# Phase 3 · M5 — The D16 Learning Loop: Design Spec

**Status: DESIGN SPEC (immutable sprint record once merged) · 2026-07-16**
**Authority: DEVELOPMENT-PLAN §5.3; executes `11-MIGRATION-PHASES.md` §6 (M5 · P2-7) per
the RULED promotion policy (🔒 7, Simon 2026-07-16 — adopted the recommendations in
`docs/design/m5-learning/PROMOTION-POLICY.md`). The M5 substrate is LIVE (20260713 on
prod). This closes the last verb — LEARN — behind the substrate the migration built.**

## 1. The ruled policy (🔒 7 — the authority for this build)

- **Promotion (staged→learned) is twice-gated:** Gate A = **≥3 blocks** of evidence **AND**
  a moderate-confidence floor; Gate B = the staged prior **predicted the last outcome**
  (Art 12 falsifiability). Both must hold.
- **Shrinkage:** a newly-learned prior may deviate from the population prior by **~15%**,
  widening as predictive blocks accumulate (Art 16 — never oversell). The population prior
  is always the floor.
- **First-armed lever: deload rhythm ONLY.** A learned prior may steer D7's deload cadence
  first (the most reversible lever); volume tolerance / block length stay population-driven
  this increment.
- **Demotion: asymmetric hysteresis** — slow to promote (3 blocks), **fast to demote** (first
  clear misprediction). An abstain (no clear signal) does not demote.
- **TR-05 hard rule:** an unlearned / schema-default prior **NEVER** arms the steer. The
  presence of a genuinely-learned `learnedPriors.<quality>` IS the arming signal; staged
  priors live in a structurally distinct field the steer never reads.

## 2. Scope

**M5-L1 — the engine promotion policy (this spec's build; pure, additive-first):**
- A pure D16 function: `promoteFromOutcomes(blockOutcomeHistory, populationPrior) →
  { learnedPriors, staged }`. Reads the block-outcome evidence (the shape the substrate's
  `block_outcomes.outcome_signals` carries), applies Gates A+B, emits a **learned** prior
  (shrunk ≤15%, confidence-tagged) only when both gates pass; otherwise keeps it **staged**
  (steers nothing). Demotion on misprediction. Provenance-stamped (three-tier, EDS §25).
- **D7 arming wired to learned priors only:** confirm/complete that `blockDeloadSteers`
  reads `learnedPriors.recoveryRate` and NOTHING else arms the deload steer (TR-05). No
  learned prior ⇒ population deload rhythm, byte-identical.
- **The falsifiability read:** the staged prior carries its prediction for the block; at
  block close the observed outcome is compared; a hit advances the predictive count (Gate B),
  a miss blocks/demotes.

**M5-L2 — the app writes the loop closed (paired follow-up, own PR):** on block close,
PlanService/SyncService writes a `block_outcomes` row (prescribed-vs-actual + the derived
`outcome_signals`) to the live substrate (append-only, owner-private); a bounded read feeds
`promoteFromOutcomes`; the promoted `learnedPriors` land on the athlete model the next pass
reads. (Writes to the live DB are normal app behaviour — append-only owner-private rows,
RLS-protected; no migration.)

## 3. Rules (binding)

1. **Additive-first (the law, as M3):** an athlete with no block-outcome history gets
   **NO learned priors → today's population-prior plan, byte-identical.** `prop-additive-
   identity` + a golden check: every archetype (none has learned priors) byte-identical.
   Only a synthetic-history fixture exercises promotion.
2. **Learning writes priors ONLY** (Art 18; EDS D16): `promoteFromOutcomes` returns priors;
   it NEVER names a plan/session/dose. The pure plan path never reads the substrate (the
   app's async band does). No clock/randomness in the engine function.
3. **The ruled gates are exact** (§1): 3 blocks + confidence floor + last-block-predictive to
   promote; ~15% shrinkage; deload-rhythm only; fast demotion. Any deviation = defect.
4. **Confidence governs authority** (Art 13): a learned prior is confidence-tagged; its
   deviation authority scales with predictive evidence; a demoted prior returns to population.
5. **Provenance** (EDS §25): every learned prior stamped with its tier + evidence count +
   the versions that produced it; reproducible.
6. `npm test` + `test:engine` + `lint` green. **Merge is Simon's.**

## 4. Out of scope

The app-side substrate writes (M5-L2 — paired follow-up PR); volume-tolerance / block-length
learning (deload-rhythm only this increment); team trends + AIGAS go-live (later M5 / Phase 4);
M6.
