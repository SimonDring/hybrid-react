# Sprint 3 — Coaching Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (A) Atlas limiting-factor panel in plain English framed to the athlete's level; (B) wake the SKB's dormant position depth (secondary qualities, gym priorities, position injuries); (C) two-tier equipment taxonomy with an optional "Detail my gym" onboarding step.

**Architecture:** A is app-only presentation. B and C change engine behaviour — B's golden-master deltas are expected and audited; C must be bit-identical when no detail is provided. Spec: `docs/superpowers/specs/2026-07-20-sprint3-coaching-depth-design.md`. Decisions locked with Simon 2026-07-20: relative framing only (no demand scaling); presets + optional detail checklist.

**Tech Stack:** packages/engine (pure, data-driven per Art 17), apps/mobile. Tests in `apps/mobile/tests/` (they cover the engine too; golden master in `tests/__snapshots__`).

## Global Constraints

- Sprint 1 & 2 constraints all apply (theme vars, store writes, test+lint green per commit, app runs, no merge/push to main).
- **Worktree engine resolution (known trap):** this worktree resolves `@performance-os/engine` through the MAIN checkout unless fixed. Before ANY engine work: run `npm install` at the worktree root (or symlink `node_modules/@performance-os/engine` → `packages/engine`); `npm test` fails loudly if wrong — do not proceed past that failure.
- Engine purity: no clock, randomness, or I/O in plan generation. Knowledge is data (`packages/engine/src/data/`), not code constants.
- Frozen docs (EDS, Constitution, etc.) are never edited. Validate B against EDS D4/D10/D11 before building; log any tension in the PR description, not in the specs.
- Golden-master re-baseline (`UPDATE=1`) only where this plan says so, audited key-by-key in the commit message.
- Nudges never gate (Art 13): B's selection changes are score adjustments; a position must never make an exercise impossible.
- **Order: A → B → C**, committed separately. B and C are pause-for-Simon at PR time.

---

## Part A — Atlas plain-English limiting factor

### Task A1: `atlasLanguage.js` renderer — TDD

**Files:**
- Create: `apps/mobile/src/lib/atlasLanguage.js`
- Test: `apps/mobile/tests/atlas-language.js`

**Interfaces:**
- Consumes: a D4 limiting-factor object `{ qualityId, magnitude, demandImportance, capabilityLevel, confidence, trainability, injuryRisk, rationale }` (shape: `packages/engine/src/lib/performance/diagnose.js:46`) + sport label.
- Produces: `explainFocus(lf, { sportLabel }) → { headline, meaning, whyItMatters, detail }` — all strings; `detail` is the technical breakdown for the collapsible.

- [ ] **Step 1: Write the failing test** `apps/mobile/tests/atlas-language.js`:

```js
import { explainFocus } from '../src/lib/atlasLanguage.js';

const lf = { qualityId: 'maxStrength', magnitude: 0.12, demandImportance: 0.9,
  capabilityLevel: 0.67, confidence: 'moderate', trainability: 0.6, injuryRisk: 1,
  rationale: 'demands maxStrength at 0.9; your level is 0.67 (measured) — gap 0.23.' };
const out = explainFocus(lf, { sportLabel: 'Rugby' });

// assert: out.headline includes 'strength' and NO decimals (regex /\d\.\d/ fails to match)
// assert: out.meaning is a non-empty sentence, mentions neither '0.9' nor 'demandImportance'
// assert: out.whyItMatters mentions the sport ('Rugby' or 'rugby')
// assert: out.detail CONTAINS the raw numbers (67, 90) and the words 'long-term benchmark'
// gap banding: gap ≤ 0.08 → meaning includes 'close'; 0.08–0.25 → 'trainable'; > 0.25 → 'biggest lever'
// trainability register: ≥ 0.8 → 'fast'; ≤ 0.5 → 'consisten' (consistency/consistent)
// met demand (capabilityLevel ≥ demandImportance) → headline is a 'maintain' framing
// unknown qualityId falls back to the id as label without throwing
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement.** Content is a data table + small pure functions (so the Stage-6 AI seam can later replace the renderer behind the same inputs):

```js
/**
 * atlasLanguage — plain-English rendering of the engine's D4 limiting factor.
 * The engine's diagnosis is unchanged and un-softened (Art 14: the numbers stay
 * available in `detail`); this layer changes the REGISTER: gaps are framed against
 * the athlete's own trajectory, and the elite SKB bar is presented as a long-term
 * benchmark, never as this block's target (Simon's call, 2026-07-20 — relative
 * framing now, demand scaling is a separately-designed future change).
 */
import { QUALITY_LABELS } from './atlas.js';

// quality id → why it matters, per register. Extend as qualities appear in SKBs.
const WHY = {
  maxStrength: (sport) => `${sport} is won in the moments where you have to produce force — this is the base under all of them.`,
  explosiveStrength: (sport) => `The first step, the jump, the hit — ${sport} pays for power delivered fast.`,
  reactiveStrength: (sport) => `Every bounce, cut and landing in ${sport} runs through this spring.`,
  strengthEndurance: (sport) => `${sport} asks you to repeat efforts when you're tired — this is what keeps quality up late on.`,
  aerobicCapacity: (sport) => `The engine that lets you do it again, all game, all season.`,
  anaerobicCapacity: (sport) => `${sport}'s hardest minutes are paid for here.`,
  hypertrophy: () => `More muscle is the raw material the other qualities are built from.`,
  mobility: () => `Range you don't have is range you can't load — mobility unlocks the rest.`,
  stability: () => `Control is what lets you express strength safely at speed.`,
  robustness: () => `The quality that keeps you on the pitch while others rehab.`,
};

const label = (id) => (QUALITY_LABELS[id] || id);

export function explainFocus(lf, { sportLabel = 'your sport' } = {}) {
  const gap = Math.max(0, lf.demandImportance - lf.capabilityLevel);
  const met = gap <= 0;
  const l = label(lf.qualityId).toLowerCase();

  const headline = met
    ? `Strong where it counts: ${l} — keep it topped up`
    : `Your biggest opportunity: ${l}`;

  let meaning;
  if (met) meaning = `You already meet what ${sportLabel} asks of your ${l}. The job now is maintaining it while you build elsewhere.`;
  else if (gap <= 0.08) meaning = `You're close — this is about sharpening what you have, not rebuilding it.`;
  else if (gap <= 0.25) meaning = `There's a real gap here for ${sportLabel}, and it's very trainable from where you are.`;
  else meaning = `This is the biggest lever you have. Closing it will move everything else — expect steady gains for months, not weeks.`;
  if (!met) {
    if (lf.trainability >= 0.8) meaning += ` You're at a stage where this quality responds fast.`;
    else if (lf.trainability <= 0.5) meaning += ` At your training age it builds slowly — consistency wins, not intensity spikes.`;
  }
  if (!met && lf.injuryRisk > 1) meaning += ` Your injury history makes this one worth extra respect.`;

  const whyItMatters = (WHY[lf.qualityId] || (() => `It's one of the qualities ${sportLabel} demands most.`))(sportLabel);

  const pct = (x) => Math.round(Math.max(0, Math.min(1, x)) * 100);
  const detail = `Current level ${pct(lf.capabilityLevel)} (${lf.confidence} confidence) against a long-term benchmark of ${pct(lf.demandImportance)} — the elite profile for ${sportLabel}, a direction of travel, not this block's target. Engine diagnosis: ${lf.rationale}`;

  return { headline, meaning, whyItMatters, detail };
}
```

- [ ] **Step 4: Run tests — pass** (`npm test && npm run lint`).

- [ ] **Step 5: Commit.**

```bash
git add apps/mobile/src/lib/atlasLanguage.js apps/mobile/tests/atlas-language.js
git commit -m "feat(atlas): plain-English limiting-factor renderer, framed to the athlete's level"
```

### Task A2: Wire into the Atlas screen

**Files:**
- Modify: `apps/mobile/src/lib/atlas.js` (focus assembly, lines 95–100)
- Modify: `apps/mobile/src/screens/Atlas.jsx` (focus panel, lines 61–67)
- Modify: `apps/mobile/src/styles/main.css`

**Interfaces:**
- Consumes: `explainFocus` (A1). `computeAtlas`'s `focus` gains `{ headline, meaning, whyItMatters, detail }`; keeps `id/label/score/demand` for anything else reading it.

- [ ] **Step 1:** In `atlas.js`, pass the WHOLE `lf` through: extend the `focus` object with `...explainFocus(lf, { sportLabel: sportLabel(profile) })` (compute `sportLabel(profile)` once above). Keep `why: lf.rationale` for back-compat (check importers: `grep -rn "focus.why" apps/mobile/src`).

- [ ] **Step 2:** In `Atlas.jsx`, replace the focus panel (61–67) with:

```jsx
      {atlas.focus && (
        <div className="atlas-focus">
          <div className="af-eyebrow">Your focus</div>
          <div className="af-title">{atlas.focus.headline}</div>
          <div className="af-why">{atlas.focus.meaning}</div>
          <div className="af-why" style={{ marginTop: 6 }}>{atlas.focus.whyItMatters}</div>
          <FocusDetail text={atlas.focus.detail} />
        </div>
      )}
```

with a small in-file disclosure component:

```jsx
function FocusDetail({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 8 }}>
      <button className="btn-text" style={{ padding: 0, fontSize: 12 }} onClick={() => setOpen(o => !o)}>
        {open ? 'Hide the numbers ▲' : 'How we worked this out ▼'}
      </button>
      {open && <div className="af-detail">{text}</div>}
    </div>
  );
}
```

(add `import { useState } from 'react';` and a muted `.af-detail` rule: `font-size: 12px; color: var(--txt-muted); line-height: 1.55; margin-top: 6px;`).

- [ ] **Step 3:** Manual pass (`npm run dev` → Atlas): headline/meaning/why in plain English, zero decimals visible until "How we worked this out" is opened; the `X vs Y demanded` title is gone.

- [ ] **Step 4:** `npm test && npm run lint` → pass (fix the `atlas-and-coachnote.js` test if it asserts on the old focus shape — extend its assertions, don't weaken them). Commit:

```bash
git add apps/mobile/src/lib/atlas.js apps/mobile/src/screens/Atlas.jsx apps/mobile/src/styles/main.css
git commit -m "feat(atlas): focus panel speaks plain English; raw diagnosis demoted to a disclosure"
```

---

## Part B — Position depth (engine; pause-for-Simon at PR)

**Setup step (once):** verify the worktree engine-resolution guard passes (`npm test` — the runner fails loudly if the worktree's engine isn't the one under test; fix per Global Constraints before continuing).

### Task B1: Secondary-quality floor in the demand profile — TDD

**Files:**
- Modify: `packages/engine/src/lib/performance/demandProfile.js` (walkDemands, lines 34–46)
- Test: `apps/mobile/tests/demand-position-secondary.js`

**Interfaces:**
- Produces: positions' `secondaryQualities` floored at `SECONDARY_FLOOR = 0.7`, evidence `skb:<sport>:pos:<position>:secondary`. `buildDemandProfile` signature unchanged.

- [ ] **Step 1: Failing test** (`apps/mobile/tests/demand-position-secondary.js`): using `buildDemandProfile('rugby', 'Front row (props & hooker)')` — assert a quality that appears ONLY in that position's `secondaryQualities` (read `packages/engine/src/data/sport-knowledge/rugby.json` to pick one that maps via `mapSkbQuality` — e.g. `strengthEndurance` or `explosivePower`→`explosiveStrength`; verify the mapping in `packages/engine/src/data/sportQualityMap.js` first) reaches importance ≥ 0.7 with evidence suffix `:secondary`; assert a primary quality still floors at 0.9 (primary floor wins where both list the same quality); assert `buildDemandProfile('rugby', null)` is unchanged from before (no position → no floors).

- [ ] **Step 2: Run — fail.**

- [ ] **Step 3: Implement** in `walkDemands` after the primary loop (line 46), same pattern, secondary floor applied ONLY where it raises (and never above an existing ≥0.7 or the primary floor):

```js
  const SECONDARY_FLOOR = 0.7;  // module-level const next to PRIMARY_FLOOR
  if (pos && Array.isArray(pos.secondaryQualities)) {
    for (const skbName of pos.secondaryQualities) {
      const pm = mapSkbQuality(skbName);
      const side = pm ? projected : dropped;
      const key = pm || skbName;
      const cur = side.get(key);
      if (!cur || cur.importance < SECONDARY_FLOOR) side.set(key, { importance: SECONDARY_FLOOR, evidence: `skb:${sportId}:pos:${positionId}:secondary` });
    }
  }
```

Place it BEFORE the primary loop or guard the order so a quality in both lists ends at the primary floor (0.9): simplest is secondary loop first, primary loop second (primary overwrites upward). Update the file header comment accordingly.

- [ ] **Step 4: Tests.** New test passes. Run `npm test`: golden-master deltas will appear for positioned team-sport archetypes only — audit each changed key: it must trace to a secondary quality of that fixture's position (diagnosis rows, possibly priorities/sessions downstream). Re-baseline with `UPDATE=1 npm test` ONLY after the audit; paste the per-archetype audit into the commit message. Build/no-position archetypes must be byte-identical — if they moved, stop and debug.

- [ ] **Step 5: Commit** (`feat(engine): position secondaryQualities floor the demand profile at 0.7 — props and wingers now diverge beyond their primaries`).

### Task B2: Position gym priorities → D11 selection nudge (data-driven)

**Files:**
- Modify: SKB JSONs (`packages/engine/src/data/sport-knowledge/*.json`) — team sports with positions: rugby, soccer, gaelic_football, hurling, field_hockey
- Modify: the D11 selection scorer — locate via `packages/engine/src/lib/plan/selectInterventions.js` and `packages/engine/src/data/selectionScoring.js` (read both first; follow the existing force-velocity-nudge pattern noted in the knowledge log — it's the template for "small soft re-ordering, bounded by quality tier")
- Modify: `packages/engine/src/lib/knowledge/entries.js` (KNOWLEDGE_SET_VERSION bump + changelog line — follow the exact format of the existing entries)
- Test: `apps/mobile/tests/position-priority-patterns.js`

**Interfaces:**
- Produces: each position may declare `priorityPatterns: ['hinge', 'squat', 'core', …]` (catalogue pattern vocabulary — the `pattern` values in `strengthExercises.js:15`); D11 adds a governed nudge weight `SELECTION_SCORING.positionPatternWeight` (seed 0.1, conservative) preferring matching-pattern exercises within a quality's candidates.

- [ ] **Step 1: Author the data.** For each position in the five team-sport SKBs, derive `priorityPatterns` from its existing `gymPriorities` prose (e.g. rugby front row: `['hinge', 'squat', 'core']` from "posterior-chain + squat strength… trunk stiffness"). Keep 2–4 patterns per position, only patterns the catalogue vocabulary has. This is authored coaching knowledge — write it as a coach, and record the derivation (prose → patterns) in the commit message for review.

- [ ] **Step 2: Failing test:** with a rugby front-row profile, generation selects at least one hinge-pattern main exercise more often/rankier than the same profile with a back-three position (assert on selection ordering or chosen ids — read how existing D11 tests assert, e.g. `apps/mobile/tests/d11-*.js`, and follow that pattern). Also assert: no exercise becomes UNAVAILABLE by position (nudge, not gate) — the candidate pool sizes are identical.

- [ ] **Step 3: Implement** the nudge in the D11 scorer following the force-velocity template: a small additive score for candidates whose `pattern` is in the position's `priorityPatterns`, weight from `SELECTION_SCORING.positionPatternWeight`. The position comes from the profile's athlete model (`sportingContext.position`); resolve its SKB entry via `SKB.section(sportId, 'positions')`.

- [ ] **Step 4: KSV bump** in `entries.js` (minor version; changelog line explains the new governed weight + data, expected plan delta: positioned team-sport archetypes only).

- [ ] **Step 5: Tests + audited re-baseline** (same discipline as B1: positioned archetypes only may move; audit each; `UPDATE=1` after audit). Commit.

### Task B3: Position injuries → prevention selection

**Files:**
- Locate first: how sport-level `injuryProfile`/prevention picks work today — `grep -rn "injuryPreventionLibrary\|prevention" packages/engine/src/lib | grep -v test`, read the module that selects prevention exercises.
- Modify: that module + test `apps/mobile/tests/position-prevention.js`.

**Interfaces:**
- Produces: when a position is set and its `commonInjuries` regions map onto the sport's prevention library, position-relevant prevention entries rank first (again a preference, not a gate).

- [ ] **Step 1:** Read the prevention-selection path; write a short note in the task commit describing where it ranks candidates.
- [ ] **Step 2: Failing test:** front row (cervical/shoulder/lumbar in `commonInjuries`) ranks neck/shoulder prevention ahead of the sport-generic pick; a positionless rugby profile is byte-identical to today.
- [ ] **Step 3: Implement** the re-rank (region match against the position's `commonInjuries` text — prefer a structured mapping if the SKB schema has one; if matching prose is required, add a `commonInjuryRegions: [...]` structured field to the positions in the SKB instead of parsing prose, and author it alongside).
- [ ] **Step 4:** Tests + audited re-baseline (positioned archetypes only) + KSV bump if data changed. Commit.

---

## Part C — Equipment taxonomy (engine + onboarding; pause-for-Simon at PR)

### Task C1: Taxonomy data + availability rule — TDD

**Files:**
- Create: `packages/engine/src/data/equipmentTaxonomy.js`
- Modify: `packages/engine/src/data/strengthExercises.js` (`availableEquip`, lines 208–215; per-exercise `equipDetail` tags where variants matter)
- Modify: `packages/engine/index.js` (export the taxonomy)
- Modify: `packages/engine/src/lib/knowledge/entries.js` (KSV bump)
- Test: `apps/mobile/tests/equipment-detail.js`

**Interfaces:**
- Produces: `EQUIPMENT_TAXONOMY` — `{ group: string, items: [{ key, label, base: '<one of the 7 base categories>', defaultFor: ['full_gym'|'home_weights'|...] }] }[]`; `availableEquipDetailed(access, accessDetail)` → `{ base: Set, detail: Set|null }`; exercise availability helper `exerciseAvailable(ex, avail)`.

- [ ] **Step 1: Author the taxonomy** (the "lead S&C coach's gym walkthrough" — curated ~30 items, grouped). Seed list (adjust labels while authoring, keys are stable):

```js
// Groups: Racks & bars | Presses | Pulls | Lower-body machines | Cables & stacks | Conditioning & accessories
// e.g. { key: 'leg_press_45', label: '45° leg press', base: 'machine', defaultFor: ['full_gym'] }
// leg_press_45, leg_press_horizontal, hack_squat_machine, pendulum_squat, smith_machine,
// leg_curl_machine, leg_extension_machine, calf_raise_machine, hip_thrust_machine, ghd,
// chest_press_plate, chest_press_selectorised, shoulder_press_machine, dip_station,
// lat_pulldown, seated_row_machine, pullup_bar, landmine, trap_bar, safety_bar,
// cable_stack_single, cable_stack_dual, resistance_bands, kettlebells, dumbbell_rack_heavy,
// plyo_box, sled, rings_trx, bench_adjustable, squat_rack
```

- [ ] **Step 2: Failing test** `apps/mobile/tests/equipment-detail.js`:

```js
// No detail → identical to today: availableEquipDetailed(['barbell','machine'], null).base
//   equals availableEquip(['barbell','machine']); detail === null; every exercise available
//   exactly as before (spot-check hack_squat).
// With detail → narrowing only: an exercise with equipDetail 'leg_press_45' is unavailable
//   when accessDetail lacks it but 'machine' is in access AND detail was provided for machines;
//   an exercise with NO equipDetail on a detailed base stays available.
// Detail never expands: equipDetail item available only if its base is in access.
```

- [ ] **Step 3: Implement.** `availableEquipDetailed(access, accessDetail)` wraps `availableEquip`; availability rule exactly per the spec (detail narrows only within bases the user detailed; absent detail ⇒ base assumed fully equipped). Tag catalogue variants: split `hack_squat` ("Hack / leg-press") into `hack_squat_machine` + `leg_press_45` + `leg_press_horizontal` entries ONLY if the selection/dose paths key off ids you can safely extend — read `substitutions.js` + `selectInterventions.js` + `PROGRESSION_LIFTS`/`CORE_HOLDS` (strengthExercises.js:217+) for id references FIRST; if a split risks progression joins, tag the existing entry with `equipDetail` and add the variants as NEW entries with distinct ids, never renaming existing ids.

- [ ] **Step 4: The acceptance test that gates this whole part:** `npm test` with NO `UPDATE=1` — the golden master must be BYTE-IDENTICAL bar the KSV stamp (no profile in the fixtures has `accessDetail`). If anything else moved, the degradation rule is broken — stop and fix.

- [ ] **Step 5: KSV bump + commit.**

### Task C2: Selection honours detail + D14 coverage fallback

**Files:**
- Modify: `packages/engine/src/lib/plan/substitutions.js` (availableEquip call sites, ~lines 73/89) and `packages/engine/src/lib/plan/strength.js` (~85/96) — read both fully first; thread `accessDetail` from the profile (`profile.access_detail`).
- Modify: the D14 validation layer — locate via `grep -rn "validation" packages/engine/src/lib | grep -iv test | head`, add a pattern-coverage check with base-pool fallback + a flagged substitution note (Art 15: no silent truncation).
- Test: extend `apps/mobile/tests/equipment-detail.js`.

- [ ] **Step 1: Failing test:** a full-gym-with-detail profile lacking `lat_pulldown` never gets a lat-pulldown-tagged exercise; a detail set that would leave a movement pattern uncoverable falls back to the base pool and `plan.meta.validation` carries a flag naming the pattern.
- [ ] **Step 2: Implement** (thread `accessDetail`, filter at the same seams `availableEquip` feeds today, add the D14 check).
- [ ] **Step 3:** `npm test` — golden master still byte-identical bar KSV (fixtures carry no detail). Commit.

### Task C3: Onboarding "Detail my gym"

**Files:**
- Modify: `apps/mobile/src/components/OnboardingWizard.jsx` (equipment step, lines 409–453)
- Modify: `apps/mobile/src/lib/onboardingModel.js` (BLANK_ANSWERS + `answersToProfilePatch` — emit `access_detail`)
- Test: `apps/mobile/tests/onboarding-equipment-detail.js`

- [ ] **Step 1: Failing test:** `answersToProfilePatch({ …, equipment: ['barbell','machine'], equipmentDetail: ['leg_press_45'] })` emits `access_detail: ['leg_press_45']`; absent detail emits `access_detail: null` (and old seeds unaffected).
- [ ] **Step 2: Implement the UI:** under the existing preset chips + fine-tune items, a collapsed "Detail my gym (optional)" expander; open → the taxonomy checklist grouped by `group`, items rendered as `Chip`s (multi-select via the existing `toggle` helper on a new `equipmentDetail` array), pre-checked per the active preset's `defaultFor`. Choosing a different preset resets the detail to that preset's defaults; leaving the expander closed keeps `equipmentDetail: null` (= skipped). Summary row shows "Detailed (N items)" when set.
- [ ] **Step 3:** Wire `equipmentDetail` → `access_detail` in `answersToProfilePatch` (next to `access`, line ~213). BLANK_ANSWERS gains `equipmentDetail: null`.
- [ ] **Step 4:** `npm test && npm run lint` + manual onboarding pass (skip → plan identical; detail → narrowed selection visible in /dev DevPlayground volume readout). Commit.

---

## Verification & handoff (whole sprint)

- [ ] `npm test && npm run lint` green; golden-master state: B-deltas audited + re-baselined, C byte-identical bar KSV stamps.
- [ ] `npm run dev` full pass: Atlas panel; a positioned rugby profile in /dev shows diverging plans front row vs back three; onboarding detail flow.
- [ ] Update `HANDOFF.md` (status lives there only) with: sprint outcomes, the Sprint-2 spec deviation, B/C awaiting Simon's PR review.
- [ ] Single PR on this branch (all three sprints), body sectioned per sprint, explicitly marked **DO NOT MERGE until Simon lands the other in-flight branch and reviews B/C** — per Simon's instruction 2026-07-20.
