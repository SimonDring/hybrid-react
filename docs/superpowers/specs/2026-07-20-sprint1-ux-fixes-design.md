# Sprint 1 — UX Fixes (app-only, low risk)

**Date:** 2026-07-20
**Status:** Design for review
**Scope:** apps/mobile only. No engine changes, no schema changes, no golden-master impact.

Six self-contained fixes to daily-use friction, all found and verified in the
codebase on 2026-07-20. Each section: the problem, the design, files touched.

---

## 1. Selection contrast — every selectable control shows a clear selected state

### Problem
Two distinct defects:

1. **A real bug.** RPE buttons (`SessionRunner.jsx:356`) and session-rating
   buttons (`SessionDetail.jsx:363`) set the class `active` when selected, but
   `main.css` only styles `.rating-btn.selected` (lines 538–542, 1259–1264).
   Result: the button you tapped gets **no persistent highlight at all**.
2. **Weak/inconsistent styling.** Onboarding option chips (`Chip`,
   `OnboardingWizard.jsx:100–119`) and `MiniToggle` use inline styles with a
   faint selected state (1.5px accent border + 12%-opacity fill). There is no
   shared "selectable" primitive; every screen rolls its own.

### Design
- Fix the class mismatch: change the JSX in both files to `selected` (matching
  the existing CSS), not the other way round — the CSS is already written.
- Define **one** selected treatment in `main.css` as a reusable class
  (`.is-selected` on top of the existing chip/button classes): stronger fill,
  2px accent border, and bolder text — unmistakable at a glance on the dark
  Midnight theme. Use only real theme variables (`--bg-surface-2`, `--moss`/
  `--rust`/`--ochre`, `--txt-strong`, `--hairline`).
- Convert `Chip` and `MiniToggle` from inline styles to these classes so the
  onboarding wizard, and anything else that reuses `Chip`, picks up the same
  treatment automatically.
- **Audit sweep:** grep every screen for tappable-option patterns (chips,
  toggles, preset buttons, rating rows, equipment items) and apply the shared
  class. The sweep list goes in the implementation plan.

### Files
`apps/mobile/src/components/OnboardingWizard.jsx`,
`apps/mobile/src/screens/SessionRunner.jsx`,
`apps/mobile/src/screens/SessionDetail.jsx`,
`apps/mobile/src/styles/main.css`, plus screens found in the audit sweep.

---

## 2. Rest timer — plan-driven only; remove manual duration presets

### Problem
`RestTimer.jsx` shows preset chips `[60, 90, 120, 180]` seconds (lines 4,
122–127) that let the user override the rest the plan prescribed. Rest duration
already comes from the engine per exercise (`restSec`).

### Design
- Remove the preset chips entirely. Keep: the countdown, tap-to-pause/resume,
  and **Skip rest** (`SessionRunner.jsx:308`).
- The timer always starts from the plan's `restSec` for the current item. If an
  item somehow lacks `restSec`, fall back to the current default the component
  already uses — never a user-editable value.
- Remove the Reset control only if it exists purely to serve the presets;
  keep it if it's useful for restarting the prescribed rest (decision:
  **keep Reset** — restarting the same prescribed duration is plan-consistent).

### Files
`apps/mobile/src/components/RestTimer.jsx`, `apps/mobile/src/screens/SessionRunner.jsx`.

---

## 3. Live session — pull-down full-session summary

### Problem
The runner steps set-by-set (good) but there's no way to see the whole session
at a glance mid-workout.

### Design
- A **dropdown arrow in the runner's header** (next to the existing progress
  indicator). Tapping it slides down an overlay panel in front of the live
  screen.
- The panel lists the full session in order, grouped by section (Primer /
  Main / supersets), one row per exercise: name, sets × reps, target weight
  where present. Completed steps get a check/dimmed state; the current step is
  highlighted (reuses the selected treatment from item 1).
- Data source: `buildSteps(session)` already produces the exact ordered list
  (`SessionRunner.jsx:33–105`) and the cursor knows where you are — this is a
  pure render of existing state, no new data.
- Dismiss: tap the arrow again, tap outside the panel, or swipe up. Read-only —
  no navigation from the panel in v1 (jumping between steps already exists via
  the header arrows; keeping the panel read-only avoids interfering with
  freeze-on-start and logging order).

### Files
`apps/mobile/src/screens/SessionRunner.jsx` (panel lives in-file or as a small
component beside it), `apps/mobile/src/styles/main.css`.

---

## 4. Session completion — a real "done" moment with Return home

### Problem
Finishing the last set bounces you to `SessionDetail?finish=1` with the rating
form open; after submitting you're stranded on the "already completed" view and
must find your own way out via the tab bar. Verified: no completion CTA exists
anywhere (`SessionDetail.jsx:162–185`, 289–342).

### Design
- After the rating form submits (`handleSubmit`), show a brief **completion
  state** in place of the form: "Session complete" with the completed
  timestamp, and a primary **Return home** button that navigates to the home
  screen (`navigate('/')` route used by the Home tab).
- Add the same **Return home** button to the bottom of the `isDone` view
  (`SessionDetail.jsx:289–342`), so re-visiting a completed session also has an
  obvious exit.
- No new screen and no routing changes — this is additive UI inside
  SessionDetail, so the `?finish=1` flow, fire-and-forget sync, and "Mark as
  incomplete" all keep working unchanged.

### Files
`apps/mobile/src/screens/SessionDetail.jsx`, `apps/mobile/src/styles/main.css`.

---

## 5. Workout summary — restyle + measured duration

### Problem
The completed-session view shows ratings, notes, and HR data, but no **measured
duration** and a dated look (the green callout box) inconsistent with the rest
of Midnight. The data for duration already exists: the store records
`startedAt` (`trainingStore.js:72`, from `started_at`) and `completedAt`.

### Design
- Compute measured duration as `completedAt − startedAt` (whole minutes).
  Guard rails: show it only when both timestamps exist and the difference is
  plausible (5 min – 6 h); otherwise omit the row rather than show nonsense
  (e.g. a session started one day and completed the next).
- Restyle the `isDone` block as a proper summary card in the Midnight design
  system: date completed (friendly format, not raw `toLocaleString`), measured
  duration, the three rating tiles, notes, then the existing physiology
  section. Keep "Mark as incomplete" as a quiet secondary action.
- **No data-model change** — both timestamps already flow through
  store → SyncService → Supabase.
- Out of scope (Simon's call, 2026-07-20): no per-set "what you lifted" recap
  table.

### Files
`apps/mobile/src/screens/SessionDetail.jsx`, `apps/mobile/src/styles/main.css`.

---

## 6. Onboarding — draft persistence (no more losing your answers)

### Problem
The wizard holds answers in component state only (`OnboardingWizard.jsx:181`);
nothing is saved until final completion (`Onboarding.jsx:36–52`). Backgrounding
or closing the app mid-onboarding loses everything. Verified: no localStorage
writes anywhere in the wizard.

### Design
- Persist a draft to localStorage on every answer change (single key,
  e.g. `onboarding_draft_v1`): `{ answers, step, savedAt }`. Writes are cheap
  (small object) — no debounce machinery needed.
- On wizard mount, if a draft exists, **restore it silently** and resume at the
  saved step. No "resume?" prompt — the user's own answers reappearing is the
  expected behaviour, and a stale draft is harmless because…
- …the draft is **cleared on completion** (in `handleComplete`) and ignored/
  cleared if older than 7 days (`savedAt` check) so a months-old abandoned
  draft doesn't resurrect.
- DevPlayground's use of the wizard is unaffected: draft persistence is gated
  behind a prop (`persistDraft`) that only the production `Onboarding.jsx`
  sets, so dev experiments never pollute the draft.
- localStorage only — deliberately NOT SyncService/Supabase. This is transient
  UI state, not training data; the "all writes via SyncService" rule governs
  training data, and a pre-profile draft has no user row to sync to anyway.

### Files
`apps/mobile/src/components/OnboardingWizard.jsx`, `apps/mobile/src/screens/Onboarding.jsx`.

---

## Testing & verification (whole sprint)

- `npm test` from repo root (CI also runs `npm run lint` — run it locally).
- `npm run dev` manual pass: onboard partway → kill app → reopen (draft
  restored); run a session end-to-end (summary dropdown, no timer presets,
  RPE button highlights, completion → Return home); reopen the completed
  session (summary card with duration, Return home).
- Theme-variable check: grep the diff for the forbidden fake variables
  (`--card-bg`, `--border`, `--accent-bg`) — this bug has recurred 3×.

## Execution & merge policy

All six items are app-only and low-risk: per the standing charter (2026-07-03),
implement overnight, and merge the PR autonomously if green. One branch, one
PR, commits per item.
