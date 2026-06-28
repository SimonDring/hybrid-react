# Rest-timer reliability + wake lock (serverless) — design

**Date:** 2026-06-28
**Branch:** `feat/focused-session-runner` (continues the session work)
**Status:** Approved in brainstorm; spec for review before planning.

This is **Spec B** of the two-part session iteration. Spec A (preview re-layout,
block colour, primer circuit) is built. Scope here was confirmed as the **serverless
PWA core** — no backend, no notifications, no permission prompts.

---

## Plain-language summary

Today the rest timer counts down with `setInterval`, decrementing a number once a
second. When the phone screen locks (or the app is backgrounded), iOS **suspends the
page's JavaScript**, so the countdown freezes and `onComplete` never fires — you come
back and it's stuck mid-rest. This spec fixes that and makes the timer behave as close
to a native timer as a PWA can:

1. **Timestamp-accurate timing** — the timer tracks an *end time*, not a ticking
   counter, so it always shows the true remaining time, even after a lock.
2. **Screen wake lock** — keep the screen awake for the whole focused-session
   (runner) so it never auto-locks between sets or during rest; the countdown stays
   visible and the alarm reliably fires.
3. **Catch-up on resume** — if rest finished while the screen was off, fire the
   completion the instant you return (auto-advance + alarm) so you're never stuck.
4. **Stronger alarm** — the existing vibrate plus a short beep on completion.
5. **Drop the manual "log your top set" form** — the runner already records every
   set, so progression derives solely from that real data; no re-entry.

### Feasibility (verified, 2026)

- **Screen Wake Lock**: iOS Safari 16.4+; the installed-PWA bug was fixed in
  **iOS 18.4**. Works on current iOS; we wrap it so it's a silent no-op anywhere it
  isn't supported.
- **Locked-screen push banner / native Live Activity**: NOT possible serverless —
  iOS supports Web Push only (no local/scheduled notifications), and that needs a
  backend + installed PWA, with imprecise timing. **Deferred** (a future server or
  the Stage 7 native app). This spec intentionally excludes it.

Sources: caniuse Wake Lock; WebKit bug 254545 (Home Screen wake lock, fixed 18.4);
MagicBell "PWA iOS limitations 2026".

---

## Component 1 — Timestamp-accurate `RestTimer`

**File:** `apps/mobile/src/components/RestTimer.jsx` (internals rewrite; **public
props unchanged**: `restStart: { secs, at }`, `onComplete`).

### The bug
`setInterval` does `setSecs(s => s - 1)`. iOS suspends timers when the page is
hidden/locked, so `secs` stops decrementing and the `s <= 1` branch (which fires
`onComplete`) is never reached. On return the timer shows a stale, too-high value.

### The fix
Track an **end timestamp** in a ref and derive the display:

- On start (`restStart` changes, or a preset tap): `endAtRef = Date.now() + secs*1000`
  (seed from `restStart.at` when present so it's anchored to the actual set-completion
  moment), `running = true`.
- The 1s interval becomes display-only: `const remaining = Math.max(0,
  Math.round((endAtRef - Date.now()) / 1000)); setSecs(remaining); if (remaining === 0) finish()`.
- `finish()` (guarded to run once): clear interval, `running=false`, vibrate, beep,
  `onComplete?.()`.
- **Pause**: store `remainingRef = endAtRef - Date.now()`, stop. **Resume**: `endAtRef
  = Date.now() + remainingRef`, restart. (Same tap-to-pause UX as today.)
- **`visibilitychange`** (and `pageshow`): on becoming visible while running,
  immediately recompute `remaining`; if it's 0, call `finish()` once. This is the
  catch-up (Component 3) — the timer self-corrects the moment you return.

Because the display is always computed from wall-clock time, a suspended interval no
longer causes drift; at worst the *visible* number doesn't animate while the screen is
off, but it's correct on return and completion still fires.

---

## Component 2 — `useWakeLock` hook

**File:** `apps/mobile/src/hooks/useWakeLock.js` (new).

```
useWakeLock(active: boolean) -> void
```

- When `active` and supported, request `navigator.wakeLock.request('screen')` and keep
  the returned sentinel in a ref.
- Wake locks are **auto-released when the page is hidden**, so add a `visibilitychange`
  listener that **re-acquires** when the page becomes visible again while `active`.
- Release the sentinel when `active` flips false or on unmount.
- Everything in `try/catch`; if `navigator.wakeLock` is undefined or the request
  rejects (older iOS, low-power mode), it's a silent no-op — the app still works, just
  without keeping the screen awake.

**Used by the runner:** `useWakeLock(true)` for the whole time `SessionRunner` is
mounted (per the decision: screen stays on across sets *and* rest, not just rest).
This is the single biggest reliability win — the common "set the phone down, it
auto-locks during rest" case simply can't happen.

---

## Component 3 — Catch-up on resume

Implemented inside `RestTimer` via the `visibilitychange`/`pageshow` recompute above:
if the countdown reached 0 while hidden, `onComplete` fires once on return, so the
runner auto-advances to the next set immediately. No separate component; it's the
natural consequence of timestamp-based timing.

Guard: a `firedRef` boolean ensures `onComplete` fires exactly once per rest period
(the interval tick and the visibility handler can't double-fire).

---

## Component 4 — Stronger completion alarm

**File:** `apps/mobile/src/lib/sound.js` (new, tiny).

- `playBeep()` — lazily create/reuse a Web Audio `AudioContext`, play a short (~0.15s)
  sine tone. No audio asset needed.
- iOS requires the `AudioContext` to be unlocked by a user gesture. The runner's
  interactions (tapping "Log set", "Skip rest", a preset) call `ensureAudio()` (resume
  the context) so a later programmatic `playBeep()` is allowed while the screen is on.
- On rest completion: keep `navigator.vibrate?.(250)` and add `playBeep()`. Default on.

(No `<audio>` element, no asset, no permission. If Web Audio is unavailable it's a
no-op — vibrate still fires.)

---

## Component 5 — Remove the manual top-set form

**File:** `apps/mobile/src/screens/SessionDetail.jsx`.

The runner records **every** set to `set_logs`, and `topLoggedSet(l)` already derives
each tracked lift's heaviest working set from that data. The manual "Log your top set"
inputs are now redundant.

Remove:
- the `lifts` / `setLifts` state and its reset in the per-session `useEffect`;
- the **"Log your top set"** block in the rating form (the `trackedLifts.length > 0`
  section with the weight input + FINAL-SET RPE row);
- the manual fallback branch in `handleSubmit` (the `entry = lifts[l.key]` path) and
  the now-unused `targetKg` helper if nothing else uses it.

`handleSubmit` simplifies to:

```js
const sets = trackedLifts.map(topLoggedSet).filter(Boolean);
if (sets.length) Promise.resolve(logLiftSets(sets)).catch(e => console.error('Top-set log failed (continuing):', e));
```

Keep `trackedLifts`, `topLoggedSet`, `logLiftSets`, and the rating form
(quality/energy/recovery/notes) — only the manual top-set entry goes.

**Edge case (accepted):** completing a session that logged **zero** sets (e.g. tapped
Complete without running it set-by-set) won't autoregulate weights — there's no real
data to learn from, which is the right behaviour and removes the re-entry friction.

---

## Files

- `apps/mobile/src/components/RestTimer.jsx` — timestamp internals + visibility
  catch-up + beep on finish (props unchanged).
- `apps/mobile/src/hooks/useWakeLock.js` — new hook.
- `apps/mobile/src/lib/sound.js` — new beep util.
- `apps/mobile/src/screens/SessionRunner.jsx` — `useWakeLock(true)`; call
  `ensureAudio()` on the existing tap handlers.
- `apps/mobile/src/screens/SessionDetail.jsx` — remove the manual top-set form +
  fallback.

No engine, schema, store, or `set_logs` changes. No new dependencies.

---

## Edge cases

- **Older iOS / unsupported**: wake lock + Web Audio are silent no-ops; the timestamp
  timer still fixes the freeze (the core bug) everywhere.
- **Manual lock / app switch**: wake lock is released (it can't prevent a manual lock
  or app switch); the timestamp timer + resume catch-up cover that case — correct time
  and a fired completion on return.
- **Pause across a lock**: a paused timer stores remaining, so a lock during a pause
  doesn't lose time.
- **Multiple rests**: `firedRef` resets each new `restStart`, so each rest fires once.

## Non-goals

Locked-screen push banner, scheduled/local notifications, native Live Activity,
background sync — all require a backend and/or native and are deferred.

## Testing & verification

- **Timestamp + catch-up**: in the preview, start a rest, dispatch
  `document.dispatchEvent(new Event('visibilitychange'))` with the tab marked hidden
  then visible (or fast-forward by setting a short rest and checking it reads 0 after
  the wall-clock elapses); assert `onComplete` fires once and the runner advances.
- **Wake lock**: assert `navigator.wakeLock.request('screen')` resolves in desktop
  Chrome (supported) and that the hook no-ops when `navigator.wakeLock` is absent.
- **Alarm**: confirm `playBeep()` runs without throwing after an unlock gesture.
- **Top-set removal**: complete a runner session → `profile.lift_log` still updates
  from logged sets; the rating form no longer shows the top-set inputs.
- `npm run build` clean; `node tests/*.js` unaffected (no engine changes).

## Commit plan

1. spec (this doc)
2. timestamp-accurate RestTimer + beep + visibility catch-up
3. useWakeLock hook + wire into runner (+ ensureAudio on taps)
4. remove manual top-set form from SessionDetail
