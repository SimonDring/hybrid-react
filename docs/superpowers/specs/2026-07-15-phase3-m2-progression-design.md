# Phase 3 · M2 — Progression Becomes Real + the Legacy Fill Dies: Design Spec

**Status: DESIGN SPEC (immutable sprint record once merged) · 2026-07-15**
**Authority: DEVELOPMENT-PLAN §5.3 (V2 blueprint ratified). Executes
`11-MIGRATION-PHASES.md` §3 (M2), operationalising `07-PROGRESSION.md` and
`13-VALIDATION-STRATEGY.md` §4.3. Gated on 🔒 1 — SIGNED OFF (Simon, 2026-07-15):
conservative / minimum-effective creep; rollout powerlifting → hypertrophy →
olympic → sports.**

## 1. The milestone

M2 closes the audit's *progress* verb and executes its one retirement. Two
sub-phases, in order:

- **M2a — progression becomes real.** Today a non-logging athlete receives the
  same stimulus for 3–4 weeks — no overload, the single most athlete-visible
  coaching failure (SR-01/G9). M2a makes every athlete progress, honestly.
- **M2b — the retirement.** With progression proven, the legacy volume-first
  deficit fill is **deleted** (Wave A already rescued its last cohorts onto the
  diagnosis-first path, so it now serves nobody). One selection engine for every
  cohort (G6 closed).

## 2. The M2a progression model (from 07-PROGRESSION, per 🔒 1)

**Estimator-driven creep** is the core. For an athlete the engine cannot see
logging, progression runs off what is always known — completions, time, the
calendar, governed knowledge — as a conservative, honestly-labelled estimate:

1. **Conservative posture (🔒 1).** Governed **minimum-effective increments**,
   hold-biased when uncertain (Art 7, Art 8). Under-reach, never over-reach, on
   an unobserved athlete.
2. **Completion-gated.** Creep advances only when prior prescribed sessions were
   completed; a missed block holds, never advances blind.
3. **Labelled estimated.** The advancement carries its confidence tier and driver
   ("estimated — governed rate", Art 13/16); it is visible in the trace/report,
   never dressed as measured.
4. **Any log displaces it instantly.** A single logged set replaces the estimate
   with real autoregulation — logged athletes keep the fast path unchanged.
5. **On top:** accessory **double-progression** (advance reps to the top of the
   range, then load) and **programmed warm-up ramps** to near-maximal work
   (closes SR-10 — no more triples at RPE 8–9 off activation-only primers).

Typed into the ratified stage arms (02 §4 R3): **D12** (dose arm — the
within-block creep + double-progression + ramps), **D7** (block arm — handover
on the creep model), **D15** (runtime arm — reflow honours the same rule).
Bidirectional per 07 §3: deload, **hold** (a decided sameness, recorded), and
estimator **decay** on prolonged non-logging.

## 3. Net first — the M2a acceptance instrument (13 §4.3)

**Before any behaviour changes**, two D14 validators land **report-only** (no
gating — the report → flag → gate ladder starts here, promotion is M4):

- **Progression-sanity** — week-over-week / block-over-block dose movements are
  explicable: advancement only with demonstrated progress or an honestly-labelled
  estimator hold; no unexplained regression; deload cadence within recoverability
  bounds; **a flat six weeks for a progressing athlete is a FAILURE, not a
  default** (SR-01).
- **Dose-coherence** — every prescription's scheme (intensity zone, rep range,
  tempo, rest) is mutually coherent with the quality its session objective names;
  the "3×12 for everyone" fixed-scheme class is the named counter-case (SR-14).

Each ships with **seeded-defect fixtures** (true-positive proof — a flat block, a
contradictory scheme — must fire the validator). Their report is how M2a is
judged: the progression redesign is done when these go quiet for the right
reasons, not by eyeballing plans.

## 4. Rollout (🔒 1: build first, staged)

Per-discipline, each stage its own commit + deliberately re-baselined goldens
(expected-delta note + the M0 guard) + an acceptance test proving **week n+1 ≠
week n in load or reps** for that discipline:

**powerlifting → hypertrophy → olympic → sports gym-support.**

Sports come last (season phasing entangles their progression — and M2a must not
re-introduce the season-in-reflow double-count just fixed).

## 5. M2b — the deletion

Delete the legacy deficit fill, its scoring economy, and its dead scaffolding —
`M-SESS` (the diagnosis-first builder) becomes the ONLY construction path
(TR-08 closed). Because Wave A (P0-5) already routed triathlon / zero-gap
run+cycle / code-less GAA onto the D11 path, deletion must be **behaviour-neutral**
— verified by the **cohort-rescue acceptance tests** (those cohorts' plans stay
correct) and byte-identical goldens for them. The deletion is an **isolated
commit** for wholesale git-revert inside the acceptance window (10 §5.6).

## 6. Rules (binding)

1. **Net before behaviour** (13 §the law): validators land + prove they fire
   (seeded defects) BEFORE the creep changes any plan.
2. **Staged & scoped re-baselines.** Each discipline stage moves only its own
   archetypes; every re-baseline carries an expected-delta note (the M0 guard
   enforces it); any archetype outside the stage's declared scope that moves =
   STOP/BLOCKED (the TR-01 discipline).
3. **Reflow stays live-state-only.** M2a's progression must not make reflow
   diverge from baseline on a neutral day (the M0 reflow≡baseline invariant is
   hard CI — do not regress it; season/calendar stays out of reflow).
4. **Engine purity** (Art 18): no clock/randomness/I-O; creep is a pure function
   of completion history × governed knowledge × priors, deterministic from
   `plan_start_date`.
5. **Knowledge, not code.** Creep rates, increments, ramp schemes, double-
   progression thresholds are **governed knowledge entries** (dose/programming
   domain), provenance-carried, KSV-bumped on edit — never bare literals in
   logic (Art 17; the C3/G19 discipline). A scientist can review the rate that
   steers plans.
6. **Logged athletes unchanged where they already autoregulate.** The fast path
   is preserved; goldens for logged archetypes move only where the ramp/double-
   progression genuinely improves them, deliberately.
7. `npm test` + `test:engine` + `npm run lint` green before every commit.
   **Merges are Simon's** (M2a and M2b as separate PRs — M2b isolated for revert).

## 7. Exit gates (measurable, 11 §3)

- **M2a:** a non-logging intermediate's week 6 ≠ week 5 in load or reps (G9);
  the progression-sanity + dose-coherence validators exist, fire on seeded
  defects, and run report-only across the matrix; per-discipline acceptance
  archetypes prove improved-or-not-degraded plans; the volume machinery survives
  only as the downstream MRV ledger (Art 6).
- **M2b:** zero cohorts served by volume-first selection (G6); the rescue
  cohorts' goldens byte-identical; the fill and its scaffolding are gone.

## 8. Out of scope

Promoting the validators past report-only (the ladder is M4); the deferred
calendar signals (taper `competition_within_h`, fixtures `matches_this_week` —
M6); measured-diagnosis estimators (M3); the substrate/learning loop (M5); the
allocator re-seat (M6). M2 progresses athletes and deletes the fill — nothing
more.
