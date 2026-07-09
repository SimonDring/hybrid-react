# Retire the legacy sport layer + season-window detection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Checkbox (`- [ ]`) steps.

**Goal:** Make the SKB the single source for all sport programming, delete `sportGymSupport/`, season-phase the team sports, and detect phase from the season window. Spec: `docs/superpowers/specs/2026-07-09-retire-legacy-sport-layer-design.md`.

**Architecture:** P1 relocates legacy data verbatim into an SKB `gymSupport` section (byte-identical, golden-master-gated) then deletes the legacy modules. P2 derives priority from `exerciseLibrary`. P3 season-phases the 5 team sports. P4 adds season-window `deriveSeason` + onboarding dates.

## Global Constraints

- Byte-identical is the P1 gate: golden-master unchanged before deleting legacy.
- `systemicFactor` 0.3–1.0; `power` boolean; emphasis 0.1–2.0; seasonVolume keys off/pre/in/transition.
- Emphasis rule: `programming[phase].muscleEmphasis` ?? `gymSupport.emphasis`.
- deriveSeason precedence: explicit `sport_season` > window (first/last game) > single `event_date` > intent/goal default.
- Pure/deterministic; version bumps per phase (KSV always; ENGINE_VERSION for P1/P2/P4).
- Branch `season-phased-skb-2026-07-09`; no push/merge.

---

## PHASE 1 — relocate + delete legacy (byte-identical)

### Task 1.1 — `gymSupport` schema + accessor
- Files: MODIFY `lib/sportKnowledge/schema.js` (validate `gymSupport`); CREATE `lib/sportKnowledge/gymSupport.js` (`gymSupportFor(profile)` → the profile's `gymSupport` or null); Test `apps/mobile/tests/gymsupport-schema.js`.
- [ ] Write failing schema test (valid gymSupport passes; systemicFactor 2 fails; missing = scaffold OK).
- [ ] Implement `validateGymSupport` (called from `validateSportProfile` when present) + `gymSupportFor`.
- [ ] `npm test` → still green (nothing authored). Commit `feat(skb): gymSupport schema + accessor`.

### Task 1.2 — relocate legacy data into the SKB (script-generated, verbatim)
- Files: MODIFY all 11 `data/sport-knowledge/*.json`; a one-off node script (scratchpad) that imports the legacy registry + writes each profile's `gymSupport`.
- [ ] Script: for each SKB id, resolve its legacy module (running_* → running.byDiscipline[disc]; gaelic_football/hurling/field_hockey → gaa; else same id) and copy `emphasis`, `power`, `systemicFactor`, `keyMuscles`, `priorityExercises`, `seasonVolume` (= module.seasonModifiers), `periodization` verbatim into `gymSupport`.
- [ ] Run it; `skb.validate()` ok. Commit `feat(skb): relocate legacy gym-support data into SKB gymSupport (verbatim)`.

### Task 1.3 — rewire the 4 consumers to read the SKB (legacy still present as fallback)
- Files: MODIFY `strength/program.js`, `strength/sportLoad.js`, `plan/periodization.js`, `plan/constraints.js`.
- [ ] program.js: emphasis fallback = `gymSupportFor(profile)?.emphasis ?? legacyEmphasis`; priority/power from gymSupport ?? legacy.
- [ ] sportLoad.js: read `gymSupport.seasonVolume`/`systemicFactor` (pass gymSupport in, or resolve inside) ?? legacy `mod`.
- [ ] periodization.js: `gymSupport.periodization[season]` ?? legacy.
- [ ] constraints.js: `gymSupport.keyMuscles` ?? legacy.
- [ ] `npm test` → **byte-identical** (golden-master unchanged; both sources equal). Commit `feat(engine): read sport gym-support from the SKB (legacy fallback)`.

### Task 1.4 — delete the legacy layer
- Files: DELETE `data/sportGymSupport/*.js` (keep nothing); MODIFY the 4 consumers to drop the legacy import + fallback; MODIFY `data/sportEngineBinding.js`/anything importing the registry.
- [ ] Remove legacy imports + `?? legacy` fallbacks (SKB is now sole source). Fix `sportLoad`'s `DEFAULT_SEASON_VOLUME`/`SPORT_BLOCKS` — move those default constants OUT of `sportGymSupport/_schema.js` into a surviving module (e.g. `data/periodizationDefaults.js`).
- [ ] `npm test` → byte-identical (golden-master unchanged). `npm run build`. Commit `refactor(engine): delete legacy sportGymSupport layer — SKB is the sole source`.
- [ ] Make `gymSupport` REQUIRED in the validator (every selectable sport must have it). Commit if separate.

---

## PHASE 2 — derive priority from exerciseLibrary (single source)

### Task 2.1 — `derivePriorityExercises`
- Files: CREATE `lib/sportKnowledge/derivePriority.js`; Test `apps/mobile/tests/derive-priority.js`.
- [ ] Failing test: for `running_middle`, returns non-empty ids ordered by `transferToSportRating`, all catalogue-joined; phase filter drops `suitableInSeason:false` in-season.
- [ ] Implement: read `exerciseLibrary.exercises`, keep catalogue-joined + phase-suitable, sort by rating (tiebreak id), map to ids.
- [ ] Commit `feat(skb): derivePriorityExercises from exerciseLibrary`.

### Task 2.2 — switch resolveProgram to the derivation + drop the relocated lists
- Files: MODIFY `strength/program.js`; script to delete `gymSupport.priorityExercises` from all profiles; per-sport golden-master re-baseline.
- [ ] resolveProgram: `exercisePriority` from `derivePriorityExercises(skbProfile, season)` (fallback to `gymSupport.priorityExercises` only if the library is empty).
- [ ] Verify each sport's derived list is non-empty + sensible; re-baseline golden-master (intentional); delete `gymSupport.priorityExercises`.
- [ ] `npm test` green. Commit `feat(skb): single-source priority from exerciseLibrary; drop relocated lists`.

---

## PHASE 3 — season-phase the team/field sports

### Task 3.1 — author programming for rugby, soccer, gaelic_football, hurling, field_hockey
- Files: MODIFY those 5 `*.json`; Test `apps/mobile/tests/season-team.js`; golden-master re-baselines.
- [ ] For each: author `seasonalModel.{offSeason,preSeason,competition}.programming` (off floors emphasis + round-out develop; in = sport-specific vector + no round-out), from each sport's `gymSupport.emphasis` as the in-season base.
- [ ] Property test (`season-team.js`): each team sport's off-season has a round-out training its derived gaps; in-season narrow. Re-baseline golden-master (off-season team fixtures). Commit per sport or as a group.

---

## PHASE 4 — season-window deriveSeason + onboarding

### Task 4.1 — window-mode `deriveSeason`
- Files: MODIFY `plan/periodization.js` (deriveSeason) + a `seasonWindow.js` helper for phase-boundary weeks from the SKB; Test `apps/mobile/tests/season-window.js`.
- [ ] Failing tests: today between first/last → 'in'; in the pre-window → 'pre'; just after last → 'transition'; long before → 'off'; explicit override still wins; single-event path unchanged.
- [ ] Implement window mode (preWeeks/transitionWeeks from SKB meta, defaults pre=6/transition=3). Commit `feat(engine): deriveSeason season-window mode (first/last game)`.

### Task 4.2 — onboarding first/last game
- Files: MODIFY `apps/mobile/src/lib/onboardingModel.js` (+ `first_game_date`/`last_game_date` fields), `apps/mobile/src/components/OnboardingWizard.jsx` (season-based sports ask two dates); Test `apps/mobile/tests/onboarding-season-window.js` + a golden-master team fixture.
- [ ] onboardingModel: map `firstGameDate`/`lastGameDate` answers → profile fields; test round-trips.
- [ ] OnboardingWizard: for a season-based sport, show first-game + last-game date inputs instead of the in/off toggle.
- [ ] Add a golden-master fixture with first/last game offsets; `npm test` + `npm run build` green. Commit `feat(app): onboarding first/last game for season-based sports`.

---

## PHASE 5 — verify + handoff

- [ ] Full `npm test` green; `npm run build`; reproduce a team-sport off vs in plan + a window-derived phase; confirm `sportGymSupport/` is gone (`ls` fails).
- [ ] Update HANDOFF.md + the spec status + memory. Commit. No push/merge.

## Self-review

- **Coverage:** gymSupport §2→P1; priority derivation §3→P2; team season §4→P3; window §5→P4; onboarding §5→Task 4.2; deletion §2→Task 1.4; testing §6→each task. All covered.
- **Byte-identical gate** repeated on every P1 task (the deletion safety net).
- **Ambiguity:** running-discipline→legacy mapping made explicit (Task 1.2); default constants relocation called out (Task 1.4); deriveSeason precedence fixed in Global Constraints.
- **Risk:** P1 verbatim relocation is script-generated + golden-master-gated; a copy error shows as drift before deletion.
