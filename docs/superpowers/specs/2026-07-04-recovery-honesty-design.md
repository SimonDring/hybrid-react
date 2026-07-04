# Recovery honesty — readiness scales intensity, travel graded from knowledge (WP-10)

**Date:** 2026-07-04 · **Status:** approved for build (charter cycle; audit Phase B) ·
**Traces to:** Constitution Art 13/17 · EDS A7/D12 · Blueprint S2/W2 · Phase 3 audit §5 V10, §8 WP-10

## Problem

The platform collects recovery signals and then under-uses them:

1. **`RecoveryOutput.intensityModifier` is a dead seam (≡ 1).** Readiness scales *volume*
   (1 / 0.9 / 0.78 via `recovery.volume_modifiers`) but never *intensity* — a low-readiness
   athlete gets a shorter session at full RPE and full suggested load. Coaching practice and
   the autoregulation literature both say the first thing to give back on a bad day is load,
   not just sets.
2. **The travel rule is an app-side literal.** `PlanService.adaptedPhases` clamps the volume
   multiplier to `0.7` when the travel override fires — a clinical decision living as a magic
   number in the orchestration layer (audit A1/§4.2).
3. ~~Subjective wellness doesn't outweigh objective signals~~ — **stale audit claim.** The
   recovery index already blends 0.6 subjective / 0.4 objective (Saw 2016,
   `readiness.subjective_priority`), and the v2 readiness weighting makes wellness the largest
   component (0.40). This spec only *pins* that with a test; no change needed.

## Key design insight

Suggested weights are already **derived from the prescribed RPE** (`applyWeights`:
`rir = 10 − RPE`, inverse-Epley `%1RM = 1/(1+(reps+rir)/30)`). So the honest, coaching-native
intensity lever is a **target-RPE offset by readiness band** — the kg suggestions then drop
coherently (~3–4%/RPE point) by construction. No string surgery on rendered items, no second
load model, and the athlete sees an honest "RPE 7" instead of a silently mis-calibrated "RPE 8".

## Design

### Knowledge (2 new entries; KA-governed, honestly tagged)

- **`recovery.intensity_policy`** — `{ rpeOffsetByBand: { high: 0, moderate: 0, low: -1 }, rpeFloor: 5 }`.
  Evidence: RPE/RIR autoregulation (Helms et al. 2016/2018) — L4, confidence **moderate**
  (→ authority `soft`: may scale alone, may not force — exactly what an intensity trim is).
  Moderate readiness deliberately keeps offset 0: volume already trims 10% there, and
  double-dipping volume+intensity on a middling day is over-reaction.
- **`recovery.travel_policy`** — `{ volumeCap: 0.7, rpeOffset: -1 }`. The existing 0.7 cap
  relocated with provenance (L5, low) plus the graded piece: a travel "easy" day is also
  *lighter*, not just shorter.

### Contract

`RecoveryOutput` gains **`rpeOffset`** (0 | −1), computed from the readiness band via the KB
entry. `intensityModifier` stays in the shape emitting 1 (documented as superseded by
`rpeOffset`; removal is a later cleanup once no consumer reads it — currently none do).

### Wiring (generation-time, not post-hoc)

- `allocateGym` ctx gains **`rpeOffset`** (default 0). The item builders that stamp
  `rpe: 'RPE n'` (main / power / accessory / core) shift n by the offset, floored at
  `rpeFloor` (5). `applyWeights` then produces the matching lighter suggestions untouched.
  Deload/taper schemes already run lower RPE; the offset still applies (a sick-ish low-readiness
  athlete on a deload week trains even lighter — correct and conservative).
- `PlanService.adaptedPhases` passes `rpeOffset` from the recovery output into the reflow ctx
  (both weeks of the horizon — readiness is a *today* signal and the horizon is ≤ 2 weeks, same
  scope the volume multiplier already has). The travel override reads `recovery.travel_policy`
  for both its volume cap (was the 0.7 literal) and its RPE offset (min with the readiness one,
  never stacking below −1).
- **Train Now** passes the same `rpeOffset` (it already shares `gymCtx`; an on-demand session on
  a low-readiness day should be honest too).
- The **pure generator is untouched** — no `rpeOffset` in its ctx ⇒ byte-identical (golden
  masters + build-parity prove it).

### Explainability

Reflowed weeks that carry a non-zero offset get `week._intensityEased = reason` so the UI can
say "eased — low readiness" (surfacing is WP-30's job; the field makes it possible).

## Behaviour changes (deliberate)

| Scenario | Before | After |
|---|---|---|
| Readiness < 50 (low band) | volume ×0.78, RPE unchanged | volume ×0.78 **and** target RPE −1 (≥ 5), weights follow |
| Travel "easy" override | volume ×0.7 (app literal), RPE unchanged | volume ×0.7 (KB) **and** RPE −1 |
| Readiness moderate/high, illness, deloads | unchanged | unchanged |
| Pure generated plan / build & swim baseline | unchanged | unchanged (byte-identical) |

## Validation

- New `tests/recovery-honesty.js`: low-readiness reflow emits RPE one lower + lighter kg on the
  same items vs high-readiness (same profile, fixed clock); moderate/high byte-identical to
  before; travel easy = cap + offset; rpeFloor respected on deload (never below RPE 5);
  low-subjective/high-objective ⇒ eased plan (pins the Saw blend); golden masters + build-parity
  green with **no re-baseline**.
- Full suite green.

## Out of scope

Readiness scaling *rest times* or exercise selection; illness/travel as graded (0–1) states
rather than flags (needs check-in UX changes); removing `intensityModifier` from the shape;
surfacing the eased badge in UI (WP-30).
