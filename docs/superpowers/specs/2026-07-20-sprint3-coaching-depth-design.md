# Sprint 3 — Coaching Depth (Atlas language · positions · equipment)

**Date:** 2026-07-20
**Status:** Design for review
**Scope:** Three workstreams, each of which gets its own implementation plan
and PR. Ordered by risk: A is presentation-only; B and C change engine
behaviour and pause for Simon at PR per the standing charter.

Decisions locked with Simon 2026-07-20:
- **Atlas:** relative framing now; the engine keeps diagnosing against the
  elite SKB bar (demand *scaling* is explicitly out of scope — future,
  separately designed).
- **Equipment:** presets + optional detail checklist (not a mandatory
  exhaustive checklist).

---

## A. Atlas — plain-English limiting factor, framed to your level

### Problem
Atlas shows the engine's raw D4 diagnostic rationale
(`diagnose.js:34–45` → `atlas.js:95–100` verbatim): *"demands maxStrength at
0.9; your level is 0.67 (measured) — gap 0.23…"*. Unreadable, and the elite
"0.9 demanded" reads as a target a 6-month triathlete should hit — demoralising
and wrong as a *message*, even though it's right as a *diagnosis*.

### Design — a plain-English explanation layer (no AI, no diagnosis change)

A new pure renderer, `explainLimitingFactor(lf, model)`, in the app layer
(`apps/mobile/src/lib/`). It consumes the structured fields D4 already emits
(quality, gap, capability source, trainability band, injury/displacement
suffix flags) — **never string-parses the rationale** — and produces:

1. **Headline:** "Your biggest opportunity: maximal strength" (quality names
   from a plain-English glossary map — `metricGlossary.js` already exists for
   this kind of mapping).
2. **What it means, relative to you:** gap size → banded language measured
   against the athlete's own level and training age, not the elite number:
   - small gap → "you're close — this is about sharpening, not rebuilding"
   - moderate → "a real gap for your sport, and very trainable at your stage"
   - large → "the biggest lever you have; expect steady gains for months"
   Trainability (`trainabilityByBand`) picks the encouragement register: high
   trainability = "fast-responding", low = "slow-cooking — consistency wins".
3. **Why it matters for the sport:** one sentence from the quality→sport
   mapping ("rugby carries and scrums are won here").
4. **Numbers demoted, not deleted** (Art 14 — every recommendation
   explainable): a collapsible "How we worked this out" reveals the current
   score, the long-term benchmark labelled as such ("elite benchmark — a
   direction, not this block's target"), and the existing provenance string.

The elite bar never appears as *your target*; the displayed next step is the
priority quality's block-level intent, which the engine already computes (D5).

Content lives as a data table (quality id → phrasing fragments), so when the
AI layer lands (Stage 6, AIGAS) it can *replace the renderer's output* behind
the same seam — the structured inputs are already exactly what an AI
interpreter needs. This is deliberate groundwork for that, per AIGAS: AI
interprets, the engine decides.

### Files
New `apps/mobile/src/lib/atlasLanguage.js` + tests; `atlas.js` /
`Atlas.jsx` consume it; `metricGlossary.js` gains quality entries. **No
engine change.**

---

## B. Positions — wake the dormant SKB position depth

### What exists (verified 2026-07-20)
The SKB already differentiates positions richly (e.g. rugby: front row, back
row, halves, centres, back three — each with `primaryQualities`,
`secondaryQualities`, `gymPriorities`, `commonInjuries`). Onboarding already
collects position, and D4's demand profile already floors the position's
**primary** qualities at importance 0.9 (`demandProfile.js:44`). Dormant:
secondary qualities, position gym priorities, position injury profiles.

### Design — three additive wirings, all data-driven (Art 17)

1. **Secondary qualities → demand profile.** A second floor,
   `SECONDARY_FLOOR = 0.7`, applied the same way as the primary floor
   (`demandProfile.js`): a winger's and a prop's demand profiles now diverge
   beyond their primaries. Evidence tag `skb:<sport>:pos:<position>:secondary`
   so provenance stays auditable.
2. **Position gym priorities → selection nudges (D11).** Each position's
   `gymPriorities` text already encodes pattern emphasis (e.g. front row:
   posterior-chain + neck + trunk stiffness). Encode these as structured
   `priorityPatterns` per position **in the SKB JSON** (data change, not core
   code), consumed as a selection-scoring nudge in D11 — a preference weight,
   never a hard gate (Art 13: this is coaching consensus, not settled science).
3. **Position injuries → prevention selection.** `commonInjuries` per position
   feeds the existing injury-prevention picks the same way sport-level injury
   profiles do today — position-specific prevention (e.g. cervical work for
   front row) outranks generic sport prevention.

Out of scope: position-specific conditioning/energy-system work (engine is
gym-only), position-specific session structures.

### Impact & gates
Changes diagnosis and selection for team-sport users with a position set →
golden-master changes are **expected and meaningful**, audited case-by-case
against "would a good S&C coach agree a prop's plan should differ from a
winger's in exactly this way?". Validated against EDS D4/D10/D11 before
building. **PR pauses for Simon** (coaching-philosophy change).

### Files
`packages/engine/src/lib/performance/demandProfile.js`, D11 selection scoring,
SKB JSONs (structured `priorityPatterns` per position), engine tests.

---

## C. Equipment — best-in-class availability model

### Problem
7 coarse categories (`barbell·dumbbell·machine·cable·bodyweight·band·
kettlebell`); every catalogue exercise carries exactly one. "machine" can't
distinguish a 45° leg press from a horizontal one, or a plate-loaded from a
cable chest press — so selection can't match what's actually in the gym.

### Design — two-tier taxonomy with graceful degradation

**Taxonomy (engine data).** Keep the 7 base categories exactly as-is. Add an
optional refinement: exercises may declare `equipDetail: '<subtype>'`
(e.g. `leg_press_45`, `leg_press_horizontal`, `chest_press_plate`,
`chest_press_selectorised`, `lat_pulldown`, `seated_row_cable`, `leg_curl`,
`leg_extension`, `smith`, `hack_squat`, `cable_stack_dual`, `ghd`,
`hip_thrust_machine`, `calf_raise_machine`, `pullup_bar`, `dip_station`,
`landmine`, `trap_bar`, `safety_bar`, `rings_trx`, `plyo_box`, `sled`,
`resistance_bands` …). The curated "what a lead S&C coach looks for" list
(~30 items, grouped: racks & bars / presses / pulls / lower-body machines /
cables & stacks / conditioning & accessories) is finalised in the
implementation plan and lives as engine data (Art 17).

**Selection rule (engine).**
- User's profile keeps `access` (base categories) and gains optional
  `accessDetail` (subtype list).
- An exercise is available if its base `equip` is in `access`, AND — *only
  when the user has provided detail for that base category* — its
  `equipDetail` (if declared) is in `accessDetail`.
- **Graceful degradation is the load-bearing rule:** no detail provided ⇒
  behaves exactly as today (base category assumed fully equipped). Detail can
  only ever *narrow* selection, never expand it, and never leaves a movement
  pattern uncoverable — validation (D14) checks pattern coverage survives the
  narrowed set and falls back to the base-category pool with a flagged
  substitution if not (Art 15: no silent truncation).

**Onboarding (app).** The equipment step keeps its presets; choosing
full_gym/home_weights adds an optional **"Detail my gym"** expander — the
grouped checklist, all items pre-checked for full_gym (uncheck what you lack),
sensible defaults per preset otherwise. Stored via the existing
`answersToProfilePatch` path. Skipping = today's behaviour.

**Catalogue growth.** Where the app should distinguish variants (45° vs
horizontal leg press), they become separate catalogue entries sharing pattern/
role but differing in `equipDetail` — a data change. Existing generic entries
(e.g. `hack_squat` "Hack / leg-press") get split or tagged in the
implementation plan's catalogue audit.

### Impact & gates
Additive schema on profile + catalogue; with no `accessDetail`, output is
bit-identical to today (golden master unchanged — this is the acceptance
test). New behaviour only for users who provide detail. **PR pauses for
Simon** (public onboarding surface + catalogue split decisions).

### Files
`packages/engine/src/data/strengthExercises.js` (+ new equipment-taxonomy data
file), substitution/selection logic (`substitutions.js`, `strength.js`),
`OnboardingWizard.jsx`, `onboardingModel.js`, engine tests.

---

## Testing & verification (all three)

- A: renderer unit tests (every quality × gap band × trainability band
  produces grammatical, level-relative copy; no raw decimals in the default
  view). Manual Atlas pass.
- B: demand-profile tests (position secondary floor), selection tests (nudge
  changes ranking, never gates), audited golden-master re-baseline.
- C: acceptance test — no `accessDetail` ⇒ golden master unchanged; unit tests
  for narrowing + pattern-coverage fallback; onboarding manual pass.
- `npm test` + `npm run lint` at repo root for each PR.

## Execution & merge policy

Three branches, three PRs, in order A → B → C. A is presentation-only: merge
autonomously if green. B and C **pause for Simon** at PR (coaching philosophy /
public interface, per the 2026-07-03 charter).
