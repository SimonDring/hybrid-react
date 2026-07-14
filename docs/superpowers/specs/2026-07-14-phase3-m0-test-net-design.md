# Phase 3 · M0 — The Test Net: Design Spec

**Status: DESIGN SPEC (immutable sprint record once merged) · 2026-07-14**
**Authority: DEVELOPMENT-PLAN §5.3 ratified (PR #179). Executes the V2 blueprint's
first build phase — `11-MIGRATION-PHASES.md` §1 (M0) + `13-VALIDATION-STRATEGY.md`
§2.2, §5.2, §6. M0 changes NO engine behaviour — additive tests only — and carries
NO 🔒 Simon decision points.**

## 1. Why M0 is first and safe

The blueprint's one law: *the net precedes the change* — every later phase lands
its safety net before its behaviour change. M0 is that net. It makes the audit's
two proven failure modes structurally impossible to repeat: a regression
re-baselined into the goldens unnoticed (TR-01), and production running paths the
goldens never exercise (TR-05). It ships confidence, nothing else — and because
it only adds tests, its rollback is "revert the flaky test alone."

## 2. Scope — six workstreams (all from 13-VALIDATION-STRATEGY)

1. **Engine-owned suite seed** (§1 mechanic 3). At the pin the engine had no test
   suite of its own — it delegated to `apps/mobile/tests`. M0 seeds a suite in
   `packages/engine` with its own runner entry point; every module must be
   exercisable **without booting the app**. The app suite is retained for
   adapter/store/UI seams. Existing `apps/mobile/tests/*` stay green untouched.
2. **Archetype-matrix extension** (§2.2). Add, at minimum, the five extension
   archetype families to the golden matrix: **armed-D7** (populated
   recoverability priors so the D7 arm runs armed, not on schema defaults —
   TR-05), **injured** across regions **including the five bare rehab regions**
   (pinning the current honest fallback — NOT authoring rehab content, which is
   🔒 4 / M1-residual science), **measured-vs-prior pairs** (the additive-first
   seam), **legacy-rescue cohorts** (triathlon / zero-gap run+cycle / code-less
   GAA), **non-logging progressors** (week n vs n+1), plus steered-path
   archetypes (SKB decision rules, position modifiers).
3. **Property test classes** (§5.2). reflow≡baseline-when-nothing-changed;
   cross-runtime determinism; additive-measurement byte-identity; the contract
   properties (`{value, confidence, rationale}` present + confidence ≤ weakest
   input + `droppedDemands`/`parked` always present + D16-names-a-plan fails);
   purity triple-enforcement extended to any new module surface.
4. **Re-baseline discipline made enforceable** (§2.3). The expected-delta-note
   protocol documented AND a CI/review guard: a PR whose diff touches
   `__snapshots__/` without an accompanying expected-delta note fails.
5. **RLS harness into CI** (§1 · §7 CA-12). `supabase/tests/rls-harness.mjs`
   runs in CI from M0 (it was manual/non-CI at the pin).
6. **Performance benchmarks as measured baselines** (§6). A benchmark harness in
   the engine-owned suite records percentiles per engine+knowledge version —
   **baselines only this phase**, not yet CI-failing budgets (budgets need two
   phases of data).

## 3. Rules (binding)

1. **Zero behaviour change.** The 28 pinned archetypes stay **byte-identical** —
   M0 adds NEW archetypes to the matrix (an additive snapshot extension), it does
   not re-baseline existing ones. If any existing archetype moves, STOP: that is a
   real regression, not an M0 diff to accept.
2. **Non-vacuous tests only.** A property test that passes trivially (asserts
   nothing, or the property is unreachable in the current engine) is a defect, not
   a pass. Every property must be shown to *fail* against a deliberately broken
   input (the injected-defect discipline, §8.2) so we know it can catch.
3. **A property that fails against the current post-Wave-A engine is a FINDING,
   not a test to weaken.** M0's job is to catch latent divergences (reflow vs
   baseline was caught after the fact twice — §5.2). If reflow≡baseline or any
   invariant fails on today's engine, report it with the reproducing profile for
   Simon — do not adjust the test to make it green.
4. **Engine purity holds** (Art 18): no clock / randomness / I-O added inside
   `packages/engine`; the ESLint purity overlay stays green. Determinism tests
   use fixed `plan_start_date`, never the clock.
5. **`npm test` + `npm run lint` green before every commit.** New engine-suite
   tests run in CI. Golden additions carry their expected-delta note (here: "N new
   archetypes added; zero existing archetypes move").
6. **No frozen-doc edits; no V2-blueprint edits** (the blueprint is the ratified
   reference this phase executes, read-only).

## 4. Model allocation (Simon's policy: floor = Sonnet 5, allocate by complexity)

- **Sonnet 5**: engine-suite scaffold; archetype-matrix extension; RLS-into-CI;
  perf baselines; the expected-delta guard.
- **Opus 4.8**: the property-test suite (subtle invariants where a vacuous test is
  a false guarantee); the final whole-branch net review.

## 5. Out of scope

Any engine behaviour change (that is M2+); authoring the 5 bare-region rehab
CONTENT (🔒 4, science, M1-residual — M0 only pins current honesty behaviour);
the M2 progression-sanity / dose-coherence validators (they need M2's behaviour);
turning perf baselines into CI-failing budgets; the P1-10 DB apply and Edge
Function deploys (Simon's, tracked in HANDOFF).

## 6. Exit gate (from 11 §1)

Golden archetypes exercise every armed production path the audit named (the TR-05
case included); reflow≡baseline and the engine-own suite run in CI; the
re-baseline protocol is documented and enforced (a re-baseline without a note
fails review by rule). Then: PR — **M0 is additive/low-risk, but merge is Simon's**
(the standing charter; and it opens the M-phase sequence).
