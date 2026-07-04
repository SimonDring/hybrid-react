# Dose by quality — D11 sessions dosed from their target quality (WP-21)

**Date:** 2026-07-04 · **Status:** approved for build (charter cycle) ·
**Traces to:** EDS D12 (volume as OUTPUT of the dose decision) · Blueprint W6 · Phase 3 audit §8 WP-21 ·
H9 seed-evidence review C6/C7/C8 (docs/engine/06 §5.1)

## Problem

Every D11 session — whatever its diagnosed purpose — doses from the single `sportSupport`
composite (`3×5 @ RPE 7` mains in base, etc.). A session whose objective is *tendon
robustness* prescribes the same reps/RPE as one building *explosive strength*; a
sprint-discipline runner and a marathoner get identical prescriptions on the same
exercises. D9 already names each session's target quality; D12 should dose from it.

## Design

### Knowledge (doseSchemes.js — extending WP-14's module)

`doseForQuality(quality, intent, {deload, taper})` → the quality's scheme block, or
`null` when the quality has no block (caller falls back to the style bridge). Reuses the
existing `maxStrength` / `hypertrophy` / `strengthEndurance` blocks; adds:

- **`robustness`** — heavy-slow-resistance per the H9 review's C6 (Kongsgaard 2009;
  Beyer 2015 HSR ≥ eccentric for tendinopathy): 6–10 reps, heavy, `mainNote` carries the
  tempo cue ("3 s down, 3 s up — heavy, tendon-loading tempo"). base `3×8@7` → build
  `4×8@7→8` → peak `4×6@8`; deload `2×8@6`; taper `2×6@8`.
- **`explosiveStrength`** — strength-speed, low-rep, sub-max RPE (Haff & Nimphius 2012):
  base `4×3@7` → build `5×3@7→8` → peak `4×2@8`; deload `2×3@6`; taper `3×2@8`.
  Power-quality exercises (jumps/cleans) still take `POWER_DOSE` — unchanged.
- **`reactiveStrength`** — mirrors power dosing for its non-power work (base `4×4@7`,
  acc `3×8@6`…), plus **`REACTIVE_LIMITS.footContacts`** = `{beginner 80, intermediate
  100, advanced 120}` per session (C7 — de Villarreal 2009). The 48–72 h spacing part of
  C7 is D13 scheduling — out of scope here, noted for the scheduler.

C6/C7 blocks are tagged **reviewed** (evidence per the H9 doc), not seed.

### Wiring (allocator D11 branch only)

Each D11 slot gets `slot.scheme = doseForQuality(targetQuality, …) || s` (the session's
style-bridged scheme as fallback — e.g. a sportSupport session whose target has no
block). `place()`/`makePick`/the D11 fallback anchor read `slot.scheme || s`; `makeItem`
honours an optional `mainNote` on the scheme (falls back to the existing
deload/taper/progression note). The **foot-contact ceiling** trims reactive sets at
placement: running total of `sets × reps` across power-quality items; a pick that would
exceed the level's ceiling has its sets reduced (min 2) or is skipped.

Everything outside the D11 branch is untouched: **build, swim, and the legacy fill dose
exactly as before** (they never had a target quality). WP-10's readiness `rpeOffset`
applies downstream in `finaliseSlot` → quality-dosed items scale on low-readiness days
like everything else.

### C8 (hypertrophy dose corrections) — partially deferred, deliberately

`qualities.js` `hypertrophy.doseResponse` text widens per Schoenfeld 2017/2016 (load
~30–85% near-failure; rest ≥2 min) — informational surfaces only (D9 intensity-zone
strings). The **rest-floor change for build accessories is NOT applied**: it would move
build plans, and build stays byte-identical until its own deliberate flip (WP-22/23).
Recorded there.

## Behaviour changes (deliberate; run/cycle only)

| Session target | Before (sportSupport) | After |
|---|---|---|
| robustness (marathoner durability day) | mains `3×5 @ RPE 7` | HSR `3×8 @ RPE 7` + tempo cue |
| explosiveStrength (sprinter strength day) | `3×5 @ RPE 7` | `4×3 @ RPE 7` (strength-speed) |
| maxStrength (via re-target/cycle) | `3×5 @ RPE 7` | `4×5 @ RPE 7` (the true maxStrength block) |
| reactive session (pogo day) | power items already `4×4@7/150s` | same + foot-contact ceiling |
| build / swim / legacy paths | unchanged | unchanged (byte-identical) |

## Validation

- **Nature-of-change gate (the audit's acceptance):** a sprint-discipline runner's
  strength mains are low-rep (≤5) while a long-distance runner's robustness mains are
  6–10 rep HSR with the tempo cue — the two archetypes provably dose differently.
- Foot contacts per reactive session ≤ the level ceiling (and >0 — pogo day intact).
- Deload/taper still override per quality block; readiness offset still applies.
- `build-parity` + swim archetypes byte-identical; run/cycle golden re-baseline audited
  key-by-key. Full suite green.

## Out of scope

Plyometric 48–72 h spacing (D13); the build rest floor (build flip); per-exercise %1RM
prescription (the RPE→load coupling already handles it); C3/C9 movement-map corrections
(separate change).
