# Decision-Engine Evaluation

_Robustness + scientific review of the gym plan generator._
Date: 2026-06-21 · Method: exhaustive automated sweep + real-UI verification + cited literature review.

> **Relation to the foundational specs.** This evaluation (and its F1–F10 findings) **seeded** the
> engine documentation set in [engine/](engine/README.md): it was extended by the
> [Panel Review](engine/01-PANEL-REVIEW.md) and is now governed by the
> [Engine Design Specification](engine/00-ENGINE-DESIGN-SPECIFICATION.md) (the EDS). This remains the
> **evaluation of record** for that point-in-time sweep. Note several findings have since shipped (e.g.
> F1 weekly-MRV ceiling, F4 intensity-holding taper); current status is tracked in the running docs
> (`HANDOFF.md`, `CLAUDE.md`), not here.

> **Scope.** The engine is a **gym-only** plan generator on purpose. When a user picks a sport
> (run / cycle / swim) it biases the *gym* programming to **support** a sport the athlete trains
> on their own; it does **not** program endurance sessions (a deliberate future stage). Sport
> cases below are therefore judged as *strength complements*, not as endurance plans.

---

## 1. Executive summary

The engine is, structurally, **a well-built and genuinely evidence-based gym generator.** Across
~28,000 generated plans it never crashed, is perfectly deterministic, always respects equipment,
never mis-assigns a lift above a lifter's level, and its periodisation (block structure, rep-scheme
progression, deload placement, season sizing) maps cleanly onto the sports-science it cites. The
injury subsystem is a real strength.

The one **systemic weakness** is **volume control on the high end**: the exercise allocator
overshoots its *own* weekly volume targets by ~20–25%, which is harmless in early/low-frequency
blocks but pushes posterior-chain volume **past MRV** (the maximum recoverable volume) in
high-frequency and functional-style plans — in the worst case to **more than double MRV**. A second,
smaller cluster of issues concerns **peaking** (the event taper lowers intensity, which the evidence
says it should not), a **cosmetic-but-real equipment leak** (one hard-coded warm-up exercise needs a
band the user may not own), **misleading session titles**, and **inaccurate time estimates** for
1–2-day plans.

**Headline ratings:** most build and sport archetypes land **A− / B+**. The outliers are the
**high-frequency functional plans (C−/D+)**, dragged down by the volume overshoot, and **1-day-a-week
plans (C+)**, limited by physiology and an inaccurate duration label.

---

## 2. Method & coverage

`generatePlan(profile)` ([src/lib/PlanGenerator.js](../src/lib/PlanGenerator.js)) is a pure function,
so it can be swept directly. All testing ran in the live app via the hidden `/dev` playground
([src/screens/DevPlayground.jsx](../src/screens/DevPlayground.jsx)), driving the **real**
onboarding wizard and the **real** engine modules in-browser.

**Layer 1 — exhaustive automated sweep (every decision-bearing combination).**
- **Build branch:** 3 styles × 4 levels × 7 days × 6 session-lengths × 5 equipment presets = **2,520 plans**.
- **Sport branch:** 5 sport configs × 6 intent/season scenarios × 4 levels × 7 days × 6 lengths × 5 equipment = **25,200 plans**.
- Plus determinism (324), sex (male/female/other) and lift-entry sub-sweeps. **~60,000 `generatePlan` calls.**
- Every week of every plan was checked against property assertions (below).

**Layer 2 — deep cited rating** of representative + boundary + injury cases (actual sessions read and scored on a 9-point rubric against primary literature, §6/§8).

**Layer 3 — real-UI verification.** Seven onboarding flows were driven through the actual wizard
(one hand-clicked to the goal screen, plus all seven presets). For each, the profile the UI fed the
generator and the rendered plan **exactly matched** the swept equivalent (e.g. Strength preset →
`{goal_type:build, strength_style:strength, days:4, mins:75, access:[…7 items]}` → "12 weeks · 3
phases · 4 sessions/week", identical UI vs engine). The UI → profile → plan wiring is sound.

---

## 3. Hard invariants — results

| Invariant | Result | Notes |
|---|---|---|
| No crashes (any combination) | ✅ **0 / ~60k** | Engine is robust to every input combination. |
| Determinism (regenerate identical) | ✅ **0 mismatches / 324** | Pure function confirmed. |
| Sessions per week == requested days | ✅ **0 violations** | |
| No empty sessions | ✅ **0** | |
| Session duration ≤ session-minutes budget | ⚠️ **0 by self-report** | Passes against the engine's *own* duration estimate, but that estimate is unreliable for 1–2-day plans (§5.4). |
| Equipment legality | ⚠️ **1 leak** | "Band Pull-Apart" in the functional warm-up given to band-less users (§5.3). |
| Level gating (no over-level primary) | ✅ **0 violations** | Beginners correctly get e.g. back squat demoted to 3×8 accessory, not 4×5 heavy. |
| Periodisation / season mapping | ✅ **correct in all 25,200 sport cases** | compete-in / event-passed → 4-wk maintenance; off-season → 6/10/12 wks by discipline; pre-season → 4/6 wks. |
| Sex handling | ✅ | Female +2 reps on accessories only (mains untouched); no new failures. |
| Lift targets | ✅ | Entered 1RMs scale loads; absent lifts estimated from level/bodyweight/sex. |

---

## 4. The systemic finding — volume overshoots MRV on the high end

The app's own volume panel shows it: for an advanced 4-day strength plan, **Week 1 actual = 85 sets
vs target = 69** — every muscle over target (Glutes 11 vs 6.5, Quads 11 vs 8.5). The allocator
([src/lib/plan/allocator.js](../src/lib/plan/allocator.js)) pays down per-muscle *deficits* but
compound lifts credit several muscles at once, so total volume runs **~20–25% above the
evidence-based target** that [src/lib/strength/targets.js](../src/lib/strength/targets.js) computes.

There is a per-*session* cap (½·MRV) and the *target* is capped, but **there is no weekly ceiling on
the actual allocated volume.** So as the block-continuous ramp raises targets and frequency rises,
the overshoot compounds and breaks through MRV.

**Sweep quantification (build branch, 2,520 plans):**

| | Plans over MRV (any working week) | Severity |
|---|---|---|
| Build | **869 / 2,520 (34.5%)** | 336 mild (≤20% over) · 260 moderate (20–50%) · **245 substantial (50–100%)** · **28 extreme (>100%)** |
| Sport | 639 / 25,200 (2.5%) | marginal (e.g. glutes 21 vs MRV 20) |

- **Concentrated in functional style + high frequency.** Worst case: `functional / advanced / 7d /
  bodyweight`, week 7 → **back 57.5 "effective" sets vs MRV 25**. Most-affected muscles: **back,
  hamstrings, glutes** (posterior-chain synergist stacking + the desk-posture pull boost).
- _Honest caveat:_ this is by the engine's **own** volume accounting, which counts synergist
  contributions (a hinge credits 0.5 to "back"), so absolute numbers are inflated. But the engine
  uses that same accounting for its MRV ceiling — so by its own measure it is overshooting its own
  limit, often severely.

**Evidence.** Hypertrophy follows a dose-response that **plateaus and can reverse at very high weekly
volumes** (~>20 sets/muscle) through accumulated fatigue and reduced per-set effort — Schoenfeld et
al. 2017; the 2024/25 dose-response meta-regression (Pelland et al.); Baz-Valle et al. 2022 (no
benefit of >20 vs 12–20 sets for quads/biceps). Prescribing **50+ sets** to a muscle is well past the
point of diminishing/negative returns and raises overuse-injury and overtraining risk. This is the
single highest-value fix (§7, F1).

---

## 5. Other findings

### 5.1 Event taper lowers intensity (it should maintain it)
Taper weeks "lighten like a deload" — `lighten = deload || taper` in
[PlanGenerator.js](../src/lib/PlanGenerator.js) → the deload scheme (e.g. 2×5 **@ RPE 6**). But a
peaking taper is **not** a deload. The evidence for both endurance **and** strength peaking is to
**cut volume sharply (~40–60%) while *maintaining* intensity** — Bosquet et al. 2007 (endurance:
2-wk taper, volume ↓41–60%, intensity held); Travis & Mujika 2020 (strength: volume-load halved,
intensity ≥85% 1RM maintained; "intensity is the key variable for maintaining performance").
Dropping to RPE 6 in the run-in to an event blunts the peak. (§7, F4)

### 5.2 Misleading session titles
Session titles don't match contents. Examples observed: **"Monday · Upper · push · chest focus"**
whose first two lifts are **Front squat + Seated calf raise**; **"Wednesday · Upper · pull · back
focus"** containing squats, deadlifts and bench. Titles are generated independently of the exercises
the allocator picks. Cosmetic, but it undermines trust. (§7, F3)

### 5.3 Equipment leak: hard-coded warm-up needs a band
The functional activation primer (`FUNCTIONAL_PRIMER` in
[src/lib/plan/strength.js](../src/lib/plan/strength.js)) always includes **"Band Pull-Apart,"** which
needs a band. The allocator correctly gates every other exercise by equipment, but the primer is
hard-coded and unfiltered — so **functional-style users on dumbbells-only or bodyweight-only get an
exercise they can't perform** (every session). This is the only equipment violation in the entire
sweep. (§7, F2)

### 5.4 Time estimates are wrong for 1–2-day plans
A 1-day/week beginner plan returns a single session with **13 exercises** (5 compound mains at
75–180 s rest) labelled **"~60 min"** — realistically 90+ minutes. The duration estimate stays under
budget on paper but doesn't reflect the packed reality, so the time-budget invariant "passes" while
the session is over-stuffed. (§7, F5)

### 5.5 Short sessions: the warm-up eats the session
The fixed 4-item functional primer (~7 min) is constant regardless of session length, so on a
**20-minute** session it consumes ~⅓ of the time, leaving ~13 min for actual training. (§7, F6)

### 5.6 Vestigial endurance copy
The Base phase tagline is **"Build the aerobic engine and movement quality"** and week themes say
"Build aerobic base" — leftovers from the endurance era, shown on pure gym/strength plans. Now that
the app is explicitly gym-first, these read as wrong. (`PHASE_META` /
`themeFor` in [PlanGenerator.js](../src/lib/PlanGenerator.js).) (§7, F7)

### 5.7 Sport plans carry non-specific volume
Sport-support plans still allocate substantial general bodybuilding-style work. A **sprinter** gets
**12 sets of chest/week** and exercises like Cable Fly and Spider Curl; a **distance runner** gets
chest flyes. The evidence says high-load strength + plyometrics drive the transfer, while submaximal
"bodybuilding" volume is **less effective** for runners (Llanos-Lagos et al. 2024). The emphasis
vectors only mildly de-prioritise these (sprint chest = 0.90). (§7, F8)

### 5.8 Every sport session opens with a squat/hinge
The "fundamental pattern" anchor leads every session with squat/hpush/hinge in rotation — so a
**swimmer's** session opens with a heavy **Front squat** before any pulling. Generic lower-body
strength transfers poorly to swimming unless swim-specific (Crowley et al. 2017). For limited-time
sport-support, the highest-value first slot would better go to the sport's priority pattern. (§7, F8)

### 5.9 Deloads are fixed, not adaptive
Deload weeks are placed at fixed positions per profile, not driven by accumulated fatigue/readiness.
Acceptable for now (adaptive deloads are a natural future step), noted for completeness.

---

## 6. What the engine does well (evidence-aligned)

- **Block periodisation is textbook.** Strength: base **4×5 @ RPE 7** → build **4×4 @ RPE 8** → peak
  **4×3 @ RPE 8–9**, deload **2×5 @ RPE 6**. This is clean accumulation → transmutation → realisation
  (Issurin 2010) with appropriate intensity/rep progression.
- **Volume *targets* (not the overshoot) are well-modelled:** MEV→MAV ramp, style-specific ceilings
  (strength 0.6, functional 1.0, bodybuilding 1.4 ×MAV), level multipliers (0.85→1.05) — straight
  from Renaissance-Periodisation landmarks and consistent with Schoenfeld dose-response.
- **RPE/RIR autoregulation** of barbell loads (Epley-based, target-RPE adjusted) follows Helms et al.
- **≥2×/week frequency** per muscle is guaranteed where days allow — aligned with frequency meta-analyses.
- **Sport emphasis is mostly right:** swim → back (18 sets), shoulders, scapular/rotator-cuff health
  work (Prone Y/T/W, face pulls) — matches swim-specific dry-land + shoulder-health evidence;
  distance run → posterior chain + Achilles/calf (single-leg calf raise); cycle → heavy max-strength
  + single-leg, which improves cycling economy (Rønnestad/Sunde 2010). Sprint power/plyo (Power
  Clean, Hang Clean, Pogo, Sled Push, Bounding) **are** present — correctly **periodised after** the
  base phase, not dumped in week 1.
- **Season logic is correct:** event ≤8 wks → 4-wk in-season maintenance at 0.6 volume; event passed
  → transition; far out → full base block. Behaved correctly in all 25,200 sport cases.
- **Injury subsystem is a highlight.** Active **knee** injury → squats/deadlifts substituted +
  quad-set/straight-leg-raise rehab injected; active **shoulder** → presses/pulls substituted +
  scapular-row rehab; non-affected lifts left intact; clear user banner. Contraindications and rehab
  choices match standard physiotherapy practice.
- **Honest expectation-setting:** the goal screen says *"Everything is built in the gym — pick what
  it should serve,"* which correctly frames the gym-only scope.

---

## 7. Prioritised improvements

Ranked by impact × confidence. Each names the file to change.

| # | Fix | Impact | Effort | Where |
|---|---|---|---|---|
| **F1** | **Add a weekly MRV ceiling on *actual* allocated volume.** After allocation, cap or trim per-muscle weekly sets at MRV (with a small buffer), so high-frequency/functional plans can't reach 50+ sets. Reconcile the allocator's ~20–25% overshoot against the target. | **High** | Med | [allocator.js](../src/lib/plan/allocator.js) + an audit pass using [volume.js](../src/lib/plan/volume.js) |
| **F2** | **Equipment-filter the activation primer.** Swap "Band Pull-Apart" for a no-kit alternative (e.g. prone/scapular raise, wall slide) when the user has no band. | High (correctness) | Low | `FUNCTIONAL_PRIMER` in [strength.js](../src/lib/plan/strength.js) |
| **F3** | **Generate session titles from contents.** Title from the actual dominant pattern(s) the allocator chose, not a pre-set label. | Med (trust) | Low | session assembly in [allocator.js](../src/lib/plan/allocator.js) / [strength.js](../src/lib/plan/strength.js) |
| **F4** | **Make the event taper a real taper.** Keep intensity (RPE 8+) on the main lifts; cut **volume** ~40–60% instead of dropping RPE. Stop treating taper == deload. | Med | Low–Med | `lighten` logic in [PlanGenerator.js](../src/lib/PlanGenerator.js); scheme in [allocator.js](../src/lib/plan/allocator.js) |
| **F5** | **Fix the session-duration estimate** (account for sets × rest + per-exercise overhead) and cap exercises-per-session so 1–2-day plans don't silently pack 90+ min into a "~60 min" label. | Med | Med | duration calc in [strength.js](../src/lib/plan/strength.js) |
| **F6** | **Scale the warm-up to session length** (trim/skip the primer on ≤30-min sessions). | Low–Med | Low | [strength.js](../src/lib/plan/strength.js) |
| **F7** | **Replace vestigial endurance copy** ("Build the aerobic engine") with gym-appropriate phase text. | Low | Trivial | `PHASE_META` / `themeFor` in [PlanGenerator.js](../src/lib/PlanGenerator.js) |
| **F8** | **Sharpen sport-support specificity:** lead each sport session with the sport's priority pattern (not the squat/hinge anchor), and de-emphasise non-specific upper-body volume harder for runners/cyclists. | Med | Med | anchor logic in [allocator.js](../src/lib/plan/allocator.js); emphasis in [program.js](../src/lib/strength/program.js) |
| F9 | (Future) Adaptive deloads driven by readiness/fatigue rather than fixed weeks. | Med | High | [periodization.js](../src/lib/plan/periodization.js) |
| F10 | (Housekeeping) The dev "Cyclist support · in" preset uses the legacy `sportSeason` field, which the engine ignores (season now comes from `event_date`) — so it renders 12 wks, not the 4-wk in-season block. Update the preset. | Low | Trivial | [DevPlayground.jsx](../src/screens/DevPlayground.jsx) |

---

## 8. Rated cases (rubric, 1–5)

Dimensions: **G** goal-alignment · **V** volume adherence · **Pe** periodisation · **Ta** taper/peaking ·
**Ex** exercise selection · **Fr** frequency/recovery · **Co** constraints (time/days/equip) ·
**Sa** safety · **Sp** sport-support _(— = N/A)_.

| Archetype | G | V | Pe | Ta | Ex | Fr | Co | Sa | Sp | Grade |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Build · Strength · Beginner · 3d · 45m · full gym | 5 | 5 | 5 | 4 | 4 | 5 | 5 | 5 | — | **A** |
| Build · Strength · Intermediate · 4d · 60m · full gym | 5 | 4 | 5 | 4 | 4 | 5 | 5 | 5 | — | **A−** |
| Build · Hypertrophy · Intermediate · 5d · 60m · full gym | 5 | 3 | 4 | 4 | 4 | 5 | 5 | 4 | — | **B+** |
| Build · Functional · Intermediate · 3d · 45m · home weights | 4 | 4 | 5 | 4 | 3 | 4 | 5 | 5 | — | **B+** |
| Build · Functional · **Advanced · 7d · bodyweight** | 4 | **1** | 4 | 3 | 2 | 3 | 4 | **2** | — | **D+** |
| Build · Functional · Beginner · 3d · **20m** · bodyweight | 4 | 4 | 4 | 4 | 3 | 4 | 3 | 4 | — | **B−** |
| Build · Strength · **1d** · 60m · full gym | 4 | 3 | 4 | 3 | 3 | 2 | **2** | 4 | — | **C+** |
| Sport · **Run-sprint** · Advanced · off-season · 4d | 4 | 4 | 5 | 3 | 4 | 5 | 5 | 5 | 4 | **B+** |
| Sport · **Run-long** · Intermediate · base · 4d | 5 | 4 | 5 | — | 4 | 5 | 5 | 5 | 4 | **A−** |
| Sport · **Swim** · Intermediate · base · 3d | 4 | 4 | 5 | — | 3 | 4 | 5 | 5 | 3 | **B** |
| Sport · **Cycle** · Intermediate · in-season · 2d | 4 | 4 | 5 | — | 4 | 4 | 5 | 5 | 4 | **A−** |
| Sport · Run-middle · **compete, event ~1 wk** (taper) | 4 | 4 | 5 | **3** | 4 | 5 | 5 | 5 | 4 | **B** |
| Any · **injury-modified** (active knee, sev 4) | — | — | — | — | 5 | — | — | **5** | — | **A** |

**Pattern:** quality is high and consistent for low-to-moderate frequency. It degrades only where the
**volume overshoot** bites (high-frequency functional), where **physiology constrains** the request
(1 day/week), or where **non-specific volume** dilutes a sport plan.

---

## 9. Appendix — key sources

- Schoenfeld, Ogborn & Krieger (2017), _J Sports Sci_ — weekly-set dose-response for hypertrophy.
- Pelland et al. (2024/25), _Sports Medicine_ — resistance-training dose-response meta-regression (diminishing returns at high volume).
- Baz-Valle et al. (2022), _PMC8884877_ — volume systematic review (no benefit >20 vs 12–20 sets, quads/biceps).
- Issurin (2010) — block periodisation.
- Helms et al. (2016/2018) — RPE/RIR autoregulation.
- Bosquet et al. (2007), _Med Sci Sports Exerc_ — taper meta-analysis (2-wk, volume ↓41–60%, hold intensity).
- Travis & Mujika et al. (2020), _Sports (MDPI)_ — peaking maximal strength (cut volume-load, maintain intensity ≥85% 1RM).
- Llanos-Lagos et al. (2024), _Sports Medicine_ — strength training & running economy (high-load + plyometric effective; submaximal less so).
- Rønnestad & Sunde (2010) — maximal strength training improves cycling economy.
- Crowley et al. (2017) — dry-land strength transfer to swimming (best when swim-specific).

_All numeric claims above were verified against these sources during the review (June 2026)._
