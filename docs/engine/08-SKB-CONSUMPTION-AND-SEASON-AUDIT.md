# 08 — SKB Consumption & Season Audit (2026-07-08)

> **What this is.** A full audit of the Sports Knowledge Base (SKB) — every sport, and the
> *structure* — through five lenses: an elite S&C coach, an elite athlete who must follow the
> plans, an elite head coach, a sports scientist, and a systems architect. Requested by Simon
> 2026-07-08, prompted by a **triathlon** plan that came out spine-heavy and upper-body-blind.
>
> **Relationship to [07-SKB-PROFILE-REVIEW.md](07-SKB-PROFILE-REVIEW.md).** That review (2026-07-04)
> checked each profile against the *schema* — are the 21 sections authored, do the decision rules
> parse. This audit checks something 07 did not: whether the SKB's knowledge actually **reaches the
> plan generator**, whether the **content is right against the literature**, and whether the engine
> can express **season** (off / pre / in) the way an elite coach would. 07 asked "is the profile
> well-formed?" — this asks "does the athlete get the right plan?"
>
> **Status.** Audit + fix-design. No engine code changed in this pass (per Simon's scope choice).

---

## 0. TL;DR — the five findings

1. **There are two sport "brains," and the good one is switched off.** The rich 21-section SKB
   (`packages/engine/src/data/sport-knowledge/*.json`, ~2,600 lines/sport) is **~95% dormant** for
   plan generation. The plan an athlete actually receives is driven by a **separate 32-line-per-sport
   legacy layer** (`sportGymSupport/*.js`). This split is *known and intended-to-merge* (WP-23) but
   hasn't happened, and in the gap it produces bad plans.

2. **Triathlon is the sharpest symptom, and it's a wiring bug, not a knowledge bug.** Onboarding
   collapses `triathlon → engineSport 'run'`; there is no triathlon module in the live layer, so a
   triathlete is programmed as a **middle-distance runner** (`chest 0.55`, `shoulders 0.80`). The
   swim third of the sport — which drives the back/shoulder/scapular demand — is entirely unserved.
   The correct knowledge is sitting, unread, in `triathlon.json`.

3. **"Season" can only turn a volume dial.** In-season vs off-season today changes *how much*
   (`off:0.90 → in:0.6`) and the block shape — it does **not** change per-muscle emphasis or exercise
   selection. So Simon's request ("off-season = generalise and round the body out; in-season = shift
   to prehab") **cannot be expressed by the engine as built**, even though every SKB `seasonalModel`
   already describes exactly that progression.

4. **The SKB content is genuinely good — better than the plans it produces.** All 11 profiles score
   1.00 completeness and validate; the literature audit graded most **A / A−**. The knowledge to
   build the plan Simon wants (including the subtle "swimming is pull-and-internal-rotation dominant,
   so prioritise pulling + scapular/cuff prehab, *not* heavy bench") is already authored.

5. **The one structural content gap is the same in every sport:** the sport's demand is encoded as
   quality *importances* (1–10) and *prose*, but **not** as machine-consumable **per-muscle emphasis
   weights** or **movement-pattern balance targets**. An engine can read *that* two sports differ but
   not *by how much*. This is the missing bridge between "great knowledge" and "great plan."

---

## 1. Scope & method

**Audited:** all 11 selectable sports — `running_sprint`, `running_middle`, `running_long`,
`cycling`, `swimming`, `triathlon`, `gaelic_football`, `hurling`, `field_hockey`, `rugby`, `soccer`.

**Method:**
- Traced the live generation path end-to-end (`resolveProgram` → `sportGymSupport` → allocator) and
  the SKB consumption path (`sportKnowledge/index.js`, `demandProfile.js`, `reflowAdjust.js`).
- **Reproduced** the triathlon plan from a faithful profile by running the real engine (§3).
- Ran the engine's own `completeness()` / `validate()` across all 11 profiles.
- Ran a five-lens, against-the-literature content audit of each sport (§5).

**The five lenses**, applied throughout: **S&C coach** (is the programming logic sound?), **athlete**
(what happens if I actually follow this for a season?), **head coach** (does it respect the
competitive calendar?), **sports scientist** (is it true to the evidence?), **systems architect**
(is the required data present, and in a shape the engine can consume?).

---

## 2. The core finding — two sport models, only one wired

### 2.1 The map

| Layer | Where | Size | What it knows | Does it reach the plan? |
|---|---|---|---|---|
| **SKB** (rich) | `data/sport-knowledge/*.json` | ~2,600 lines × 11 | 21 sections: qualities, energy systems, movement/injury profiles, seasonal model, gym philosophy, decision rules, KPIs | **Almost never** (see 2.2) |
| **Gym-support** (live) | `data/sportGymSupport/*.js` | ~32 lines × 6 | `emphasis` (per-muscle ×), `priorityExercises`, `seasonModifiers` (volume), `periodization` (blocks), `power` | **Yes — this is what the athlete gets** |

For a **sport** goal, [`resolveProgram`](../../packages/engine/src/lib/strength/program.js) reads
**only the gym-support layer** (`sports.get(profile.sport)`). It never touches the SKB.

### 2.2 What the SKB *does* drive at runtime (the ~5%)

- **Onboarding sport list** — `selectable.js` shows a sport iff `completeness().complete` + a binding exists.
- **The diagnosis demand profile** — `demandProfile.js` maps `physicalProfile.qualities` → Performance-Model
  qualities. But per `CLAUDE.md`, the diagnosis "**does not yet steer the plan**," and this path drops
  every muscle-level and pattern-level detail (only quality importances survive the `SKB_TO_PM_QUALITY` map).
- **The reflow rule interpreter** — `reflowAdjust.js` reads `decisionRules`, but can only produce a
  **volume multiplier** and a **force-deload** flag. Region-specific effects
  (`exclude_soreness_above`, `reduce_region_eccentric`, `reduce_region_overhead`, `cap_high_speed`)
  are **validated-but-no-op** — they need exercise-level tagging the catalogue doesn't have.
  (Even for triathlon, only 7 of 11 rules are machine-actionable, and the actionable ones only scale volume.)

**Net:** the SKB cannot change a single exercise in the baseline plan, and can only *reduce* volume at reflow.

### 2.3 What the live layer actually does per sport (the emphasis vectors)

These per-muscle multipliers are the real drivers. `1.0` = neutral; `<1` de-emphasised.

| Live module (SKB sports it serves) | chest | back | shoulders | quads | ham | glutes | calves |
|---|---|---|---|---|---|---|---|
| **run** default / **middle** *(← triathlon lands here)* | 0.55 | 0.90 | 0.80 | 1.15 | 1.30 | 1.25 | 1.20 |
| run **sprint** | 0.70 | 1.00 | 1.10 | 1.20 | 1.30 | 1.35 | 1.20 |
| run **long** | 0.45 | 0.90 | 0.70 | 1.10 | 1.30 | 1.20 | 1.40 |
| **cycle** (cycling) | 0.55 | 0.90 | 0.70 | 1.30 | 1.15 | 1.25 | 1.00 |
| **swim** (swimming) | 1.00 | **1.30** | **1.25** | 0.70 | 0.70 | 0.70 | 0.50 |
| **gaa** (gaelic_football, hurling, *field_hockey*) | 0.80 | 1.05 | 1.00 | 1.15 | 1.30 | 1.25 | 1.10 |
| **rugby** | 1.00 | 1.20 | 1.15 | 1.15 | 1.25 | 1.25 | 0.90 |
| **soccer** | 0.70 | 1.00 | 0.85 | 1.15 | 1.30 | 1.25 | 1.10 |

**Sports with a dedicated module:** run, cycle, swim, rugby, soccer, gaa (6).
**Sports with no module (mapped/approximated):** `triathlon → run`, `field_hockey → gaa`, `hurling → gaa`.

The single most damaging line in the table: **triathlon inherits the `run/middle` row.** A triathlete
who swims a third of the week gets `chest 0.55, shoulders 0.80` and none of the `swim` row's `back 1.30 /
shoulders 1.25`. Contrast this with the SKB's own triathlon `gymPhilosophy`, which lists "vertical +
horizontal pull" and "scapular control + external rotation" as **essential movement patterns**.

---

## 3. Evidence — the triathlon plan, reproduced and traced

Built a faithful amateur-triathlete profile (as onboarding persists it) and ran the **real** engine:

```
resolveProgram → style: sport | sport: run | season: off
emphasis: {quads:1.15, hamstrings:1.30, glutes:1.25, calves:1.20, core:1.20,
           back:0.90, shoulders:0.80, chest:0.55, biceps:0.55, triceps:0.70}
exercisePriority: [nordic_curl, split_squat, rdl, double_leg_pogo, sl_pogo_jump,
                   trap_bar_dl, step_up, lateral_band_walk, copenhagen, pallof,
                   sl_calf, sl_hinge, tibialis_raise]     ← 100% lower-body / core
```

Resulting week (Base phase):

```
Monday · Lower:   Trap-bar DL 3×8 | Hip thrust | Bulgarian split squat | mobility
Thursday · Lower: Back squat | Trap-bar DL 4×5 | Hip thrust | mobility
Sunday · Lower:   Trap-bar DL 3×8 | Hip thrust | carries | mobility
```

**Trap-bar deadlift in all three sessions; zero pressing; zero pulling; zero upper body.** This matches
Simon's report (his run of the wizard surfaced some pull work; the exact selection shifts with days/
sport-days, but the pathology — spine-heavy, upper-body-blind — is identical and structural).

**Root cause, traced:**
1. `bindingFor('triathlon')` → `{ engineSport: 'run' }` ⇒ `profile.sport = 'run'` (the word "triathlon" is discarded for planning).
2. No `run_discipline` ⇒ `resolveProgram` defaults to **`middle`**.
3. `emphasis.chest = 0.55` halves the weekly chest target ⇒ the allocator never accumulates enough
   "pressing deficit" to program a bench/OHP ⇒ **pressing is structurally impossible**, regardless of
   the athlete or the week.

The knowledge to fix this is not missing — it is in `triathlon.json`, unread.

---

## 4. The season-model gap (Simon's second concern)

Simon: *off-season should generalise and build a well-rounded base; then pre-season; then in-season
should shift toward prehab (calf raises, Copenhagen, single-leg RDL, single-leg leg press, shoulder
health, pull-ups).*

**What "season" does today** ([`sportLoad.js`](../../packages/engine/src/lib/strength/sportLoad.js),
[`_schema.js`](../../packages/engine/src/data/sportGymSupport/_schema.js)):
- Picks a **block template** (weeks, deload placement).
- Scales **volume**: `DEFAULT_SEASON_VOLUME = { off: 0.90, pre: 0.85, in: 0.60, transition: 0.70 }`.

**What it does *not* do:** change the emphasis vector or the exercise selection. In-season is the *same*
runner's leg-day as off-season, with **less of it**. There is no "generalise in the off-season" and no
"pivot to prehab in-season."

**What the SKB already contains but the engine ignores** — `triathlon.json seasonalModel`:
- `offSeason.primaryObjective`: *"Restore tissues; build the strength foundation and general aerobic base."*
- `offSeason.trainingEmphasis`: gym **MAX-STRENGTH + tissue capacity**, address the **weakest discipline**.
- `competition.trainingEmphasis`: *"maintained strength at minimal effective volume … full prehab."*

Every sport's `seasonalModel` carries `gymFrequencyPerWeek / volume / intensity / fatigueTolerance`
per phase, and the audit found the **off-season objectives are appropriately general/round-out across
all sports** ("fix the season's asymmetries," "round out"). The intent is authored and engine-shaped;
the *machinery* to act on it (season → emphasis + selection, not just volume) does not exist.

**This is the single highest-leverage change for what Simon described.** Detail in §8 — and note the
Tier-2 investigation there found it is a **session-split** change, not an emphasis change (proven: the
emphasis/priority levers leave a runner's off-season plan byte-identical), plus an S&C judgement call.

---

## 5. Per-sport content audit (five lenses, against the literature)

> Grades are for **content fidelity to the literature**, independent of the wiring problem in §2.
> A sport can be an "A" here and still produce a poor plan, because the A-grade knowledge is dormant.

### 5.1 Grade summary

| Sport | Grade | Headline strength | Most important content gap |
|---|---|---|---|
| running_sprint | A− | Correct max-velocity quality signature; strong hamstring/RTP detail | Energy split mis-centred (~15% vs ~35% aerobic for a 200–400 midpoint); no upper-body/antagonist content; adductor/groin missing from `injuryProfile.common` |
| running_middle | A | Best of the three; economy thesis + injury epidemiology are coach-grade | Universal upper-body gap; RED-S cited but no energy-availability rule signal; ITB missing |
| running_long | A | Best injury epidemiology; uniquely exposes bone-stress + low-EA rules | Universal upper-body gap; proximal hamstring tendinopathy missing; ultra eccentric demand only in prose |
| cycling | A− | Discipline-aware; PFPS/low-back epidemiology precise | Off-season opens a "no upper-body/no bone-loading" loop it never closes; `stability` slightly low |
| swimming | A− | **The reference for swim treatment** — pull-first, cuff/ER prehab, bench correctly de-prioritised | Ontology has no first-class "pulling strength" quality, so a quality-reading engine under-selects pulling |
| triathlon | **C+/B−** | A-grade injury + energy knowledge; the swim nuance *is* encoded in prose | **The direct source of the complaint** — machine layers read as a runner; no discipline-blend; swim demand averaged out; no off-season round-out |
| gaelic_football | A− | Correct RSA-dominant signature; excellent seasonal model | Kicking-leg asymmetry diagnosed but not corrected; no horizontal-push exercise despite declaring the pattern essential; low-back not in `common` |
| hurling | A− | Best asymmetry handling in the set; grip/rotation correctly elevated | `broad_jump` name/pattern/equipment inconsistency; "both-sides" intent is prose, not a machine field |
| rugby | A | Collision + cervical load as first-class demands; superb positional data | No numeric per-position quality vectors or per-muscle weights (categorical only) |
| soccer | A | Best-in-class injury-prevention evidence (Nordic/Copenhagen, UEFA) | No per-muscle emphasis weights; `deceleration` arguably under-weighted |
| field_hockey | B+ | Correct anti-flexion / posterior-chain framing for the stooped posture | **Missing hand/facial injuries** in `common`; asymmetry diagnosed but no corrective prescription; `schemaVersion` "1.0" typo |

**Bottom line: the content is strong.** Nine of eleven are A/A−. Only **triathlon** grades poorly — and even that is a *structure* problem (the knowledge is present in prose but the machine-consumable layers read as a runner), not a knowledge problem.

### 5.2 The triathlon deep-dive (why it's the odd one out)

The audit confirmed the mechanism independently of the wiring: *even inside `triathlon.json`*, the lower-body lifts out-rank the swim/pull work on `exerciseLibrary[].transferToSportRating` — split-squat **8**, calf-raise **7**, squat/trap-bar/pogo **7**, RDL/hip-thrust **6**, vs pull-up **6**, row **5**, band-ER **4**. Four of the five top-ranked lower-body lifts load the posterior chain/spine. So *any* transfer- or volume-ranked selector "fills legs first and the swim/pull work last" — reproducing "spine-heavy, almost no upper body" **from the data itself**. And `"upper"` appears **0 times** in `triathlon.seasonalModel`. The swim — triathlon's only upper-body, pull- and shoulder-dominant leg — is exactly the signal that gets averaged out.

### 5.3 Content-fix list per sport (the concrete, low-risk edits)

- **field_hockey** — add hand/finger + facial/dental to `injuryProfile.common` (surveillance completeness, even if flagged non-gym-preventable); fix `schemaVersion` "1.0" → "1.0.0".
- **running_sprint** — add adductor/groin strain to `injuryProfile.common`; recentre/relabel `energySystems` (~35% aerobic for a 200–400 midpoint, or relabel as 100–200).
- **running_middle** — add ITB syndrome to `injuryProfile.common`.
- **running_long** — add proximal hamstring tendinopathy to `injuryProfile.common`.
- **swimming** — add Batalha et al. (seasonal ER-strength decline in swimmers) to `references` to anchor the ER:IR target.
- **hurling** — fix the `broad_jump` entry (name "Broad Jump" vs `movementPattern` "triple-extension jump" vs `equipment` ["trap bar"] are mutually inconsistent — a WP-23 normalisation artefact).

---

## 6. Cross-cutting content findings

Four themes recur across nearly every sport — these matter more than any single-sport nit:

1. **Demand is expressed as importances + prose, not as machine-consumable weights.** No sport carries a numeric **per-muscle emphasis map** or **movement-pattern balance target**. The engine can read *that* two sports differ but not *by how much*. This is the missing bridge between the SKB and a good plan — and it's the reason even the future "derive the live layer from the SKB" (WP-23) will underperform until it exists.

2. **Imbalances are diagnosed but not remedied.** Hurling/hockey (dominant-side rotation), GAA/soccer (kicking-leg dominance), rugby (tackle-shoulder) all *name* their signature asymmetry in `movementProfile.asymmetricLoading` — but only hurling comes close to a corrective prescription, and none expose a machine-readable `weakSideEmphasis`/`bilateralBalance` field an allocator could enforce.

3. **The off-season "round-out" intent exists but doesn't translate to movement scope.** Every `seasonalModel.offSeason` says something like "build a general base / fix the season's asymmetries" — but for the endurance sports that "general base" is still *lower-body-only* (more volume, same menu). "Generalise" is authored as an *intensity/quality* cue, not a *movement-balance* cue. A season-long follower of any endurance sport gets **no pressing or pulling at all**.

4. **A few internal inconsistencies** — declared-essential patterns with no library exercise (GAA horizontal push), the hurling `broad_jump` artefact, triathlon's 19th quality (`durability`) sitting outside the canonical 18. Individually minor; collectively they'd mislead an engine that trusts the data literally.

---

## 7. Does the SKB contain the required data? (the core question, answered)

**Mostly yes — but it's in the wrong form and the wrong place.**

- **The knowledge exists and is good.** Nine of eleven sports are A/A−; the specific nuance behind the complaint (triathlon/swim needs *pulling + scapular/cuff prehab*, not heavy bench) is authored, correctly, today.
- **It doesn't reach the plan.** The generator reads a 32-line legacy table, not the SKB (§2). So the right knowledge is present and unused.
- **Even where it's read, it's the wrong shape.** The demand is importances + prose; there is no numeric per-muscle-emphasis / pattern-balance / discipline-blend layer for an engine to consume (§6.1).
- **Season can't be expressed.** The engine can only scale volume by season, so "off-season generalise → in-season prehab" is unbuildable as-is (§4).

So the audit's answer to "do we collect the required data to make the correct decisions?" is: **the raw knowledge — yes; the machine-consumable decision inputs — not yet, and not connected.**

---

## 8. Prioritised fixes

Ordered by value-per-risk. Tiers 1–2 + the content fixes are being implemented in this pass (branch
`skb-audit-fixes-2026-07-08`); Tier 3 is designed here for review, not built.

> **UPDATE 2026-07-09** — T2 (season model) and the first slice of T3 (wire the SKB into generation)
> were subsequently built on branch `season-phased-skb-2026-07-09` via **Approach A** (the SKB
> `seasonalModel.programming` block drives the plan). Off-season now rounds the athlete out with a
> sport-derived round-out session; in-season stays sport-specific. Endurance sports migrated; gated so
> un-migrated sports are byte-identical. Design: `docs/superpowers/specs/2026-07-09-season-phased-skb-design.md`.
> Remaining: `movementPolicy` consumption (in-season pool restriction), team-sport migration, retiring the
> legacy layer. So the T2/T3 items below are PARTLY DONE — see that spec + `HANDOFF.md` for current status.

### Tier 1 — stops the reported bug (implementing now, low-risk, well-contained)

- **T1a. Give triathlon its own gym-support module.** New `sportGymSupport/triathlon.js` blending
  swim + bike + run: emphasis that keeps `back`/`shoulders`/upper-pull at genuine priority (from the
  swim leg) alongside run durability (calf/single-leg/posterior chain) and bike quad drive, and a
  `priorityExercises` list that *leads* with pulls + scapular/cuff prehab, not a triple-deadlift week.
  Repoint `sportEngineBinding` `triathlon → engineSport 'triathlon'`. Additive to the golden-master
  (triathlon isn't a fixture); add a triathlon fixture + a test asserting the plan contains upper-body
  pull **and** isn't spine-stacked.

- **T1b. The per-sport content fixes** in §5.3 (data-only; dormant; no plan-output change).

### Tier 2 — Simon's season ask (INVESTIGATED tonight; needs a deeper change + your call — NOT shipped)

- **T2. Off-season generalisation.** I built and tested the obvious version — when `season === 'off'`,
  (a) floor the de-emphasised muscles up toward a general baseline, (b) stop the allocator demoting
  the press for run/cycle, and (c) seed general upper-body movements into the off-season priority
  list. **Result: it does not work, and the reason is important.** Regenerating the plans showed
  **every run/cycle off-season plan came out byte-identical** — the emphasis floor, the un-demotion,
  and the seeded press changed *nothing* for the target cohort. Only the (already-fixed) triathlon
  plan moved.

  **Why:** a runner/cyclist's gym week is *rating-based* (not category-led — see
  `session/categoryCoverage.js`, where run/cycle/triathlon are deliberately excluded from
  `CATEGORY_LED`). Their **session split is built from the emphasis vector**, and with the legs at
  1.15–1.30 the split stays leg-dominated, so **no horizontal-push slot is ever opened**. Raising the
  chest *target* (emphasis) or boosting a press in the *priority* list can't place a press into a slot
  that doesn't exist. The only upper-body the off-season plan gets today is a fixed posture/prehab
  injection (band rows, pull-aparts) — pulls, never presses.

  **So off-season generalisation is a SPLIT-STRUCTURE change, not an emphasis change** — it must make
  the split open genuine upper-body / push days for an endurance athlete in the off-season (or route
  the off-season athlete through a more general split entirely). That touches `resolveSplit` /
  the slot allocator — core, shared code that affects every sport plan — which is too risky to change
  blind overnight. It also carries a genuine **S&C judgement call that is yours to make:**

  > How much pressing/upper-body does an *endurance* athlete want even in the off-season? Your instinct
  > ("hit full-body muscle groups") points one way; the SKB's own `gymPhilosophy` for runners points
  > the other (upper-body mass costs running economy — it lists heavy pressing as *limited value*). For
  > a **triathlete/swimmer** the answer is clearly "yes, round out the upper body" (now handled by T1).
  > For a **pure runner/cyclist** it's a deliberate trade-off, not an obvious win.

  **Recommendation:** treat off-season generalisation as its own small design task (a season-aware
  split that guarantees N upper-body/push slots in the off-season), scoped per-sport (aggressive for
  swim/tri, light for run/cycle), landed behind the golden-master one sport at a time. I've left the
  code reverted so tonight's branch ships only what actually works.

### Tier 3 — the real re-seat (designed here, NOT built tonight — needs Simon's review)

- **T3a. Add the machine-consumable demand layer to the SKB schema.** A numeric `muscleEmphasis` map
  + `patternBalance` targets (push:pull, upper:lower floors) per sport, and for multi-discipline
  sports a `disciplineBlend` (swim:bike:run) that *drives* the emphasis rather than being averaged
  away. This is the bridge §6.1 identifies as missing.
- **T3b. Wire the SKB into generation (finish WP-23).** Have `resolveProgram` derive `emphasis` +
  `priorityExercises` from the SKB's new demand layer, retiring the 32-line legacy modules. HIGH risk
  (touches every sport plan) → staged behind the golden-master, one sport at a time.
- **T3c. Season-aware selection, not just emphasis.** Let `season` drive an in-season pivot to the
  prehab menu the SKB `seasonalModel` already describes (calf/Copenhagen/SL-RDL/shoulder-health),
  and expose a machine-readable `weakSideEmphasis` so the diagnosed asymmetries (§6.2) get corrected.
- **T3d. Reconcile the ontology** — triathlon's 19th quality (`durability`), the "pulling strength"
  quality gap for swimming, and an energy-availability/RED-S readiness signal in `RULE_SIGNALS`.

> **Sequencing note.** T1 fixes the symptom Simon reported tonight. T2 delivers his season ask in a
> contained way. T3 is the correct long-term architecture (and aligns with the frozen EDS's
> diagnosis-first, SKB-as-Sport-Model design) but is a deliberate, staged re-seat — not an overnight change.
