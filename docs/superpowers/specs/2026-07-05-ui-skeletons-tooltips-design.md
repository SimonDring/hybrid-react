# UI upgrades: skeleton loaders + tooltips (2026-07-05)

**Simon's scope decisions:** skeletons = web per-panel + mobile's genuinely-loading
moments; tooltips = every jargon term + every metric card, web AND mobile (buttons and
obvious labels stay clean). One PR, stacked on #124 (same dashboard files).

## Skeleton loaders

**Web (apps/web).** The dashboard's data fetch is server-side in the layout, so route
entry genuinely blanks. Mechanism: a `Skeleton` primitive (`components/ui/Skeleton.tsx`,
Tailwind tokens only — `bg-surface-2`/`bg-surface-3`, a CSS shimmer via
`animate-pulse` or a custom keyframe in globals.css) + `app/dashboard/loading.tsx`
composing per-panel skeleton layouts that MIRROR the real panels' frames (cards grid,
table rows, attention list, chart block) so the reveal doesn't jump. Child routes are
covered by the segment-level loading file; no changes inside the live panels.

**Mobile (apps/mobile).** Screens render instantly from the local cache; skeletons apply
only where the UI actually waits: the sign-in sync (`syncing` with no local rows yet)
and wearable/network fetches. One `.skeleton` shimmer class in `src/styles/main.css`
using REAL theme vars (`--bg-surface-2`, `--hairline` — never invented ones), applied in
those few spots. No skeletons on instant screens.

## Tooltips

**One accessible primitive per app.** Web: `components/ui/InfoTip.tsx` — an ⓘ button,
`aria-describedby`, opens on hover AND focus AND click/tap (touch-friendly), Escape
closes; positioned popover using existing tokens (`bg-surface-3`, `border-hairline`).
Mobile: an `InfoTip` JSX component + `main.css` styles (tap-to-toggle, outside-tap
closes) matching the existing ⓘ form-guide affordance.

**Copy lives in one place.** Web: a `JARGON` map added to `content/dashboardCopy.ts`
(reuse STATUS_META/LOAD_META meanings; plain English, no raw-vitals language). Mobile: a
small `src/data/metricGlossary.js`. Terms covered: readiness, workload ratio (ACWR),
load bands, adherence, confidence, RAG statuses, "updated", awaiting-first-sync,
match-week, RPE, training load, MEV/MAV/MRV (dev), recovery trend, session quality/
objective terms where surfaced.

**Sweep targets.** Web: every TeamOverviewCards card label, PlayerStatusTable column
headers, drawer MiniStats + workload ratio, Confidence chip, status badges (meaning),
Focus direction panel terms. Mobile: readiness score, training-load/ACWR banner, RPE
inputs, weekly check-in metrics, DevPlayground volume bar.

## Rules

- Never invent CSS variables (CLAUDE.md hard rule); web uses existing Tailwind tokens.
- Tooltip copy is explanatory only — never raw vitals, never coach-visible private data.
- `npm run dev` (mobile) + web typecheck/build must stay green; engine suite untouched.
