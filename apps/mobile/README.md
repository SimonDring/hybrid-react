# @performance-os/mobile — the player app

React 18 + Vite PWA. This is the **Individual package** of Performance OS (one
person onboards and gets a tailored, periodised gym plan) and the **player
surface** of the Team package — players in a team get exactly the same app.

## Run it

From the **repo root** (npm workspaces — one hoisted `node_modules`):

```bash
npm install
npm run dev        # delegates to this workspace; open http://localhost:5173/hybrid-react/
npm run build      # builds into apps/mobile/dist
```

Deploys to GitHub Pages automatically via `.github/workflows/deploy.yml` on push
to `main`. Secrets live in `apps/mobile/.env.local` (gitignored, next to
`vite.config.js`).

## Where things live

```
src/
  screens/       one file per screen (~25, plus auth/)
  components/    shared shell (TopBar, TabBar, ScreenContainer) + ui/ primitives
  lib/           data + runtime layer: SyncService.js (ALL writes — Supabase
                 primary, localStorage cache/offline fallback), Database.js,
                 Storage.js, supabaseClient.js, PlanService.js (wraps the
                 engine + runs the adaptive weekly reflow)
  stores/        Zustand: trainingStore.js (app data), authStore.js (auth)
  data/          app-side tables: activityTypes, strengthStandards,
                 exerciseLibrary (form guide), athletePillars, providers, sports/
  styles/        main.css — the dark-only "Midnight" design system
```

The **pure decision engine is not in this app** — it lives in
`packages/engine` (`@performance-os/engine`) and is consumed as a workspace
dependency. `PlanService.js` is the runtime wrapper around it.

Data flow: screens → trainingStore → SyncService → Supabase (primary), with
localStorage as the instant-read cache. Never write to Database.js directly
from a screen.

## Docs

- Repo-root `CLAUDE.md` — the working guide (rules, structure, data flow)
- `HANDOFF.md` — current state of play
- `docs/DOCUMENTATION-INDEX.md` — master map of all documentation

The original Stage-2 migration walkthrough this app grew from is archived at
`docs/archive/STAGE2-GUIDE.md`.
