# Sprint 1 — UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Six app-only UX fixes: selection contrast (incl. a real class-mismatch bug), plan-driven rest timer, live-session summary dropdown, completion → Return home flow, workout-summary restyle with measured duration, onboarding draft persistence.

**Architecture:** All changes in `apps/mobile`. No engine, schema, or golden-master changes. Spec: `docs/superpowers/specs/2026-07-20-sprint1-ux-fixes-design.md`.

**Tech Stack:** React 18 + Vite, Zustand, plain CSS (`src/styles/main.css`, dark-only Midnight system). Tests are plain node scripts in `apps/mobile/tests/*.js` run by `npm test`.

## Global Constraints

- Theme variables: USE `--bg-surface`, `--bg-surface-2`, `--txt-strong`, `--txt-muted`, `--txt-body`, `--hairline`, `--rust`, `--moss`, `--ochre`, `--shadow-sm`, `--shadow-md` (plus the pre-existing `--accent`/`--accent-warm` already used throughout). NEVER `--card-bg`, `--border`, `--accent-bg` (don't exist — recurring bug).
- All data writes via store actions → SyncService. Never touch Database.js from a screen.
- `npm test` AND `npm run lint` from repo root must pass before every commit (CI runs lint).
- App must run (`npm run dev` from repo root) at the end of every task.
- Working branch: `claude/session-ui-flow-improvements-92b44a` (this worktree). Commit per task; do NOT merge or push to main.

All file paths below are relative to the repo root.

---

### Task 1: Fix the selected-state class bug + one shared selected treatment

**Files:**
- Modify: `apps/mobile/src/screens/SessionRunner.jsx:356`
- Modify: `apps/mobile/src/screens/SessionDetail.jsx:363`
- Modify: `apps/mobile/src/components/OnboardingWizard.jsx:100–119` (Chip), `148–156` (MiniToggle)
- Modify: `apps/mobile/src/styles/main.css` (rating-btn blocks at ~524–542 and ~1247–1265; add `.is-selected`)

**Interfaces:**
- Produces: CSS class `.is-selected` — the single app-wide selected treatment for tappable option controls. Later tasks (summary dropdown current-step highlight) reuse it.

- [ ] **Step 1: Fix the class mismatch (the bug).** In `SessionRunner.jsx` line 356 change `` className={`rating-btn ${draft.rpe === n ? 'active' : ''}`} `` to `` className={`rating-btn ${draft.rpe === n ? 'selected' : ''}`} ``. In `SessionDetail.jsx` line 363 change `` className={`rating-btn ${ratings[rk] === n ? 'active' : ''}`} `` to `` className={`rating-btn ${ratings[rk] === n ? 'selected' : ''}`} ``. (The CSS `.rating-btn.selected` rules already exist — the JSX was writing a class the stylesheet never styles.)

- [ ] **Step 2: Verify visually.** `npm run dev`, open a session runner set step (or the rating form via a completed session's "Mark as incomplete" → complete flow), tap an RPE/rating button — it must now stay visibly highlighted.

- [ ] **Step 3: Add the shared `.is-selected` treatment to `main.css`.** Append (near the existing `.rating-btn` rules, ~line 542):

```css
/* One app-wide selected treatment for tappable option controls (chips, toggles,
   preset buttons). Strong enough to read at a glance on Midnight. */
.opt-chip {
  border: 1.5px solid var(--hairline);
  background: var(--bg-surface);
  color: var(--txt-strong);
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.12s, background 0.12s, box-shadow 0.12s;
}
.opt-chip.is-selected {
  border: 2px solid var(--accent);
  background: rgba(111, 211, 196, 0.16);
  box-shadow: 0 0 0 1px rgba(111, 211, 196, 0.25) inset;
}
.opt-chip.is-selected .opt-chip-label { font-weight: 700; }
```

- [ ] **Step 4: Convert `Chip` to the classes.** Replace the `Chip` component in `OnboardingWizard.jsx` (lines 100–119) with:

```jsx
function Chip({ selected, onClick, label, hint, emoji, center }) {
  return (
    <button onClick={onClick} className={`opt-chip ${selected ? 'is-selected' : ''}`} style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      minHeight: emoji ? 62 : (hint ? 58 : 46),
      padding: emoji ? '12px 14px' : '10px 12px',
      display: 'flex', alignItems: 'center', justifyContent: center && !emoji ? 'center' : 'flex-start', gap: emoji ? 12 : 0,
      textAlign: center && !emoji ? 'center' : 'left'
    }}>
      {emoji && <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span className="opt-chip-label" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
        {hint && <span style={{ fontSize: 11, color: 'var(--txt-muted)', lineHeight: 1.3 }}>{hint}</span>}
      </span>
    </button>
  );
}
```

(Layout stays inline — it's per-instance; the border/background/selected styling moves to the classes.)

- [ ] **Step 5: Convert `MiniToggle` similarly** (lines ~148–156):

```jsx
function MiniToggle({ on, onClick, label }) {
  return (
    <button onClick={onClick} className={`opt-chip ${on ? 'is-selected' : ''}`} style={{
      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8
    }}>{label}</button>
  );
}
```

- [ ] **Step 6: Audit sweep.** `grep -rn "selected ?" apps/mobile/src/screens apps/mobile/src/components` and `grep -rn "var(--hairline)" apps/mobile/src/screens | grep -i "border"` to find remaining hand-rolled selectable controls (known candidates: day-of-week picker chips and start-date options inside OnboardingWizard steps — they render via `Chip` so are already covered; check `SubstituteSheet.jsx`, `Settings*` screens, and any preset buttons). Apply `opt-chip`/`is-selected` where the control is a *selection* (persistent chosen state), NOT where it's a one-shot action button. List what you changed in the commit message.

- [ ] **Step 7: Test + commit.**

Run: `npm test && npm run lint` (repo root). Expected: both pass (no snapshot impact — CSS/JSX only).
Run: `npm run dev` — onboarding chips and RPE buttons show the strong selected state.

```bash
git add -A apps/mobile/src
git commit -m "fix(ui): selected state actually renders — class mismatch + shared .is-selected treatment"
```

---

### Task 2: Rest timer — remove manual presets, keep skip/pause/reset

**Files:**
- Modify: `apps/mobile/src/components/RestTimer.jsx`

**Interfaces:**
- Consumes: `restStart: { secs, at }` from SessionRunner (unchanged).
- Produces: same component API; presets UI and `startSecs` removed.

- [ ] **Step 1: Remove the presets.** In `RestTimer.jsx`: delete line 4 (`const PRESETS = [60, 90, 120, 180];`), delete the `startSecs` function (lines 82–88), and replace the footer block (lines 122–127):

```jsx
      <div className="rt-presets">
        {PRESETS.map(n => (
          <button key={n} className="rt-preset" onClick={() => startSecs(n)}>{n}s</button>
        ))}
        {secs > 0 && <button className="rt-preset rt-reset" onClick={reset}>Reset</button>}
      </div>
```

with a restart-the-prescribed-rest control (keep Reset semantics but plan-driven — it restarts the same `restStart.secs`, never a user-picked value):

```jsx
      {secs > 0 && (
        <div className="rt-presets">
          <button className="rt-preset rt-reset" onClick={restart}>Restart rest</button>
        </div>
      )}
```

and add `restart` next to the old `reset` (replace line 102):

```jsx
  // Restart the same prescribed rest from the top (plan-driven — no manual durations).
  const restart = () => {
    if (!restStart?.secs) return;
    firedRef.current = false;
    pausedRef.current = 0;
    endAtRef.current = Date.now() + restStart.secs * 1000;
    setSecs(restStart.secs);
    setRunning(true);
  };
```

- [ ] **Step 2: Fix the idle label.** Line 120's `'pick a time'` state can no longer happen mid-rest (the timer only ever auto-starts). Change the ternary to `{running ? 'tap to pause' : 'tap to resume'}` and remove the `disabled={secs === 0}` guard's dependence on presets (keep `disabled={secs === 0}` — harmless).

- [ ] **Step 3: Update the component doc comment** (lines 12–27): delete the "Pick a preset to override" sentence; note rest is always plan-prescribed.

- [ ] **Step 4: Test + commit.**

Run: `npm test && npm run lint`. Expected: pass.
Run: `npm run dev` — log a set: rest auto-starts with the plan's duration; only pause/resume, Restart rest, and the runner's Skip rest exist.

```bash
git add apps/mobile/src/components/RestTimer.jsx
git commit -m "feat(runner): rest timer is plan-driven only — manual duration presets removed"
```

---

### Task 3: Live-session summary dropdown

**Files:**
- Create: `apps/mobile/src/components/SessionOverview.jsx`
- Modify: `apps/mobile/src/screens/SessionRunner.jsx` (header, ~lines 285–295)
- Modify: `apps/mobile/src/styles/main.css`

**Interfaces:**
- Consumes: `steps` (from `buildSteps`), `cursor`, `loggedSet`/`loggedKey` from SessionRunner.
- Produces: `<SessionOverview steps cursor isStepDone(i) onClose />` — read-only overlay.

- [ ] **Step 1: Create `SessionOverview.jsx`:**

```jsx
/**
 * SessionOverview — a read-only pull-down of the whole session while running it.
 * Groups the runner's step list back into exercises (a strength exercise's N set-steps
 * collapse to one row with per-set dots). Tap the scrim or the chevron to close.
 */
export default function SessionOverview({ steps, cursor, isStepDone, onClose }) {
  // Collapse steps → rows. Consecutive set-steps of the same exercise share a row.
  const rows = [];
  steps.forEach((st, i) => {
    if (st.kind === 'primerRound') {
      if (st.round === 1) rows.push({ kind: 'primer', label: 'Primer circuit', detail: `${st.totalRounds} round${st.totalRounds > 1 ? 's' : ''}`, indexes: [i] });
      else rows[rows.length - 1].indexes.push(i);
      return;
    }
    const last = rows[rows.length - 1];
    if (st.kind === 'set' && last && last.kind === 'sets' && last.label === st.exerciseName) {
      last.indexes.push(i);
      return;
    }
    rows.push(st.kind === 'set'
      ? { kind: 'sets', label: st.exerciseName, detail: `${st.totalSets} × ${st.repsLabel}${st.weightLabel ? ` @ ${st.weightLabel}` : ''}`, indexes: [i] }
      : { kind: 'prep', label: st.exerciseName, detail: st.prescription, indexes: [i] });
  });

  return (
    <div className="so-scrim" onClick={onClose}>
      <div className="so-panel" onClick={e => e.stopPropagation()}>
        <div className="so-head">Session overview</div>
        {rows.map((row, r) => {
          const done = row.indexes.every(isStepDone);
          const current = row.indexes.includes(cursor);
          return (
            <div key={r} className={`so-row ${done ? 'done' : ''} ${current ? 'is-selected' : ''}`}>
              <span className="so-mark">{done ? '✓' : current ? '●' : ''}</span>
              <span className="so-name">{row.label}</span>
              <span className="so-detail">{row.detail}</span>
            </div>
          );
        })}
        <button className="so-close" onClick={onClose} aria-label="Close overview">▲</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the runner header.** In `SessionRunner.jsx`: add `const [overviewOpen, setOverviewOpen] = useState(false);` beside the other state (~line 168). A step is "done" if it's behind the cursor or its set is logged:

```jsx
  const isStepDone = (i) => {
    const st = steps[i];
    if (!st) return false;
    if (st.kind === 'set') return loggedSet.has(loggedKey(st.exerciseName, st.setIndex));
    return i < cursor;
  };
```

Replace the header's right-side spacer `<div style={{ width: 32 }} />` (line 293) with:

```jsx
        <button className="runner-nav" onClick={() => setOverviewOpen(o => !o)} aria-label="Session overview">▼</button>
```

and render the overlay just inside the root `<div className="runner">` (before the `{resting ? …}` block):

```jsx
      {overviewOpen && (
        <SessionOverview steps={steps} cursor={cursor} isStepDone={isStepDone} onClose={() => setOverviewOpen(false)} />
      )}
```

Import at top: `import SessionOverview from '../components/SessionOverview.jsx';`

- [ ] **Step 3: Styles.** Append to `main.css`:

```css
/* Session overview pull-down (runner) */
.so-scrim { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 60; }
.so-panel {
  position: absolute; top: 0; left: 0; right: 0;
  max-height: 78vh; overflow-y: auto;
  background: var(--bg-surface); border-bottom: 1px solid var(--hairline);
  border-radius: 0 0 18px 18px; padding: 14px 16px 8px; box-shadow: var(--shadow-md);
  animation: so-drop 0.18s ease-out;
}
@keyframes so-drop { from { transform: translateY(-12px); opacity: 0.6; } to { transform: none; opacity: 1; } }
.so-head { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--txt-muted); margin-bottom: 8px; }
.so-row { display: flex; align-items: baseline; gap: 10px; padding: 8px 10px; border-radius: 10px; }
.so-row.is-selected { background: rgba(111,211,196,0.12); }
.so-row.done { opacity: 0.5; }
.so-mark { width: 14px; flex-shrink: 0; font-size: 11px; color: var(--accent); }
.so-name { font-size: 14px; font-weight: 600; color: var(--txt-strong); min-width: 0; flex: 1; }
.so-detail { font-size: 12px; color: var(--txt-muted); flex-shrink: 0; }
.so-close { display: block; margin: 6px auto 0; background: none; border: none; color: var(--txt-muted); font-size: 14px; cursor: pointer; padding: 6px 20px; font-family: inherit; }
```

- [ ] **Step 4: Test + commit.**

Run: `npm test && npm run lint`. Expected: pass.
Run: `npm run dev` — start a session, tap ▼: full session listed, current row highlighted, logged sets ticked/dimmed; scrim tap and ▲ close it; works during rest too.

```bash
git add apps/mobile/src/components/SessionOverview.jsx apps/mobile/src/screens/SessionRunner.jsx apps/mobile/src/styles/main.css
git commit -m "feat(runner): pull-down full-session overview during a live session"
```

---

### Task 4: Completion flow — "Session complete" state + Return home

**Files:**
- Modify: `apps/mobile/src/screens/SessionDetail.jsx`

**Interfaces:**
- Consumes: existing `handleSubmit` (line 162), `isDone` block (289–342), `navigate` (react-router).
- Produces: `justFinished` local state; Return home buttons navigating to `/`.

- [ ] **Step 1: Track the just-finished moment.** Add `const [justFinished, setJustFinished] = useState(false);` beside the other state (~line 100). In `handleSubmit` (after `setNotes('')`, line 184) add `setJustFinished(true);`. In the `useEffect` keyed on `key` (line 108) add `setJustFinished(false);`.

- [ ] **Step 2: Celebration + Return home in the `isDone` block.** At the top of the `isDone` fragment (before the existing callout, line 291) add:

```jsx
          {justFinished && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <div style={{ fontSize: 34 }}>🎉</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--txt-strong)', marginTop: 4 }}>Session complete</div>
              <div style={{ fontSize: 12.5, color: 'var(--txt-muted)', marginTop: 2 }}>Nice work — it's in the log.</div>
            </div>
          )}
```

And after the `SessionPhysiology` render (end of the fragment, ~line 341) add the primary exit:

```jsx
          <button className="btn-primary" style={{ marginTop: 16, width: '100%' }} onClick={() => navigate('/')}>
            Return home
          </button>
```

(One button serves both the just-finished and revisit cases — it's always the obvious exit. "Mark as incomplete" stays as the quiet secondary above it.)

- [ ] **Step 3: Order check.** Final `isDone` layout order: celebration (conditional) → summary card (Task 5 restyles it) → Mark as incomplete → physiology → **Return home**. Verify `navigate('/')` lands on the Home tab (the app's root route — confirm in `src/App.jsx`/router config; if home is a different path, e.g. `/home`, use that).

- [ ] **Step 4: Test + commit.**

Run: `npm test && npm run lint`. Expected: pass.
Run: `npm run dev` — complete a session end-to-end: rating form → Save & complete → celebration + summary + Return home → lands Home. Revisit the completed session: summary + Return home (no celebration).

```bash
git add apps/mobile/src/screens/SessionDetail.jsx
git commit -m "feat(session): completion state with Return home — no more dead-end after finishing"
```

---

### Task 5: Workout summary — measured duration + Midnight restyle

**Files:**
- Modify: `apps/mobile/src/screens/SessionDetail.jsx` (the `isDone` callout, lines 289–319)
- Modify: `apps/mobile/src/styles/main.css`

**Interfaces:**
- Consumes: `state.startedAt`, `state.completedAt` (already in the store view, `trainingStore.js:72`), `state.quality/energy/recovery/notes`.
- Produces: `.done-card` summary styling.

- [ ] **Step 1: Duration helper.** Top of `SessionDetail.jsx` (below imports):

```jsx
// Measured duration in whole minutes — only when both stamps exist and the value is
// plausible (5 min – 6 h); an overnight-forgotten completion shows no duration.
function measuredDuration(state) {
  if (!state?.startedAt || !state?.completedAt) return null;
  const mins = Math.round((new Date(state.completedAt) - new Date(state.startedAt)) / 60000);
  return mins >= 5 && mins <= 360 ? mins : null;
}
const fmtWhen = (iso) => new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
  + ' · ' + new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
```

- [ ] **Step 2: Replace the green callout** (lines 291–319) with a Midnight summary card:

```jsx
          <div className="done-card" style={{ marginTop: 20 }}>
            <div className="dc-head">
              <span className="dc-badge">✓ Completed</span>
              {state.completedAt && <span className="dc-when">{fmtWhen(state.completedAt)}</span>}
            </div>
            {measuredDuration(state) != null && (
              <div className="dc-duration">{measuredDuration(state)} min session</div>
            )}
            {state.quality != null && (
              <div className="dc-ratings">
                {[['Quality', state.quality], ['Energy', state.energy], ['Recovery', state.recovery]].map(([label, v]) => (
                  <div className="dc-rating" key={label}>
                    <div className="dc-rating-val">{v}</div>
                    <div className="dc-rating-label">{label}</div>
                  </div>
                ))}
              </div>
            )}
            {state.notes && <div className="dc-notes">"{state.notes}"</div>}
          </div>
```

- [ ] **Step 3: Styles.** Append to `main.css`:

```css
/* Completed-session summary card */
.done-card {
  background: var(--bg-surface); border: 1px solid var(--hairline);
  border-left: 3px solid var(--moss); border-radius: 12px;
  padding: 14px 16px; box-shadow: var(--shadow-sm);
}
.dc-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.dc-badge { font-size: 13px; font-weight: 700; color: var(--moss); }
.dc-when { font-size: 12px; color: var(--txt-muted); }
.dc-duration { font-size: 12.5px; color: var(--txt-body); margin-top: 4px; }
.dc-ratings { display: flex; gap: 22px; margin-top: 12px; }
.dc-rating { text-align: center; }
.dc-rating-val { font-size: 18px; font-weight: 700; color: var(--txt-strong); }
.dc-rating-label { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--txt-muted); margin-top: 1px; }
.dc-notes { font-size: 13px; font-style: italic; color: var(--txt-body); opacity: 0.85; margin-top: 10px; }
```

- [ ] **Step 4: Test + commit.**

Run: `npm test && npm run lint`. Expected: pass.
Run: `npm run dev` — a session completed normally shows "N min session"; one with missing/absurd stamps shows no duration row; card reads as Midnight (no green callout).

```bash
git add apps/mobile/src/screens/SessionDetail.jsx apps/mobile/src/styles/main.css
git commit -m "feat(session): summary card with measured duration, styled to Midnight"
```

---

### Task 6: Onboarding draft persistence

**Files:**
- Modify: `apps/mobile/src/components/OnboardingWizard.jsx` (state init ~181, effects ~199)
- Modify: `apps/mobile/src/screens/Onboarding.jsx` (pass `persistDraft`, clear on complete)
- Test: `apps/mobile/tests/onboarding-draft.js`

**Interfaces:**
- Produces: `loadDraft()/saveDraft(answers, step)/clearDraft()` exported from `OnboardingWizard.jsx`; wizard prop `persistDraft: boolean` (default false — DevPlayground unaffected).

- [ ] **Step 1: Write the failing test** `apps/mobile/tests/onboarding-draft.js` (follow the suite's plain-assert pattern — copy the `assert` helper usage from a neighbour like `answers-to-athlete-model.js`; stub `localStorage` with a Map):

```js
// Onboarding draft persistence — save/load/clear + 7-day staleness.
import { saveDraft, loadDraft, clearDraft, DRAFT_KEY } from '../src/components/OnboardingWizard.jsx';
// ...stub globalThis.localStorage with a Map-backed shim before the calls...
// assert: loadDraft() === null on empty store
// saveDraft({ goalType: 'build' }, 3); const d = loadDraft();
// assert: d.answers.goalType === 'build' && d.step === 3
// tamper savedAt to 8 days ago via localStorage.setItem(DRAFT_KEY, ...); assert loadDraft() === null
// clearDraft(); assert localStorage.getItem(DRAFT_KEY) === null
```

Note: this file imports JSX — if the node test runner can't parse it, put the three functions in a new plain module `apps/mobile/src/lib/onboardingDraft.js` instead and have the wizard import them from there (preferred; keeps the test dependency-free). Write the test against that module path.

- [ ] **Step 2: Run it to confirm it fails** (`npm test`, or `node apps/mobile/tests/onboarding-draft.js`). Expected: module-not-found failure.

- [ ] **Step 3: Implement `apps/mobile/src/lib/onboardingDraft.js`:**

```js
/**
 * onboardingDraft — localStorage draft of in-progress onboarding answers, so
 * backgrounding/closing the app mid-wizard doesn't lose everything. Deliberately
 * NOT SyncService: this is transient UI state with no user row yet, cleared the
 * moment onboarding completes. Stale drafts (>7 days) are ignored and removed.
 */
export const DRAFT_KEY = 'onboarding_draft_v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function saveDraft(answers, step) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, step, savedAt: Date.now() })); } catch { /* storage full/blocked — drafting is best-effort */ }
}
export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || !d.answers || Date.now() - (d.savedAt || 0) > MAX_AGE_MS) { clearDraft(); return null; }
    return d;
  } catch { return null; }
}
export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}
```

- [ ] **Step 4: Run the test — pass.**

- [ ] **Step 5: Wire into the wizard.** In `OnboardingWizard.jsx`: add prop `persistDraft = false`; import the module. Initialise from the draft (replace lines 181–182):

```jsx
  const draft = useMemo(() => (persistDraft ? loadDraft() : null), []);  // eslint-disable-line react-hooks/exhaustive-deps
  const [a, setA] = useState({ ...BLANK_ANSWERS, ...(initialAnswers || {}), ...(draft?.answers || {}) });
  const [step, setStep] = useState(draft?.step || 0);
```

Persist on change (beside the `onAnswersChange` effect, ~line 201):

```jsx
  useEffect(() => { if (persistDraft) saveDraft(a, step); }, [a, step, persistDraft]);
```

- [ ] **Step 6: Production screen.** In `Onboarding.jsx`: pass `persistDraft` to `<OnboardingWizard …/>`, and in `handleComplete` (lines 36–52) call `clearDraft()` right after the profile save succeeds (import from the lib module). DevPlayground passes nothing → drafting off there.

- [ ] **Step 7: Test + commit.**

Run: `npm test && npm run lint`. Expected: pass, incl. the new test.
Run: `npm run dev` — answer a few onboarding steps, hard-reload the tab: answers + step restored. Complete onboarding: draft gone (check devtools localStorage).

```bash
git add apps/mobile/src/lib/onboardingDraft.js apps/mobile/src/components/OnboardingWizard.jsx apps/mobile/src/screens/Onboarding.jsx apps/mobile/tests/onboarding-draft.js
git commit -m "feat(onboarding): draft persistence — leaving the app mid-onboarding no longer wipes answers"
```

---

### Task 7: Sprint verification pass

- [ ] **Step 1:** `npm test && npm run lint` from repo root — all green.
- [ ] **Step 2:** Forbidden-variable check: `git diff main -- apps/mobile/src | grep -E "card-bg|--border[^-]|accent-bg"` → no matches.
- [ ] **Step 3:** Full `npm run dev` walkthrough of all six fixes (the spec's Testing section lists the pass).
- [ ] **Step 4:** No commit needed unless fixes emerged; if they did, commit each with a `fix(sprint1): …` message.
