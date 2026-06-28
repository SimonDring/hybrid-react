# Remove stick-figure demos → video placeholder behind ⓘ — design

**Date:** 2026-06-28
**Branch:** `feat/focused-session-runner`
**Status:** Approved in brainstorm; small UI/data change.

## Summary

The animated stick-figure demos were always a placeholder until real form content
exists, and they aren't adding value. Remove them entirely and replace the demo area
inside the ⓘ exercise guide with a **video area** that's ready for real clips: when an
exercise has a `video`, it plays; until then it shows a static "form video coming soon"
shell. The rest of the ⓘ guide (summary, "How to do it", Look-for / Avoid cues, the
fallback coach's cue) is unchanged — that's the written preview the user wants to keep.

## Decisions

- **Delete the animations** — `components/StickFigureDemo.jsx` and
  `data/exerciseDemos.js` (used only by `ExerciseInfo`).
- **Video area = static "coming soon" shell** (chosen): a 16:9 frame with a film icon,
  "Form video coming soon", and a disabled upload affordance + a note that upload will be
  enabled once content is captured. No file picker yet (no storage exists).
- **Future-ready** — the area first checks `entry.video` (a new optional field on an
  exercise-library entry); if present it renders a `<video controls>`. So when real
  clips are captured, populating `entry.video` lights up the player with no further UI
  work — that's the "upload into the future" path.

## Changes

- **Delete:** `apps/mobile/src/components/StickFigureDemo.jsx`,
  `apps/mobile/src/data/exerciseDemos.js`.
- **`apps/mobile/src/components/ExerciseInfo.jsx`:**
  - Remove the `DEMOS` + `StickFigureDemo` imports.
  - Replace the demo block (the `entry.demo && DEMOS[...]` conditional + the
    stick-figure "ANIMATED DEMO COMING SOON" placeholder) with:
    - `entry?.video` → `<video src={entry.video} controls playsInline style={16:9}>`;
    - else → the static video shell (16:9 `--bg-surface-2` frame, `ti`-style film icon
      built with an inline SVG or a simple glyph, "Form video coming soon", a disabled
      "Upload form video" button, and a muted note "Enabled once we've captured form
      videos"). Theme vars only.
  - Update the component's header comment (demo → video).
- **Leave** the now-unused `demo:` field on `exerciseLibrary` entries (harmless dead
  data; removing it is a large unrelated edit). `entry.demo` is simply no longer read.

## Verification

- `npm run dev` + preview: tap a ⓘ in a session → the sheet shows the written guide with
  a **video "coming soon" shell** (no stick figure); no console errors; nothing imports
  the deleted files (`grep` clean). `npm run build` clean.
- No engine/test impact (UI + dead-data only); `node tests/*.js` unaffected.

## Commit plan

1. spec (this doc)
2. delete stick-figure files + swap ExerciseInfo demo block for the video shell
