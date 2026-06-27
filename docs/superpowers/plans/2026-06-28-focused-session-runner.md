# Focused Session Runner + Primer/Main Sections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show every gym session as colour-coded Primer/Main sections, and replace the tap-each-exercise checklist with a full-screen set-by-set runner that auto-advances through rest and saves every set as real history.

**Architecture:** A pure engine module derives a movement-specific primer and tags each item `section:'primer'|'main'`; PlanService applies that decoration when surfacing sessions. SessionDetail renders the two coloured sections and launches a new SessionRunner route that walks one set at a time. Each logged set is persisted via the existing Storage → Database → SyncService → Supabase offline-first path (new `set_logs` table), and the top working set still feeds the existing RPE progression.

**Tech Stack:** React 18 + Vite, React Router 6, Zustand 5, Supabase (Postgres + RLS), localStorage. Engine is plain ES modules tested with `node`.

## Global Constraints

- App must run (`npm run dev` from repo root) at the end of every change.
- Theme vars only: `--bg-surface`, `--bg-surface-2`, `--txt-strong`, `--txt-muted`, `--txt-body`, `--hairline`, `--rust`, `--moss`, `--ochre`, `--shadow-sm`, `--shadow-md`. NEVER `--card-bg`, `--border`, `--accent-bg`.
- All data writes go through SyncService via store actions. Never write Database.js from a screen.
- Never rewrite Database.js (additive registration only). Never mutate the pure generator.
- New tables need a versioned migration + RLS `auth.uid() = user_id`. Never the service_role key in the browser.
- Primer moves must add ZERO counted muscle volume.
- Engine imports use the `@performance-os/engine/...` alias.

---

### Task 1: Primer table + `buildPrimer` (pure engine)

**Files:**
- Create: `packages/engine/data/primers.js`
- Create: `packages/engine/src/lib/plan/primers.js`
- Test: `packages/engine/tests/primers.test.js`

**Interfaces:**
- Produces: `buildPrimer(session, { access }) -> { primer: Item[], main: Item[] }` where each primer item has `{ num:'P1', name, sets, rpe, note, restSec, tag:'mobility', equip, section:'primer' }` and every main item gains `section:'main'`.
- Consumes: `matchLift` / name classification (reimplemented locally as `patternForName`), `availableEquip` from `data/strengthExercises.js`.

**`primers.js` content:** export `PRIMERS` keyed by pattern (`horizontalPress`, `verticalPress`, `squat`, `hinge`, `pull`) — each an array of 1 item with `{ name, sets, rpe, note, restSec, equip, alt? }` (alt = no-kit fallback). Keep moves bodyweight/band, `restSec` short.

**`plan/primers.js` logic:**
1. `patternForName(name)` — lowercase match: `bench|push|dip|chest press`→horizontalPress; `overhead|shoulder press|ohp`→verticalPress; `squat|leg press|lunge`→squat; `deadlift|hinge|rdl|hip thrust|good morning`→hinge; `row|pull|chin|lat`→pull; else null.
2. Walk `session.items`; collect patterns of items that are NOT already `tag:'mobility'`/primer/rehab; preserve first-seen order; cap 3.
3. For each pattern pull `PRIMERS[pattern][0]`; swap `equip` the user lacks (`availableEquip(access)`) for `.alt`; number `P1..`; set `tag:'mobility'`, `section:'primer'`.
4. `main` = items mapped to `{ ...it, section:'main' }`.
5. Return `{ primer, main }`. If no patterns → `{ primer: [], main }`.

- [ ] **Step 1: Write failing tests** (`packages/engine/tests/primers.test.js`) — assert with `node:assert`:
  bench session → primer has a horizontalPress move; squat → glute/ squat move; both → deduped & all `section:'primer'`; no-band access → band swapped for alt; primer items all `tag:'mobility'` (volume guard).
- [ ] **Step 2: Run** `node packages/engine/tests/primers.test.js` → FAIL (module missing).
- [ ] **Step 3: Implement** `primers.js` + `plan/primers.js`.
- [ ] **Step 4: Run** test → PASS. Also run existing engine tests (`for f in packages/engine/tests/*.js; do node "$f"; done`) → still PASS.
- [ ] **Step 5: Commit** `feat(engine): curated movement-specific primer + section tagging`.

---

### Task 2: Apply section decoration in PlanService

**Files:**
- Modify: `apps/mobile/src/lib/PlanService.js` (imports; new `decorateSections(session, access)`; apply in `getPhase`/`getWeek`/`getPhases`/`adaptedSessionByKey` output path; retire `applyFunctionalPrimer` usage so primers aren't double-added).

**Interfaces:**
- Consumes: `buildPrimer` from `@performance-os/engine/lib/plan/primers.js`.
- Produces: every session surfaced to screens has items with `section`, primer prepended.

**Approach:** add a single helper that takes a session + profile access, runs `buildPrimer`, returns `{ ...session, items: [...primer, ...main] }`. Apply it in `injuryFilteredPhases()` output (the one funnel all screen reads pass through) so overview, runner, Train Now snapshot, and reflow all agree. Only decorate `sessionDiscipline(s) === 'gym'`. Remove the functional-only `applyFunctionalPrimer` (and its slot-minute deduction stays — primer time budget unchanged) OR keep `functionalSlotMinutes` but stop calling `applyFunctionalPrimer`; the new primer is non-time-budgeted (it's short, mobility). Document the change inline.

- [ ] **Step 1:** Add `decorateSections`; wire into `injuryFilteredPhases` map and `adaptedSessionByKey`.
- [ ] **Step 2:** Remove `applyFunctionalPrimer` calls (baseline + reflow) so there's one primer source; leave `functionalSlotMinutes`.
- [ ] **Step 3:** `npm run dev`; load a session in the preview — items carry `section`; only one primer block.
- [ ] **Step 4: Commit** `feat(plan): surface movement-specific primer + main sections`.

---

### Task 3: Two-colour Primer/Main overview (SessionDetail)

**Files:**
- Modify: `apps/mobile/src/screens/SessionDetail.jsx` (wrap the existing activity-type grouping in an outer section grouping; add section headers).
- Modify: `apps/mobile/src/styles/main.css` (`.session-section`, `.ss-head`, primer/main accents).

**Approach:** before the existing `groups` IIFE, partition `session.items.filter(!substituted)` by `section` (default `'main'`). Render a Primer block (header "Primer · prime the main lifts", `--moss` accent) then a Main block (header "Main", `--rust` accent). Inside each, run the *existing* activity-type grouping unchanged. Keep the original index for `toggleItem`/checked by computing absolute indices.

- [ ] **Step 1:** Refactor render to outer-section → inner activity groups; preserve absolute item indices.
- [ ] **Step 2:** Add section header + left-accent CSS using `--moss` / `--rust`.
- [ ] **Step 3:** `npm run dev` + preview screenshot: green Primer block above rust Main block.
- [ ] **Step 4: Commit** `feat(session): colour-coded primer/main section overview`.

---

### Task 4: `set_logs` persistence — schema, storage, database, sync, store

**Files:**
- Create: `supabase/migrations/013_set_logs.sql`
- Modify: `supabase/schema.sql` (table + RLS array + trigger array)
- Modify: `apps/mobile/src/lib/Storage.js` (`setLogs` key)
- Modify: `apps/mobile/src/lib/Database.js` (register `setLogs`; `services.logSet`, `services.setLogsForSession`)
- Modify: `apps/mobile/src/lib/SyncService.js` (`saveSetLog`; pull; cascade on uncomplete/cancel/deleteTrainingData; snapshot/export lists)
- Modify: `apps/mobile/src/stores/trainingStore.js` (`logSet` action; expose `setLogsBySession` in buildView)

**Interfaces:**
- Produces: `store.logSet({ session_id, exercise_key, exercise_name, section, set_index, target_weight, target_reps, target_rpe, actual_weight, actual_reps, actual_rpe, is_primer, completed_at })`.
- Produces: `view.setLogsBySession[session_id] -> SetLog[]` for runner resume.

**Migration:** copy `006_workouts.sql` structure → `set_logs` columns from the spec; index on session + user; `set_updated_at` trigger; RLS `own rows`.

- [ ] **Step 1:** Migration + schema.sql additions (table, add `set_logs` to trigger array + RLS `own rows` array).
- [ ] **Step 2:** Storage key `setLogs: 'htp_set_logs_v4'`; ensure it's in `ALL_BASE_KEYS`/`TABLE_BASE_KEYS`.
- [ ] **Step 3:** Database: add `setLogs` to `tables`, `tablesApi`; `services.logSet(fields)` → `tablesApi.setLogs.create({ ...fields })`; `services.setLogsForSession(id)` → filter by `session_id`; add to snapshot + import maps.
- [ ] **Step 4:** SyncService: `saveSetLog(fields)` (local create then best-effort `supabase.from('set_logs').upsert(clean(rec,userId))`); add `set_logs` to `pullFromSupabase` (select own, replaceAll), to `deleteTrainingData` table list, and soft-delete set logs in `uncompleteSession`/`cancelSession` cascades; add to `pullTablesToReplace`/export.
- [ ] **Step 5:** Store: `logSet(fields)` action mirroring `completeSession` (fire-and-forget `Sync.saveSetLog`, then `set(buildView())`); in `buildView` build `setLogsBySession` from `Database.tables.setLogs.all()` grouped by `session_id`.
- [ ] **Step 6:** `npm run dev` boots clean (no console errors). Commit `feat(data): set_logs table + offline-first per-set persistence`.

---

### Task 5: RestTimer auto-advance callback

**Files:**
- Modify: `apps/mobile/src/components/RestTimer.jsx` (optional `onComplete` prop fired when countdown hits 0).

**Approach:** add `onComplete` prop; in the tick where it reaches 0, call `onComplete?.()` alongside the existing vibrate. No behaviour change when prop absent (SessionDetail still imports it for completed view — but checklist removal in Task 6 may drop that usage).

- [ ] **Step 1:** Add `onComplete` prop + invoke at 0.
- [ ] **Step 2:** Commit `feat(ui): RestTimer onComplete callback for auto-advance`.

---

### Task 6: SessionRunner (set-by-set) + route + Start wiring

**Files:**
- Create: `apps/mobile/src/screens/SessionRunner.jsx`
- Modify: `apps/mobile/src/App.jsx` (route `/phases/:phaseId/weeks/:weekNum/sessions/:sessionIdx/run`)
- Modify: `apps/mobile/src/screens/SessionDetail.jsx` (Start → `navigate('.../run')` after `startSession`; remove inline tap-checklist + its shared RestTimer; keep completion + rating views)
- Modify: `apps/mobile/src/styles/main.css` (runner styles, steppers, progress bar)

**Step model (in SessionRunner):**
- Build steps from the frozen session items (read via `Plan.getPhase`, same as SessionDetail). `parseExercise`/`liftProgression.parseReps` → set count.
- primer/`tag:'mobility'`/non-strength → one `prep`/`done` step; strength → N `set` steps; supersets interleave by round (real rest only on last member per round).
- Each `set` step state: `{ weight, reps, rpe }` pre-filled from target, carry-forward from prior logged set of same exercise.
- Steppers: weight ±2.5, reps ±1, RPE 6–10 buttons. **Log set** → `store.logSet(...)` → start rest (`RestTimer` with `onComplete` → advance). Skip-rest / ±15s available. Last step → navigate back to SessionDetail with a `?complete=1` flag (or set local UI state) to open the rating form.
- Resume: on mount, read `store.setLogsBySession[session.id]`; advance cursor past already-logged sets.

**Start wiring:** SessionDetail Start button → `startSession(key)` then `navigate('run')`. The pin-on-start freeze already happens in `startSession`.

**Completion/progression (Task 7 finishes this):** runner's finish routes to SessionDetail rating form.

- [ ] **Step 1:** Add route in App.jsx.
- [ ] **Step 2:** Build SessionRunner with step model + per-set UI + logSet + rest auto-advance + resume.
- [ ] **Step 3:** SessionDetail: Start → navigate to runner; remove inline checklist (`isStarted` table tap, `toggleItem`, shared RestTimer, `session-live`); keep `isStarted` "Complete session"/rating entry so a started session can still be completed if user returns.
- [ ] **Step 4:** CSS for runner (full-screen card, big numbers, steppers, section-coloured progress bar — theme vars only).
- [ ] **Step 5:** `npm run dev` + preview: Start → step through sets → rest auto-advances → finish → rating form. Screenshot.
- [ ] **Step 6: Commit** `feat(session): focused set-by-set runner`.

---

### Task 7: Derive progression from logged sets

**Files:**
- Modify: `apps/mobile/src/screens/SessionDetail.jsx` (in `handleSubmit`, if `setLogsBySession[session.id]` has sets, derive each tracked lift's top working set and pass to `logLiftSets` instead of the manual inputs; keep manual inputs only as fallback when a tracked lift has no logged set).

**Approach:** for each `trackedLift`, find logged `set_logs` for that session whose `exercise_key === lift.key` (or name match), pick the heaviest `actual_weight` (tiebreak highest reps), build `{ key, weight, reps, rpe: actual_rpe, targetRpe, factor }`, feed `logLiftSets`. Falls back to existing manual form values when absent.

- [ ] **Step 1:** Implement top-set derivation in `handleSubmit`.
- [ ] **Step 2:** `npm run dev` + preview: complete a runner session → `profile.lift_log` updates from logged sets.
- [ ] **Step 3: Commit** `feat(progression): autoregulate from logged per-set history`.

---

## Self-Review

- **Spec coverage:** primer table+section (T1–T3), runner (T6), persistence (T4), auto-advance (T5), progression (T7), offline-first + graceful degradation (T4 best-effort upsert). All spec sections mapped.
- **Type consistency:** `buildPrimer` return `{primer, main}` used in T2; `store.logSet` field set identical in T4 (def) and T6/T7 (callers); `setLogsBySession` produced T4, consumed T6/T7.
- **Placeholders:** none — each task has concrete files, logic, and test/verify commands.
- **Risk note:** removing the inline checklist (T6) changes the started-session UX; rating-form completion path retained so no dead-end.
