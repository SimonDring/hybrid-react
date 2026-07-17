# D6 flip design — and why "steer selection by intervention-class" is the wrong flip

**Status: DESIGN / RECOMMENDATION — for Simon · 2026-07-16 · no code**
**Context: D6 `Strategy` shipped as a PARALLEL v0 (#211). "Flip it live" = let it actually steer the
plan. I investigated the selection chain before designing the wiring, and the honest finding is that
the obvious flip would deliver ~nothing. This doc shows why, and what (if anything) is worth doing.**

## 1. What "flip D6 live" would naively mean

Let the D6 `Strategy`'s per-quality **intervention class** (maxStrength→heavy-compound,
robustness→heavy-slow-resistance, reactiveStrength→plyometric-ssc, …) **steer exercise selection** —
so a robustness block biases toward HSR, a reactive block toward plyometrics, etc.

## 2. Why that flip is redundant — the evidence

I traced the live D9→D10→D11 selection path:

- **Selection scores by QUALITY TAG, not by class or force-velocity.** `selectInterventions`'
  `tierOf` + `valueOf` rank an exercise by `trainsTarget(ex, targetQuality)` — *does this exercise
  train the priority quality* (its S5 quality tag) — plus compound-ness, sport-tags, and the SKB
  per-movement transfer rating. That is the whole selection economy.
- **The intervention class is 1:1 with the quality.** `interventionClassFor('maxStrength')` →
  `heavy-compound` is just another name for "the maxStrength exercises." Selecting "exercises whose
  committed class is heavy-compound" picks the **exact same set** as today's "exercises tagged
  maxStrength." The class adds no new discriminator.
- **`forceVelocity` / `contraction` (from `qualityMovementMap`) are computed but UNUSED in
  selection.** `deriveMovementRequirements` emits them; `selectInterventions` never reads them
  (verified: zero references). So even the finer signal the class approximates isn't in the scoring.
- **No exercise carries an `interventionClass` tag** (0 in the catalogue).

**Conclusion:** wiring the class into selection is either a **no-op** (it agrees with the quality tag
→ byte-identical, nothing "flipped") or a **contrived override** (make it disagree with the quality
tag on purpose) — which would move plans with *no coaching rationale behind the move*. Neither is a
real flip. The quality diagnosis already steers selection; D6's class is a **name for what's already
happening**, not a new lever.

## 3. What D6's Strategy is actually FOR (and already delivers as v0)

- **The typed home** for the develop/maintain sequence + concurrency model + sequencing/interference
  rules — one inspectable object instead of scattered fragments (audit 03 §1's macro-strategy gap).
- **The object D8 + Stage-7 endurance consume** — the concurrency model is exactly where the
  strength↔endurance interference trade will be made when endurance is built (🔒 10).
- **The intervention-class knowledge** — genuinely useful as *documentation-as-data* (a scientist can
  read the committed modality per quality), which it now is, in a governed table.

All three are already true from the #211 v0. **D6 does not need a "flip" to serve its purpose** — its
purpose is to be the typed strategy layer, not a new selection steer.

## 4. The one genuine (but separate) opportunity — and it isn't a "D6 flip"

Selection ignores `forceVelocity`/`contraction`. There *is* a real question worth asking: **should
selection prefer, within a quality's exercises, the ones whose force-velocity profile best matches
the target?** (e.g. within maxStrength, favour grinding compounds over speed-biased ones.) That would
be a genuine refinement — but:
- it is a change to **M-SESS selection scoring using the movement-map**, not to D6's Strategy;
- it needs an **evidence basis** per quality (the map is `seed`, `needsReview`), i.e. a science pass;
- it **moves plans** for real athletes → a scoped, audited re-baseline + your coaching sign-off.

It should be evaluated on its own merits as a selection-refinement work item, NOT smuggled in as
"turning D6 on."

## 5. Recommendation

- **Do NOT flip D6 to steer selection by intervention-class.** It's redundant; the only way to make
  it visible is to make it wrong.
- **Keep D6 `Strategy` as the typed v0 it is** — it already serves its real role (typed macro-strategy;
  D8/endurance input; governed class knowledge). No plan change, no risk.
- **If you want selection to genuinely sharpen,** that's the **force-velocity-aware selection**
  refinement (§4) — a separate, evidence-gated, audited change I can design and cost on its own. It's
  where real plan improvement lives; the D6 class flip is not.

I wrote this instead of wiring a flip because the wiring would have handed you moved goldens with no
coaching reason behind the movement — the opposite of what the engine is supposed to guarantee
(Art 14: every recommendation explainable). Happy to spec the §4 refinement if that's the direction.
