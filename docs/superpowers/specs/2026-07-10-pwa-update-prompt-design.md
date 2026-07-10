# PWA update prompt + version stamp — design spec (2026-07-10)

> **Status:** approved (autonomous, spawned from the triathlon-fix follow-up). Branch `pwa-update-prompt-2026-07-10`.
>
> **Goal:** make a new deploy actually reach users — especially installed iOS PWAs — instead of them
> silently running yesterday's service-worker-cached bundle. This is the root cause of repeated "I still
> see the old bug after you fixed it" reports (e.g. the triathlon sport-enum fix, PR #161: live, but the
> user's device kept serving the pre-fix bundle).

## 0. Why the current setup fails silently

`apps/mobile` uses `vite-plugin-pwa` with `registerType: 'autoUpdate'`, and **no app code imports the
register module or surfaces any update UI**. So a new service worker installs in the background but the
user gets **no signal** and **no reliable prompt to reload** — on iOS an installed PWA can keep running the
old precached bundle for a long time. There is also **no way to tell which build a device is running**,
which made diagnosing the triathlon report slow.

## 1. The change (small, low-risk)

1. **Switch to `registerType: 'prompt'`** and drive it with `useRegisterSW` (from
   `virtual:pwa-register/react`). When a new SW is waiting, `needRefresh` becomes true → show a small toast:
   **"Update available — Reload"**. Tapping calls `updateServiceWorker(true)` (skipWaiting + reload).
   Dismiss hides the toast for this session; the waiting SW still activates on the next full app restart, so
   a user who ignores it is never permanently stuck (strictly better than today's silent autoUpdate).
2. **A periodic + on-focus update check** (`r.update()` hourly and when the tab regains focus) so a
   long-open app notices a deploy without a manual reload.
3. **A build/version stamp** (Option 3): inject the package version + short commit at build time (`define`),
   show it as a muted line at the bottom of Settings. Answers "which version am I on?" at a glance.

Options **not** taken: a manual `controllerchange`→reload guard (Option 2) is redundant —
`updateServiceWorker(true)` already reloads; and keeping `autoUpdate` would keep the update invisible,
defeating the goal.

## 2. Where it mounts (important)

The toast mounts in `main.jsx` as a sibling of `<App />`, **not** inside `App`'s render tree. `App` has
many early returns (splash, auth flow, **onboarding**, block check-in) before the main UI. A user stuck on a
**stale onboarding screen** — the exact triathlon case — is inside one of those early returns, so a prompt
mounted in the signed-in app would never reach them. A top-level sibling renders on every screen.

## 3. Components + files

- `src/components/UpdatePrompt.jsx` — `useRegisterSW` wiring; renders the toast only when `needRefresh`.
  Exports a **pure** `UpdateToast({ onReload, onDismiss })` (no SW deps) so it can be rendered for a
  screenshot/preview without a real service-worker update.
- `src/lib/appVersion.js` — **pure** `formatVersion(version, commit)` (unit-tested) + `getAppVersion()`
  that reads the injected `__APP_VERSION__` / `__APP_COMMIT__` globals (browser-only; never imported by the
  node test suite).
- `src/styles/main.css` — a `.update-toast` block using **real theme variables only** (`--bg-surface-2`,
  `--txt-strong`, `--txt-muted`, `--hairline`, `--rust`, `--shadow-md`); fixed, bottom-anchored above the
  tab bar, respects `env(safe-area-inset-bottom)`, high z-index, `role="alert"`.
- `src/main.jsx` — mount `<UpdatePrompt />`.
- `src/screens/Settings.jsx` — render the version stamp in a footer.
- `vite.config.js` — `registerType: 'prompt'`; `define: { __APP_VERSION__, __APP_COMMIT__ }` (commit from
  `GITHUB_SHA` env or `git rev-parse --short HEAD`, wrapped in try/catch → `''` fallback).

## 4. Testability + verification

- **Unit (TDD):** `formatVersion` is pure → `apps/mobile/tests/app-version.js` (version+commit, version-only,
  missing version). The rest is UI glue to a build-only virtual module; the node harness (`node tests/*.js`,
  no jsdom/vitest) can't render it — that's verified in the browser.
- **Build:** `npm run build` resolves `virtual:pwa-register/react` in `prompt` mode; `npm test` stays green
  (no component is imported by the suite; no global is referenced in test-imported modules).
- **Browser:** render `UpdateToast` forced-visible (a temporary `?updatetoast=1` dev hook) to screenshot the
  themed toast and confirm layout/contrast. Real end-to-end SW update needs two deploys, so it's validated on
  device after merge (the task notes: test on Simon's iPhone installed PWA — I can't drive his device).

## 5. Risk

Low. Additive UI + a config flag flip. No engine/schema/data change (KSV untouched). The one behavioural
change — `autoUpdate` → `prompt` — makes updates **visible and user-triggered** while still auto-activating
on a full restart, so no user is worse off. Reversible by reverting the config flag + unmounting the toast.
