# Phase 3 · M0 Test Net — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build M0 — the test net under the whole V2 migration — per `docs/superpowers/specs/2026-07-14-phase3-m0-test-net-design.md`. Additive tests only; zero engine behaviour change.

**Architecture:** T1 (engine-owned suite scaffold) lands first — everything else uses its entry point. Then T2 (archetype extension), T3 (property suite), T4 (RLS-CI + perf + guard) fan out, touching mostly disjoint files; controller commits each. T5 reviews the whole net + PR. Branch `phase3-m0-test-net-2026-07-14`.

**Tech stack:** Node ESM test files (the repo's convention — plain `node`-run `.js`/`.mjs`, no framework; see `apps/mobile/tests/*.js` + `run-all.mjs`). Engine: `packages/engine` (pure ESM). CI: `.github/workflows/test.yml`.

## Global Constraints

1. **Zero behaviour change.** The 28 pinned golden archetypes stay **byte-identical**. M0 ADDS new archetypes (additive snapshot extension) — it never re-baselines an existing one. Any existing archetype moving = STOP, report BLOCKED (real regression).
2. **Non-vacuous + falsifiable.** Every property/coverage test must be shown to FAIL against a deliberately broken input before it's trusted (inject the defect, see red, remove it, see green — record both in the report). A test that can't go red is a defect.
3. **A property that fails against the current post-Wave-A engine is a FINDING for Simon, not a test to weaken** (spec rule 3). Report the reproducing profile; do not adjust the assertion to pass.
4. **Engine purity** (Art 18): no clock/randomness/I-O inside `packages/engine`; ESLint purity overlay green; determinism/golden tests use fixed `plan_start_date`.
5. `npm test` + `npm run lint` green before every commit. Commits by the controller, one per task, `test(engine): …` / `ci: …` + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Authoring agents do NOT run git.
6. No frozen-doc edits; the V2 blueprint (`docs/design/engine-v2/`) is the read-only ratified reference this phase executes.
7. **Worktree note (if any agent uses one):** npm-workspace symlinks resolve `@performance-os/engine` to the checkout; run `npm install` inside a worktree before testing engine code, or the run-all worktree-guard fails. (These tasks run in the main checkout on the branch, so this is informational.)

---

### Task 1 — Engine-owned suite scaffold  · MODEL: Sonnet 5

**Files:** Create `packages/engine/tests/run-engine.mjs` (runner) + `packages/engine/tests/smoke.test.mjs` (first test) · Modify `packages/engine/package.json` (add `test:engine` script) · Modify `.github/workflows/test.yml` (run the engine suite) · Modify root `package.json` if needed so the aggregate can't skip it.

**Interfaces produced:** the engine-suite entry point + the "add engine tests as `packages/engine/tests/*.test.mjs`" convention T3 consumes.

- [ ] Read spec §2.1; inspect `apps/mobile/tests/run-all.mjs` for the repo's runner idiom (serial, non-zero exit on any failure) and mirror it.
- [ ] Create `run-engine.mjs`: discovers and runs `packages/engine/tests/*.test.mjs` serially, fails loudly on any non-zero, prints a summary. No app import anywhere — it imports only from `@performance-os/engine` / `packages/engine/src`.
- [ ] Create `smoke.test.mjs`: imports `generatePlan` (or the barrel) and asserts a minimal valid profile yields a plan with the expected top-level shape — proving the engine is exercisable **without booting the app** (spec §2.1). Must be non-vacuous (assert real fields, not just truthiness).
- [ ] Add `"test:engine": "node tests/run-engine.mjs"` to `packages/engine/package.json`; wire it into CI `test.yml` as a step (after `npm run lint`, alongside `npm test`) so it gates every PR. Ensure it's not silently skippable.
- [ ] Run `npm run lint`, the new `test:engine`, and the full `npm test` — all green.
- [ ] Report to `.superpowers/sdd/m0-task1-report.md`: files, the convention, CI wiring, green evidence.

### Task 2 — Archetype-matrix extension  · MODEL: Sonnet 5

**Files:** Modify `apps/mobile/tests/golden-master.js` (archetype list + `answersToProfile` helpers as needed) · regenerate `apps/mobile/tests/__snapshots__/engine-golden-master.json` additively.

- [ ] Read spec §2.2 + `13-VALIDATION-STRATEGY.md` §2.2 (the extension table) + `golden-master.js` (how archetypes + `answersToProfile` are structured; date-relative profiles).
- [ ] Add archetypes for each family, each a valid profile the engine actually accepts (verify input shapes against the athlete model / onboarding): **armed-D7** (populated `athlete_model` recoverability priors so the D7 arm runs armed — see how P0-3/D7 reads priors), **injured** across regions incl. the 5 bare rehab regions (pin the current honest fallback, do NOT author rehab content), **measured-vs-prior pair** (same profile ± test-result/lift evidence), **legacy-rescue** (triathlon, zero-gap run+cycle, code-less GAA — confirm they land on the D11 path post-Wave-A), **non-logging progressor** (week n and n+1 snapshots), plus a couple of steered-path archetypes (SKB decision rule / position modifier).
- [ ] Regenerate with `UPDATE=1 node apps/mobile/tests/golden-master.js`. **Audit the diff:** only NEW keys appear; every existing archetype byte-identical. If any existing archetype moved, STOP → BLOCKED with the archetype + key.
- [ ] Full `npm test` + `npm run lint` green.
- [ ] Report to `.superpowers/sdd/m0-task2-report.md`: archetypes added (list), the additive-only diff audit ("N new keys, 0 existing moved"), expected-delta note text for the commit.

### Task 3 — Property test suite  · MODEL: Opus 4.8

**Files:** Create `packages/engine/tests/prop-reflow-baseline.test.mjs`, `prop-determinism.test.mjs`, `prop-additive-identity.test.mjs`, `prop-contracts.test.mjs`, `prop-purity.test.mjs` (split as sensible) — all in the engine-owned suite from Task 1.

- [ ] Read spec §2 item 3 + `13-VALIDATION-STRATEGY.md` §5.2 (the five property classes, verbatim intent) + `02-COACHING-PIPELINE.md` §2.15 (D15 reflow), §2.16 (D16). Depends on Task 1's runner + convention.
- [ ] **reflow≡baseline:** `reflow(plan, liveState)` with no completions/readiness/injuries/freezes reproduces the baseline week EXACTLY; and with freezes present, frozen sessions are byte-identical to committed form. Drive a spread of profiles.
- [ ] **cross-runtime determinism:** assert byte-identical output for identical inputs. If genuine multi-runtime execution can't run in CI, implement the strongest available proxy (e.g. serialize-compare across repeated runs + a documented harness for the browser/Node comparison) and NAME the limitation in the report — do not fake coverage.
- [ ] **additive-measurement byte-identity:** for a profile, adding zero new measurements yields a byte-identical plan (load-bearing at M3; may be near-trivial now — assert it anyway so M3 can't break it silently, and say so).
- [ ] **contract properties:** across fuzzed valid inputs at stage boundaries — `{value, confidence, rationale}` present + typed; confidence ≤ weakest input; `droppedDemands`/`parked` always present (even empty); a D16-style output naming a plan/session/dose fails.
- [ ] **purity:** the same profile through the same engine+knowledge versions is the same plan (extends the pin's regime to the engine suite).
- [ ] **Falsifiability (Global Constraint 2):** for EACH property, inject a defect that should trip it, confirm RED, revert, confirm GREEN — record both in the report.
- [ ] **If any property fails against the current engine (Global Constraint 3):** capture the reproducing profile, mark it a FINDING in the report, keep the test as-is (documented expected-fail or skipped-with-reason pending Simon) — do NOT weaken it.
- [ ] `test:engine` + full `npm test` + `npm run lint` green (excepting any documented current-engine FINDING, which the report must call out explicitly).
- [ ] Report to `.superpowers/sdd/m0-task3-report.md`: per-property falsifiability evidence (RED→GREEN), any current-engine FINDINGS with repro profiles, cross-runtime limitation note.

### Task 4 — RLS-into-CI + perf baselines + expected-delta guard  · MODEL: Sonnet 5

**Files:** Modify `.github/workflows/test.yml` (RLS harness step) · Create `packages/engine/tests/bench.mjs` (perf baseline harness) · Create a re-baseline guard (script + CI step, e.g. `apps/mobile/tests/snapshot-note-guard.mjs`).

- [ ] **RLS harness in CI:** add a step running `node supabase/tests/rls-harness.mjs`. First check what it needs (env/secrets/local DB) — if it can't run without live-DB secrets, wire it as a job guarded on secret availability and DOCUMENT the constraint in the report rather than adding a step that always fails. Goal: the 46/57 proofs gate continuously where they can (spec §2 item 5; CA-12).
- [ ] **Perf baselines:** `bench.mjs` runs the archetype matrix against fixed reference profiles, records p50/p95 per operation (full planning pass, reflow, `validate`, trace/explain if present) per engine+knowledge version, prints a table. **Baselines only** — no CI-failing budget this phase (spec §2 item 6). Deterministic inputs; no clock-dependent assertions.
- [ ] **Expected-delta guard:** a check that fails when a PR/commit diff touches `__snapshots__/` without an accompanying expected-delta note (spec §2 item 4 / §2.3). Define the note convention (a `EXPECTED-DELTA:` block in the commit message or a sibling note file) and enforce it; wire into CI.
- [ ] Verify each piece runs; `npm run lint` green; document what runs in CI vs locally.
- [ ] Report to `.superpowers/sdd/m0-task4-report.md`: RLS-CI wiring (+ any secret constraint), the baseline table, the guard mechanism + how it fires.

### Task 5 — Whole-branch net review + HANDOFF + PR  · MODEL: Opus 4.8

- [ ] Generate the review package (`scripts/review-package <merge-base> HEAD`) and review the whole M0 branch: (a) **non-vacuity** — spot-check that the property + smoke + coverage tests actually assert behaviour and can go red (re-run one falsifiability injection); (b) existing 28 goldens byte-identical (diff the snapshot: only additions); (c) engine suite runs without the app; (d) purity/lint clean; (e) any current-engine FINDING from Task 3 is surfaced, not buried; (f) RLS-CI + guard actually wired. Fix Critical/Important inline or dispatch a fix; record Minors.
- [ ] Update `HANDOFF.md`: Phase 3 M0 status (test net landed pending PR; the exit-gate items; any Task-3 FINDING flagged for Simon). Update the migration ledger note if M0 exit criteria met.
- [ ] `npm test` + `npm run lint` green; push; open PR `test(engine): Phase 3 M0 — the test net (archetype extension + property suite + engine-owned suite)`. **Merge is Simon's** — and if Task 3 surfaced a current-engine FINDING, the PR body leads with it (it may be a defect to fix before M2, or a documented known-divergence — Simon's call).
