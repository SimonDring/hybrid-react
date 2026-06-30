# Decision-Engine Panel Review

_A multidisciplinary review of the gym decision engine._
Date: 2026-06-23 · Method: full code-level architecture map + live literature grounding (Level 1–2 priority).

**Review panel (the decision quality we are benchmarking against):** Olympic S&C Coach ·
Professional Team Sports Scientist · High-Performance Director · Sports Rehabilitation
Specialist · Exercise Physiologist · Strength-Training Researcher · Senior Software
Architect · Product Architect.

**Mandate.** Critique, harden and future-proof the *existing* engine. **Not a rebuild** —
refactor over rewrite, preserve behaviour, minimise regression. Challenge convention; demand
evidence; distinguish evidence from coaching tradition.

> **How to read this.** Recommendations are graded **Evidence level** (L1 systematic
> review/meta-analysis → L5 expert opinion), **Confidence** (High/Moderate/Low), and where
> relevant we name **contradictory evidence**. The companion
> [02-REFACTOR-ROADMAP.md](02-REFACTOR-ROADMAP.md) holds the staged build plan, data
> contracts, folder structure, quick wins and testing strategy (review outputs §10–§12).
> This review supersedes nothing in [../decision-engine-evaluation.md](../decision-engine-evaluation.md)
> — it extends it with an architecture/future-proofing lens and refreshed citations.

> **Role in the doc set.** This is the **evidence & critique basis** of the engine documentation —
> the scientific grounding (graded L1–L5) and the weakness/risk audit behind the platform's design.
> It is a *foundational* spec governed by the **[Engine Design Specification](00-ENGINE-DESIGN-SPECIFICATION.md)** (the EDS);
> where this review and the EDS conflict, **the EDS wins**. **Canonical home for:** the evidence and
> the ranked weaknesses/risks. The decision-hierarchy (§6) and orchestrator (§7) *ideas* first proposed
> here are now canonicalised in the EDS (Part V decision architecture, Part VII knowledge architecture) —
> this doc keeps the **evidence** for them, not the law. **Find elsewhere:** laws & decision architecture →
> [00](00-ENGINE-DESIGN-SPECIFICATION.md); build plan & contracts → [02](02-REFACTOR-ROADMAP.md); sport
> schema → [03](03-SPORT-KNOWLEDGE-BASE.md); physiological metrics → [04](04-PHYSIOLOGICAL-FRAMEWORK.md).
> Current status vs. these targets lives in the running docs (`HANDOFF.md`, `CLAUDE.md`). See the [index](README.md).

---

## §0 Headline verdict

The engine is **a genuinely good evidence-based gym generator with a clean pure core** — better
than most commercial apps and most non-specialist coaches for the single-athlete strength case.
It is *not yet* an orchestrated high-performance system, for three structural reasons:

1. **Specialist knowledge is embedded, not pluggable.** Sport logic is two hand-maintained maps
   inside [program.js](../../apps/mobile/src/lib/strength/program.js); injury logic is regex
   pattern-matching; recovery/load logic is tangled into
   [PlanService.js](../../apps/mobile/src/lib/PlanService.js). Adding rugby, GAA or soccer — the
   Team-package priority — currently means editing the core. That is the opposite of the
   orchestrator architecture the mission needs.
2. **The science is not traceable.** Every threshold (MEV/MAV/MRV, ACWR cut-offs, readiness
   bands, taper %) is a magic number justified only by a code comment. It cannot be audited,
   versioned, or evolved without a developer.
3. **It monitors the wrong things, and over-trusts a discredited one.** It leans on ACWR — which
   the current literature says is **mathematically flawed** as an injury gate — while **ignoring
   subjective wellness**, which the literature says is the **most sensitive** monitoring signal.
   It does not model illness, travel, or life stress at all, despite "the real-world athlete"
   being the entire product thesis.

None of these require a rebuild. All three are addressable by *extracting* what already exists
into modules behind clean contracts, plus one new data layer. That is the plan.

**Two premises in the commissioning brief are already solved — do not regress them:**
- *"Sessions end early and waste the booked time."* The opposite is true. The allocator's
  round-robin + filler passes **overshoot** volume (documented 20–25% over target, up to **>2×
  MRV** on high-frequency functional plans). The lever is **value-ordering within a recoverable
  ceiling**, not padding empty time.
- *"Deloads are fixed, not adaptive."* Already shipped: `deloadRecommendation()` forces/defers
  the current week's deload from ACWR + readiness + session recovery ratings.

---

## §1 Current Architecture Review

### 1.1 The real pipeline (pure generation)

`generatePlan(profile)` ([PlanGenerator.js:93](../../apps/mobile/src/lib/PlanGenerator.js)) is a
**pure, deterministic** function — same profile → identical plan, with stable session keys
(`p{phase}_wk{week}_s{idx}`) so completion state maps across regenerations:

```
generatePlan(profile)
  → resolveProgram(profile)            goal/sport → { style, emphasis{muscle:×}, volumeScalar,
                                         power, sport, season, exercisePriority[] }
  → resolvePeriodization(profile)      → { totalWeeks, split:[{intent,weeks}], deloads[] }
  → (race taper window computed from event_date)
  for each week:
    → strength.buildWeek(...)
        → weeklyMuscleTargets(ctx)     MEV→MAV ramp per muscle  (targets.js)
        → resolveSplit(...)            day focuses + anchors
        → allocateGym({targets,slots}) greedy fill → sessions   (allocator.js)
        → applyFunctionalPrimer(...)
    → scheduleWeek({sportSpecs,days})  lay onto weekdays         (scheduler.js)
  → { phases:[…], totalWeeks }
```

### 1.2 Runtime adaptation (overlays, never mutate the pure plan)

In [PlanService.js](../../apps/mobile/src/lib/PlanService.js), driven by `setRuntime({sessions,
readiness, loadDecision})` from the Zustand store on every `buildView()`:

```
getPhases()
  → injuryFilteredPhases()             apply contraindications + prevention   (injury/)
      → adaptedPhases()                CURRENT WEEK ONLY:
          • rolling missed-volume deficit → redistribute across remaining slots
          • readiness multiplier  (≥70→1.0, ≥50→0.9, <50→0.78)
          • combinedMultiplier(readiness, loadDecision)  → session minutes
          • deloadRecommendation(...)  force/defer the scheduled deload
```

### 1.3 What's strong (architecturally)

- **Purity & determinism.** The whole generator is a pure function of the profile. This is the
  single most valuable property the codebase has: it makes the engine testable, sweepable
  (~60k plans, 0 crashes), and safe to refactor under golden-master tests.
- **The pure plan is never mutated.** Adaptation is a *projection* applied at read time, scoped
  to the current week. Future weeks stay provisional. This is the correct separation.
- **Fractional/synergist volume accounting** (`muscleContribution`, `volume.js`) — a hinge
  credits ~0.5 to "back." This is exactly the "fractional set" method the current dose-response
  literature endorses (§3).
- **Stable completion mapping** via session keys + a `withinEpoch` guard so old completions
  don't leak onto a regenerated plan.
- **A real injury subsystem** (4 rehab phases, severity gating, ~197 rehab exercises, recurrence
  flags) — rare in consumer apps.

### 1.4 Coupling map — where specialist logic lives that *should* be modular

| Domain | Where it lives now | Should live | Severity |
|---|---|---|---|
| Sport knowledge | `SPORT_EMPHASIS` + `SPORT_PRIORITY` maps + `run_*` branches in [program.js](../../apps/mobile/src/lib/strength/program.js); sport `PROFILES` + `run_discipline` branches in [periodization.js](../../apps/mobile/src/lib/plan/periodization.js) | `sports/<id>.js` modules behind a registry | **High** |
| Injury rules | Regex `blockedPatterns` in `injury/injuryRules.js` | `injuries/profiles/<id>.js` + exercise-DB tags | **High** |
| Recovery → modifier | Bands + multipliers inline in `Readiness.js` *and* `PlanService.js` | `recovery` module emitting a contract | **High** |
| Load → modifier | ACWR + `loadDecision` thresholds in `trainingLoad.js`; multiplier blend in `PlanService.js` | `load` module emitting a contract | **High** |
| Progression scheme | Hardcoded rep/RPE table in `allocator.js scheme()` | `progression/<model>.js` referenced by goal | Medium |
| Evidence/thresholds | Code comments + inline constants everywhere | `knowledge/` evidence base | **High** |

The orchestrator principle the brief asks for — *the core coordinates specialist modules and
holds none of the specialist knowledge itself* — is **~40% true today**. The pipeline shape is
right; the module boundaries and contracts are missing.

---

## §2 Sports-Science Review (component by component)

**Goal resolution.** Three build styles (strength / bodybuilding / functional) map to defensible
volume scalars and emphasis. **Gap:** no explicit "athletic development / power" goal as a
first-class goal (it only appears via sport), and goal logic is entangled with style strings.

**Periodization.** Block model (accumulation → transmutation → realisation) with phase-end
deloads and an event taper. Evidence-aligned (§3). **Gap:** fixed block lengths per profile; no
goal-level choice of model (block vs undulating).

**Volume model.** MEV→MAV weekly ramp per muscle, MRV ceiling enforced in the allocator,
style/season scalars, ≥2×/week frequency. This is the engine's best science. **Gap:** the
*landmark numbers* are expert-opinion (Renaissance Periodisation), and the allocator overshoots
the target it computes (§4).

**Sport biasing.** Per-muscle emphasis vectors + ordered priority-exercise lists + a season
volume scalar + run-discipline specialisation. Reasonable direction. **Gaps:** (a) it is a
*strength-support* bias only — there is no model of the sport's movement/force/velocity/energy-
system demands or injury patterns, so it can't reason about *why*; (b) sport plans still carry
non-specific bodybuilding volume (a sprinter gets 12 sets of chest); (c) every session still
opens with a squat/hinge anchor even for a swimmer.

**Injury subsystem.** Phase-appropriate contraindications + rehab injection + post-recovery
prevention. Clinically sensible. **Gaps:** regex matching is brittle and not data-driven; the
*prevention* side does not encode the specific, evidence-graded protocols (Copenhagen, Nordic,
neuromuscular warm-up) with dosing/progression that the literature supports (§3).

**Recovery (readiness).** Composite of sleep-duration, HRV-vs-7-day-baseline, RHR-vs-baseline,
averaged. Reasonable physiology. **Gaps:** single-day HRV is noisy; the composite weighting is
arbitrary/unvalidated; and it **ignores subjective wellness, soreness, illness and stress** —
which the evidence says are the *most* sensitive signals (§3). Session `recovery` ratings are
collected but barely used.

**Load (ACWR).** Edwards TRIMP → EWMA acute(7)/chronic(28) → coupled ACWR → `loadDecision` with
hard 0.8 / 1.3 / 1.5 thresholds → volume multiplier. **Gaps:** ACWR is **discredited as a gate**
(§3); the thresholds are treated as settled science; and load is computed from **endurance
sessions** (Strava) yet used to throttle **gym** volume — a cross-domain inference that is not
justified.

---

## §3 Evidence Review (graded, with contradictions)

> Ordering follows the brief's hierarchy: L1 meta-analyses/systematic reviews → L2 position
> stands → L3 RCTs → L4 cohort → L5 expert opinion.

### 3.1 Resistance-training volume dose-response — **Evidence L1 · Confidence High**
Pelland et al. (2024/25), _Sports Medicine_ meta-regression (67 studies, 2,058 participants):
**100% posterior probability** that more weekly volume → more hypertrophy *and* strength, with
**diminishing returns** (markedly steeper for strength). Crucially, it confirms that **fractional
(synergist-weighted) set counting** is the right accounting method — which is exactly what the
engine already does.
- **Engine implication:** the fractional accounting is *validated*. But "MRV as a hard reversal
  point past which gains go negative" is a **weaker** claim than the diminishing-returns curve
  itself. The ceiling should be framed as *diminishing-returns + recoverability*, not a cliff.
- **Contradictory evidence:** Baz-Valle et al. 2022 found no benefit beyond ~20 sets for some
  muscles; the high end of the curve is genuinely uncertain. Treat >20 sets/muscle as
  low-confidence territory.

### 3.2 Acute:Chronic Workload Ratio (ACWR) — **Evidence L1–L2 *against* · Confidence High (that it is flawed)**
Impellizzeri et al. (2019, _BJSM_, "the ACWR-injury figure and its 'sweet spot' are flawed");
Impellizzeri et al. (2020, _Sports Medicine_, "Conceptual Issues and Fundamental Pitfalls");
Lolli et al. (mathematical coupling → spurious correlation). Findings: the acute window is a
*subset* of the chronic window, so the ratio is **mathematically coupled** and correlates with
injury partly as a statistical artefact; the "sweet spot" (0.8–1.3) is **not robust**; ACWR
"magnifies the effect of acute load without adding predictive value."
- **Engine implication:** the hard 0.8 / 1.3 / 1.5 gates in `loadDecision` are **not defensible
  as injury-risk thresholds.** Demote ACWR to *one soft, low-confidence input* among several;
  prefer reporting **absolute load and week-to-week change** alongside it. **Additional flaw
  specific to this app:** ACWR is built from endurance TRIMP and used to cut *gym* volume — there
  is no evidence base for that transfer.
- **Contradictory evidence:** Gabbett and others still defend load monitoring (not the ratio
  per se); *monitoring* load is sound, the *ratio-as-gate* is what's discredited. Keep the
  monitoring; drop the false precision.

### 3.3 Subjective wellness vs objective (HRV/RHR) monitoring — **Evidence L1 · Confidence High**
Saw, Main & Gastin (2016, _BJSM_) systematic review: **subjective self-report measures "trump"
objective measures** (HRV, RHR) in sensitivity/consistency to acute and chronic load; subjective
wellbeing falls with acute load spikes and chronic load, and recovers when load eases. Best used
**combined** with objective signals.
- **Engine implication:** the readiness module **ignoring subjective wellness is a top-tier,
  evidence-backed gap.** Add a lightweight daily wellness input (sleep quality, soreness, mood,
  stress, energy) and weight it *at least* as heavily as HRV. This is high value and low cost.

### 3.4 HRV-guided training — **Evidence L2–L3 · Confidence Moderate**
HRV-guided beats fixed programming in some RCTs (endurance), but single-day HRV is noisy; rolling
7-day mean / coefficient-of-variation is more reliable. The engine already baselines on 7 days
(good); it should **smooth the gating** (act on trends, not one bad night).

### 3.5 Injury-prevention exercise efficacy — **Evidence L1–L2 (efficacy) · Moderate (real-world)**
- **Copenhagen adduction (groin):** Harøy et al. (2019, _BJSM_) cluster-RCT — Adductor
  Strengthening Programme **reduced groin-problem risk by 41%** (13.5% vs 21.3% prevalence).
  Confidence **High**. The engine already lists `copenhagen` for cycle/run — good; encode the
  dosing/progression.
- **Neuromuscular warm-ups (FIFA 11+ / PEP):** meta-analyses show **30–57%** reductions in
  injury (~52% knee; pronounced female ACL benefit). Confidence **High** for efficacy.
- **Nordic hamstring:** the popular **~51%** figure (van Dyk et al. 2019) is **contested** — a
  stricter-methodology reappraisal found the protective effect **inconclusive**, and the 2024
  umbrella review grades it **"conditionally recommended" (GRADE).** Confidence **Moderate**.
  Keep it, but tag it conditional, not settled.
- **Cross-cutting caveat (Confidence High):** every one of these has strong *efficacy* under
  trial conditions but is **undermined by real-world adherence.** For a busy-person app this is
  the decisive constraint — short, embedded, well-explained prevention work beats an optimal
  protocol nobody does.

### 3.6 Concurrent-training interference — **Evidence L1 · Confidence High**
2023/24 meta-analyses: interference is **real but small and modality-specific** — **running**
interferes with lower-body strength/hypertrophy **more than cycling**; trained athletes are more
affected than untrained; **strength-first** sequencing aids neuromuscular adaptation; separating
modalities reduces interference.
- **Engine implication:** validates the scheduler's interference spacing. Implies (a) a genuine
  interference allowance for runners specifically, and (b) the "strength on the same day as hard
  running" case should prefer strength-first or separate-by-hours guidance.

### 3.7 Periodization model — **Evidence L1 (periodized > not) · L4–L5 (which model)**
Periodized training beats non-periodized (Williams et al. 2017), but **no model reliably beats
another** (block vs daily-undulating). The block model here is *defensible, not uniquely
correct.* Don't claim superiority; allow the goal module to choose a model later.

### 3.8 Taper / peaking — **Evidence L1 · Confidence High**
Cut volume ~40–60% while **maintaining intensity** (Bosquet et al. 2007 endurance meta; Travis &
Mujika 2020 maximal strength). The engine's taper scheme now keeps RPE high and cuts sets —
**correct** (a prior bug that lightened intensity was fixed).

### 3.9 Sleep & injury/performance — **Evidence L2–L4 · Confidence Moderate–High**
Chronic short sleep is associated with elevated injury risk and impaired performance/recovery
(e.g. Milewski 2014 in adolescents). Supports weighting **sleep** in readiness — already done;
keep it prominent.

---

## §4 Weaknesses (ranked by impact × confidence)

1. **Volume overshoot past MRV on the high end** (systemic; from the prior eval). The allocator
   pays down per-muscle deficits but compounds credit several muscles, so realised volume runs
   ~20–25% over target and breaches MRV on high-frequency/functional plans (worst case >2× MRV).
   Highest-value *correctness* fix. _Note: a weekly MRV ceiling now exists in the allocator; this
   weakness is about the residual overshoot beneath that ceiling and the cliff-vs-curve framing._
2. **Recovery/load logic is embedded and over-trusts ACWR.** Not a consumable contract; ACWR
   gates are scientifically indefensible (§3.2); subjective wellness ignored (§3.3).
3. **Sport & injury knowledge are hardcoded** (maps + regex). Adding a sport or refining an
   injury rule requires core edits — blocks the Team-package roadmap and multi-sport scale.
4. **No modelling of illness / travel / life-stress / subjective wellness** — directly contradicts
   the strongest monitoring evidence *and* the product's "real-world athlete" thesis.
5. **No evidence-traceability layer.** Science lives in comments; not auditable, versionable, or
   evolvable without a developer. Blocks the "scientific recommendations evolve without rewriting
   the engine" requirement.
6. **Correctness/trust papercuts:** equipment leak (Band Pull-Apart in the functional primer for
   band-less users), session titles not always matching contents, vestigial endurance copy,
   unrealistic duration labels on 1–2-day plans.

---

## §5 Risks

**Regression hot-spots (touch with care, cover with tests):**
- The **PlanOutput contract** consumed by screens: `phases[].weeks[].sessions[].items[]` with
  item fields `{num, name, sets, rpe, note, restSec, group, superset, tag}`. Frozen.
- `profileSignature()` memoization — omitting a new plan-affecting field silently serves a stale
  plan.
- `withinEpoch()` completion mapping — breaking it leaks old completions onto new plans.
- Week/date math (`mondayOf`, `currentWeekNumber`) — off-by-one shifts "today's session."

**Scalability concerns:**
- Per-render injury re-filtering (acceptable now; memoise if injury rules grow).
- Sport modelled as a boolean branch (build OR sport) — no multi-sport / hybrid athletes.
- `packages/{engine,shared}` are empty — the intended home for the extracted engine.

**Scientific risk:** shipping contested thresholds (ACWR, MRV cliff, Nordic magnitude) as if
settled. The knowledge base (§13) mitigates this by forcing every number to carry a confidence.

---

## §6 Recommended Decision Hierarchy

> _Canonical home: this hierarchy is now formalised as the engine's decision architecture in the
> **[EDS](00-ENGINE-DESIGN-SPECIFICATION.md) Part V** (the D1–D16 decision graph) and refined in its
> Part II §8. The version below is the **evidence-grounded proposal** that seeded it; defer to the EDS
> for the authoritative sequence._

The brief proposes a 14-step order; it is close to right. The **critical correction** is that
sport, injury, recovery and load must be **overlays/modules the orchestrator consumes**, not
logic baked into base generation — and **injury contraindications should feed exercise
*selection*** (build the session right) rather than only substitute after the fact.

| # | Stage | Why here | Change vs today |
|---|---|---|---|
| 1 | **Athlete profile** | All else is a function of capability, training age, history, equipment. | — |
| 2 | **Goal module params** | Goal sets volume/intensity/frequency/progression/recovery priorities *before* anything sport-specific. | Goal becomes a module, not a `style` string. |
| 3 | **Constraints** (frequency · duration · equipment) | These *bound* the whole solution; everything downstream must fit them. | Make explicit/first-class. |
| 4 | **Goal-driven base scaffold** | A coherent base (full-body / U-L / PPL / performance split) the overlays modify. | Base built before sport. |
| 5 | **Sport overlay** | Emphasis, priority lifts, prevention inserts, season modifier — *additive* on the base. | **Sport stops being baked into the core.** |
| 6 | **Periodization (+ taper)** | Wraps the volume/intensity progression over the block. | Model selectable by goal (future). |
| 7 | **Volume targets** | MEV→MAV ramp × scalar, within an MRV/diminishing-returns ceiling. | Framed as curve, not cliff. |
| 8 | **Recovery overlay** → `{readinessLevel, volumeModifier, intensityModifier, sessionOverride}` | Sizes the session to today's capacity *before* it's built. | Extracted to a module; adds subjective + illness/travel/stress. |
| 9 | **Load overlay** → `{riskLevel, loadModifier, loadRecommendation}` | One more soft modifier; ACWR demoted. | Extracted; ACWR no longer a gate. |
| 10 | **Injury overlay** | Contraindications as **selection constraints** + prevention inserts. | Feeds selection, not just post-hoc substitution. |
| 11 | **Exercise selection** | Value-ordered, equipment/level-gated, priority-weighted greedy fill. | Largely as-is (good). |
| 12 | **Progression assignment** | Reference a progression *model*, don't hardcode the scheme. | Extracted to `progression/`. |
| 13 | **Session construction** | Fill the highest-value work **within the recoverable ceiling**; when the core dose is met, present extra as *optional* quality work — never pad junk volume. | Reframes the brief's "fill the time." |
| 14 | **Scheduling** | Weekday placement with muscle-recovery + concurrent-interference spacing. | As-is (good). |

**On the brief's "fill the available time" priority (§ session construction):** the evidence
(§3.1) says more volume helps only up to diminishing returns, and this engine already
*overshoots*. So the correct objective is **not** "keep adding work until the clock runs out" —
it is "deliver the highest-value work the athlete can recover from, then stop or pivot to quality
(technique, mobility, sport-specific skill, prevention)." A value hierarchy for any spare capacity:
**(1) primary compound → (2) secondary compound → (3) sport-specific injury-prevention →
(4) sport-specific accessory → (5) targeted hypertrophy to lagging muscles within MRV →
(6) core/anti-rotation → (7) mobility.** Beyond the recoverable dose, time is better banked than
spent.

---

## §7 Modular Architecture (the orchestrator)

> _Canonical home: the orchestrator **principle** (core coordinates registries; holds no domain
> knowledge) is canonicalised in the **[EDS](00-ENGINE-DESIGN-SPECIFICATION.md) Part VII** (knowledge
> architecture) and Part X (software architecture); the **build structure & contracts** that realise it
> live in **[02-REFACTOR-ROADMAP](02-REFACTOR-ROADMAP.md)** §8–§9. The diagram below is the originating
> proposal._

```
                         ┌───────────────────────────┐
                         │  core/orchestrator         │  ← coordinates only; no domain knowledge
                         │  (generatePlan pipeline)   │
                         └─────────────┬─────────────┘
        ┌───────────┬───────────┬──────┴──────┬───────────┬───────────┐
        ▼           ▼           ▼             ▼           ▼           ▼
     goals/      sports/     injuries/     recovery     load     progression/
   (registry)  (registry)   (registry)    (module)    (module)  (registry)
        └───────────┴───────────┴─────────────┴───────────┴───────────┘
                                   │  all read ▼
                         ┌───────────────────────────┐
                         │  knowledge/  (evidence KB) │  ← thresholds + provenance + confidence
                         └───────────────────────────┘
```

**Rule:** adding a sport, an injury profile, a recovery metric, or a progression model = **a new
file + a registry entry, zero edits to `core/`.** The orchestrator imports registries and the
knowledge base; it never imports a specific sport or injury.

Folder structure, data contracts, and the staged build are specified in
[02-REFACTOR-ROADMAP.md](02-REFACTOR-ROADMAP.md) (§8, §9, §10).

---

## §8–§12 — Folder Structure · Data Contracts · Refactor Plan · Quick Wins · Long-Term Roadmap

See [02-REFACTOR-ROADMAP.md](02-REFACTOR-ROADMAP.md). Summary: a **Phase 0 golden-master safety
net**, then **(1) Evidence Knowledge Base → (2) Pluggable sport modules → (3) Recovery/Load
contracts**, with a later **data-driven injury module** and an eventual **extraction to
`packages/engine`**. Quick wins (equipment-leak fix, content-derived titles, copy cleanup,
"you're at target — extra is optional" transparency) can ship independently.

---

## §13 Scientific Knowledge Base Design

**Problem it solves:** today the science is un-auditable magic numbers. **Goal:** every
recommendation is traceable and can evolve without rewriting the engine.

**Shape — `knowledge/rules/*.json`, entries of:**
```json
{
  "id": "volume.mrv.back",
  "rule": "Weekly recoverable ceiling for 'back' ≈ 25 fractional sets",
  "value": 25,
  "evidenceLevel": "L5",
  "source": "Israetel/RP landmarks; consistent w/ Schoenfeld 2017 dose-response",
  "confidence": "low",
  "lastReviewed": "2026-06-23",
  "appliesTo": ["volume", "allocator"]
}
```
**Consumption:** `kb.get('volume.mrv.back')` returns `{ value, ...provenance }`. Modules read
thresholds from the KB instead of inlining constants. The `/dev` playground surfaces provenance
("this number, this source, this confidence"); later the coach dashboard can show athletes/coaches
*why* a decision was made. A test flags any entry whose `lastReviewed` is older than N months, so
the science is *forced* to be revisited rather than silently rotting. Contested entries (ACWR,
MRV cliff, Nordic) carry `confidence: "low"` and the engine treats them as soft.

---

## §14 Areas of STRONG scientific consensus (build confidently on these)

- Resistance-training **volume dose-response with diminishing returns**; **fractional set**
  counting (Pelland 2024). _L1._
- **≥2×/week** per-muscle frequency for hypertrophy. _L1._
- **Progressive overload** as the driver of adaptation. _L1._
- **Periodized > non-periodized** (model choice less important). _L1._
- **Strength-first** sequencing in concurrent sessions for neuromuscular adaptation. _L1._
- **Taper = cut volume, hold intensity** (~40–60% volume reduction). _L1._
- **Strength training improves endurance economy** (running & cycling) — Rønnestad & Sunde 2010,
  Blagrove 2018, Llanos-Lagos 2024. _L1–L2._
- **Specific prevention-exercise efficacy** under trial conditions: Copenhagen 41% groin
  (Harøy 2019); neuromuscular warm-ups 30–57% (FIFA 11+). _L1–L2._
- **Subjective wellness is a sensitive monitoring signal** (Saw 2016). _L1._

## §15 Areas of WEAK / CONFLICTING evidence (treat as soft, tag low-confidence)

- **ACWR thresholds & the "sweet spot"** — mathematically flawed; not a valid injury gate
  (Impellizzeri 2019/2020; Lolli). _Demote to soft input._
- **Exact MEV/MAV/MRV landmark numbers** — useful heuristics but expert-opinion, not
  RCT-validated; the high end of the dose curve is genuinely uncertain.
- **Nordic hamstring magnitude** — ~51% vs "inconclusive"; GRADE conditional. _Keep, tag conditional._
- **Single-day HRV gating** — noisy; act on 7-day trends, and prefer/combine subjective.
- **Precise taper magnitudes** — direction is solid (cut volume, hold intensity); exact % is
  athlete-specific.
- **Real-world adherence** systematically erodes trial-grade prevention effects — design for
  adherence, not for the protocol.

---

## Appendix — Sources (this review's literature pass, June 2026)

- Pelland et al. (2024/25), _Sports Medicine_ — RT dose-response meta-regression. [PubMed 41343037](https://pubmed.ncbi.nlm.nih.gov/41343037/)
- Impellizzeri et al. (2019), _BJSM_ — "[The ACWR-injury figure and its 'sweet spot' are flawed](https://www.researchgate.net/publication/333589357_The_acute-chronic_workload_ratio-injury_figure_and_its_'sweet_spot'_are_flawed)."
- Impellizzeri et al. (2020), _Sports Medicine_ — "[Acute:Chronic Workload Ratio: Conceptual Issues and Fundamental Pitfalls](https://link.springer.com/article/10.1007/s40279-020-01280-1)."
- Saw, Main & Gastin (2016), _BJSM_ — "[Subjective self-reported measures trump objective measures](https://pmc.ncbi.nlm.nih.gov/articles/PMC4789708/)."
- Harøy et al. (2019), _BJSM_ — [Adductor Strengthening Programme prevents groin problems (cluster-RCT, 41%)](https://researchprofiles.ku.dk/en/publications/the-adductor-strengthening-programme-prevents-groin-problems-amon/).
- FIFA 11+ neuromuscular training — [systematic reviews/meta-analyses (30–57% injury reduction)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12856364/).
- Nordic hamstring — [2024 umbrella review (GRADE: conditionally recommended)](https://www.mdpi.com/2227-9032/12/15/1462); [methodological reappraisal (inconclusive)](https://pubmed.ncbi.nlm.nih.gov/34520846/).
- Concurrent training — [Sports Medicine meta-analysis on sex & training status](https://link.springer.com/article/10.1007/s40279-023-01943-9); running > cycling interference.
- Bosquet et al. (2007), _MSSE_ — taper meta-analysis · Travis & Mujika (2020) — peaking maximal strength.
- Williams et al. (2017) — periodization meta-analysis · Schoenfeld, Ogborn & Krieger (2017) — weekly-set dose-response · Issurin (2010) — block periodization · Helms et al. — RPE/RIR autoregulation.
- Existing internal prior art: [../decision-engine-evaluation.md](../decision-engine-evaluation.md).
