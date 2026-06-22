# performance-os

A monorepo for the Performance OS product — a dynamic, personalised training
platform. Managed with **npm workspaces** (one `node_modules` hoisted at the root,
one lockfile at the root).

> Note: the git repository is still named `hybrid-react` and the player app still
> deploys to GitHub Pages at `/hybrid-react/`. The `performance-os` name is the
> monorepo's identity; renaming the repo/URL is a separate, future decision.

## Layout

```
apps/
  mobile/    Player-facing app — React 18 + Vite PWA (the current shipping app).
             Contains the deterministic decision engine in src/lib/ (for now).
  web/       PLACEHOLDER — future Next.js marketing site + coach dashboard. Not built yet.

packages/
  shared/    PLACEHOLDER — shared types / utils / status logic. Empty for now.
  engine/    PLACEHOLDER — reserved slot for the decision / programming / recommendation
             engine once it is extracted out of apps/mobile/src/lib/. Empty for now.

supabase/    Shared backend — migrations, edge functions, schema.sql, config.toml.
             Used by apps/mobile today and by apps/web in future.

docs/        Product, strategy, prompts, and engineering docs.
```

## Getting started

```bash
npm install          # installs every workspace, hoisted to the root node_modules
npm run dev          # runs the mobile app (delegates to: npm run dev -w hybrid-react)
npm run build        # builds the mobile app into apps/mobile/dist
npm run test         # runs the mobile app's engine tests
```

You can also target a workspace directly, e.g. `npm run dev -w hybrid-react`.

## Backend keys

The mobile app's secrets live in `apps/mobile/.env.local` (gitignored). Vite loads
env files from the app directory, so they must sit next to `apps/mobile/vite.config.js`.

## Deployment

`apps/mobile` deploys to GitHub Pages via `.github/workflows/deploy.yml` on push to
`main`: `npm ci` installs all workspaces, `npm run build` builds the mobile app, and
the `apps/mobile/dist` artifact is published.
