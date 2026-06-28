# Engine: primary lifts always run as straight sets — design

**Date:** 2026-06-28
**Branch:** `feat/focused-session-runner`
**Status:** Approved in brainstorm; spec for review before implementation.

This is **Spec C**, a small decision-engine change prompted by a real observation:
the generated "Monday · Upper" session supersetted Spider Curl onto Bench press
(A1/A2). Investigation showed this is by design but compromises the heavy lift.

---

## The problem (why it happens today)

`structureItems` in [allocator.js](../../../packages/engine/src/lib/plan/allocator.js)
splits a session into **primaries** (role `primary`) and everything else, then walks
the primaries in order and drops the first eligible light **"filler"** (an isolation,
or core/calf) into that lift's rest gap, provided they share no muscle (`canPair`).
Bench is the first primary and Spider Curl (role `iso`, biceps) is the first eligible
filler — no shared muscle — so they pair as A1/A2.

The intent (code comment) was to use bench's long rest "without compromising it." But
in the runner the pairing plays out as **Bench → Spider Curl → 20s → Bench…**, so the
heavy 4×5 bench effectively rests only ~the curl + 20s between sets — far short of the
~3 min a strength set needs. Biceps aren't an antagonist of bench's prime movers, so
the curl isn't "free" recovery; it eats into bench's rest. On a strength block this
**does** compromise the primary lift.

## The decision

**Primary compounds always run as straight sets** — no filler is ever supersetted onto
a primary (bench/row/OHP/squat/deadlift). They keep their full prescribed rest.
Accessories still antagonist/non-competing **superset among themselves** (the existing
"remaining accessories" pass), so the time-efficiency that matters is preserved where
it's appropriate — on the lighter work, not the heavy lifts.

Net effect for the example session: Bench, Barbell row, OHP each run solo; Spider Curl
pairs with another accessory (e.g. Floor Press) or runs solo if nothing non-competing
is available.

## The change

**File:** `packages/engine/src/lib/plan/allocator.js`, `structureItems`.

Replace the primary-filler pass:

```js
for (const m of mains) {
  let fi = -1;
  for (let i = 0; i < rest.length; i++) {
    if (!usedRest.has(i) && isFiller(rest[i].ex) && !isSupportive(rest[i]) && canPair(m.ex, rest[i].ex)) { fi = i; break; }
  }
  if (fi >= 0) { usedRest.add(fi); blocks.push([m, rest[fi]]); } else blocks.push([m]);
}
```

with:

```js
// Primary compounds always run as straight sets — never supersetted with a filler —
// so heavy work keeps its full rest. Accessories still pair among themselves below.
for (const m of mains) blocks.push([m]);
```

Then the remaining-accessory pass runs over **all** non-primary picks (since
`usedRest` is now always empty, `rem` = every `rest` pick). Remove the now-unused
`usedRest` set, and the `isFiller` helper if nothing else references it. No other
logic changes — anchor-first ordering, supportive-work-last sequencing, the `restSec
20` on paired accessories, group lettering, and volume are all untouched.

## Why this is low-risk (time budget unchanged)

Session **duration** is computed from `slot.timeUsed`, accumulated during *selection*
via `perSetMin(ex, role)` — which already costs accessory isolations at the compressed
~1.5 min/set regardless of whether `structureItems` actually pairs them. `structureItems`
only *arranges* already-selected picks; it doesn't change which exercises are chosen or
the duration estimate. So removing primary-fillers changes the session's **structure**,
not its selected volume or its `~NN min` estimate.

## Test impact

- **`golden-master.js`** — the snapshot changes for any session where a primary
  previously carried a filler. Regenerate intentionally: `UPDATE=1 node
  tests/golden-master.js`, then eyeball the diff to confirm the only changes are
  primaries un-pairing + accessories re-grouping (no volume / exercise-selection
  changes).
- **`engine-rest-and-rep.js` (T7)** — asserts superset "…2" items have `restSec 20`.
  Still holds (accessory pairs are built the same way) or skips if a sampled session
  has no accessory superset. No change needed.
- **`session-density.js`** — reads duration + working-set counts, both unchanged. No
  change needed.
- All other engine tests untouched (selection/volume logic unchanged).

## Verification

- `node tests/golden-master.js` green after `UPDATE=1` regen; `node tests/engine-rest-and-rep.js`
  and `node tests/session-density.js` green.
- In the running preview: the Upper session shows **Bench, Barbell row, OHP each on
  their own**; Spider Curl no longer sits under Bench (it pairs with an accessory or
  runs solo). `npm run build` clean.

## Non-goals

No change to exercise selection, volume targets, rep/RPE schemes, the primary cap, or
accessory-superset behaviour. Purely how primaries are grouped.

## Commit plan

1. spec (this doc)
2. `structureItems` change + golden-master regen + verify
