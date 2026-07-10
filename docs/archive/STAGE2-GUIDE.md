# Stage 2 — React migration step-by-step

A complete guide to taking your current vanilla JS PWA and migrating it to React + Vite.
Assumes you're on a MacBook (M-series), already have your v2.0 app deployed on GitHub Pages,
and have completed Stage 1.

**Estimated time: 2 hours for setup + 1–2 hours for any bug fixes the first run reveals.**

---

## What you'll end up with

A new project called `hybrid-react` sitting alongside (not replacing) your existing PWA. The
existing v2.0 keeps working at your current URL. The React version will deploy to a *new* URL
like `https://<yourname>.github.io/hybrid-react/`. Once you've confirmed it works and you're
happy, you can decommission v2.0 (or keep both, your choice).

---

## Part 1 — Get the files onto your Mac

The Claude conversation produced a folder called `hybrid-react` with about 30 files. Download
or AirDrop that folder to your Mac. Move it to `~/Code/hybrid-react/` so it sits next to your
existing project.

In Terminal:

```
ls ~/Code
```

You should see both `hybrid-training` (your v2.0) and `hybrid-react`. If you see just one, the
other isn't where you think it is.

---

## Part 2 — Install dependencies

In Terminal:

```
cd ~/Code/hybrid-react
```

```
npm install
```

This downloads everything `package.json` says is needed (React, React Router, Zustand, Vite,
the PWA plugin). Takes 30–90 seconds. You'll see a `node_modules` folder appear with a few
hundred subfolders. That's normal — that's how npm works.

When done, you should see something like:

```
added 184 packages in 47s
```

There might be a "X moderate severity vulnerabilities" warning. **Ignore it** — those are
warnings about edge cases in development dependencies, not real security issues affecting
your built app.

---

## Part 3 — Run it locally

```
npm run dev
```

After a few seconds, you'll see:

```
  VITE v5.x.x  ready in 312 ms

  ➜  Local:   http://localhost:5173/hybrid-react/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Open `http://localhost:5173/hybrid-react/` in Safari.

### What you'll probably see

**Best case (50% chance):** Everything works perfectly. The app renders, you can navigate, complete sessions, log check-ins.

**More likely (50% chance):** Some errors. The app might:
- Show a blank white page → look at the terminal output for the actual error
- Show some screens but not others → which screen is broken? Check that screen's `.jsx` file
- Have unstyled or oddly styled sections → CSS class mismatch, fixable

Vite has hot reload, so when you fix something and save, the browser updates automatically.
Leave `npm run dev` running while you work.

---

## Part 4 — Common issues and fixes

### Issue: "Cannot find module" error in terminal

Means an import path is wrong somewhere. The terminal output tells you which file. Most often
this is a case-sensitivity issue (Mac is case-insensitive but Vite/Node are case-sensitive).

**Fix:** check the import statement against the actual filename. `import Foo from './foo.js'`
needs the file to be exactly `foo.js`, not `Foo.js`.

### Issue: Blank white page

Open Safari developer tools (right-click → Inspect Element → Console tab). The error there
is the real problem. Common causes:

1. **JSX syntax error** — bad bracket/quote somewhere. Terminal usually shows the file and
   line number too.
2. **Missing import** — using a hook or component that wasn't imported.

### Issue: Screen renders but looks unstyled

CSS class name mismatch. The CSS file expects certain class names (like `.today-card`,
`.phase-tile`) — the JSX files I wrote use the same class names, but I may have got one wrong.

Use Safari's Inspect Element to see what classes are on the element, then check the CSS for
matching rules. Add missing class names where appropriate.

### Issue: Phase list / week list / sessions empty

The Database migration from v3 isn't running (no v3 data exists in the new app's localStorage).
This is actually fine — start fresh. The app should create a default user + plan automatically.
If you don't see this, check the browser console for errors during initial load.

---

## Part 5 — Build for production

When the app works in dev, build the production bundle:

```
npm run build
```

This takes 10–30 seconds and creates a `dist/` folder containing the optimised, minified files
ready for deployment. You'll see output like:

```
✓ 142 modules transformed.
dist/index.html                  0.5 kB
dist/assets/index-AbC123.css   42.1 kB │ gzip:  8.3 kB
dist/assets/index-XyZ789.js   189.4 kB │ gzip: 64.2 kB
...
```

Test the production build locally to make sure it actually works:

```
npm run preview
```

Open the URL it shows (usually `http://localhost:4173/hybrid-react/`). If this works, you're
ready to deploy.

---

## Part 6 — Deploy to GitHub Pages

### Step 6.1 — Create a new repository

The React app deploys to a *separate* repo from your v2.0 PWA. Don't try to merge them.

```
cd ~/Code/hybrid-react
git init
git branch -M main
git add .
git commit -m "Stage 2 — React migration initial"
gh repo create hybrid-react --public --source=. --remote=origin
git push -u origin main
```

### Step 6.2 — Set up the deploy workflow

For Vite apps, GitHub Pages needs a small build step. Create this file:

```
mkdir -p .github/workflows
```

Then create `.github/workflows/deploy.yml` with this content (you can do this from your text
editor — VS Code, or even `nano .github/workflows/deploy.yml`):

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Commit and push:

```
git add .github
git commit -m "Add deploy workflow"
git push
```

### Step 6.3 — Enable Pages in repo settings

In your browser, go to `https://github.com/<yourname>/hybrid-react/settings/pages`.

Under "Build and deployment":
- **Source:** select **GitHub Actions** (not "Deploy from a branch" — this is different
  from your v2.0 setup)

That's it. No branch or folder to pick — the workflow file you just added handles it.

### Step 6.4 — Watch the build

Go to `https://github.com/<yourname>/hybrid-react/actions`. You'll see the workflow running.
Yellow dot → green check (or red X if something failed). Takes 1–2 minutes.

When green, your app is at:

```
https://<yourname>.github.io/hybrid-react/
```

---

## Part 7 — The new update loop

Every future change to the React app:

```
cd ~/Code/hybrid-react
# make changes
npm run dev          # test locally
git add .
git commit -m "describe change"
git push
```

GitHub Actions automatically rebuilds and deploys. No manual `npm run build` needed for
deploys — the workflow runs it.

---

## What about the v2.0 app?

Your existing PWA at `https://<yourname>.github.io/<v2-repo-name>/` keeps working completely
independently. Treat them as two separate apps until you're confident in the React one.

**Decision point — when to retire v2.0:**

After 1–2 weeks of using the React version on your phone with no major issues, you can:
1. Archive or delete the v2.0 repo, OR
2. Keep it as a fallback (small cost, but works)

If you've installed v2.0 on your phone, that PWA stays installed and working even if you
delete the repo (it's cached). To switch to the React version on your phone, visit the new
URL in Safari and "Add to Home Screen" again. You'll have two icons; delete the old one.

---

## Reality check on what's been ported

All 16 screens, the data layer, the navigation, and the state management have been ported.
But:

- **CSS class names** mostly match between v2.0 and the React version, but there will be a
  few mismatches I missed. Things that worked in v2.0 might look slightly off in React. Use
  Safari's Inspect Element to check and add missing classes.

- **The Trends screen Canvas charts** are the most fragile piece. They redraw on data
  changes, but I haven't been able to test them. If charts don't render, check the browser
  console — the most likely problem is the canvas ref not being attached correctly.

- **The Settings → Import/Export** uses a different file-download mechanism than v2.0 (uses
  Blob URLs instead of native browser download API). Should work but worth testing.

- **PWA install behaviour** is handled by `vite-plugin-pwa` instead of your hand-built
  service worker. You no longer control cache versioning manually — the plugin generates
  fresh asset hashes on every build, which is better. The "Update available — Reload"
  toast is also handled by the plugin automatically.

Spend an hour or two clicking through every screen on the first run. Note any bugs. Fix
them as you go. The code is structured to make those fixes easy.

---

## When you hit problems

The most useful debugging skill at this stage: **read the error message**.

When `npm run dev` fails to start, the terminal tells you exactly what's wrong, often with
line numbers.

When the app loads but a screen breaks, open browser dev tools (right-click → Inspect),
look at the Console tab — the error there is the real problem.

If you're truly stuck, copy the **exact** error message into a conversation with me and
I'll fix it. Don't paraphrase — the precise wording matters because it usually contains the
file path and line number.

---

## Stage 2 complete — what comes next

Once the React app is stable and deployed:

- **Stage 3 (Supabase backend, 3–5 weeks):** Replace localStorage with a real database.
  Your `Database.js` is already structured for this — you swap the internal storage calls
  to Supabase SDK calls, the rest of the app doesn't change.

- **Stage 4 (Auth, 1–2 weeks):** Add user accounts so your data syncs across devices.

- **Stage 5 (Claude AI plan generation, 4–6 weeks):** The thing you actually want — being
  able to chat with an AI coach to generate and modify plans. Requires Stage 3 first
  because the API key has to stay server-side.

- **Stage 6 (React Native + App Store, 8–16 weeks):** Convert from PWA to a real iOS app
  in the App Store, with HealthKit integration and push notifications.

When you're ready for any of these, come back and ask. Each stage has its own multi-hour
walkthrough.
