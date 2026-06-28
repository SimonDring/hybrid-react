# Engine: region-pure focused days + sensible in-session ordering — design

**Date:** 2026-06-28
**Branch:** `feat/focused-session-runner`
**Status:** Approved direction in brainstorm; spec for review before implementation.

This is **Spec D**, prompted by: "why is Floor Press on the Phase 1 Wk 1 Tuesday
(lower) session, stranded last?"

---

## What was found

The 4-day split is **Upper / Lower / Upper / Lower** ([split.js](../../../packages/engine/src/lib/plan/split.js));
Tuesday is a **Lower** day (groups = lower + core, anchor = squat). Yet the generated
session was:

```
A1 Box squat · B1 Deficit Deadlift · C1 Ab Wheel · D1/D2 Calf/Tibialis · E1 Floor Press
```

Two problems, both confirmed in the engine:

1. **Floor Press (an upper, horizontal-press accessory) leaked onto a lower day.** The
   split's per-day `focus` is only a **soft suppression** in `bestExercise`
   (allocator.js:369 — "the multiplier only ever SUPPRESSES off-focus work, never a
   boost"). It reorders priority but doesn't *exclude*. So once the lower deficits were
   filled and time remained, the still-open weekly chest deficit (chest gets only one
   focused day — Monday; Thursday is vertical press) made Floor Press score high enough
   to be picked. The session title is **content-derived** (`focusLabel` reads realised
   volume), so the stray upper work flipped the label from "Lower" to "Full body".

2. **It rendered last.** `structureItems`' `classRank` keys off `loadClass`, which is
   undefined for nearly every exercise — so compounds, isolation and core all share
   rank 0 and render in *pick order*. Floor Press was the lowest-priority pick (lower
   focus down-weighted it), so it landed at the very end, after core and calves.

Neither is deliberate: the split intends a pure Lower day; the press is spillover and
its position is an artifact.

## The decision

**Both fixes** (chosen in brainstorm):
- **Region-pure focused days** — a single-region day (Upper / Lower / Push / Pull /
  Legs) no longer absorbs opposite-region work; that volume stays on the region's own
  days (or slightly under-shoots in tight base weeks — accepted). Full-body days are
  unchanged.
- **Sensible in-session ordering** — compounds before isolation before core before
  mobility, everywhere.

---

## Change 1 — region-pure focused days

**File:** `packages/engine/src/lib/plan/allocator.js`, `bestExercise`, the
`if (slot.focus)` block (currently ~lines 369–373).

```js
if (slot.focus) {
  let c = 0, inFocus = 0;
  for (const m in contrib) { c += contrib[m]; if ((slot.focus[m] || 0) > 0) inFocus += contrib[m]; }
  // Region-pure focused days: a candidate whose work is ENTIRELY off-focus (e.g. a
  // chest press on a Lower day) is EXCLUDED, not just suppressed — so a focused day
  // stays in its region instead of absorbing cross-region weekly-deficit spillover.
  // A full-body day has every trained muscle in focus, so nothing is ever fully
  // off-focus and nothing is excluded. (Null focus → direct/Train-Now call → no bias.)
  if (c > 0 && inFocus === 0) continue;
  score *= 0.4 + 0.6 * (c > 0 ? inFocus / c : 1);
}
```

That single `continue` is the whole behavioural change. Why it's correctly scoped:
- **Focused days** (4/6/7-day templates, sport push/pull/lower) set a whole region's
  muscle weights to 0 → opposite-region exercises have `inFocus === 0` → excluded.
- **Full-body days** (1–3-day templates, the 5/7-day "Full body" day) weight every
  trained muscle > 0 → no real exercise is fully off-focus → unchanged.
- **Anchors** already filter to in-focus candidates (allocator.js ~550) — unchanged.
- **Core** stays available on focused days (focus includes core), so ab/oblique work
  is not excluded.

No change to `focusLabel`; with region-pure content it naturally returns "Lower" /
"Upper" again, fixing the mislabelled "Full body".

## Change 2 — in-session ordering

**File:** `packages/engine/src/lib/plan/allocator.js`, `structureItems`, `classRank`.

Replace the near-no-op rank with an explicit tier so heavy/compound work always leads:

```js
const classRank = (p) => {
  const ex = p.ex;
  if (ex.loadClass === 'health' || (p.item && p.item.tag === 'mobility')) return 3; // mobility/health last
  if (ex.pattern === 'core' || ex.role === 'core') return 2;                          // core after isolation
  if (ex.role === 'iso') return 1;                                                    // isolation after compounds
  return 0;                                                                            // primary + accessory compounds lead
};
```

Anchor-first ordering and stable-by-pick-order within a tier are unchanged, so
primaries still lead (anchor pulled to front, primaries picked first). Net for the
example Tuesday (post-Change-1, Floor Press gone): `A1 Box squat · B1 Deficit Deadlift
· [Calf/Tibialis superset] · Ab Wheel` — compounds, then calf isolation, then core.

(Note: squat leads because it's the day's anchor; "deadlift first" would be a separate
anchor-preference change and is out of scope here.)

---

## Ripple & risk

- **Weekly volume redistribution.** Removing cross-region spillover means a muscle that
  leaned on a focused day for extra volume (here: chest, via Tuesday) now relies on its
  own region days. The shared weekly deficit still drives selection, so those days pick
  up more of that muscle **if their time budget allows**; in tight base weeks it may
  under-shoot slightly — the accepted trade-off. This is the main thing to watch.
- **`session-density.js`** asserts sessions are substantial (≥12 working sets at the
  optimal day count) and within the ~75-min ceiling. Region-pure days could shorten a
  focused day if in-region deficits are already met. **Run it; if a focused day drops
  below the substance floor, that's a real signal** — revisit (e.g. allow in-region
  MRV-capped filler, or accept a shorter honest session).
- **`golden-master.js`** will change in BOTH selection (focused days lose off-region
  accessories) and ordering. Regenerate (`UPDATE=1`) and verify the diff is only:
  (a) off-region accessories removed from single-region days, (b) re-tiered ordering,
  (c) full-body / sport days unchanged in selection. Capture a before/after of one
  4-day archetype's focused day in the commit message.
- **`engine-rest-and-rep.js` T7** (paired "…2" items get restSec 20) — unaffected.

## Verification

- New focused unit check (extend an existing test or add `tests/region-pure.js`):
  generate the 4-day strength plan; assert **no Lower day contains an upper-pattern
  (hpush/vpush/hpull/vpull) item**, and **no Upper day contains a lower-pattern
  (squat/hinge/lunge/calf) item**; assert within each session, every compound precedes
  every isolation/core item.
- `node tests/*.js` green (golden-master regenerated; density still passes) except the
  pre-existing date-dependent `reflow-start-consistency.js`.
- Live preview: Phase 1 Wk 1 Tuesday shows `Box squat · Deficit Deadlift · Calf/Tib ·
  Ab Wheel` (no Floor Press), titled **Lower**; an Upper day shows no leg work. `npm run
  build` clean.

## Non-goals

No change to weekly volume *targets*, rep/RPE schemes, anchors/priority, the primary
cap, full-body or sport-day composition, or the primer. Anchor ordering preference
(deadlift-vs-squat-first) is out of scope.

## Commit plan

1. spec (this doc)
2. region-pure exclusion + ordering re-tier + region-pure test + golden-master regen
