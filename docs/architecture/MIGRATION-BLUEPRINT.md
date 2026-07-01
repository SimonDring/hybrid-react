# Migration Blueprint (Sprint 2) — Decision-System Mapping & Rebuild Plan

> **The master plan for migrating the current gym-planning engine into the coaching decision engine the governing set defines.**
> This document designs the *path*, not the code. It defines how the future engine reasons, every decision it must make, who owns each decision, how each current component migrates, how knowledge moves out of code, the target module map, the migration waves, an executable sprint backlog, a traceability matrix, and a six-lens critical review.

| | |
|---|---|
| **Status** | v1.0 — governing migration plan (Sprint 2). Subordinate to the frozen set. |
| **Date** | 2026-07-01 |
| **Authority** | Below the Constitution · EDS · Decision Ontology · Knowledge Architecture · TAS, and downstream of the Baseline Architecture Assessment. Where it and a governing doc differ, the governing doc wins. |
| **Method** | Full read of the Constitution, TAS, and EDS; requirement-level read of the Ontology + Knowledge Architecture; grounded in the Sprint-1 baseline. No code changed. |
| **Prime directive** | *Re-seating, not rewrite* (EDS §18): keep the strong machinery, change the order and the primitive, wire the dormant knowledge, ship value continuously (Constitution Art 20). |

**How to read.** Parts 1–3 define the *future* (reasoning chain, decisions, ownership) from first principles. Parts 4–5 map *current → future* (components, knowledge). Part 6 is the target module map. Parts 7–8 are the *plan* (waves, then executable sprints — the operational heart). Part 9 is traceability; Part 10 is the critical review with revisions folded back.

The governing set already answers much of Parts 1, 2, and 6 (the EDS defines the decision graph D1–D16; the TAS defines the six layers). This blueprint's *new* work is the **mapping, sequencing, backlog, traceability, and multi-lens review** that turn those targets into an executable programme — plus a faithful consolidation of the reasoning model so a sprint can proceed without re-reading five documents.

---

# PART 1 — The Future Decision System (the reasoning chain)

## 1.1 How an elite coach actually reasons

An elite coach does not think in muscles, sets, or templates. They run a continuous loop (EDS §5, Constitution Art 5): *understand the athlete → understand the sport's demands → diagnose the limiting factors → choose the highest-value adaptations → select the minimum-effective interventions → organise them into recoverable sessions → observe the response → learn → repeat.* The pivot of that loop — the act that separates coaching from programming — is **diagnosis**: turning *what is true* into *what to do about it*.

## 1.2 The definitive coaching decision chain

The brief proposes a flat chain (Athlete → Assessment → Goals → Outcomes → Model → Limiting Factors → … → Learning). It is directionally right but **flat, and it hides the two moves that matter most.** The governing EDS (§8) has already challenged and improved it. This is the definitive chain, reconciled and adopted here:

```
                         ┌────────────────────────────────────────────────┐
                         │             CROSS-CUTTING RAILS                 │
   THE SPINE             │  • Constraints  (time·equipment·schedule·       │
   (top-down reasoning)  │     injury·recoverability)  — bound EVERY step  │
                         │  • Training history & learned priors            │
                         │     (population → sport → athlete)              │
                         │  • Confidence  (attached to every decision)     │
                         └────────────────────────────────────────────────┘
   Athlete model                       (who they are — capability per QUALITY, not muscle)
      ▼
   Performance goal  ─────────────▶ resolves to ▼
      │                                Demand profile   (qualities · energy systems · movements)
      ▼                                     │
   Sport demands ◀───────────────────────────┘
      ▼
   Position / event demands            (modifies the demand profile)
      ▼
   Individual demands                  (this athlete's specifics)
 ══════════════════ THE PIVOT: DIAGNOSIS ══════════════════
   Limiting factors        ← the gap: demand − capability, × trainability-now × injury-risk
      ▼
   Priority qualities      ← which gaps to close now, highest return first (small k)
 ═══════════════════════════════════════════════════════════
   Adaptation targets      ← the physiological change that closes each gap   (SEPARATE from exercise)
      ▼
   Movement / quality requirements   ← force-velocity, contraction, pattern — BEFORE naming an exercise
      ▼
   Training strategy       ← concurrency & sequencing (interference management)
      ▼
   Block objective (mesocycle)   ← one dominant adaptation per block
      ▼
   Weekly objective (microcycle) ← loading pattern around the fixed sport schedule
      ▼
   Session objective       ← one named purpose per session
      ▼
   Intervention selection  ← minimum-effective exercises/doses that drive the target adaptation
      ▼
   Dose assignment         ← sets·intensity·reps·tempo — volume computed as OUTPUT
      ▼
   Scheduling              ← place on days; recovery/interference optimal
      ▼
   Validation              ← recoverable? sport-safe? lawful? — construction proposes, validation disposes
      ▼
   Runtime adaptation      ← reshape PENDING work to reality (respect freezes)
      ▼
   Monitoring & learning   ← check the hypothesis; update priors; sharpen the next loop
```

## 1.3 The four improvements over the brief's flat chain (and why each is non-negotiable)

1. **Diagnosis is elevated to the pivot.** Everything above it is *understanding*; everything below is *response*. The current engine omits this layer entirely, so "priority" is a hard-coded emphasis multiplier with no reasoning behind it (Baseline Art-5 conflict; EDS A2). Without an explicit limiting-factor diagnosis the engine can say *that* it down-weights a runner's chest but never *why* — and cannot be explained (Constitution Art 14) or overridden.
2. **Adaptation target is separated from exercise.** The brief (and the current engine) jump from emphasis straight to exercise. A coach decides the *adaptation* ("develop reactive strength") and the *movement requirements* ("high-velocity, short ground-contact, elastic loading") *before* naming an exercise (Constitution Art 6; EDS P5/P7). This makes interventions substitutable and explainable.
3. **Constraints, history/priors, and confidence become cross-cutting rails, not rungs.** They bound and inform *every* level — a constraint (injury, equipment, schedule) is computed *first* and shapes construction (Constitution Art 19 constraints-before-content), not applied as a post-filter.
4. **The chain is a loop, not a pipeline.** The athlete is non-stationary; their limiting factors change as they develop. Re-diagnosis triggers at block boundaries and on significant events (injury, goal change, sustained readiness shift). A static plan is a coaching failure by month two.

## 1.4 The chain, executable

This chain is not a metaphor — it is the literal decision graph of Part 2. Each rung is one or more pure decisions (D1–D16). "Monitoring & learning" splits into runtime adaptation (D15, a read-time projection over the immutable plan) and asynchronous learning (D16, which updates priors, never plans). The three cross-cutting rails are: the **Constraint framework** (EDS §36), the **three-tier prior model** (EDS §25), and the **Confidence model** (EDS §28) — present at every decision.

---

# PART 2 — Decision Catalogue

The sixteen decisions the future engine must make, in dependency order (EDS §20), each in the brief's required template. Every output additionally carries a plain-English **rationale** (Constitution Art 14) and a **confidence** (Art 13). Doses/thresholds live in knowledge, not here — this catalogues *the decisions*, not their parameters.

Legend for the compressed fields below: **In** = inputs · **Know** = knowledge consumed · **Constr** = constraints that bound it · **Out** = output · **Cons** = downstream consumers · **Conf** = confidence requirement · **Expl** = explainability requirement · **Valid** = validation requirement · **Fail** = failure modes.

### D1 · Athlete Assessment
- **Purpose** Build the structured model of who this athlete is now.
- **In** onboarding, tracked lifts, history, demonstrated qualities (from logs), demographics, learned priors. **Know** Athlete (quality-estimation rules), Quality taxonomy, Evidence. **Constr** none (root). **Out** athlete model: capability *per quality* + confidence, training age, competency, equipment, availability, injuries, goal. **Cons** D2, D4, all. **Conf** per-attribute (high if measured, low if inferred); whole-model confidence grows with data. **Expl** must state which capabilities are measured vs inferred. **Valid** sanity bounds on inputs (age/BW/lift ranges). **Fail** sparse onboarding → many low-confidence estimates → wider downstream margins, never a halt.

### D2 · Demand Resolution
- **Purpose** Determine what the goal/sport requires, as a structured demand profile. **In** goal/sport (+event/season/intent). **Know** **Sport (SKB)** demand profile, or goal-as-sport profile for build goals. **Constr** — **Out** demand profile: ranked quality requirements, energy-system targets, key movements, injury-risk map, season context. **Cons** D3, D4, D6, D7, D11. **Conf** inherits SKB section confidences. **Expl** "your sport most requires X, Y, Z." **Valid** demand-profile schema (energy-system %s sum ~100). **Fail** sport stub/unknown → generic athletic demand profile + low confidence; never invent demands.

### D3 · Position / Individual Demand Refinement
- **Purpose** Refine demand for position/event and personal specifics. **In** demand profile (D2), position/event, individual notes. **Know** SKB positions/developmentPriorities. **Out** refined demand profile. **Cons** D4. **Conf** position modifiers carry SKB confidence; individual refinements grow with data. **Expl** "as a [position] your demand shifts toward …". **Valid** pass-through safe when no position. **Fail** missing position → pass-through.

### D4 · Limiting-Factor Diagnosis  ★ the pivot
- **Purpose** Identify what most constrains sport performance now. **In** athlete model (D1), refined demand (D3), injury status, recent performance. **Know** Quality (targets/trainability), Injury (risk), SKB. **Constr** injury, season, recoverability (trainability-now). **Out** ranked limiting factors, each with magnitude + rationale + confidence. **Cons** D5. **Conf** driven by weakest input (current-level estimates often low early). **Expl** REQUIRED and central — every recommendation traces here. **Valid** a diagnosis must always exist (a generic athlete has generic limiters). **Fail** no measured levels → diagnose from population priors + sport risk, low confidence, conservative priorities; *never no diagnosis*. **Example** "low eccentric-hamstring capacity is this runner's top limiter (injury + performance)."

### D5 · Priority-Quality Selection
- **Purpose** Choose the small set (k≈1–3) of qualities to develop this block for highest return. **In** ranked limiters (D4), season/phase, recoverability budget, concurrency constraints. **Know** Quality (compatibility/prereqs), Programming. **Constr** sport-protection (L1), recoverability (L3), competency (L4). **Out** priority qualities, ordered, each tracing to a limiter. **Cons** D6, D7, D9. **Conf** inherits diagnosis; lower confidence → fewer priorities, more conservative. **Expl** "we're prioritising X because it's your top limiter and trainable now without harming your sport." **Valid** priorities compatible (no max-strength + max-endurance crammed). **Fail** conflicting high-priority limiters → sequence across blocks, don't cram.

### D6 · Training Strategy
- **Purpose** Decide the macro approach: sequencing + concurrency management. **In** priority qualities (D5), demand (D2), constraints, history. **Know** Programming (concurrent-training/interference models). **Out** strategy: sequencing rules, concurrency model, develop/maintain map. **Cons** D7, D8, D11, D13. **Conf** strong evidence base (usually high). **Expl** "strength before conditioning, spaced from your key runs." **Valid** interference law respected. **Fail** over-constrained schedule → prioritise sport-protection + top quality; record the down-scope (Art 15).

### D7 · Periodisation / Block Objective
- **Purpose** Structure the macrocycle into blocks, each with one dominant objective. **In** strategy (D6), priority qualities (D5), competition calendar, history, priors. **Know** Programming (periodisation models), Recovery (recoverability). **Out** periodised blocks: objective, length, trajectory, deloads, taper. **Cons** D8. **Conf** periodisation-beats-none is strong; exact lengths heuristic. **Expl** "off-season builds a max-strength base; a taper precedes your event." **Valid** taper holds intensity; deloads placed by objective+recoverability not a fixed template. **Fail** no event date → rolling block model + conservative deload rhythm.

### D8 · Weekly Objective (microcycle)
- **Purpose** Give each week a loading pattern around the fixed sport schedule. **In** block (D7), strategy (D6), sport schedule, fixture congestion. **Know** Programming (microcycle templates), Sport (season/microcycles). **Constr** fixed sport schedule (individual/team). **Out** weekly objective: per-day intent, volume/intensity targets, sport-aware spacing. **Cons** D9, D13. **Conf** moderate–high. **Expl** "heavy lower away from your Saturday match." **Valid** sport-compatibility (gym never compromises a key sport session). **Fail** fixture clash → sport wins; gym moves or lightens (L1).

### D9 · Session Objective
- **Purpose** Give each session exactly one purpose (L7). **In** weekly objective (D8), priority qualities (D5), day intent. **Know** Quality, Programming. **Out** session objective: named purpose + target quality + intensity zone + fatigue budget. **Cons** D10, D11, D12, D14. **Conf** inherits weekly/priority. **Expl** the session title = its purpose. **Valid** purpose-coherence (content matches title). **Fail** two competing purposes → split or pick one; never a muddled session.

### D10 · Movement / Quality Requirements
- **Purpose** Translate the objective into movement/loading characteristics — before naming an exercise (P5). **In** session objective (D9), demand movements (D2), injury contraindications. **Know** Quality (adaptation→movement), Exercise (force-velocity vocabulary), Injury. **Constr** contraindicated patterns subtracted UP FRONT (L8). **Out** movement/quality requirements. **Cons** D11. **Conf** inherits objective. **Expl** "we need heavy-slow hip-hinge + eccentric loading." **Valid** requirements exclude contraindicated patterns. **Fail** all ideal patterns contraindicated → best available transfer + recorded compromise.

### D11 · Intervention Selection
- **Purpose** Choose the minimum-effective set of interventions that satisfy the requirements (P3, P5). **In** movement/quality requirements (D10), constraints. **Know** Exercise (adaptation-/cost-tagged, transfer ratings), SKB exerciseLibrary, Injury (prevention). **Constr** equipment, time, competency, injury. **Out** selected interventions, ordered, each tracing to a requirement + quality. **Cons** D12, D14. **Conf** exercise transfer ratings carry knowledge confidence. **Expl** the *value-ordered* candidates + why each was chosen/rejected (Art 14 "alternatives rejected"). **Valid** value-ordered fill with a STOPPING rule (§34 value hierarchy); beyond the recoverable dose, bank the time (L5). **Fail** sparse equipment → best available regressions; never empty or junk-filled.

### D12 · Dose Assignment
- **Purpose** Assign sets/intensity/reps/tempo — the minimum-effective dose for the target adaptation (P3, P7). **In** selected interventions (D11), session objective+zone (D9), readiness (runtime), dose-response priors (learning). **Know** Quality (dose-response), Programming (schemes), Recovery. **Constr** recoverability budget, readiness. **Out** dosed session (sets×intensity×reps×tempo×rest). **Cons** D14, D13. **Conf** dose-response direction strong; magnitudes athlete-specific (sharpen via learning). **Expl** "the smallest dose expected to drive the adaptation, eased for today's readiness." **Valid** volume computed as OUTPUT then handed to validation as a ledger; readiness scales **volume AND intensity**. **Fail** unknown tolerance → conservative dose + observe.

### D13 · Scheduling
- **Purpose** Place sessions on days to optimise recovery / minimise interference (already strong today). **In** dosed sessions, weekly spacing constraints (D8), sport schedule. **Know** Programming/Recovery (interference/spacing rules). **Out** scheduled week. **Cons** D14. **Conf** high. **Expl** "spaced so heavy legs don't stack." **Valid** spacing/interference penalties minimised. **Fail** too many sessions → greedy placement + flag suboptimal spacing.

### D14 · Validation  ★ construction proposes, validation disposes
- **Purpose** Verify the constructed week is recoverable, sport-safe, balanced, lawful, scientifically consistent (Constitution Art 19). **In** scheduled dosed week. **Know** Validation (validators + thresholds), Recovery, Injury, Evidence, Laws. **Out** validated week + a **validation report** (passed / trimmed / vetoed + why). **Cons** athlete (render), D15. **Conf** each validator carries its own; safety validators act even at moderate confidence. **Expl** the report feeds the athlete explanation + no-silent-debt (Arts 14, 15). **Valid** IS the validation layer — 16 validators (§35): recoverability, sport-compat, balance, joint/spinal/neural load, MRV, redundancy, equipment, duration-honesty, constraint-compliance, competency, contraindication, scientific-consistency, purpose-coherence, lawfulness. Conflicts resolve by the conflict order (§37). **Fail** irreconcilable constraints → safest satisfiable session + surfaced compromise; never silently ship unsafe/unlawful.

### D15 · Runtime Adaptation (reflow)
- **Purpose** Reshape *pending* work to reality, over the immutable plan (L10). **In** immutable plan, what was done, today's readiness (subjective-weighted, intensity-aware), load (absolute+change), active injuries (as inputs), freezes, sport decision rules. **Know** Recovery, Injury, SKB decisionRules. **Constr** freezes (committed sessions never reshaped), recoverability. **Out** adapted pending sessions (read-time projection). **Cons** athlete, D16. **Conf** bounded by readiness/load confidence; symmetric (ease *or* progress). **Expl** the adaptation banner + reason. **Valid** re-runs D9–D14 for pending only; missed *adaptation* re-prioritised (not just missed volume). **Fail** missing signals → fall back to baseline plan; never a broken/empty week.

### D16 · Learning
- **Purpose** Update beliefs so the next loop is better (P9). **In** prescribed vs actual (completion/loads/RPE), readiness responses, performance change. **Know** Learning (three-tier priors), Evidence. **Out** updated priors (population/sport/athlete), each versioned + attributable. **Cons** D1, D4, D7, D12 (next pass). **Conf** low early → rising; confidence is itself learned. **Expl** "we increased your squat frequency because we learned you recover quickly." **Valid** priors staged + validated before promotion; runs OFF the planning critical path (never mutates a plan — L9). **Fail** noisy/sparse data → slow learning rate, wide posterior; never overfit one session.

> The catalogue is the brief's requested list, fully covered: *Identify Goal* (D1/D2), *Performance Outcomes/Model* (D2), *Limiting Factors* (D4), *Prioritise Adaptations* (D5), *Select Interventions* (D11), *Movement Patterns* (D10), *Exercise Candidates* (D11), *Programming Variables* (D12), *Validate Recovery/Structure/Load/Sport-Compatibility* (D14), *Schedule* (D13), *Monitor Adaptation* (D15/D16), *Recommend Adjustment* (D15). Nothing in the brief's decision list is unmapped.

---

# PART 3 — Decision Ownership Mapping

The Knowledge Architecture's canonical **eight-kind taxonomy** (§2) is: **Knowledge · Decision Logic · Inference · Calculation · Stored Data · Derived Data · Assumption · Prediction** — every datum is exactly one kind, decided by the §2.2 classification test (*fact-with-citation → Knowledge; combining-code → Decision Logic; judgement-under-uncertainty → Inference; exact-computation → Calculation; recorded-about-this-athlete → Stored Data; computed-and-recomputable → Derived Data; acted-on-but-uncited → Assumption/flag; future-estimate → Prediction*). The governing hard-coding test: *if you are about to write Knowledge into Decision Logic — stop; it belongs in a knowledge module.*

Below, each decision is classified on the **brief's ownership axis** (Knowledge/Rule/Calculation/Inference/Optimisation-driven · Coach-configurable · Athlete-specific · Learning-enhanced · Immutable) and tagged with its dominant KA kind(s). The rule this prevents: **hard-coded coaching logic.** A decision's *reasoning* is Decision Logic / Inference / Calculation (code); every *coaching fact* it reasons from is Knowledge (data); every *preference* is configuration; every *athlete fact* is Stored Data and every *computed artefact* is Derived Data — never inlined. (Note: "optimisation" and "validation" are engine *functions* in the brief's/​TAS framing, not distinct KA kinds — D11's selection is Decision Logic with an optimisation character; D14's validation is Decision Logic reading the Validation domain.)

| Decision | Primary kind(s) | Rule/Calc/Infer/Optim driven | Coach-config | Athlete-specific | Learning-enhanced | Immutable core? | Why |
|---|---|---|---|---|---|---|---|
| D1 Assess | Inference + Calculation | Inference (estimate qualities) | no | **yes** | **yes** (priors sharpen) | logic immutable; estimates from Knowledge | estimation *rules* are code; the *standards/priors* are Knowledge |
| D2 Demand | **Knowledge-lookup** | Rule (read SKB) | no | via position (D3) | sport priors (D16 outer tier) | logic immutable | contains **zero** sport code — reads the SKB registry |
| D3 Position | Knowledge-lookup + Inference | Rule | no | **yes** | yes | immutable | position modifiers are SKB data |
| D4 Diagnose ★ | **Inference** | Inference (gap × trainability × risk) | coach may override the diagnosis | **yes** | **yes** (the big learning target) | logic immutable | the gap *formula* is code; the *targets/risks* are Knowledge; confidence governs authority |
| D5 Prioritise | Decision Logic + Optimisation | Optimisation (rank, constrained) | coach may re-prioritise | **yes** | yes | immutable | selection is bounded + explainable, never a black box |
| D6 Strategy | Decision Logic (Rule) | Rule (interference laws) | coach-configurable philosophy | partial | yes | immutable | interference *laws* are Knowledge (strong evidence) |
| D7 Block | Decision Logic + Calculation | Rule + Calc | coach-configurable | **yes** | yes | immutable | periodisation *models* are Knowledge, selected not hard-coded |
| D8 Week | Decision Logic | Rule | **coach supplies the schedule (constraint)** | **yes** | partial | immutable | microcycle templates are Knowledge |
| D9 Session | Decision Logic | Rule | coach may rename/override | yes | partial | immutable | one-purpose law (L7) |
| D10 Movement | Inference (Rule) | Rule (adaptation→movement map) | no | via injury | no | immutable | mapping is Quality/Exercise Knowledge |
| D11 Select ★ | **Optimisation** (bounded) | Optimisation (value-ordered + stop) | coach override; athlete substitution | **yes** | yes (transfer priors) | immutable | value hierarchy is Knowledge; never volume-fill |
| D12 Dose | Calculation + Inference | Calc (dose from model) | coach override | **yes** | **yes** (dose-response priors) | immutable | dose-response *curves* are Knowledge |
| D13 Schedule | Optimisation (Calculation) | Optim (minimise penalty) | coach constraints | partial | no | immutable | spacing rules are Knowledge |
| D14 Validate | **Validation** | Rule (pass/trim/veto) | no (safety is not configurable) | via athlete state | no | **immutable + absolute** | validators + conflict order are the safety layer; laws never configurable |
| D15 Reflow | Decision Logic (re-runs D9–D14) | Rule | no | **yes** | yes | immutable | one adaptor sharing decisions; freezes honoured |
| D16 Learn | **Learning** | Inference (Bayesian/shrinkage) | no | **yes** | (is the learner) | logic immutable; priors are data | writes priors only; off the critical path |

**Ownership rules that fall out (the anti-hard-coding contract):**
- **Nothing that is a coaching *fact* lives in a decision.** Landmarks, dose-response curves, transfer ratings, interference laws, taper magnitudes, injury contraindications, readiness weights → all **Knowledge (L2)**, versioned + provenance-tagged. A decision reads them; it never inlines them.
- **Coach/athlete *preferences* are configuration/overrides, never Knowledge and never code** (TAS §9): a coach's default philosophy and standing overrides are athlete-scoped config; the coach's fixed schedule is a *constraint* into D8/D13.
- **Safety is immutable and non-configurable** (D14 validators + the conflict order = the Engine Laws compiled). No feature flag may change reasoning (TAS §9 rule 2).
- **Confidence governs authority everywhere** (Art 13): contested facts are *soft inputs*, never gates — enforced in code, not comments.

---

# PART 4 — Current → Future Mapping

Every existing decision/module from the Baseline Assessment (§5), mapped to its future decision + module, with strategy (**Retain / Refactor / Replace / Remove / Unknown**), complexity, risk, and dependencies.

| Current decision (Baseline) | Current module | → Future decision | → Future module | Strategy | Complexity | Risk | Depends on |
|---|---|---|---|---|---|---|---|
| Goal → style (D-a) | `strength/program.js` | D2 Demand (goal-as-sport profile) | `knowledge/qualities` + goal profiles | **Replace** | M | med | quality model |
| Per-muscle emphasis (D-b) | `program.js` + `sports/*` | D2/D10 (derived from demand) | `knowledge/sports` (SKB) | **Replace** (derive from SKB, retire vectors) | M | med | SKB wired |
| Volume scalar (D-c) | `sportLoad.js` | D12 Dose (recoverability-bounded) | `knowledge/recovery` + D12 | **Refactor** | S | low | recovery model |
| Weekly per-muscle target / MEV→MAV ramp (D-d) | `strength/targets.js` | Downstream **ledger** for D14 validation | `validation/*` (MRV) + `knowledge/base` (landmarks) | **Refactor** (from driver → guardrail) | L | high | quality model, validators |
| Periodisation template (D-e) | `plan/periodization.js` | D7 Block objective (reasoned) | `knowledge/programming` + D7 | **Refactor** | M | med | strategy model |
| Split selection (D-f) | `plan/split.js` | D8/D9 (weekly + session objective) | `knowledge/programming` + D8/D9 | **Replace** | M | med | demand, strategy |
| Frequency default (D-g) | `plan/frequency.js` | D8 (derived from dose/recoverability) | D8 + `knowledge/recovery` | **Refactor** | S | low | recovery |
| Exercise selection/scoring (D-h) | `plan/allocator.js` (bestExercise) | D11 Intervention selection (value-ordered) | `decisions/D11` + `knowledge/exercises` | **Refactor** (deficit-fill → transfer-per-fatigue value order) | L | high | quality/exercise tagging |
| Set counts / rep-RPE scheme (D-i,D-j) | `allocator.js` (scheme) | D12 Dose | `knowledge/programming` (schemes by quality) + D12 | **Refactor** (schemes → Knowledge keyed by quality, not style) | M | med | quality model |
| Rest / supersets / structure (D-k,D-l) | `allocator.js` | D12/D13 | `knowledge/programming` + D13 | **Retain** (re-home) | S | low | — |
| Session title (D-m) | `allocator.js focusLabel` | D9 (purpose-named) | D9 | **Replace** (region label → purpose) | S | low | session objective |
| Session duration (D-n) | `allocator.js` | D14 duration-honesty validator | `validation/*` | **Retain** (re-home as validator) | S | low | — |
| Weekly MRV ceiling (D-o) | `allocator.js` (in selection loop) | D14 MRV validator (separable) | `validation/*` | **Refactor** (extract from construction) | M | med | validator suite |
| Stimulus credit (D-p) | `strength/stimulus.js` | D14 ledger input | `knowledge/exercises` + `validation` | **Retain** | S | low | — |
| Suggested weights / e1RM autoreg (D-q) | `liftProgression.js`, `exerciseLoad.js` | D12 + D16 (progression anchored to demonstrated rate) | `knowledge/programming` + `learning/*` | **Retain + extend** | M | low–med | learning seams |
| Axial management (D-r) | `plan/axial.js`, `despine.js` | D13 + D14 spinal validator | `validation/*` + D13 | **Retain** (re-home) | S | low | — |
| Scheduling / interference (D-s) | `plan/scheduler.js` | D13 Scheduling | `decisions/D13` | **Retain** (G-grade today) | S | low | — |
| Readiness (D-t) | `Readiness.js` + `buildView` | D-in / D15 input, **in the engine** | `knowledge/recovery` + engine `deriveReadiness` | **Refactor** (move out of the store; subjective-weighted) | M | med | recovery model |
| ACWR / load (D-u) | `trainingLoad.js`, `load.js` | soft input to D15 (non-gating) | `knowledge/recovery` + Confidence model | **Retain + finish demotion** | S | low | confidence operative |
| Adaptive deload (D-v) | `trainingLoad.js` deloadRecommendation | D15 (+ intensity-aware) | `decisions/D15` | **Refactor** | M | med | recovery model |
| Current-week reflow (D-w) | `PlanService.adaptedPhases` | D15 (pure, in engine, re-runs D9–D14) | `decisions/D15` | **Refactor** (into engine; retire duplicated math) | L | med | engine boundary |
| Freeze-on-commit (D-x) | `sessionOverrides` + store | D15 freeze (portable) | `decisions/D15` + persistence | **Retain + make portable** | M | low | portable state |
| Injury filtering (D-y) | `injury/*` (post-hoc) | D10/D11 input + D14 net | `knowledge/injuries` (registry) + validators | **Refactor** (post-filter → pre-shape) | M | med | constraints-first |
| SKB decision rules (D-z) | `sportKnowledge/*` | D15 (+ D2/D3/D4/D8/D11 consume more SKB) | `knowledge/sports` | **Retain + expand consumption** | L | med | SKB primary |
| — (absent) | — | **D4 Diagnose, D5 Prioritise, D10 Movement-reqs** | `decisions/D4,D5,D10` | **Build (new)** | L | high | quality model |
| — (absent) | — | **D16 Learning** | `learning/*` | **Build (new, deferred)** | L | med | learning seams |
| Vestigial plan tables; scheduler endurance branch; `TrainingCalendar`; `exerciseDemos` refs | schema / scheduler / app / docs | — | — | **Remove** (confirm-then-retire) | S | low | Sprint-1 §22 |

**Preserve outright** (Baseline §20 / EDS §18 assets — invariants *through* the migration): pure/deterministic `generatePlan` + golden-master (G1); fractional-set accounting as the ledger (G2); the injury subsystem's data-driven pattern (G3); the evidence KB with provenance (G4); the SKB schema (G5); freeze-on-commit (G6); privacy-by-validation (G8); stable session keys + epoch guard (G9).

---

# PART 5 — Knowledge Migration Plan

Every piece of coaching knowledge currently embedded in code/constants/JSON, mapped to a future knowledge domain (Knowledge Architecture's 12 domains). **Goal: knowledge lives in versioned repositories with provenance, never in decision logic.** Every entry carries `{id, value, appliesTo, evidenceLevel(L1–L5), confidence, source, lastReviewed}` (EDS §26.2).

| Knowledge item | Current location | Kind today | → Future domain | Effort | Priority | Risk | Depends on |
|---|---|---|---|---|---|---|---|
| Exercise catalogue (~118) | `engine/data/strengthExercises.js` | code objects | **Exercise** | M | high | low | add adaptation/cost tags |
| Adaptation/quality tags (sparse) | exercise `quality` field (~25) | code | **Quality&Adaptation** + Exercise | L | **highest** | med | build the taxonomy |
| MEV/MAV/MRV landmarks | `data/muscleVolume.js` ← `kb` | **already Knowledge** | Evidence + Validation (ledger caps) | S | high | low | mark low-confidence at high end |
| Pattern→muscle contribution | `data/muscleVolume.js` | code table | Exercise (ledger) | S | med | low | — |
| Second muscle model | `data/exerciseSimilarity.js` | code | **merge into Exercise** (one source) | S | med | low | reconcile duplication |
| Rep/RPE schemes | `allocator.js scheme` | **code literals** | **Programming** (keyed by quality, not style) | M | high | med | quality model |
| STYLE_TOP / level ramps | `strength/targets.js` | code literals | Programming + Evidence | S | high | low | — |
| Scoring multipliers (×1.35, ×1.15, 0.6+0.9·urgency, overshoot 0.1) | `allocator.js` | **magic numbers** | Programming (value hierarchy) + Evidence | M | high | med | D11 refactor |
| Frequency sweet-spot (=32) | `plan/frequency.js` | magic number | Programming | S | med | low | — |
| CNS/axial tiers + caps | `allocator.js`, `axial.js` | code | Exercise (cost) + Validation | S | med | low | — |
| Rest values | `allocator.js restForRole` | code | Programming | S | low | low | — |
| Sport emphasis vectors + priority lists + season blocks | `engine/lib/sports/*` (6) | **code (duplicates SKB)** | **Sport (SKB)** — derive/retire | M | high | med | SKB wired (M7) |
| SKB profiles (24 sections × 10) | `data/sport-knowledge/*.json` | JSON (mostly dormant) | **Sport (SKB)** — wire to D2/D3/D4/D8/D11 | L | high | med | decision layer (M6) |
| Evidence KB (thresholds, reliability, landmarks) | `knowledge/entries.js` | Knowledge | **Evidence & Confidence** — make operative everywhere | M | **highest (M1)** | low | confidence tiers |
| Injury profiles/taxonomy/rehab (14 regions) | `injury/profiles.js` + `data/*` | Knowledge (exemplar) | **Injury** (registry) — becomes an *input* | S | high | low | constraints-first (M4) |
| Readiness weights (60/40, bands, ±200%) | `recovery.js`, `Readiness.js`, `indices/*` | code | **Recovery/Fatigue/Load** | M | high | med | recovery model (M2) |
| ACWR bands/policy | `kb` + `trainingLoad.js` | Knowledge (low-conf) | Recovery + Evidence (soft input) | S | high | low | finish demotion (M1) |
| Strength standards (1RM/BW) | `liftProgression.js` + app `strengthStandards.js` | two code tables | **Athlete** (estimation) + Programming (progression) | S | med | low | reconcile duplication |
| Form-guide content (~40) | app `exerciseLibrary.js` | code + regex | Exercise (or a presentation domain) | M | low | low | key by id not name |
| Validators + thresholds + conflict order | scattered in allocator/injury/store | code | **Validation** | L | high | med | validator extraction (M3) |
| Movement patterns / demands | implicit in `pattern` field + SKB | code + JSON | **Movement** | M | med | med | quality model |
| Constraint computation (equipment/level/days/schedule) | `constraints.js` + allocator gates | code | **Constraint** | M | med | low | constraints-first |
| Learning priors (recovery rate, tolerance, dose-response) | absent (only lift autoreg) | — | **Learning** | L | med | med | learning seams (M9) |

**Sequencing principle (EDS §41.3):** *wire the knowledge you already have before authoring more.* The evidence KB and SKB are authored and inert — the highest-leverage early work (M1, M7) is *consumption*, not creation. The one genuinely new authoring effort is the **Quality & Adaptation domain** (M5) — the missing organising primitive on which D4–D10 depend.

---

# PART 6 — Future Module Map

## 6.1 The central correction: there is ONE engine, not many

The brief proposes ~13 "engines" (Assessment Engine, Performance Model Engine, Constraint Engine, Limiting Factor Engine, Adaptation Planner, …). **The TAS (§3.1) explicitly rejects splitting these into separate deployable engines**, because doing so would fragment the pure deterministic core across boundaries (forfeiting determinism + golden-master testability — Constitution Art 18) and reintroduce the duplication the EDS exists to remove. **"Assessment," "Planning," "Validation," "Recovery," "Readiness," "Recommendation" are decisions D1–D16 *within* one engine, not engines.** "Exercise/Sport/Evidence Library" are *knowledge domains*, not engines. What *are* genuinely separate modules: things with a different runtime, trust boundary, or scaling profile (identity, persistence, wearable ingestion, learning pipelines, surfaces).

So the module map is organised by the **TAS six layers**, with the engine internally structured as the EDS §39 responsibility map.

## 6.2 The modules

**L1 — The Engine (`@performance-os/engine`, pure, isomorphic)**

| Module | Purpose | Inputs | Outputs | Deps | Knowledge consumed | Config | Testing | Success criteria |
|---|---|---|---|---|---|---|---|---|
| `core/orchestrator` | Run the decision graph; compose decisions; assemble explanations | AthleteState, KnowledgeSet, Priors | Plan/AdaptedWeek + trace + provenance stamp | decisions, knowledge, validation | none (coordinates) | none (no reasoning flags) | integration + golden-master | runs D1–D16; holds zero domain knowledge |
| `core/contracts` | Typed, runtime-validated boundaries for every decision | decision I/O | pass/fallback+audit | — | — | dev/CI strict, prod lightweight | contract tests | no boundary un-typed; graph can't degrade to implicit pipeline |
| `decisions/D1–D16` | The pure decision functions (Part 2) | typed per decision | `{output, confidence, rationale}` | knowledge (read) | per decision (Part 2) | none | unit + golden-master + property (purity) | each independently testable + substitutable |
| `knowledge/athlete` | Athlete-model schema + quality-estimation rules | — | schema/registry | — | Evidence | — | schema + invariant | qualities estimable with confidence |
| `knowledge/sports` (SKB registry) | Per-sport demand models (24-section) + registry | JSON | demand profiles | — | self | — | schema + privacy + invariant (energy %s) | add a sport = file + registry line |
| `knowledge/qualities` | Quality/adaptation taxonomy + dose-response + assessment + prereqs | — | quality entries | — | Evidence | — | invariant (no label without dose+assessment) | D4–D12 can reason in qualities |
| `knowledge/exercises` | Intervention library (adaptation/cost-tagged) + substitution graph | — | exercise entries | — | Evidence | — | schema | select by transfer-per-fatigue, not muscle-fill |
| `knowledge/recovery` | Readiness/recoverability models + weights (subjective≥objective) | — | recovery entries | — | Evidence | — | invariant | derived signals contain no raw vitals |
| `knowledge/programming` | Periodisation/scheme/progression/deload/taper + value hierarchy | — | programming entries | — | Evidence | — | invariant (taper holds intensity) | schemes keyed by quality, not style |
| `knowledge/injuries` (registry) | Taxonomy, contraindications, rehab, prevention | — | injury profiles | — | Evidence | — | schema (exemplar exists) | injuries are an *input*, not a post-filter |
| `knowledge/base` | Cross-cutting evidence + the Confidence model | — | evidence entries | — | self | — | freshness watchdog | confidence operative everywhere |
| `validation/*` | The validators (§35) + conflict resolution (§37) | constructed week | pass/trim/veto + report | knowledge | Validation domain | thresholds are Knowledge | per-validator unit + golden | any construction path (incl. AI) must pass |
| `learning/*` | Prior estimation & update (D16); three tiers | outcomes | versioned priors | — | Learning | learning rates (reviewed) | backtest + privacy | off the critical path; never mutates plans |

**L3 — Orchestration (`orchestration`, impure adapter — successor to PlanService)**: fetch AthleteState + pin KnowledgeSet/engine version + load Priors → invoke L1 → cache derived artefacts (signature-keyed) → persist state/outcomes/priors/freezes → dispatch AI off the critical path → emit traces. **Zero coaching logic, zero mutable globals.** Success: nothing here resembles a decision.

**L4 — Platform services**: Identity/Auth (Supabase), **Membership & Access** (teams/team_members + `is_coach_of()` additive RLS — new), Persistence & Sync (state + priors + **portable freezes**), Wearable ACL (queued provider adapters), API Gateway, Notifications, Audit. Success: raw vitals owner-only; the derived coach surface is the *only* boundary crossing, computed server-side.

**L5 — Learning & Research** (off request path): Athlete Learning, Population Learning (privacy-preserving), Experimentation, Model Training. Writes priors the engine reads.

**L6 — Experience**: player app + coach dashboard render engine outputs + explanations; **compute no coaching**; both consume the SAME L1/L2 (the coach dashboard renders the engine's `rollUp()`, retiring its hand-ported TS logic).

## 6.3 Why this map is right (the extensibility test)
The things most likely to be added require touching the least (EDS §40.3): a new sport = a JSON file + a registry line; a new quality = a taxonomy entry + dose model; endurance programming = new *interventions* driving energy-system qualities (no new engine); an AI layer = a substituted decision behind its contract, gated by validators; the Team package = a constraint source + a derived read surface. Any addition that demands an engine-core edit signals knowledge has leaked into logic.

---

# PART 7 — Migration Waves

## 7.1 Reconciling three sequences

Three sources propose an order: the brief's example (Knowledge Extraction → each "engine" in turn), the **EDS §41 (M0–M10)**, and the **TAS §17 (9 steps)**. The brief's example is sub-optimal in two ways the governing docs correct: (a) it front-loads building each "engine" before shipping value, and (b) it doesn't exploit that the **highest-leverage early work is consumption of already-authored knowledge, not creation**. The governing insight (EDS §41, Constitution Art 20, TAS §16.5): **M1–M4 are high-value, low-risk corrections that ship immediately and are independent of the M5–M8 re-seating.** The definitive wave plan adopts the EDS M-numbering (the most detailed) and annotates each wave with its optimisation properties.

## 7.2 The waves (optimised for lowest-risk / highest-learning / fastest-feedback / max-reuse / min-debt)

| Wave | Goal | Ships value by | Fixes (Baseline/EDS) | Risk | Behaviour change | Independent of re-seat? |
|---|---|---|---|---|---|---|
| **W0 — Safety net** | Golden-master over an archetype matrix; **fix `npm test`; add a CI test gate** | making every later step safe (currently `npm test` is broken, no CI runs tests) | Baseline §17 tooling | low | none | — |
| **W1 — Confidence operative** | Wire the KB `confidence` into the three authority tiers platform-wide; finish demoting ACWR from the deload corroboration path | making contested science non-gating (Art 13) | S1, W6; Art 13 partial | low | small | ✅ |
| **W2 — Recovery honest** | Re-weight the readiness integrator so subjective ≥ objective *steers the plan*; illness/travel/stress first-class; readiness scales **intensity too** | fatigued athlete gets lighter *and* easier work | S2, A7; Art 12/13 | med | yes (reflow), gated | ✅ |
| **W3 — Validation-after-construction** | Extract the validators into one separable pass + the conflict order; centralise the MRV ceiling + intensity-holding taper as named validators | construction proposes / validation disposes (Art 19) | S3(arch), A6(partial); Art 19 | med | mostly structural | ✅ |
| **W4 — Constraints before content** | Injuries become an *input* to D10/D11 (not a post-filter); equipment/duration/title honesty | coherent injury-designed sessions | A6, L7/L8; Art 8/19 | med | yes | ✅ |
| **W5 — The quality model** | Build the Quality & Adaptation taxonomy + dose-response + assessments; tag exercises by adaptation/cost | the missing organising primitive | A1(begins), A3, S5; Art 5/6 | high | new capability (parallel to ledger) | the enabler |
| **W6 — The decision layer** | Introduce D4 (diagnosis), D5 (priority), D9 (session objective), D10 (movement reqs) reading the SKB demand profile | reasoning replaces re-weighting | A1–A4; Art 4/5 | high | the core re-seating | needs W5 |
| **W7 — SKB primary, emphasis retired** | D2/D11 read the SKB; derive muscle-emphasis from the demand profile; retire `lib/sports/*` | one sport model, not two | A4, A8; Art 17 | med | parity-gated | needs W6 |
| **W8 — Engine boundary clean** | Move reflow + derived-signal computation into the pure engine; one shared decision library; portable state/freezes; the 6-call public API | the engine becomes reusable by web/AI | A5, W1–W4; Art 18, TAS T7/T18 | med | structural, parity-gated | partly parallel to W1–W4 |
| **W9 — Learning seams** | Decisions read typed priors (population defaults first); begin athlete-specific estimation (D16) | the engine starts becoming *your* coach | enables P9/Art 16 | med | additive | needs W6 |
| **W10 — Position & individualisation** | D3 position refinement + individual demand signals | a goalkeeper ≠ a midfielder | A10 | low–med | additive | needs W6 |
| **W11 — Team surface + privacy** | teams/team_members + additive RLS; server-side `rollUp()`; coach dashboard renders it (retire `derive.ts`) | the Team package (near-term priority) | Art 11 unenforced; TAS T8/T19 | med | additive | parallel after W8 |

## 7.3 Sequencing logic (why this order)
- **W0–W4 first, and independent of the re-seating.** They make the *current* engine honest (confidence, recovery, validation, constraints) and each fixes a real defect the engine half-acknowledges — highest value-per-risk, fastest feedback, protected by W0's golden-master. The platform improves continuously rather than waiting on the big rebuild.
- **W8 (engine boundary) can run in parallel with W1–W4** — it is structural (move computation into the engine) and unblocks web/AI reuse; it does not need the quality model.
- **W5 → W6 → W7 is the re-seating** and must be sequenced: qualities before diagnosis (D4 needs qualities), diagnosis before SKB-primary (D2/D11 consume the demand profile the decision layer reasons over). Highest risk, gated by golden-master + parity tests.
- **W9–W11 unlock the long-term vision** (learning, individualisation, Team) and are additive once the decision layer exists. W11 (Team) may be pulled earlier if the Team package is prioritised — it depends only on W8 (engine boundary) + the derived-signal work in W2, not on the full re-seating.
- **Invariants through every wave** (never regress): determinism (G1), injury system (G3), SKB schema (G5), freeze-on-commit (G6), privacy-by-validation (G8).

---

# PART 8 — Sprint Backlog

Each wave decomposes into executable sprints — scoped for one-at-a-time execution by Claude Code, each shipping value and leaving the golden-master green. (A "sprint" here ≈ a self-contained, independently-mergeable unit with its own tests.)

### Sprint 0 — Safety net & CI gate  *(W0)*
- **Objective** Make regressions impossible to ship silently. **Scope** Fix `npm test` (points at a deleted file); add a CI job running the 84-file engine suite + golden-master on PR/push; document the archetype matrix. **Dependencies** none. **Deliverables** working `npm test`; green CI test gate; `UPDATE=1` golden-master workflow documented. **Validation** CI fails on an intentional golden-master diff. **Success** every subsequent sprint is guarded. **Risks** flaky date-dependent tests (mitigate: the suite already anchors to "today"). **Outputs** CI config + fixed scripts.

### Sprint 1 — Confidence tiers operative  *(W1)*
- **Objective** Make `confidence` govern authority everywhere. **Scope** A `confidence → {gate|soft|reported}` mechanism read by decisions; finish removing ACWR from the deload corroboration path; audit every threshold for its tier. **Dependencies** S0. **Deliverables** authority-tier helper; ACWR = reported/soft only; tests asserting no low-confidence value gates. **Validation** a golden-master delta only where intended (ACWR path). **Success** contested science provably non-gating. **Risks** subtle behaviour change in deload timing (gated). **Outputs** confidence layer + tests.

### Sprint 2 — Recovery model honest  *(W2)*
- **Objective** Subjective-weighted, intensity-aware recovery that steers the plan. **Scope** Re-weight the readiness integrator (subjective ≥ objective); model illness/travel/stress as graded state; make readiness scale **intensity and volume**; move readiness/load computation toward the engine boundary (prep for W8). **Dependencies** S1. **Deliverables** updated recovery domain + D12/D15 intensity scaling; reflow tests. **Validation** golden-master delta reviewed; parity where flags off. **Success** a fatigued athlete gets lighter *and* easier work. **Risks** behaviour-changing (reflow) — gate carefully. **Outputs** recovery knowledge + reflow update.

### Sprint 3 — Validator suite extracted  *(W3)*
- **Objective** Construction proposes; validation disposes. **Scope** Extract a `validation/*` module with the §35 validators (recoverability, sport-compat, MRV, equipment, duration-honesty, competency, contraindication, purpose-coherence, lawfulness, …) + the §37 conflict order; centralise the existing MRV ceiling + intensity-holding taper as named validators; emit a validation report. **Dependencies** S1. **Deliverables** validator module + report; D14 runs it. **Validation** per-validator unit tests; behaviour parity (MRV/taper already shipped). **Success** any construction path passes one safety layer. **Risks** re-homing subtle logic — parity tests. **Outputs** validators + report + tests.

### Sprint 4 — Constraints before content  *(W4)*
- **Objective** Injuries shape construction, not a post-filter. **Scope** Feed injury contraindications into D10/D11 up front; equipment/duration/title honesty; the injury post-filter becomes an edge-case net. **Dependencies** S3. **Deliverables** constraints-first selection; purpose-named titles. **Validation** a knee-injured archetype's session is *designed* around the knee (no strip-and-patch). **Success** coherent injury-aware sessions. **Risks** selection changes — golden-master gated. **Outputs** constraint framework + tests.

### Sprint 5 — Quality & Adaptation taxonomy  *(W5, may split into 5a/5b)*
- **Objective** Build the missing organising primitive. **Scope** Author the quality taxonomy (§31.1 families) with dose-response + assessment + prerequisites + confidence per quality (NO label without a dose+assessment); tag the exercise catalogue by adaptation/cost/force-velocity. **Dependencies** S3 (validators exist to check). **Deliverables** `knowledge/qualities` domain; adaptation-tagged exercises. **Validation** schema + invariant tests (every quality measurable+dosable); the volume ledger unchanged (parallel). **Success** the engine can *represent* "reactive strength." **Risks** scientific rigour (needs sports-science review — see Part 10 C3.1). **Outputs** quality domain + exercise tags.

### Sprint 6 — Diagnosis + priority (D4/D5)  *(W6a)*
- **Objective** Introduce the pivot. **Scope** D4 (limiting-factor diagnosis: demand−capability × trainability × injury-risk, with confidence) + D5 (priority selection, small k, constrained) reading the demand profile + quality model. **Dependencies** S5. **Deliverables** `decisions/D4,D5`; explanations trace to a limiter. **Validation** the two worked archetypes (EDS §22: in-season runner vs novice sprinter) produce *categorically different* diagnoses. **Success** the engine says *why*. **Risks** diagnosis on inferred levels = low confidence — must behave conservatively + be falsifiable (Part 10 C1.1/C3.2). **Outputs** D4/D5 + tests.

### Sprint 7 — Session objective + movement requirements (D9/D10)  *(W6b)*
- **Objective** Decide adaptation before exercise. **Scope** D9 (one named purpose/session) + D10 (movement/quality requirements before naming an exercise; contraindicated patterns subtracted up front). **Dependencies** S6. **Deliverables** `decisions/D9,D10`. **Validation** session titles = purposes; requirements exclude contraindications. **Success** interventions become substitutable + explainable. **Outputs** D9/D10 + tests.

### Sprint 8 — Intervention selection re-seated (D11)  *(W6c)*
- **Objective** Value-order by transfer-per-fatigue, not muscle-deficit fill. **Scope** Refactor the allocator's `bestExercise` into D11: value hierarchy (§34) with a stopping rule (bank beyond the recoverable dose); volume computed as *output* handed to the validators. **Dependencies** S5, S7. **Deliverables** `decisions/D11` consuming the quality/exercise model. **Validation** the runner no longer gets chest flyes; volume within MRV via validators (not selection-loop). **Success** minimum-effective, purpose-driven sessions. **Risks** the highest-complexity refactor (the 860-line allocator) — heavy golden-master + parity. **Outputs** D11 + tests.

### Sprint 9 — SKB primary, emphasis retired  *(W7)*
- **Objective** One sport model. **Scope** D2/D3/D11 read the SKB demand profile + transfer ratings; derive any needed muscle-emphasis from the demand profile; retire `lib/sports/*`; reconcile the three sport vocabularies to one canonical set. **Dependencies** S8. **Deliverables** SKB-primary demand resolution; `lib/sports/*` removed. **Validation** parity where the SKB reproduces prior behaviour; stubs (rugby/soccer) flagged, not silently degraded. **Success** no duplicated sport knowledge. **Outputs** demand resolution + retirement.

### Sprint 10 — Engine boundary + public API  *(W8, parallelisable with S1–S4)*
- **Objective** A pure, reusable engine. **Scope** The 6-call API (`plan/reflow/deriveReadiness/deriveLoad/validate/explain/rollUp`); move reflow + derived-signal computation into the engine; remove mutable `_runtime`; one shared decision library (retire the generator/reflow duplication); provenance stamp (engineVersion × knowledgeSetVersion). **Dependencies** S2 (recovery in engine). **Deliverables** engine public API; thin orchestrator. **Validation** cross-runtime determinism test; generator≡reflow parity test. **Success** apps/web + AI can call one engine. **Outputs** API + orchestrator refactor.

### Sprint 11 — Learning seams alive  *(W9)*
- **Objective** Reserve the learning channel. **Scope** D1/D4/D7/D12 read typed priors (population defaults first); begin athlete-specific estimation (recovery rate, volume tolerance) in `learning/*`, off the critical path. **Dependencies** S6, S10. **Deliverables** prior-typed decisions; a minimal athlete-learning estimator. **Validation** priors never mutate a plan; population defaults reproduce current behaviour. **Success** the seam is exercised before real learning exists. **Outputs** learning module + prior-typed decisions.

### Sprint 12 — Team surface + privacy enforcement  *(W11)*
- **Objective** The privacy-correct coach path. **Scope** teams/team_members + additive team-scoped RLS (extends `auth.uid()`); a server-side `rollUp()` producing `CoachVisibleStatus` (derived only); a **privacy validator that fails the build** on any raw-vital coach exposure; the coach dashboard renders `rollUp()` (retire `apps/web/lib/derive.ts`). **Dependencies** S10. **Deliverables** teams model + RLS tests + privacy validator + coach surface. **Validation** RLS tests before relying on any policy; the privacy validator fails on an injected raw-vital exposure. **Success** a coach sees "amber," never HRV. **Risks** highest-consequence area (one RLS mistake leaks health data). **Outputs** Team backend + validator + coach render.

*(Sprints 13+ — position/individualisation (W10), endurance interventions (EDS E2), the AI substitution seam (E3) — are queued behind the re-seating and the Team package, each a data/boundary addition per Part 6.3.)*

---

# PART 9 — Traceability Matrix

Every future module/decision traces up to a governing clause and down to a test. Nothing exists without justification.

| Future decision / module | Constitution | EDS | Ontology entity | Knowledge domain | Future module | Future test |
|---|---|---|---|---|---|---|
| D1 Assess | Art 5, 16 | §20 D1, §29 | Athlete, Capability, Quality | Athlete | `decisions/D1` | golden-master; capability-estimation unit |
| D2 Demand | Art 2, 3 | §20 D2, §30 | Sport, Demand Profile, Goal | Sport (SKB) | `decisions/D2` + `knowledge/sports` | demand-schema; energy-%s invariant |
| D3 Position | Art 3 | §20 D3 | Position/Event, Individual Demand | Sport | `decisions/D3` | position-modifier unit |
| **D4 Diagnose** | **Art 5** | §20 D4 (the pivot), §22 | **Limiting Factor** (Diagnostic Triangle) | Quality, Injury | `decisions/D4` | archetype-differentiation (runner≠sprinter) |
| D5 Prioritise | Art 5, 20 | §20 D5 | Priority Quality | Quality, Programming | `decisions/D5` | priority-compatibility unit |
| D6 Strategy | Art 2 | §20 D6 | Strategy | Programming | `decisions/D6` | interference-law unit |
| D7 Block | Art 6 | §20 D7, §34 | Block/Mesocycle, Adaptation Target | Programming | `decisions/D7` | taper-holds-intensity; deload-placement |
| D8 Week | Art 2, 9 | §20 D8 | Microcycle | Programming, Sport | `decisions/D8` | sport-compat spacing |
| D9 Session | Art 4, 7 | §20 D9 (L7) | Session Objective | Quality, Programming | `decisions/D9` | purpose-coherence |
| D10 Movement | Art 6 | §20 D10 | Movement Requirement | Quality, Exercise, Movement | `decisions/D10` | contraindication-excluded |
| **D11 Select** | **Art 6, 7** | §20 D11, §34 | Intervention, Exercise | Exercise, SKB | `decisions/D11` | value-order + stopping-rule; no-junk-fill |
| D12 Dose | Art 6, 7 | §20 D12, §34 | Dose | Quality, Programming | `decisions/D12` | dose-from-model; intensity-scaling |
| D13 Schedule | Art 9 | §20 D13 | Scheduled Week | Programming/Recovery | `decisions/D13` | interference-penalty (retain) |
| **D14 Validate** | **Art 19** | §20 D14, §35 | Validation, Constraint | Validation | `validation/*` | per-validator; conflict-order |
| D15 Reflow | Art 10 | §20 D15, §24 | Adaptation Projection, Freeze | Recovery, Injury | `decisions/D15` | freeze-respect; pending-only |
| D16 Learn | Art 12, 16 | §20 D16, §25 | Prior, Performance Outcome | Learning | `learning/*` | prior-never-mutates-plan; backtest |
| Confidence model | Art 13 | §28 | Confidence, Evidence | Evidence & Confidence | `knowledge/base` | no-low-confidence-gates |
| Engine boundary / purity | Art 18 | §38 SA1, §24 | (Plan = derived) | — | `@performance-os/engine` | cross-runtime determinism; generator≡reflow parity |
| Knowledge-as-data | Art 17 | §26 | (all knowledge entities) | all 12 domains | `knowledge/*` | schema + provenance validate-on-load |
| Privacy boundary | Art 11 | §27.1, L13 | Raw Vital vs Derived Signal | Recovery | `validation/*` + L4 RLS | privacy-validator fails build; RLS tests |
| Team surface | Art 11 | §27.1, E1 | Organisation ⊃ Team ⊃ Athlete/Coach | Athlete/Membership | L4 Membership + `rollUp()` | RLS + rollUp-contains-no-raw-vitals |
| Value hierarchy / bank-don't-pad | Art 1, 7 | §34, L5 | (Dose ordering) | Programming | `decisions/D11` | stops-at-recoverable-dose |
| Conflict order | Art (conflict order) | §37 | (all) | Validation | `validation/*` | tier-precedence unit |

> **Diagnostic Triangle (confirmed against the Ontology §1):** the three vertices are **Physical Quality** (the shared axis), **Capability** (the athlete-side level, from D1), and **Demand** (the sport-side importance, from the Demand Profile D2/D3). Its base output is the **Limiting Factor** = `demand_importance × (target − current)`, adjusted for trainability-now and injury-risk (the Ontology flags this as *a starting heuristic, not a validated formula* — EDS Q1). D4 is the executable form of the triangle. The Ontology also distinguishes three orthogonal structures the brief conflates: the **Reasoning Spine** (temporal order — Part 1's chain), the **Containment Hierarchy** (part-of: Macrocycle ⊃ Mesocycle ⊃ Microcycle ⊃ Session ⊃ Intervention ⊃ Programming Variable), and the **Diagnostic Triangle** (relational — how a need is found).

---

# PART 10 — Critical Review (six lenses)

The EDS already self-reviewed through three lenses (§45); this extends to the six the brief requires and folds revisions into the plan above. Each critique is genuine.

## 10.1 Olympic Head of Performance
- **Diagnosis is only as good as assessment, and self-coached athletes have almost no measured current levels.** *(The central scientific risk.)* → **Revision:** Sprint 6 makes D4 an explicit **low-confidence, falsifiable hypothesis** that *narrows priorities and widens margins* rather than asserting precision; Sprint 11 (learning) validates diagnoses against outcomes (EDS FR5). Do not oversell day-one personalisation.
- **"Minimum effective" can slide into under-dosing.** → **Revision:** the value hierarchy requires the *primary* dose to meet the adaptation threshold and be progressively overloaded *before* anything is banked (EDS §34); progression is first-class (Sprint 5/8).
- **Availability/robustness is the real currency and is a bit buried.** → **Revision:** robustness is a named quality family (Sprint 5) and injury-risk explicitly weights D4.

## 10.2 Elite S&C Coach
- **The 860-line allocator refactor (Sprint 8) risks losing hard-won, sound behaviour** (superset logic, axial management, honest durations, sport anchors). → **Revision:** these are tagged **Retain/re-home** in Part 4, protected by golden-master + parity tests; Sprint 8 changes the *selection driver* (transfer-per-fatigue), not the sound structuring machinery.
- **Concurrent-training / multi-sport (triathlete) is under-modelled** — demand profiles must *combine*, not be selected. → **Revision:** recorded as an open item (EDS Q6); D2 must support demand-profile combination before real endurance programming (E2). Flagged, not hand-waved.
- **Novice competency gating must survive the re-seating.** → **Revision:** competency gates (L4) are a D14 validator + a D11 constraint (Part 2), invariant through migration.

## 10.3 Sports Scientist
- **The quality taxonomy is where pseudo-precision hides** — naming "reactive strength" ≠ measuring/dosing it. → **Revision:** Sprint 5 admits **no quality without a dose-response model + assessment method + prerequisites** (EDS §31.2). A label the engine can't measure or dose is forbidden.
- **Diagnosis risks being unfalsifiable.** → **Revision:** D16 checks whether developing the prioritised quality moved the sport KPI (EDS FR5); diagnoses are treated as hypotheses (Art 12).
- **Confidence-demotion must be executed in code, not comments** — the exact defect in the current engine (ACWR). → **Revision:** Sprint 1 ("confidence operative") is sequenced *first*, before any reasoning rebuild.

## 10.4 Principal Software Engineer
- **This is a big abstraction for a solo, beginner-coded project — architecture-astronautics risk.** → **Revision:** Sprints 0–4 (+10) ship value **independently of the re-seating**; abstractions are introduced incrementally, smallest version first (Constitution Art 20); any decision with no consumer stays a thin pass-through. The re-seating (5–9) is gated and reversible via golden-master.
- **Contracts "validated in dev/CI" can rot; the graph degrades to an implicit pipeline.** → **Revision:** `core/contracts` runtime-validates boundaries (lightweight in prod, strict in dev/CI); Sprint 0's CI gate + determinism test keep it honest.
- **"Plan always re-derived" assumes cheap regeneration forever.** → **Revision:** signature-memoisation exists; the engine boundary (Sprint 10) lets generation move server-side if needed. Principle (derive, don't store-as-truth) holds; performance is a tactic.
- **Missing: a working test gate today.** → **Revision:** Sprint 0 fixes `npm test` + adds CI *first* — the single highest-value, lowest-risk item, and a precondition for safely doing anything else.

## 10.5 AI Architect
- **Where does AI plug in without breaking determinism?** → **Revision (already in the design):** AI substitutes a *specific decision* behind its contract (D4/D11/D16/explanation), **off the synchronous path**; the deterministic validators (D14) gate every proposal — the AI never gets the last word (EDS E3, SA8). Self-reported AI confidence is never trusted; the API key is server-side only (Art 11). The decision-contract seam (Part 2) is what makes this safe — built in Sprints 3 (validators) + 10 (boundary), consumed later.
- **Risk: an AI-shaped feature that would fork the decision graph.** → **Revision:** the extensibility test (Part 6.3) — if a feature needs a core-graph edit, it's misframed. AI is a decision substitution, not a new engine.
- **Eval harness for AI proposals is unspecified.** → Recorded as an open question (EDS Q8), specified per-decision when the AI layer is built.

## 10.6 Product Architect
- **The near-term product priority is the Team package, but it sits late (W11).** → **Revision:** W11/Sprint 12 depends only on the engine boundary (Sprint 10) + derived-signal work (Sprint 2), **not** the full re-seating — it can be pulled forward and run in parallel with W5–W9 if the product calls for it. The privacy split is already designed in the web app's types; the work is wiring `rollUp()` + RLS, not design.
- **Doc drift erodes trust** (the `exerciseDemos` phantom, stale README/SCHEMA). → **Revision:** a low-cost doc-reconciliation task rides alongside Sprint 0.
- **Explainability is the product differentiator and must ship early, not last.** → **Revision:** every decision emits rationale from the day it's built (Sprints 6–8 surface *why*); the explanation read-model (EDS §11) assembles them. Explainability is a property of the decision layer, not a later feature.

## 10.7 Standing tensions (recorded honestly, not resolved)
1. **Ambition vs team size** — permanent; mitigated by Art 20 + the "M1–M4 independent, ship-first" sequencing, but the risk that the framework absorbs effort owed to athlete value is real.
2. **Assessment/diagnosis believability** — early diagnosis is a low-confidence hypothesis; the mitigation is honesty + the learning loop, not precision.
3. **Multi-sport demand combination** (EDS Q6) and **cheap quality measurement** (EDS Q3) are genuine unsolved gaps that D2/D1 must eventually address.
4. **The allocator refactor (Sprint 8)** is the single highest-complexity step; it is the one place a parity regression is most likely — over-invest in golden-master coverage there.

---

## Success-criteria checklist (Sprint 2)

- [x] The future coaching reasoning model is fully defined (Part 1 — the definitive chain, reconciled with EDS §8).
- [x] Every major coaching decision is mapped (Part 2 — D1–D16 full contracts; the brief's list fully covered).
- [x] Every decision has an ownership classification that prevents hard-coded logic (Part 3).
- [x] Every existing decision has a migration strategy (Part 4 — Retain/Refactor/Replace/Remove + complexity/risk/deps).
- [x] All embedded knowledge is mapped to a future domain (Part 5).
- [x] Every future module has a defined purpose/I-O/tests/success (Part 6 — the one-engine correction).
- [x] A phased migration strategy exists (Part 7 — W0–W11, optimised + justified vs the brief's example).
- [x] An executable sprint backlog exists (Part 8 — Sprints 0–12+, one-at-a-time).
- [x] A traceability matrix exists (Part 9 — Constitution→EDS→Ontology→Knowledge→Module→Decision→Test).
- [x] Critical review across six lenses with revisions folded back (Part 10).

## Provenance
Authored Sprint 2 from a **full first-hand read of the Constitution, TAS, and EDS** (all three read cover-to-cover), plus **dedicated structured extractions of the Decision Ontology and Knowledge Architecture** (the reasoning spine, the ~40-entity families, the Diagnostic Triangle, the eight-kind taxonomy, and the twelve domains), and the Sprint-1 Baseline Architecture Assessment. The Ontology and Knowledge-Architecture extractions confirmed the reasoning model authored here and sharpened two points (the canonical eight kinds in Part 3 and the Diagnostic Triangle vertices in Part 9). Working notes: `scratchpad/blueprint/`. No application code or governing document was modified.
