# Season-phased SKB Programming — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the SKB carry machine-consumable per-phase (off/pre/in-season) programming, and have the plan generator read it directly (Approach A), so a sport plan changes shape across the season — off-season adds a sport-specific round-out session targeting the sport's derived under-developed groups; in-season narrows to a prehab pool + maintenance touch.

**Architecture:** Every new behaviour is **gated on the presence of a `seasonalModel.<phase>.programming` block**. No sport has one until authored, so the machinery is provably byte-identical (golden-master) until a sport is migrated. Machinery lands first (proven with `running_middle` as the walking skeleton), then the remaining endurance sports are authored one at a time behind per-sport golden-master re-baselines. Legacy `sportGymSupport` is the fallback and is NOT deleted.

**Tech Stack:** Pure ESM JS engine (`packages/engine`), `node --test`-free custom test runner (`apps/mobile/tests/*.js`, `assert` helper, `npm test` from root). Golden-master + knowledge-ratchet snapshots.

## Global Constraints

- Engine functions stay **pure/deterministic** — same profile → same plan.
- Un-migrated sports and ALL build goals stay **byte-identical** (golden-master).
- `muscleEmphasis` values in `[0.1, 2.0]`; `roundOut.mode ∈ {derive, explicit}`; `roundOut.dose ∈ {develop, maintain, none}`; `roundOutSessionsPerWeek` integer `≥ 0`.
- `UNDERDEV_THRESHOLD = 0.9` (round-out targets = emphasis `< 0.9`).
- Movement-policy tokens come from ONE `MOVEMENT_POLICY_TOKENS` set; group tokens (`bilateral_spinal_loading`, `hip_stability`) map to real catalogue patterns/flags in one place.
- Version bumps: `KNOWLEDGE_SET_VERSION` (SKB data changes) + `ENGINE_VERSION` (generator/allocator logic).
- Phase map: `off→offSeason, pre→preSeason, in→competition, transition→recovery`.
- Never push/merge — branch `season-phased-skb-2026-07-09` only.

---

## File structure

- `packages/engine/src/lib/sportKnowledge/schema.js` — MODIFY: validate the `programming` block; export `MOVEMENT_POLICY_TOKENS`.
- `packages/engine/src/data/movementPatternMap.js` — CREATE: muscle→movement-pattern map + group-token→pattern/flag expansion (single source for the derivation + allocator).
- `packages/engine/src/lib/sportKnowledge/seasonProgramming.js` — CREATE: `phaseProgrammingFor(profile)` + `phaseMap`.
- `packages/engine/src/lib/plan/roundOutTargets.js` — CREATE: `deriveRoundOutTargets(muscleEmphasis, roundOut)`.
- `packages/engine/src/lib/strength/program.js` — MODIFY: read SKB `muscleEmphasis` per phase (fallback legacy); surface `programming` on the resolved program.
- `packages/engine/src/lib/plan/strength.js` / split resolver — MODIFY: reserve round-out session(s).
- `packages/engine/src/lib/plan/allocator.js` — MODIFY: honour `movementPolicy` + round-out gap-block.
- `packages/engine/src/data/sport-knowledge/running_middle.json` (+ sprint/long, cycling, swimming, triathlon) — MODIFY: author `programming` blocks.
- `packages/engine/src/lib/knowledge/entries.js`, `packages/engine/src/version.js`, `packages/engine/package.json` — MODIFY: version bumps.
- `apps/mobile/tests/season-*.js` — CREATE: unit + property + fallback tests.
- Snapshots re-baselined per migrated sport.

---

## Task 1: Schema — the `programming` block contract

**Files:** Modify `packages/engine/src/lib/sportKnowledge/schema.js`; Test `apps/mobile/tests/season-schema.js`.

**Produces:** `MOVEMENT_POLICY_TOKENS` (Set); `validateSportProfile` now rejects malformed `programming` blocks.

- [ ] **Step 1 — failing test** `apps/mobile/tests/season-schema.js`: a profile with a well-formed `offSeason.programming` block validates; one with `muscleEmphasis.chest = 3` fails; `roundOut.mode='x'` fails; `movementPolicy.require=['bogus']` fails; a phase with NO programming block still validates (scaffold). Build the profile by deep-cloning a real one (`sportKnowledge.get('running_middle')`) and injecting the block.
- [ ] **Step 2** run → FAIL.
- [ ] **Step 3** implement: add `MOVEMENT_POLICY_TOKENS` (squat, hinge, single_leg, vertical_pull, horizontal_pull, vertical_push, horizontal_push, calf, anti_rotation, anti_extension, hip_stability, bilateral_spinal_loading, carry, plyo); add `validateProgramming(label, prog)` called from the seasonalModel loop in `validateSportProfile`; enforce the Global Constraints ranges; provenance (`confidence`/`source`) required when the block exists.
- [ ] **Step 4** run → PASS; then `npm test` (whole suite) → still 183 (nothing authored yet).
- [ ] **Step 5** commit `feat(skb): validate seasonalModel.programming block`.

## Task 2: Muscle→pattern map

**Files:** Create `packages/engine/src/data/movementPatternMap.js`; Test `apps/mobile/tests/season-pattern-map.js`.

**Produces:** `PATTERN_FOR_MUSCLE` ({muscle: pattern[]}); `expandPolicyToken(token)` → concrete patterns / a predicate flag (e.g. `bilateral_spinal_loading` → `{axialLoad:true, equip:'barbell'}`).

- [ ] **Step 1 — failing test:** `PATTERN_FOR_MUSCLE.chest` includes `horizontal_push`; `.back` includes `vertical_pull`/`horizontal_pull`; `.quads` includes `squat`; `.hamstrings`/`.glutes` include `hinge`; `.calves` includes `calf`. `expandPolicyToken('bilateral_spinal_loading')` returns a flag object; `expandPolicyToken('single_leg')` returns `['single_leg']`.
- [ ] **Step 2** run → FAIL.
- [ ] **Step 3** implement the map + expander. Reconcile pattern token names with the catalogue's actual `pattern` field values (`EXERCISES` in `data/strengthExercises.js`) — read that file first; alias where the catalogue uses `hpush`/`vpull` etc.
- [ ] **Step 4** run → PASS.
- [ ] **Step 5** commit `feat(engine): muscle→pattern map + policy-token expander`.

## Task 3: Season accessor

**Files:** Create `packages/engine/src/lib/sportKnowledge/seasonProgramming.js`; Test `apps/mobile/tests/season-accessor.js`.

**Consumes:** `sportKnowledge` (`skbSportIdOf`, `get`, `section`), `deriveSeason`.
**Produces:** `phaseProgrammingFor(profile) → programmingBlock | null`; `PHASE_MAP`.

- [ ] **Step 1 — failing test:** with a cloned `running_middle` that HAS an injected `offSeason.programming` and a profile whose `deriveSeason` → `off`, `phaseProgrammingFor` returns that block; a profile whose sport has no block returns `null`; unknown/`transition` maps sanely; never throws on unknown sport.
- [ ] **Step 2** run → FAIL.
- [ ] **Step 3** implement: resolve `skbSportIdOf(profile)` → profile → `deriveSeason(profile)` → `PHASE_MAP` → `seasonalModel[skbPhase]?.programming ?? null`. Pure; inject the SKB via import (mirror `demandProfile.js`). For the test, allow an optional injected profile arg so the test can pass a cloned SKB profile without mutating the registry.
- [ ] **Step 4** run → PASS; `npm test` → 183 (accessor unused by generation yet).
- [ ] **Step 5** commit `feat(skb): phaseProgrammingFor accessor`.

## Task 4: Round-out derivation

**Files:** Create `packages/engine/src/lib/plan/roundOutTargets.js`; Test `apps/mobile/tests/season-roundout.js`.

**Consumes:** `PATTERN_FOR_MUSCLE`.
**Produces:** `deriveRoundOutTargets(muscleEmphasis, roundOut) → { muscles: string[], patterns: string[] }`.

- [ ] **Step 1 — failing test:** runner off-season vector (`chest 0.9? use <0.9 e.g. 0.55`... use a vector with chest/shoulders/biceps/triceps < 0.9) → `muscles` includes chest/shoulders, `patterns` includes `horizontal_push`/`vertical_pull`. Swimmer vector (quads/hams/glutes/calves 0.7/0.7/0.7/0.5) → `muscles` includes quads/hamstrings/calves, `patterns` includes `squat`/`hinge`/`calf`. `mode:'explicit'` with `targetPatterns:['carry']` → returns exactly those. Empty/near-neutral vector → empty targets.
- [ ] **Step 2** run → FAIL.
- [ ] **Step 3** implement: `mode==='explicit'` → return authored targets; else muscles = keys with `emphasis[m] < 0.9`, patterns = union of `PATTERN_FOR_MUSCLE[m]`. Dedup, deterministic sort.
- [ ] **Step 4** run → PASS.
- [ ] **Step 5** commit `feat(engine): deriveRoundOutTargets (sport-derived gap-fill)`.

## Task 5: resolveProgram reads SKB emphasis per phase (gated, byte-identical)

**Files:** Modify `packages/engine/src/lib/strength/program.js`; Test `apps/mobile/tests/season-program-resolve.js`.

**Consumes:** `phaseProgrammingFor`.
**Produces:** resolved program `emphasis` = `programming.muscleEmphasis` when present; new fields on the sport-branch return: `programming` (the block or null) + `roundOut` targets, for downstream tasks.

- [ ] **Step 1 — failing test:** with a profile whose sport HAS a programming block (inject via a test-only sport OR temporarily author a block — see note), `resolveProgram` returns the phase's `muscleEmphasis`; with a profile whose sport has none, `emphasis` is unchanged from the legacy module (assert byte-equality vs the legacy vector).
- [ ] **Step 2** run → FAIL.
- [ ] **Step 3** implement: after the legacy emphasis is resolved, `const prog = phaseProgrammingFor(profile); if (prog) emphasis = prog.muscleEmphasis;` and attach `programming: prog || null` + `roundOut: prog ? deriveRoundOutTargets(prog.muscleEmphasis, prog.roundOut) : null` to the returned object. Guard: only for `goalType==='sport'`.
- [ ] **Step 4** run → PASS; `npm test` → 183 (no sport authored → byte-identical, golden-master green).
- [ ] **Step 5** commit `feat(engine): resolveProgram reads SKB per-phase emphasis (gated)`.

## Task 6: Split reserves a round-out session (off/pre; gated)

**Files:** Modify the split resolver (`packages/engine/src/lib/plan/strength.js` + `resolveSplit` wherever it lives — read it first); Test covered by Task 8's property tests.

**Consumes:** resolved `program.programming.roundOutSessionsPerWeek`, `program.roundOut`, gym-day count.
**Produces:** one (or `min(N, gymDays-1)`) session flagged `roundOut: true` carrying `roundOutTargets`, when a programming block is present and `roundOutSessionsPerWeek ≥ 1`.

- [ ] **Step 1** Read `strength.js` + the split resolver to learn the session/slot shape. Identify where day "focus"/"title" is assigned.
- [ ] **Step 2** Implement gated: if `program.programming?.roundOutSessionsPerWeek` and `deriveSeason` phase allows, tag `effectiveRoundOut = min(N, max(0, gymDays-1))` sessions (or fold into the single session when gymDays==1) with `roundOut:true` + the derived `targets`. Gated on programming presence → byte-identical for un-migrated sports.
- [ ] **Step 3** `npm test` → 183 (still no sport authored).
- [ ] **Step 4** commit `feat(engine): split reserves a round-out session (gated)`.

## Task 7: Allocator honours movementPolicy + round-out gap-block (gated)

**Files:** Modify `packages/engine/src/lib/plan/allocator.js`; Test covered by Task 8.

**Consumes:** `program.programming.movementPolicy`, session `roundOut`/`targets`, `expandPolicyToken`.
**Produces:** in-season candidate pool filtered/weighted by `require`/`maintainOnly`/`deprioritize`; a round-out session guarantees ≥1 exercise per target pattern, sourced from the sport's own `priorityExercises`/SKB library first, neutral fallback to fill.

- [ ] **Step 1** Read the allocator's candidate-selection + `demotePress`/pattern logic (around lines 215, 446, 640-650, 840-897) to find the seam.
- [ ] **Step 2** Implement gated on `program.programming`:
  - a round-out session: for each `roundOutTargets.patterns`, ensure a slot selects a matching exercise (sport priority first).
  - `movementPolicy.require`: boost those patterns; `maintainOnly`: cap to one light-dose slot; `deprioritize` (+ `bilateral_spinal_loading` via `expandPolicyToken`): down-weight/skip as primary.
- [ ] **Step 3** `npm test` → 183 (gated → byte-identical).
- [ ] **Step 4** commit `feat(engine): allocator honours movementPolicy + round-out (gated)`.

## Task 8: Walking skeleton — author `running_middle.programming` (off/pre/in) + property tests + golden-master

**Files:** Modify `running_middle.json`; Create `apps/mobile/tests/season-running-middle.js`; bump versions; re-baseline snapshots.

- [ ] **Step 1 — property tests** (`season-running-middle.js`): OFF-season plan has a round-out session containing an upper push AND pull; IN-season plan is lower/prehab-dominant, contains single-leg/calf, has at most a maintenance upper touch, and no trap-bar/back-squat in every session; off-season emphasis chest ≥ 0.9, in-season chest ≤ 0.6.
- [ ] **Step 2** run → FAIL (no programming block yet).
- [ ] **Step 3** Author `running_middle.seasonalModel.{offSeason,preSeason,competition}.programming` per the spec §4 (off = balanced + roundOut develop + full patterns; pre = maintain; in = narrow vector + prehab require + upper maintainOnly + deprioritize bilateral_spinal). Bump `KNOWLEDGE_SET_VERSION` + `ENGINE_VERSION` (+ package.json).
- [ ] **Step 4** run property tests → PASS. Then `UPDATE=1 knowledge-set-ratchet` + inspect golden-master drift: ONLY `sport·run-middle·*` + version stamps should change; `UPDATE=1 golden-master`; verify no other sport/build fixture drifted beyond the stamp.
- [ ] **Step 5** `npm test` → green. Commit `feat(skb): running_middle season-phased programming (walking skeleton)`.

## Task 9: Author the remaining endurance sports

For EACH of `running_sprint`, `running_long`, `cycling`, `swimming`, `triathlon` (one commit each):

- [ ] **Step 1** Add a per-sport property assertion to a shared `season-endurance.js` (swimmer OFF round-out contains LOWER: squat/hinge/calf; cyclist OFF contains upper + hamstring; sprint keeps power bias; triathlon keeps its balanced blend and gains the round-out).
- [ ] **Step 2** run → FAIL for that sport.
- [ ] **Step 3** Author its `programming` blocks (off/pre/in) per the sport's real emphasis (swim in-season keeps upper as sport-specific, not maintainOnly; etc.). Bump `KNOWLEDGE_SET_VERSION`.
- [ ] **Step 4** run → PASS; re-baseline golden-master (verify only that sport's fixtures + stamp drift); add a `pre`/`in` fixture for the sport if missing.
- [ ] **Step 5** `npm test` → green; commit `feat(skb): <sport> season-phased programming`.

## Task 10: Verify + handoff

- [ ] **Step 1** `npm test` (full) → green; `npm run build` → ok.
- [ ] **Step 2** Reproduce a runner off-season vs in-season and a swimmer off-season; capture the before/after for the handoff.
- [ ] **Step 3** Update `HANDOFF.md` + `docs/engine/08-...md` (T2/T3 now partly built) + memory.
- [ ] **Step 4** commit `docs: season-phased SKB — handoff + status`. DO NOT push/merge.

---

## Self-review

- **Spec coverage:** schema §4→T1; derivation §5→T2+T4; accessor §3→T3; resolveProgram §3→T5; split §3→T6; allocator §3→T7; rollout/fallback §7→gating + T8/T9; gym-days §8→T6; validation §6→T1; testing §9→T8/T9/T10; versioning→T8/T9. All covered.
- **Gating invariant** repeated in every engine task → un-migrated byte-identical (the core safety property).
- **Ambiguity:** `UNDERDEV_THRESHOLD` and phase map fixed in Global Constraints; pattern-token reconciliation to the catalogue is an explicit step (T2.3, T7.1) because the exact token names must be read from `strengthExercises.js`, not guessed.
- **Risk:** Tasks 6-7 touch core code; each is gated + golden-master-guarded so a mistake shows as a byte-diff on an un-migrated sport (caught immediately), not a silent regression.
