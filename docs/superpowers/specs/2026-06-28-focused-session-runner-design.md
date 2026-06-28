# Focused Session Runner + Primer/Main sections — design

**Date:** 2026-06-28
**Branch:** `feat/focused-session-runner`
**Status:** Built overnight on a local branch for Simon to review. Nothing pushed, no PR.

---

## Plain-language summary (what we're building and why)

Two connected changes to how a workout is shown and trained:

1. **Primer / Main split.** Every gym session is shown as two clearly-labelled,
   colour-coded sections *before* you start:
   - **Primer** (green, `--moss`) — 1–2 short, movement-specific activation moves
     matched to the day's main lifts (e.g. band pull-aparts before bench). This is
     a *primer*, not a generic warm-up: it preps the exact pattern you're about to load.
   - **Main** (rust, `--rust`) — the working exercises, exactly as today.

2. **Focused set-by-set runner.** Tapping **Start session** opens a full-screen
   runner that walks you through the session **one set at a time**: "Squat — Set 1
   of 4 · target 5 reps @ 100 kg @ RPE 8". You adjust the actual weight / reps /
   RPE with +/- steppers, tap **Log set**, and it drops into a **rest countdown**
   that **auto-advances** to the next set when it finishes. Primer moves are a
   lighter "do this, tap Done" step (no weight logging). At the end you land on the
   existing rating form and the session completes as normal.

Every set you log is **saved as real training history** (new `set_logs` table),
and the heaviest working set per main lift still feeds the existing weight-
progression engine, so next week's targets autoregulate exactly as they do today.

**Why:** a set-by-set view removes all the "what's next / what weight / how long do
I rest" friction at the rack, and capturing real per-set data is the foundation
for future charts and the AI coach.

---

## Decisions made (the questions Simon answered)

| Question | Decision |
| --- | --- |
| What is the "warm-up"? | A **primer** — short, movement-specific activation, not a generic warm-up. |
| How are primers chosen? | A **curated lift→primer table**: each main movement pattern maps to 1–2 activation moves. |
| Runner vs today's checklist? | **Replace** the tap-each-exercise checklist with the full-screen set-by-set runner. |
| What happens to logged numbers? | **Persist full per-set history** to Supabase (new `set_logs` table) + feed progression. |
| Primers in the runner? | **Lighter** — show the move + suggested target, tap **Done**. No weight steppers, no logging. |

## Defaults chosen for Simon to review (easy to change)

- **Section colours:** primer `--moss` (green), main `--rust`. Real theme vars only.
- **Steppers:** weight ±2.5 kg, reps ±1, RPE buttons 6–10. Each set pre-fills from
  the target; once you change a set, the next set of the same exercise defaults to
  what you actually just did (carry-forward).
- **Supersets:** interleaved by round — A1 set 1 → A2 set 1 → rest → A1 set 2 …
- **Non-strength items** (run / swim / cycle / mobility): a single "Done" step, no
  weight steppers (they have no sets×reps×weight shape).
- **Offline-first:** the runner works fully on `localStorage`. Cloud sync is
  best-effort — so it's usable in the morning even before the Supabase migration is
  applied to the live DB.

---

## Architecture

The feature splits cleanly across the existing layers. Nothing rewrites
`Database.js` or mutates the pure plan generator.

```
ENGINE (pure, packages/engine)
  data/primers.js          NEW  curated pattern → primer-move(s) table
  lib/plan/primers.js      NEW  buildPrimer(session) → primer items (section:'primer')
                                + tag existing items section:'main'. Pure + tested.

PLAN SURFACING (apps/mobile/src/lib)
  PlanService.js           EDIT apply the primer/section decoration when surfacing
                                sessions to screens (after reflow + injury filter).

UI (apps/mobile/src)
  screens/SessionDetail.jsx   EDIT two-colour Primer/Main overview; "Start session"
                                   launches the runner instead of the inline checklist.
  screens/SessionRunner.jsx   NEW  full-screen set-by-set runner (own route).
  components/RestTimer.jsx    REUSE auto-advance on finish (small callback addition).
  App.jsx                     EDIT add the runner route.
  styles/main.css             EDIT section colours + runner styles.

DATA / PERSISTENCE
  supabase/migrations/0XX_set_logs.sql  NEW  set_logs table + index + RLS + trigger
  supabase/schema.sql                   EDIT add set_logs to the canonical schema
  Storage.js                            EDIT add setLogs key
  Database.js                           EDIT register setLogs table + a logSet service
  SyncService.js                        EDIT saveSetLog / pull set_logs / delete cascade
  stores/trainingStore.js               EDIT logSet action + expose set logs in view
```

### Why the primer lives in the engine but is *applied* in PlanService

The primer is a deterministic function of the session's main lifts, so it belongs
with the other pure plan logic in `packages/engine` (and gets unit tests there).
But we **apply** it as a decoration in `PlanService` (the single place screens read
sessions from), *after* the adaptive reflow and injury filtering. That keeps:

- the pure `generatePlan` output and its existing snapshot/volume tests untouched
  (primers are non-loading bodyweight/band moves — they must not affect muscle
  volume accounting, MEV/MAV/MRV, or durations); and
- one consistent code path so the overview, the runner, Train Now, and reflowed
  weeks all show the same primer.

This mirrors the precedent already in the codebase: `applyFunctionalPrimer`
([packages/engine/src/lib/plan/strength.js](../../../packages/engine/src/lib/plan/strength.js))
already prepends a generic primer to `functional`-style sessions. We generalise
that idea into a curated, movement-specific, all-styles primer with explicit
`section` tags, and retire the narrower functional-only version.

---

## Component 1 — Primer table + section tagging (engine)

### `packages/engine/data/primers.js` (new)

A small lookup keyed by **movement pattern** (the categories the exercise data
already uses — push/horizontal-press, vertical-press, squat/hinge, pull, etc.).
Each entry is 1–2 activation moves with the same item shape the allocator emits
(`name`, `sets`, `rpe`, `note`, `restSec`, `equip`, optional no-kit `alt`).

```js
// shape (illustrative)
export const PRIMERS = {
  horizontalPress: [
    { name: 'Band Pull-Apart', sets: '2 × 15', rpe: 'RPE 4', note: 'Retract shoulder blades',
      restSec: 0, equip: 'band', alt: { name: 'Scapular Wall Slide', sets: '2 × 10', equip: 'bodyweight' } },
  ],
  squat: [
    { name: 'Glute Bridge (2s hold)', sets: '2 × 10', rpe: 'RPE 4', note: 'Wake up the glutes', restSec: 0, equip: 'bodyweight' },
  ],
  hinge: [
    { name: 'Bodyweight Hip Hinge', sets: '2 × 10', rpe: 'Easy', note: 'Groove the hinge', restSec: 0, equip: 'bodyweight' },
  ],
  verticalPress: [ /* band dislocates / wall slides */ ],
  pull:          [ /* scap pull-ups / band face-pulls */ ],
};
```

### `packages/engine/lib/plan/primers.js` (new, pure)

```
buildPrimer(session, { access }) -> { primer: Item[], main: Item[] }
```

- Looks at the session's items, finds the **main movement patterns** present
  (reuse the existing pattern/`matchLift` logic so "Bench Press" → horizontalPress),
  collects the matching primer moves, **de-duplicates** (one primer per pattern,
  cap ~3 total so the primer stays short), swaps any move whose equipment the user
  lacks for its `alt`, and numbers them `P1, P2…`.
- Tags every primer item `section:'primer'` and every existing item `section:'main'`.
- Returns both lists. The caller concatenates `[...primer, ...main]`.
- **No volume side-effects:** primer moves are bodyweight/band, tagged `mobility`,
  so `countWeeklyVolume` already ignores them (same as today's functional primer).

**Tests** (`packages/engine/tests/primers.test.js`, run with `node`):
- bench session → primer contains a horizontal-press activation move
- squat session → glute activation present
- session with both → primers de-duped, capped, all `section:'primer'`
- no-band user → band move swapped for its bodyweight `alt`
- primer adds **zero** counted muscle volume (regression guard)

---

## Component 2 — Two-colour Primer / Main overview (SessionDetail)

The exercise table already **groups consecutive items by activity type**
([SessionDetail.jsx:230](../../../apps/mobile/src/screens/SessionDetail.jsx)).
We add an **outer grouping by `section`** first: render a **Primer** block then a
**Main** block, each with a coloured section header + left accent bar (primer
`--moss`, main `--rust`). Activity-type sub-grouping stays exactly as-is inside
each section. Items with no `section` (legacy / non-decorated) default to `main`,
so nothing breaks if decoration is ever absent.

This is the "full session shown before you click in" view the user described.

---

## Component 3 — Focused set-by-set runner (SessionRunner)

### Route

New route `/.../sessions/:sessionIdx/run` (sibling of SessionDetail). A real route
(not an overlay) so the browser back button works and a refresh can resume from
the persisted progress. SessionDetail's **Start session** navigates here after
calling `startSession(key)` (which already pins/freezes the session — the runner
must train exactly what was on screen, never recompute).

### Step model

On entry the runner expands the (frozen) session into an ordered list of **steps**:

- **Primer item** → one `prep` step: name, suggested target (`2 × 15`), note, **Done**.
- **Main strength item** with `sets = "N × R"` → **N** `set` steps, each carrying
  `{ exerciseName, setIndex, totalSets, targetReps, targetWeight, targetRpe, restSec, liftKey }`.
- **Superset group** (same `group`, `superset:true`) → interleave by round:
  for round r: a `set` step for each member at round r, then **one** rest (members
  get `restSec:0` except the last in the round, which carries the real rest).
- **Non-strength main item** (run/swim/cycle/mobility, no parseable sets) → one
  `done` step (no steppers).

### Per-set UI

- Big exercise name + "Set X of N", section colour accent.
- Three adjustable values with +/- steppers: **Weight** (±2.5 kg), **Reps** (±1),
  **RPE** (6–10). Pre-filled from target; carry-forward from the previous logged
  set of the same exercise.
- **Log set** → writes a `set_log` row (local-first), then starts the rest timer.
- **Rest:** reuse RestTimer; on finish it **auto-advances** to the next step
  (callback). Controls to **skip rest** / **+/- 15 s** stay available. Last set of
  the session → no rest, go to finish.
- Progress affordance: "Set 7 of 18" + a thin section-coloured progress bar.

### State & resume

- Per-set entries are written immediately (offline-first), so a refresh/return
  rebuilds the runner's position from the persisted `set_logs` for this session.
- "Started by mistake / Exit" returns to SessionDetail without completing (logged
  sets remain — they're real history; uncomplete/cancel still clears them via the
  cascade, see below).

### Finish → completion

- Last step → navigate to SessionDetail's existing rating form (quality / energy /
  recovery / notes) → `completeSession`. **Unchanged.**
- Progression: instead of the manual "log your top set" form, derive each tracked
  lift's **top working set** from the logged `set_logs` and feed it to the existing
  `logLiftSets` path (same `nextE1RM` autoregulation). The manual top-set inputs
  become a fallback shown only if a tracked lift somehow has no logged set.

---

## Component 4 — Persistence (`set_logs`)

### Table (new migration, mirrors `006_workouts.sql` + `session_logs`)

```sql
create table if not exists public.set_logs (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid references public.sessions(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  exercise_key  text,        -- tracked-lift key when applicable (squat/bench/…)
  exercise_name text,
  section       text,        -- 'primer' | 'main'
  set_index     int,         -- 1-based within the exercise
  target_weight numeric,
  target_reps   int,
  target_rpe    numeric,
  actual_weight numeric,
  actual_reps   int,
  actual_rpe    numeric,
  is_primer     boolean default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists idx_set_logs_session on public.set_logs(session_id);
create index if not exists idx_set_logs_user on public.set_logs(user_id);
-- updated_at trigger + RLS "own rows" (auth.uid() = user_id), exactly like every other table.
```

`schema.sql` updated to include the table, its RLS, and its trigger in the
canonical definition + the relevant table-name arrays.

### Local + sync (offline-first, the established pattern)

- **Storage.js:** add `setLogs: 'htp_set_logs_v4'`.
- **Database.js:** register `setLogs` in `tables`/`tablesApi`; add a
  `services.logSet(fields)` (thin wrapper over `tablesApi.setLogs.create`) and a
  `services.setLogsForSession(sessionId)` reader. (Additive — not a rewrite.)
- **SyncService.js:** `saveSetLog(fields)` (local create, then best-effort
  `supabase.from('set_logs').upsert(...)`, identical shape to `addInjury`); include
  `set_logs` in `pullFromSupabase`, `deleteTrainingData`, and the
  uncomplete/cancel cascade so resetting a session clears its set logs too; add
  `set_logs` to the snapshot/export lists.
- **trainingStore.js:** `logSet(fields)` action (fire-and-forget sync, then
  `set(buildView())`), mirroring `completeSession`. `buildView` exposes set logs
  grouped by `session_id` for the runner's resume.

**Graceful degradation:** if `set_logs` doesn't exist in the live DB yet, the
Supabase upsert errors, `logError` records it, and the local write is unaffected —
the runner keeps working. So Simon can try it before touching the database.

---

## Data flow (one logged set)

```
Runner "Log set"
  → trainingStore.logSet({ session_id, exercise_name, set_index, actual_*… })
     → SyncService.saveSetLog → Database.services.logSet (localStorage, synchronous)
                              ↘ supabase.from('set_logs').upsert (best-effort)
     → set(buildView())  (runner re-reads, advances to rest)
On finish → completeSession (unchanged) + derive top sets → logLiftSets (progression)
```

Matches the project's hard rule: **all writes go through SyncService via store
actions**; reads are instant from local.

---

## Edge cases & non-goals

- **Injury-modified / rehab sessions:** decoration runs after injury filtering;
  rehab/full-replacement sessions still get a (possibly empty) primer + main split
  and run set-by-set. Rehab items with no parseable sets fall to a `done` step.
- **Run / swim / cycle sessions:** no primer (no matching strength pattern); each
  item is a single `done` step. The runner still works as a guided checklist.
- **Legacy plans (no start date):** unaffected; sections default to `main`.
- **Non-goals (explicitly out of scope):** charts/analytics over the new per-set
  data; editing a logged set after the session; AI primer selection; endurance
  session programming. The data model is shaped so these can come later.

---

## Testing & verification

- **Engine:** `node packages/engine/tests/primers.test.js` (new) + run the
  existing engine tests to prove primers didn't disturb volume/durations.
- **App runs:** `npm run dev` from repo root; verify with the preview tools:
  - SessionDetail shows green Primer + rust Main sections.
  - Start → runner steps set-by-set; steppers adjust; Log set → rest counts down →
    auto-advances; finish → rating form → completed.
  - Refresh mid-session resumes at the right step.
  - `set_logs` rows present in localStorage; progression still updates `lift_log`.
- **Theme check:** only real vars (`--moss`, `--rust`, `--bg-surface`,
  `--txt-strong`, `--hairline`, …). No invented vars.

## Commit plan (small, described steps, all local)

1. spec doc (this file)
2. engine: primer table + `buildPrimer` + tests
3. PlanService: apply section decoration; retire functional-only primer
4. SessionDetail: two-colour Primer/Main overview
5. data: migration + schema + Storage + Database + SyncService + store action
6. SessionRunner + route + RestTimer auto-advance + CSS
7. wire completion/progression from logged sets
