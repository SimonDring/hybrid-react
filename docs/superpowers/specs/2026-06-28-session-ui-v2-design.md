# Session UI v2 — preview re-layout, block colour, primer circuit — design

**Date:** 2026-06-28
**Branch:** `feat/focused-session-runner` (continues the set-by-set runner work)
**Status:** Approved in brainstorm; spec for review before planning.

This is **Spec A** of a two-part iteration on the session experience. Spec B
(rest-timer reliability + lock-screen notifications) is separate — see its own doc.

---

## Plain-language summary

Now that training is set-by-set in the runner, the **session preview** (the screen
you see before tapping Start) is carrying columns it no longer needs. Today it shows
a cramped grid — SETS / REPS / RPE / WEIGHT — that wastes horizontal space and wraps
long exercise names onto three lines, with cue notes stacked underneath. This spec
declutters it and brings the colours in line with the app's current "Midnight" dark
theme.

Five connected changes:

1. **Compact preview rows** — one line per exercise: name + a single prescription
   badge (`4 × 5`). Weight and RPE are removed from the preview (they appear
   set-by-set in the runner). Cue notes are removed from the preview too.
2. **Surround-block colour** — Primer and Main each become a bordered card, not a
   left-rail accent.
3. **Palette correction** — Primer = teal (`--accent`), Main = neutral. Rust is
   removed from the session views (it belongs to the old palette).
4. **Primer as a circuit** — in the runner the primer runs round-by-round
   ("Round 1 of 2 → Round 2 of 2"), all moves listed per round, no per-move rest.
5. **Runner colour cleanup** — the rust I used in the runner (section label,
   set-line, progress bar) moves to the Midnight palette.

No engine, data-layer, or schema changes. Purely presentational + runner flow.

---

## Decisions (from the brainstorm)

| Question | Decision |
| --- | --- |
| Sequence | Spec A (this) first, then Spec B. |
| Block colours | **Option C** — Main neutral, Primer teal. Rust removed. |
| Primer circuit | **One card per round** — tap through Round 1 of N → Round N. |
| Preview columns | Drop weight + RPE (runner-only); show a single prescription badge. |
| Preview cue notes | Removed from the preview; still behind `ⓘ` and shown per-step in the runner. |
| `ⓘ` button | Kept in the compact row (quick form-guide access). |
| Primer rounds N | Derived from the primer moves' set count (2 today). |

## The Midnight palette (the source of truth for colours)

From `:root` in `main.css` (the current dark theme):
- `--accent: #6FD3C4` (teal) — **primary** interactive / positive → used for Primer.
- `--accent-2: #97A6FF` (periwinkle) — secondary data.
- `--accent-warm: #F2C14E` (amber) — tertiary / caution.
- `--bg-surface: #161B24`, `--bg-surface-2: #1B2230`, `--hairline: rgba(255,255,255,0.07)`.
- `--txt-strong`, `--txt-body`, `--txt-muted` for text.
- **`--rust: #e8836f` is legacy** — removed from these views. (`--moss`/`--ochre` still
  exist but `--accent`/`--accent-warm` are the Midnight names; we use `--accent`.)

`.btn-primary` is near-black (`--bg-ink`) with only a rust press-flash — app-wide and
out of scope, left unchanged.

---

## Component 1 — Compact preview rows (SessionDetail)

### Today
The preview groups items by activity type and renders a CSS-grid table per group
(`.gym-table` / `.gt-head` / `.gt-row` with `.gt-cell` columns from
`activityTypes.js`: sets, reps, rpe, weight). On a 375px screen this wraps names and
stacks a `.gt-note` cue under most rows.

### New
A single compact row per exercise — no grid columns:

```
[num]  Exercise name ........................  4 × 5   ⓘ
```

- **Prescription badge** = the item's primary prescription string:
  - strength → `item.sets` (already `"4 × 5"`),
  - run/cycle/swim → `item.distance || item.sets` (e.g. `"5 km"`, `"6 × 400m"`).
  A small helper `prescriptionFor(item)` (reusing the activity registry's notion of
  the emphasis metric) returns this string so mixed sessions still read correctly.
- **No weight, no RPE, no cue note** in the preview.
- Keep: the `num` (P1/A1/…), the exercise name, the `ⓘ` info button, and the
  injury `Rehab`/`Prev` tags (those are status, not clutter).
- New classes (e.g. `.sx-row`, `.sx-name`, `.sx-badge`) replace the per-row grid;
  the activity-type **header row is dropped** (the columns it labelled are gone).

Because activity columns are no longer rendered in the preview, the grouping logic
simplifies to "list the section's items as rows" — activity type only affects the
badge value now, not a column layout.

### Why this is safe
The runner already owns all per-set detail (weight/reps/RPE), so removing those
columns from the preview loses no information — it relocates it to where you act on
it. `parseExercise` / the activity registry stay the single source for parsing.

---

## Component 2 — Surround-block section cards (SessionDetail)

Replace the left-rail treatment (`.session-section { border-left … }`) with a full
bordered card per section:

- **Primer:** `border: 1.5px solid var(--accent)` at ~55% alpha, `background:
  rgba(111,211,196,0.07)` tint, header label "Primer" + sub ("prime the main lifts")
  in `--accent`.
- **Main:** `border: 1px solid var(--hairline-strong)`, `background: var(--bg-surface)`,
  header "Main" in `--txt-muted` (neutral — no accent colour).
- Header label sits inside the card, top-left. The small square colour chip is kept
  for the Primer (teal), dropped for Main (neutral).
- Full borders → rounded corners are fine (the design-system rule against rounded
  corners applies only to single-sided borders).

Implementation: drop the inline `--ss-color` left-border scheme; give each section a
`section-card` class plus a `primer`/`main` modifier carrying the right border/tint.

---

## Component 3 — Primer circuit, round-by-round (SessionRunner)

### Today
`buildSteps` emits one `prep` step per primer move (P1, P2, P3) — you tap Done
through each.

### New
Primer moves collapse into **round steps**. `buildSteps` groups all `section:'primer'`
items into `rounds` (N = max set-count among primer moves, default 2) and emits N
`primerRound` steps:

```
{ kind:'primerRound', round:1, totalRounds:2, moves:[{name, repsLabel}, …] }
```

The runner renders a single card: "Round 1 of 2", each primer move listed with its
per-round target (e.g. "Band pull-apart · 15", "Band face-pull · 15"), and one
button: **Done — round 2** (or **Done — start main** on the last round). No per-move
rest, no `set_logs` writes (primers remain unlogged prep, unchanged from today).

Main (strength) step generation is **unchanged** — per-set steps, steppers,
carry-forward, supersets, rest, logging all stay exactly as built.

Resume logic: unchanged — resume still jumps to the first unlogged **set** step, so
primer rounds are skipped on resume (you've done them), same as today.

---

## Component 4 — Runner colour cleanup (SessionRunner + CSS)

Remove rust from the runner and align with Midnight:

- `--rn-color` (drives the section label, set-line, progress-bar fill) becomes:
  - **teal (`--accent`)** while in primer rounds,
  - **neutral** for main set steps — progress bar uses `--accent` (teal) as the single
    neutral-safe accent for "progress", set-line + section label use `--txt-muted`
    (so the main set view is calm/neutral, matching the neutral Main block).
- Delete the `SECTION_COLOR = { main: rust }` mapping; primer → `--accent`, main →
  neutral.
- The "Skip rest" and "Log set" buttons keep `.btn-primary` (unchanged).

Net: no `--rust` references remain in `SessionRunner.jsx` or the runner CSS.

---

## Files touched

- `apps/mobile/src/screens/SessionDetail.jsx` — compact rows, section cards, drop
  the activity-type column grid + cue notes from the preview, `prescriptionFor` helper.
- `apps/mobile/src/screens/SessionRunner.jsx` — `primerRound` step kind + render,
  colour map → Midnight.
- `apps/mobile/src/styles/main.css` — new `.sx-row`/`.sx-badge`/`.section-card`
  styles; retire `.session-section` left-rail + the rust runner styles.
- (Optional) a tiny `prescriptionFor(item)` in `activityTypes.js` or inline in
  SessionDetail — reuses the registry's emphasis metric.

No changes to: the engine, `PlanService` decoration, `set_logs`/persistence, the
store, or the schema.

---

## Edge cases

- **Mixed-activity sessions** (run/swim items in a gym week): the badge shows the
  activity's prescription (distance/target); the runner already treats non-strength
  main items as a single `done` step — unchanged.
- **Injury-modified sessions:** rehab/prevention items still render as compact rows
  with their tags; rehab items with no parseable sets show their raw prescription.
- **A session with no primer** (no compound match): no Primer card, no primer rounds
  in the runner — straight into Main, as today.
- **Completed-session view:** the same compact rows render read-only (no behavioural
  change from completion state).

## Non-goals

Rest-timer reliability, wake lock, and lock-screen notifications (Spec B). No change
to which exercises/sets are programmed, to logging, or to progression.

## Testing & verification

- `npm run dev`; verify on a **375px** viewport via the preview tools:
  - preview: one-line rows, no name wrapping, no weight/RPE/cue, teal-bordered
    Primer card above a neutral Main card, no rust anywhere.
  - runner: primer runs as Round 1 → Round 2 → first main set; set view shows no rust;
    steppers/log/rest/resume still work.
- Engine tests untouched → `node tests/*.js` green except the pre-existing
  date-dependent `reflow-start-consistency.js`.
- `npm run build` clean.

## Commit plan (small steps)

1. spec (this doc)
2. compact preview rows + `prescriptionFor` (drop columns/notes)
3. surround-block section cards + retire left-rail CSS
4. primer circuit round steps in the runner
5. runner colour cleanup (rust → Midnight)
