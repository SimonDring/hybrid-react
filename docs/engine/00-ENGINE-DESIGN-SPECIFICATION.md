# Engine Design Specification (EDS)

> **The governing document for the athlete performance platform.**
> This is the constitution. Every future engineering decision references it.
> The other four foundational docs — `01-PANEL-REVIEW` (evidence), `02-REFACTOR-ROADMAP`
> (build plan), `03-SPORT-KNOWLEDGE-BASE` (sport schema), `04-PHYSIOLOGICAL-FRAMEWORK`
> (physiological metrics), and its implementation spec `05-INDEX-LAYER-FOLLOWUPS` — are
> *implementations* of the principles set out here. Where they disagree with this document,
> this document wins; where this document is silent, they govern. See the doc-set
> [index](README.md) for each document's role and the foundational-vs-running distinction.

---

| | |
|---|---|
| **Status** | Draft v1.0 — foundational |
| **Scope** | The decision engine: how the platform *reasons*, not how it is *coded* |
| **Audience** | Any engineer, scientist, or coach who must understand or extend the platform |
| **Implementation-independence** | This document names no React component, API, or table unless unavoidable. It describes the engine's mind, not its body. |
| **Authority** | Governs the foundational doc set (see [index](README.md)); the tie-breaker on any conflict. Canonical for philosophy, laws, and the decision architecture. Defers to the named owner for evidence (01), build plan & contracts (02), the sport schema (03), and physiological metrics (04–05). |
| **Companion docs** | Foundational set: [`01-PANEL-REVIEW`](01-PANEL-REVIEW.md) (evidence), [`02-REFACTOR-ROADMAP`](02-REFACTOR-ROADMAP.md) (build plan & contracts), [`03-SPORT-KNOWLEDGE-BASE`](03-SPORT-KNOWLEDGE-BASE.md) (sport schema), [`04-PHYSIOLOGICAL-FRAMEWORK`](04-PHYSIOLOGICAL-FRAMEWORK.md) (metrics), [`05-INDEX-LAYER-FOLLOWUPS`](05-INDEX-LAYER-FOLLOWUPS.md) (index-layer specs). Related: [`decision-engine-evaluation.md`](../decision-engine-evaluation.md) (the F1–F10 sweep), [`../strategy/VISION.md`](../strategy/VISION.md), [`../product/TEAM-ARCHITECTURE.md`](../product/TEAM-ARCHITECTURE.md). |
| **Status tracking** | This document states the **target**. Where the codebase actually stands against it — what is shipped, in flight, or pending — lives in the **running docs** (`HANDOFF.md`, `CLAUDE.md`), never here. Parts III–IV (the as-built snapshot and critique) are a point-in-time read; see the note at the head of Part III. |

---

## How to read this document

It is written in three movements, mirroring the process that produced it:

1. **Where we are** (Parts I–IV) — the philosophy this platform should hold, and an honest reverse-engineering and critique of what is actually built today. *You cannot design the future without first being precise about the present.*
2. **How the engine should think** (Parts V–IX) — the decision architecture, the loops, the knowledge architecture, the domain models, and the validation framework. *This is the heart.*
3. **How to build and govern it** (Parts X–XV) — software architecture, migration, expansion, rationale, open questions, and a self-review through three expert lenses.

A reader in a hurry should read **Part I (Philosophy, First Principles, Engine Laws)** and **Part V (Decision Architecture)**. Everything else serves those two.

A note on plain language: the platform's user (and one of its authors) is a beginner coder. This document is technical where it must be, but every law and every model is stated in language a thoughtful non-specialist can follow, and every "what" is paired with a "why." That is not a courtesy — *explainability is an architectural requirement* (Law 11). If a concept cannot be explained plainly, the engine should not act on it.

---

## Table of contents

**Part I — Vision, Philosophy, Laws**
- 1. Executive Vision
- 2. Core Coaching Philosophy
- 3. First Principles
- 4. Engine Laws
- 5. What is a Coach? (and what is *not* a coach)

**Part II — Definitions and Boundaries**
- 6. Definitions (the vocabulary the engine thinks in)
- 7. System Boundaries (what the engine is, and is not, responsible for)
- 8. The Coaching Hierarchy (refined)

**Part III — The Platform As Built (Phase 1: reverse engineering)**
- 9. Current architecture at a glance
- 10. Current planning logic and decision flow
- 11. Current data flow
- 12. The coaching philosophy implicit in the code

**Part IV — Critique (Phase 2)**
- 13. Architectural weaknesses
- 14. Scientific weaknesses
- 15. Software weaknesses and technical debt
- 16. Hidden assumptions
- 17. The bodybuilding bias, structurally traced
- 18. What is genuinely strong (and must not regress)

**Part V — Decision Architecture (the heart)**
- 19. The atomic unit: the coaching decision
- 20. The decision catalogue
- 21. The decision graph
- 22. Decision trees (worked)

**Part VI — The Three Loops**
- 23. The Coaching Loop
- 24. The Planning Loop
- 25. The Learning Loop

**Part VII — Knowledge and Data Architecture**
- 26. Knowledge Architecture
- 27. Data Architecture
- 28. The Confidence & Evidence Model

**Part VIII — Domain Models**
- 29. The Athlete Model
- 30. The Sport Model
- 31. The Physical-Qualities & Adaptation Model
- 32. The Exercise (Intervention) Model
- 33. The Recovery Model
- 34. The Programming Model

**Part IX — Validation and Constraints**
- 35. The Validation Framework
- 36. The Constraint Framework
- 37. Conflict resolution

**Part X — Software Architecture**
- 38. Architecture principles
- 39. Module responsibilities
- 40. Architecture diagrams

**Part XI–XV — Governance**
- 41. Migration Strategy
- 42. Future Expansion Strategy
- 43. Design Rationale
- 44. Open Questions, Research Gaps, Future Research
- 45. Self-review through three lenses
- 46. Glossary

---

# Part I — Vision, Philosophy, Laws

## 1. Executive Vision

**The platform is an evidence-based coaching decision engine.**

It is not a workout generator. It is not an AI fitness app. It is not a hypertrophy planner. It is not a chatbot with a training-themed prompt. Those things produce *content*. This platform produces *decisions* — and training content is merely the most visible projection of those decisions.

The mission, stated once and unchangingly: **open elite strength & conditioning to every athlete, club, and team that cannot afford an elite S&C coach.** A busy individual, or a club with no S&C budget, should receive programming close to what a top-level coach would prescribe for *their* goal, *their* sport, and the time they actually have — and should be able to trust it.

To deliver that, the engine must do the thing an elite coach does that a spreadsheet cannot: **reason**. It must look at an athlete, understand what their sport demands, diagnose what is currently limiting them, decide what single intervention would most improve their performance over the long term, deliver that intervention in the minimum effective dose, observe what actually happened, and learn. Then repeat. Forever.

Everything in this document exists to make that loop real, inspectable, evidence-grounded, and safe.

### The one question

Every programme the engine produces must answer exactly one question:

> **"What is the highest-value intervention for this athlete today that maximises their long-term performance — given their sport, their limiting factors, their recoverability, and the life they actually live?"**

Sessions, sets, exercises, and volumes are downstream of that answer. If a feature, a number, or a module cannot trace its existence back to that question, it does not belong in the engine.

### The platform in one paragraph

An athlete (or a coach, on behalf of a squad) describes who they are, what they are training for, and what constrains them. The engine builds a *model of the athlete* and consults a *model of their sport*. From the gap between the two it diagnoses *limiting factors* and selects *priority physical qualities* — the adaptations that, if developed, would most move performance. It composes a *strategy*, then *blocks*, then *weeks*, then *sessions*, choosing *interventions* (exercises, doses, and — in future — energy-system work) to drive the prioritised adaptations with the least fatigue compatible with the sport's own training load. Each plan is a *hypothesis*. Reality — what was done, how the athlete recovered, how they performed — *validates or refutes* the hypothesis, and the engine *learns*, becoming more personalised as evidence about this specific athlete accumulates. Throughout, the gym serves the sport; nothing exists "because most apps do it"; and every recommendation can explain *why*, in plain English, with its evidence and its confidence attached.

---

## 2. Core Coaching Philosophy

These statements are the engine's worldview. They are upstream of all architecture.

**2.1 The sport is the objective. The gym is never the objective.**
For an athlete who trains a sport, performance in that sport is the sole outcome that matters. Strength, size, power, and mobility are *means*. The engine may never optimise a means at the expense of the end. A stronger back squat that does not transfer, or that costs a sprinter the freshness to sprint, is a *failure*, not a success. (Bodybuilding is a fully supported pathway — see 2.8 — but it is a *goal-as-sport*, not the architecture's centre of gravity.)

**2.2 The engine optimises athlete development, not training artefacts.**
It does not optimise volume, exercise selection, session count, or adherence-as-a-metric. It optimises the athlete's trajectory toward their goal. Volume, selection, and the rest are instruments read off that optimisation — never the optimisation itself.

**2.3 Minimum effective intervention.**
The right dose is the *smallest* one that produces the required adaptation. Extra fatigue is not extra progress; beyond the recoverable dose it is the opposite. The engine's bias is to do *less* well rather than *more* badly. "Fill the available time" is an anti-pattern (see 17.4 and Law 5).

**2.4 Physical qualities are more fundamental than muscles.**
A coach thinks in *qualities and adaptations* — maximal strength, rate of force development, reactive strength, aerobic capacity, robustness — because those are what transfer to sport. Muscles are an accounting dimension (where fatigue and hypertrophy land), not the organising goal. A hypertrophy engine organises around muscles; a coaching engine organises around qualities and lets muscle accounting fall out downstream.

**2.5 Adaptation first; volume second.**
The first question is *what adaptation creates the highest return for this athlete now?* Only after that is answered does the engine ask *how should that adaptation be achieved, and at what dose?* Volume is a consequence and a guardrail, not the plan. (This inverts the current engine — see Part IV.)

**2.6 Every programme is a hypothesis; reality is the referee.**
A plan is the engine's best current guess about what will work for this athlete. It is provisional by nature. The athlete's lived response — completion, readiness, soreness, performance — continuously tests that guess. Planning and learning are different activities and must be kept architecturally separate (Law 9).

**2.7 Evidence informs decisions; it does not replace them.**
Science sets priors and bounds. It rarely dictates the single right answer for one athlete on one day. The engine reasons *from* evidence (with confidence attached) and *toward* a coaching decision; it does not outsource the decision to a citation. Where evidence is strong, the engine acts confidently; where it is weak or contested, the engine treats it as a soft input and widens its safety margins (the Confidence Model, Part VII).

**2.8 Sport-agnostic by construction; bodybuilding supported, never dominant.**
The architecture knows nothing about any specific sport. Sports are *data* (knowledge modules) that *modify* coaching decisions; they never *replace* them. Bodybuilding and "get stronger / build muscle / functional" goals are first-class pathways modelled exactly like sports (as goal-defined demand profiles) — but the hypertrophy lens is one supported worldview among many, not the chassis the others are bolted onto.

**2.9 Become more personal over time.**
On day one the engine reasons from population and sport evidence. As athlete-specific data accumulates, it should reason increasingly from *this athlete's* demonstrated responses — their real recovery rate, their real volume tolerance, their real rate of progress on each quality. Generic on day one; bespoke by month six.

**2.10 Honesty and explainability are features, not decorations.**
The engine must be able to say, for any recommendation: *what it decided, why, on what evidence, and how sure it is.* A recommendation that cannot be explained should not be made. Trust is the product; explainability is how trust is earned.

---

## 3. First Principles

The philosophy above, distilled into immutable principles that govern architecture. These are *design axioms*: every module, schema, and algorithm must be consistent with them.

| # | Principle | Architectural consequence |
|---|-----------|---------------------------|
| **P1** | Sport performance is the primary outcome; the gym supports the sport. | Sport demand is a first-class input to *every* training decision, not a late modifier. |
| **P2** | The engine optimises long-term athlete development, expressed as the highest-value intervention available today. | There must be an explicit "priority / highest-value intervention" decision; it cannot be implicit in a fill loop. |
| **P3** | Training should produce the required adaptation with the *minimum effective intervention*. | Dose is computed from an adaptation target and a recoverability ceiling — not from a volume target to be maximised. |
| **P4** | Every recommendation has an evidence-based coaching rationale, with confidence. | Knowledge is separated from logic and carries provenance + confidence; decisions emit a rationale. |
| **P5** | Exercises are interventions, not objectives. | The exercise model describes *what adaptation an exercise drives and at what cost*, not merely *what muscle it hits*. |
| **P6** | Physical qualities and adaptations are the organising concept of training content; muscles are downstream accounting. | The domain model centres on a quality/adaptation taxonomy; muscle volume is a derived ledger and a guardrail. |
| **P7** | Adaptation is chosen before dose; volume validates rather than plans. | The pipeline decides *adaptation → movement requirement → intervention → dose*, then *validates* the resulting volume. |
| **P8** | Every programme is a hypothesis; reality validates it. | Plans are immutable hypotheses; adaptation is a read-time projection; learning is a separate loop that updates priors. |
| **P9** | The engine becomes more personalised as athlete-specific data accumulates. | A learning layer maintains per-athlete priors with growing confidence; decisions consume them. |
| **P10** | Science informs but does not replace coaching judgement. | Evidence sets priors and bounds; the decision layer composes them into a judgement; contested evidence is soft, not a gate. |
| **P11** | The engine reasons *from structured knowledge*, not from hard-coded logic. | Adding a sport, injury, quality, or progression model = new data + registry entry, *zero* edits to the reasoning core. |
| **P12** | Determinism and purity of the planning core are sacred. | `decision(knowledge, athleteState) → output` is a pure function; same inputs ⇒ identical output; golden-master testable. |
| **P13** | Recoverability is a hard ceiling, not a target. | A recoverability/fatigue validator can *veto* or *trim* any construction; it can never be overshot "to use the time." |
| **P14** | Privacy of raw athlete vitals is inviolable. | Raw HRV/sleep/RHR never cross a person boundary; they roll up into derived signals. Enforced by validation, not convention. |
| **P15** | Simplicity is a feature; complexity must earn its place. | Every module must justify itself against the question "can this be data, generic, or removed?" |

---

## 4. Engine Laws

First principles are *why*. Laws are *what the engine must never do*. They are non-negotiable invariants. A build that violates a law is broken, regardless of how good its output looks. Laws should be enforced by tests and validators wherever mechanisable.

**L1 — Never compromise sport performance to improve gym performance.**
No gym prescription may knowingly reduce the athlete's capacity to perform or train their sport. Strength work is sequenced and dosed around sport load, never over it.

**L2 — Never prescribe unnecessary fatigue.**
Every unit of prescribed fatigue must be justified by an adaptation it is expected to drive. Fatigue with no adaptation rationale is forbidden.

**L3 — Never exceed recoverability.**
The combined load of gym + sport + life must remain within the athlete's modelled capacity to recover. The recoverability ceiling can trim or veto any session; it can never be overridden to "fill the time" (see L5).

**L4 — Never prescribe an intervention beyond the athlete's technical competency or readiness.**
Exercises are gated by demonstrated skill and training age. The engine does not prescribe a depth jump to a novice or a heavy snatch to an untrained lifter, however well it would "fit the volume."

**L5 — Never prescribe work merely to satisfy a volume target or to consume available time.**
Volume is a guardrail and a validation, never a goal. When the highest-value recoverable dose is met, surplus capacity is offered as *optional* quality work or *banked* — never padded with junk volume. (Directly overturns the "fill the booked time" premise.)

**L6 — Every exercise must contribute to today's stated objective.**
No exercise exists without a traceable line to the session objective, the priority quality, and the sport demand it serves. "Because the template has it" is not a reason.

**L7 — Every session must have one clearly defined purpose.**
A session is built to achieve a named objective (e.g., "develop maximal lower-body force," "maintain in-season power with minimal fatigue," "rebuild eccentric hamstring capacity"). Its title, content, and dose must all reflect that purpose. (Overturns the current "misleading session titles" defect, F3.)

**L8 — Constraints are computed before content, and content must satisfy them.**
Time, equipment, sport schedule, injuries, and recoverability bound the solution space *before* exercises are chosen. Construction happens inside the constraint box; it does not get filtered into it afterward. (Overturns post-hoc injury filtering.)

**L9 — Planning and learning are separate; the planning core is pure.**
The function that produces a plan from athlete state is pure and deterministic. Learning never mutates a plan in place; it updates the *priors* that the next planning pass will read.

**L10 — Adaptation is a projection over an immutable plan; the athlete's committed intent is never silently overwritten.**
Runtime adaptation reshapes only provisional (pending) work. Once an athlete commits to a session, what they were shown is what they get (freeze-on-commit). Future weeks remain provisional.

**L11 — Every recommendation must be explainable in plain English, with its evidence and confidence.**
If the engine cannot articulate *why* and *how sure*, it must not act. Confidence is a first-class output, not an internal detail.

**L12 — Confidence governs authority.**
A low-confidence signal may inform but may not gate. Evidence strength determines whether a number is a hard rule, a soft input, or merely a reported metric. (Generalises the ACWR lesson: contested science is never a gate.)

**L13 — Raw vitals never cross a person boundary.**
A coach, teammate, or any party other than the athlete may see only *derived* signals (readiness, load state, availability), never the underlying HRV, sleep, or resting heart rate. Enforced by a validator that fails the build, not by reviewer vigilance.

**L14 — The engine must degrade safely under missing data.**
With no wearable, no history, and minimal onboarding, the engine still produces a sound, conservative plan. More data sharpens the plan; absence of data never breaks it. Uncertainty widens margins (L12), it does not halt reasoning.

**L15 — No silent truncation or silent debt.**
If the engine drops work (over a ceiling), defers a deload, forgives missed volume, or caps coverage, it records and can surface that fact. The athlete is never misled into thinking they received the full prescription when they did not.

---

## 5. What is a Coach? (and what is *not*)

The brief asks the engine to *define coaching, not programming.* This is the pivot of the whole specification, so it is stated carefully.

**Programming** is the production of training content: sets, reps, exercises, schedules. It is the *visible output*.

**Coaching** is the *reasoning that decides what content to produce, why, and when to change it.* It is a continuous loop of observation and judgement. A great coach and a mediocre one can write the same set-and-rep scheme on paper; what separates them is the *decisions behind it* — what they chose to develop, what they chose to leave alone, what they noticed and responded to.

**This platform models coaching, and treats programming as its output.** The decisive architectural implication: the engine's primary artefacts are not sessions — they are *decisions*. Sessions are rendered from decisions. (Part V.)

### The coaching loop (informal)

A coach, across a season, runs this loop continuously:

```
   OBSERVE ──▶ ASSESS ──▶ DIAGNOSE ──▶ PRIORITISE ──▶ PLAN ──▶ INTERVENE
      ▲                                                              │
      │                                                              ▼
   LEARN ◀──────────────────────────────────────────────── VALIDATE
      │                                                              
      └──────────────────────────────▶ (repeat, now better informed)
```

- **Observe** — gather what is true now: the athlete, the sport, the schedule, the wearable signals, what was actually done, how they look and feel.
- **Assess** — turn raw observation into structured understanding: capability, training age, current qualities, recovery state, available time and kit.
- **Diagnose** — identify the *limiting factors*: what, specifically, is holding this athlete's sport performance back right now?
- **Prioritise** — choose the *priority qualities/adaptations*: of all the things that could be developed, which would yield the highest return, and are trainable now without compromising the sport?
- **Plan** — translate priorities into a *strategy*, then *blocks*, *weeks*, and *session objectives*, all within the constraints.
- **Intervene** — select the *minimum effective interventions* (exercises, doses, and eventually energy-system work) that drive the prioritised adaptations, validate them, and deliver them.
- **Validate** — compare what was prescribed to what happened and how the athlete responded; check the hypothesis.
- **Learn** — update beliefs about this athlete (and, in aggregate, about the sport and the population) so the next loop is better.

Every module in this engine exists to support one or more stages of this loop. If a module supports no stage of the loop, it is not a coaching module and should be questioned (P15).

### What a coach is *not* — and so what the engine must not be

- **Not a volume calculator.** Volume is an output and a guardrail, not the plan (L5).
- **Not a template filler.** A coach reasons to a plan; they do not look up a split and paste it. The engine constructs by reasoning, not by retrieving a template (Part VI).
- **Not a maximiser.** A coach seeks *sufficiency with safety*, not maximum work. Minimum effective dose (P3).
- **Not an oracle.** A coach is frequently uncertain and plans accordingly, hedging and observing. The engine carries and acts on its own uncertainty (Part VII).
- **Not a generic stimulus engine.** A coach's every choice is specific to *this* athlete and *this* sport. Generic bodybuilding volume handed to a distance runner is a coaching failure, not a neutral default (17).

---

# Part II — Definitions and Boundaries

## 6. Definitions (the vocabulary the engine thinks in)

These are the *concepts the engine reasons with*. They are deliberately implementation-independent: each is a thing the engine knows about, not a class or table. A full alphabetical glossary is in §46; this section defines the load-bearing terms in conceptual order.

**Athlete** — the subject of all decisions. Modelled as capability (training age, demonstrated qualities, lifts), history (what they have done and how they responded), constraints (time, equipment, schedule, injuries), and goal. The athlete model grows richer and more individual over time (P9).

**Goal** — what the athlete is training *for*. Either a **sport** (run, swim, cycle, GAA, …) or a **goal-as-sport** (get stronger, build muscle, functional fitness). A goal resolves to a *demand profile* exactly as a sport does. The goal is the athlete's, never the app's — the engine discovers it, it does not impose one.

**Sport** — a *knowledge module*, not code. A structured, evidence-tagged description of a sport's demands: movement and force/velocity demands, energy-system mix, competition and season structure, injury risks, priority adaptations, position modifiers, recovery considerations, performance metrics, and transfer characteristics. (The Sport Knowledge Base; §30.)

**Demand profile** — the resolved set of physical, energetic, and movement requirements that a goal/sport imposes. The thing the athlete model is compared *against* to find gaps.

**Physical quality** — a trainable attribute that contributes to performance: maximal strength, rate of force development (RFD), power, reactive/elastic strength, strength-endurance, aerobic capacity, anaerobic capacity, mobility, stability, robustness, and so on (full taxonomy §31). Qualities are the organising unit of training content.

**Adaptation** — the physiological change training is intended to cause (e.g., increased motor-unit recruitment, tendon stiffness, mitochondrial density, muscle cross-sectional area). A quality is developed *by* driving its underlying adaptation(s). The engine decides adaptations before doses (P7).

**Limiting factor** — the specific deficit, relative to the demand profile, that is most constraining the athlete's sport performance now. Diagnosing limiting factors is the pivot of coaching (§5, §20).

**Priority quality** — a physical quality selected, because of a limiting factor, as a focus for the current block/phase. The bridge from diagnosis to intervention.

**Intervention** — anything the engine prescribes to drive an adaptation: most often an *exercise* at a *dose*, but also (in future) an energy-system session, a mobility protocol, a prevention protocol, or a rest/recovery directive. Exercises are interventions, not objectives (P5).

**Exercise** — a specific movement, modelled by *what adaptations/qualities it drives, for which sport demands, at what fatigue and joint/spinal/neural cost, requiring what equipment and competency* — not merely by which muscles it works (§32).

**Dose** — the prescribed magnitude of an intervention: sets, intensity (load/RPE/velocity), reps, tempo, density, and frequency. Dose is computed from an adaptation target under a recoverability ceiling, by the minimum-effective principle (P3).

**Volume** — accumulated dose, accounted per muscle and per quality. A *ledger and a guardrail*, not a plan (P6, L5). Measured in fractional (synergist-weighted) hard sets for resistance work.

**Recoverability / capacity** — the athlete's modelled ability to absorb and adapt to total load (gym + sport + life) over a window. A hard ceiling (P13, L3).

**Readiness** — a derived, time-local estimate of the athlete's capacity to train hard *today*, blending objective signals (HRV, sleep, RHR) and subjective wellness, plus state flags (illness, travel). Sizes today's session before it is built.

**Load** — accumulated training stress over time (gym + sport). Used to manage progression and detect spikes. Reported as absolute load and week-on-week change; ratio metrics (e.g., ACWR) are soft, low-confidence inputs only (L12, §14).

**Strategy / Block / Week / Session objective** — the nested planning horizons. The *strategy* spans the macrocycle; a *block* (mesocycle) has one dominant objective; a *week* (microcycle) has a loading pattern; a *session* has a single purpose (L7).

**Constraint** — a hard bound on the solution: available days, session duration, equipment, the sport schedule, active injuries, and recoverability. Constraints are computed first and content must satisfy them (L8).

**Plan (hypothesis)** — the engine's deterministic best guess: a full macrocycle of provisional sessions, derived purely from athlete state (P12). Immutable.

**Adaptation projection (reflow)** — the read-time reshaping of *current, pending* work in response to what actually happened and today's readiness/load — applied over, never into, the immutable plan (L10).

**Validation** — the post-construction check that a built session/week/block is recoverable, sport-compatible, balanced, lawful, and scientifically consistent. Validation can trim or veto (§35).

**Confidence** — how much the engine trusts a piece of knowledge or a decision, on an evidence scale. Governs authority (L12) and margin width.

**Decision** — the atomic artefact of the engine: an explicit, inspectable reasoning step with inputs, rationale, output, confidence, dependencies, and failure modes (§19). The engine *is* a graph of decisions.

---

## 7. System Boundaries

A precise statement of what the engine is, and is not, responsible for. Boundaries are as important as capabilities: they prevent scope creep and keep the architecture honest.

### 7.1 In scope — the engine decides

- **Resistance/strength programming** end-to-end: which qualities to develop, which exercises (interventions) drive them, at what dose, in what sequence, on which days, with what progression and deload/taper structure.
- **Adaptation to reality**: reshaping pending work around completion, readiness, load, injuries, and (for teams) the fixed sport schedule.
- **Injury-aware programming**: contraindication-respecting selection, rehab and prevention, return-to-performance staging.
- **Diagnosis and prioritisation**: limiting-factor identification and priority-quality selection from athlete-vs-sport gaps.
- **Explanation**: a plain-English rationale and confidence for every recommendation.
- **Learning**: maintaining and improving per-athlete, per-sport, and population priors.

### 7.2 Currently out of scope — explicitly deferred (with intent to bring in)

- **Endurance/energy-system session *programming*** (actual run/cycle/swim/conditioning workouts). Today the engine *biases gym work to support* a sport and *consumes* the athlete's own sport load; it does not yet *prescribe* the sport sessions themselves. **This is the single largest planned expansion** (§42) and the architecture is designed to admit it: an energy-system session is just another *intervention* driving an *adaptation* (aerobic/anaerobic capacity) — the same decision machinery applies. Until then, the engine treats sport load as an *input constraint*, not an *output*.
- **Nutrition, sleep, and lifestyle *prescription*.** The engine *consumes* sleep and wellness as readiness inputs; it does not yet prescribe them. A clean future intervention class.
- **Real-time / intra-session coaching** (autoregulation mid-workout beyond logged feedback). The session runner collects data; the engine reasons between sessions.
- **Medical diagnosis.** The engine reasons about injuries as *training constraints* using a structured taxonomy; it is not a diagnostic tool and must defer high-risk presentations to professionals.

### 7.3 Permanently out of scope — not the engine's job

- **Identity, auth, sync, storage, rendering, device integration.** These are *platform services* the engine consumes or is consumed by. The engine is a pure reasoning core; it must never depend on how data is stored or shown (Part X). (This boundary is *violated today* — §15 — and restoring it is a migration priority.)
- **Being the source of the athlete's goal.** The engine never decides what an athlete *should* want. It discovers the goal and serves it.

### 7.4 The two packages, one engine

The platform ships as **Individual** (one athlete, self-coached by the engine) and **Team** (players each get the individual experience; a coach gets a privacy-preserving squad overview and supplies the fixed schedule as constraints). **There is one engine.** A player is an athlete; a team adds *constraints* (the fixed schedule) and a *derived, privacy-bounded read surface* (the coach view) — it does not add a second reasoning system. The coach never sees raw vitals (L13). (See `../product/TEAM-ARCHITECTURE.md`.)

---

## 8. The Coaching Hierarchy (refined)

The brief proposes a conceptual hierarchy from athlete down to learning. It is directionally right but flat, and it hides the most important move (diagnosis). Below is the **challenged and improved** hierarchy. Three structural changes:

1. **Constraints and Training History are made cross-cutting**, not a single layer — they bound and inform *every* level, so they are drawn as a rail beside the spine, not a rung on it.
2. **"Limiting factors" is elevated to the pivot.** Everything above it is *understanding*; everything below it is *response*. This is where coaching actually happens.
3. **"Adaptation target" is separated from "Exercise."** The current engine collapses these — it jumps from emphasis to exercise. A coach decides the *adaptation* first and the *exercise* (intervention) second (P5, P7).

```
                          ┌─────────────────────────────────────────┐
                          │              CROSS-CUTTING RAILS          │
                          │  • Constraints (time · equipment ·        │
   THE SPINE              │    sport schedule · recoverability)       │
   (top-down reasoning)   │  • Training history & demonstrated        │
                          │    response (the learning prior)          │
                          │  • Confidence (attached at every step)    │
                          └─────────────────────────────────────────┘
   Athlete
      │   (who they are: capability, training age, current qualities)
      ▼
   Performance Goal  ───────────────────────────────▶ resolves to ▼
      │                                               Demand Profile
      ▼                                                     │
   Sport Demands ◀───────────────────────────────────────┘
      │   (movement · force/velocity · energy systems · injury risk)
      ▼
   Position / Event Demands        (where applicable — modifies the profile)
      ▼
   Individual Demands              (this athlete's specifics within the sport)
      ▼
 ══════════════════ THE PIVOT: DIAGNOSIS ══════════════════
   Current Limiting Factors        ← the gap: demand profile − athlete model
      ▼
   Priority Physical Qualities     ← which gaps to close now, highest return first
 ═══════════════════════════════════════════════════════════
      ▼
   Adaptation Targets              ← what physiological change closes each gap
      ▼
   Movement / Quality Requirements ← what movement & loading characteristics are needed
      ▼
   Training Strategy               ← macro approach (concurrent model, sequencing)
      ▼
   Block Objective                 ← one dominant adaptation per mesocycle
      ▼
   Weekly Objective                ← microcycle loading pattern (incl. sport congestion)
      ▼
   Session Objective               ← one named purpose per session  (L7)
      ▼
   Intervention Selection          ← exercises/doses that drive the target adaptation  (P5)
      ▼
   Validation                      ← recoverable? sport-compatible? balanced? lawful?  (§35)
      ▼
   Adaptation (runtime)            ← reshape pending work to reality  (L10)
      ▼
   Learning                        ← update priors; sharpen the next loop  (§25)
```

### Justification of each layer

- **Athlete → Goal → Sport/Position/Individual demands.** You cannot prescribe before you understand. These four layers build the two objects every later decision needs: the *athlete model* and the *demand profile*. Goal resolves to a demand profile; sport, position, and individual specifics refine it.
- **The pivot (Limiting factors → Priority qualities).** This is the layer the current engine *lacks entirely*. Without an explicit diagnosis, "priority" is just a hard-coded emphasis multiplier. With it, the engine can answer *why* a runner is doing eccentric hamstring work (because low eccentric hamstring strength is a limiting factor and a top injury risk) rather than merely *that* it is.
- **Adaptation targets → Movement requirements.** A coach translates "develop reactive strength" into "we need high-velocity, short-ground-contact, elastic loading" *before* choosing an exercise. Separating these makes interventions substitutable and explainable.
- **Strategy → Block → Week → Session.** The standard periodisation nesting, but each level now inherits a *purpose* from the pivot, not from a fixed template. Concurrent-training science (strength-first sequencing, interference management) lives in *Strategy*.
- **Intervention selection.** Where the current engine starts, the new engine arrives — only after everything above has constrained the choice. Selection becomes a *value-ordered, validated fill* (§34), not a volume-driven greedy fill.
- **Validation → Adaptation → Learning.** Construction is checked, then projected onto reality, then mined for learning. These are the loop's closing stages and they are *separate activities* (L8, L9, L10).

### Why this ordering is non-negotiable

The current engine's defects (Part IV) are almost all *ordering* defects: it selects volume before diagnosing need; it filters injuries after building; it adapts volume but never intensity; it decides emphasis before understanding the sport. The refined hierarchy is, more than anything, a **statement of the correct order of operations for coaching reasoning.** Get the order right and most defects become impossible to express.

---

# Part III — The Platform As Built (Phase 1: reverse engineering)

This part documents the engine *as it actually is* on 2026-06-30, reverse-engineered from the code. It is deliberately non-judgemental; the critique is Part IV. The purpose is a precise shared understanding of the present so that the design is grounded in reality, not in a wished-for version of the system. File paths are given so any claim can be checked.

> **Snapshot caveat.** This Part (the as-built read) and Part IV (the critique) are a **point-in-time** assessment. The engine is under active hardening, and several findings below have since been **wholly or partly addressed** — notably the MRV-volume ceiling (F1), the intensity-holding taper (F4), the demotion of ACWR to a soft input, and a subjective-weighted recovery blend; these are annotated where they appear (Part IV §14). The *architectural* critiques — the organising primitive, the order of operations, the missing explicit decision layer, sport-as-modifier — are the **live thesis** and are not affected by those point fixes. Current implementation status is tracked in the running docs (`HANDOFF.md`, `CLAUDE.md`), not here; this document states the target.

## 9. Current architecture at a glance

The engine lives at `packages/engine/src/` (the `@performance-os/engine` workspace — the June 2026 extraction; CLAUDE.md's "reserved/empty" note for this package is stale). It splits cleanly into two halves:

1. **A pure generator** — `generatePlan(profile)` (`lib/PlanGenerator.js`) — a deterministic function that turns an athlete profile into a full multi-week plan of fixed sessions. Same profile ⇒ identical plan. This purity is the codebase's most valuable property; ~60,000 generated plans in the evaluation sweep never crashed.

2. **An adaptive runtime** — `PlanService.js` (currently in `apps/mobile/src/lib/`, i.e., *outside* the engine package) — which reshapes the *current and next week's pending* sessions around what was actually done, readiness, training load, sport decision rules, and injuries. The pure plan is never mutated; adaptation is a read-time projection.

Around these sit **knowledge/data tables** (exercise library, volume landmarks, strength standards, injury taxonomy/profiles, a provenance-tagged knowledge base, and the Sport Knowledge Base), and the **app shell** (Zustand store → SyncService → Supabase/localStorage) which invokes the engine and persists state.

### The generator pipeline

```
generatePlan(profile)
  │
  ├─ resolveProgram(profile)            lib/strength/program.js
  │     goal/sport → style, per-MUSCLE emphasis vector (×0.5–1.4),
  │     volumeScalar (season), priority-exercise list, power:bool
  │
  ├─ resolvePeriodization(profile)      lib/plan/periodization.js
  │     season → totalWeeks, base/build/peak split, deload weeks
  │
  ├─ deriveConstraints(profile)         → busyDays (sport days), sportMuscles
  │
  └─ for each week:
        resolveSplit({gymDays,style,emphasis})    lib/plan/split.js
              N days → per-day region focus + opening pattern anchors
        weeklyMuscleTargets(ctx)                  lib/strength/targets.js
              MEV→MAV ramp per MUSCLE × emphasis × volumeScalar  ← the core
        allocateGym({targets,slots,ctx})          lib/plan/allocator.js
              greedy bestExercise() fill against per-muscle DEFICITS;
              supersets; rep/RPE scheme; durations; titles
        scheduleWeek(...)                          lib/plan/scheduler.js
              lay sessions on weekdays; spacing/interference penalties
        despineWeek(...)                           lib/plan/despine.js
              swap high-axial lifts if heavy days land adjacent
  → { phases: [...], totalWeeks }
```

The **organising primitive is the weekly per-muscle hard-set target.** Everything upstream (goal, sport, style, level, season) exists to compute that target vector; everything downstream (split, allocation, scheduling) exists to deliver it. Muscles are tracked as 10 groups; exercises contribute *fractional* sets to muscles via a `PATTERN_CONTRIB` table (e.g., a squat = 1.0 quads + 0.5 glutes), which is the evidence-endorsed "fractional set" accounting method.

### The runtime layer

```
buildView() [Zustand store]  →  computes readiness + load  →  setRuntime(_runtime)
                                                                     │
PlanService.adaptedPhases()  reads _runtime + overrides + injuries   ▼
   observe : completed/started/skipped sessions; readiness; ACWR; missed-volume (10-day window)
   decide  : adaptive deload (force/defer); sport decision-rule volume trims; catch-up spread
   adjust  : re-allocate ONLY current+next-week pending slots; cap at MRV-rate; forgive overflow
   freeze  : on Start, snapshot the shown session (pinnedAtStart) so it never reflows
   → injuryFilteredPhases() applies contraindications AFTER reflow
```

## 10. Current planning logic and decision flow

**Goal → style.** Goal is `build` or `sport`. A `build` goal picks a *style* — `strength`, `bodybuilding`, or `functional` — which sets where the per-muscle volume ramp tops out (`STYLE_TOP`: strength 0.6, functional 1.0, **bodybuilding 1.4** — i.e., bodybuilding ramps *past* MAV toward MRV). A `sport` goal looks up a sport module for emphasis, priority exercises, season scalar, and (for running) discipline overrides.

**Periodisation.** Block length and phase split come from fixed per-style/per-season templates (hypertrophy 6 wks, strength 12 wks, functional 8 wks; sport seasons 4–12 wks derived from `event_date`). Deload weeks are placed at fixed positions in the template.

**Volume targets.** Per muscle: `MEV + rampFraction × (top − MEV)`, then × goal emphasis × season scalar, clamped to MRV. The ramp fraction is *block-continuous* (rises across the whole block, not reset per phase). Training age shifts the start point and ceiling. Deload/taper weeks sit near MEV.

**Allocation.** A greedy loop fills each day's session by repeatedly scoring every candidate exercise (`bestExercise()`) on how much it pays down the largest current per-muscle *deficits*, with multipliers for priority (×1.35), within-session variety (×0.6 repeat), quality match (×1.15 on-goal / ×0.7 off-goal), stretch bias (hypertrophy), a compound "open the session" boost, and a posterior-chain lean — gated by equipment, level, an MRV stimulus ceiling, a primary-lift cap, and a time budget.

**Scheduling & spine.** Sessions are laid onto weekdays by minimising a penalty (same-muscle adjacency, hard+hard adjacency, axial-load adjacency, sport-day interference). A final pass swaps high-axial lifts for lower-axial variants if heavy days remain adjacent.

**Runtime decisions.** The runtime makes exactly three kinds of decision: (a) **adaptive deload** — *force* a deload when fatigued (illness, or low readiness + poor recovery, or sustained-high ACWR corroborated by low readiness/recovery), or *defer* a scheduled deload when fresh; (b) **volume scaling** — a conservative stack of multipliers (readiness 1.0/0.9/0.78; load ease/none; travel ≤0.7; sport-rule trims), taking the smaller, floored at 0.5; (c) **catch-up** — spread missed-session volume (trailing 10 days) across pending slots, capped at the MRV rate, forgiving the overflow. **Intensity is never scaled** (`intensityModifier` is hard-coded 1.0): a fatigued athlete gets a *shorter* session at the *same* RPE.

**Sport decision rules.** The one part of the Sport Knowledge Base that is wired: structured `if trigger then effect` rules (signals: readiness, ACWR, illness, travel, season, competition-proximity, soreness-region; effects: taper, force_deload, reduce_one_step, minimal_effective_volume, withhold, …) are evaluated each reflow and contribute a conservative volume multiplier + force-deload flag. Several region-specific effects (`reduce_region_overhead`, `cap_high_speed`, `reduce_region_eccentric`) are validated but **no-ops** — they need exercise-level tagging that does not yet exist.

## 11. Current data flow

```
Screens ──read──▶ trainingStore.buildView()  (synchronous, from localStorage cache)
   │                    │ assembles sessions, logs, dailyMetrics, injuries, profile,
   │                    │ AND computes readiness + load, AND calls PlanService.setRuntime()
   │                    ▼
   │              PlanService.getPhases() → injuryFilteredPhases() → adaptedPhases()
   │                    │                                              → generated() = generatePlan(profile) [memoised]
   │
   └─write──▶ store action ──▶ SyncService ──▶ Supabase (primary, async) ──▶ localStorage (sync cache)
                                                  (offline-first: local write returns immediately;
                                                   cloud write is fire-and-forget; errors logged, never block UI)
```

- **Reads** are synchronous from the localStorage cache via `buildView()`; the cloud is pulled once on sign-in (`syncFromCloud`).
- **Writes** go local-first then cloud (offline-first). All writes flow through SyncService; screens never touch storage directly.
- **The engine is invoked client-side**, memoised by a signature of profile fields. The plan is *recomputed*, not persisted. Session *state* (completed/started) is persisted, keyed by stable position keys (`p{phase}_wk{week}_s{idx}`), with a `withinEpoch` guard so a re-started plan doesn't inherit old completions.
- **Persistence**: 12 Supabase tables, each owner-scoped by `auth.uid() = user_id` RLS, soft-deleted. Raw vitals live in `daily_metrics`/`wearable_readings`, owner-only.
- **The profile** is the sole engine input: demographics, goal/sport fields, experience, five tracked lifts (kg e1RM), availability (days), equipment access, injuries (now in their own table). This object defines everything the engine knows about the athlete.

## 12. The coaching philosophy implicit in the code

Reverse-engineered, the *de facto* worldview the current engine encodes is:

> *"Good training is the right number of weekly hard sets per muscle, ramped from a minimum-effective to a near-maximal-adaptive dose across a periodised block, delivered through movement-pattern-anchored sessions, kept under a recoverable ceiling, and nudged down when the athlete is tired or under-recovered. Sport is a set of multipliers that re-weight which muscles get how many sets."*

This is a **mature, evidence-based hypertrophy/strength generator** with a genuinely excellent injury subsystem and a thoughtful, conservative runtime. It is *not* a sport-performance coaching engine — and, importantly, **the documents and code already say so** (the scope note in CLAUDE.md; the panel review; the dormant Sport Knowledge Base). The platform is *mid-migration* from the former toward the latter. The gap between the implicit philosophy above and the stated philosophy of Part I is the subject of the next part.

---

# Part IV — Critique (Phase 2)

The brief's instruction: *do not assume anything is correct; challenge every major decision.* This part does. It is organised by failure class. Each finding states the problem, the evidence, the underlying cause, and — crucially — *which Part-I principle or law it violates*, so the critique connects directly to the design. Severity is rated **Critical / High / Medium / Low** by impact on the platform's stated mission (not by how hard it is to fix).

The single sentence that frames everything below:

> **The engine is an excellent answer to the wrong question.** It answers *"how much volume per muscle?"* with rigour. The mission requires it to answer *"what is the highest-value intervention for this athlete's sport today?"* — a question it does not currently ask.

## 13. Architectural weaknesses

**A1 — The organising primitive is a hypertrophy accounting unit. (Critical. Violates P6, P7, 2.4.)**
The atomic thing the engine reasons about is the *weekly per-muscle hard-set target* (MEV/MAV/MRV). That is the correct primitive for a bodybuilding planner and the *wrong* primitive for a coaching engine. A coach's primitive is the *adaptation/quality* (and above it, the *decision*). Because the primitive is muscle-volume, *every* sport question is forced through a muscle-volume translation: a sprinter's need for rate-of-force-development becomes "more quad sets, fewer chest sets." The engine literally has no place to represent "develop reactive strength" as a goal — only "allocate N sets to muscle M." This is the root architectural defect from which most others descend.

**A2 — There is no explicit decision layer. (Critical. Violates §5, P2.)**
The engine has no first-class representation of a *coaching decision*. There is no "limiting-factor diagnosis," no "priority-quality selection," no "session objective" as an inspectable object with inputs, rationale, and confidence. These decisions are *implicit* in a procedural pipeline and in hard-coded multipliers. Consequence: the engine cannot explain *why* (violating L11 in spirit), cannot be unit-tested at the decision level, and cannot accept an AI or human override at a decision boundary (because there are no decision boundaries — only function calls).

**A3 — Adaptation is computed in the wrong order: volume-first, not adaptation-first. (Critical. Violates P5, P7, 2.5.)**
The pipeline computes a volume target *first* (`weeklyMuscleTargets`) and *then* fills it with exercises. The adaptation an exercise drives (`quality` tag) is a *tie-breaker multiplier* applied during the fill, on ~25 of ~180 exercises. So adaptation is an afterthought to volume, exactly inverting the coaching order. A runner and a powerlifter with the same muscle-emphasis vector would receive structurally similar sessions differing mainly in set counts — when they should receive *categorically different* interventions (high-velocity/elastic vs. maximal-load/low-velocity).

**A4 — Sport is a cosmetic modifier, not a reasoning input. (Critical. Violates P1, 2.1, 2.8.)**
Sport selection changes (a) per-muscle emphasis multipliers, (b) a priority-exercise list, (c) a season volume scalar, (d) for running, a discipline branch. It does *not* give the engine any model of the sport's *demands, energy systems, limiting factors, injury mechanisms, or transfer characteristics.* The engine cannot reason about *why* a swimmer needs posterior-cuff work or *why* a distance runner should not chase chest hypertrophy — it can only down-weight. The richly authored Sport Knowledge Base that *does* model all of this (21 sections × 8 sports) is **~95% dormant**: only the volume-trimming decision rules are consumed. The knowledge exists; the reasoning to use it does not.

**A5 — The coaching decision is made in the UI layer. (High. Violates L9, Part X.)**
The actual adaptive decisions (compute readiness, compute load, decide deload, scale volume) are made in `trainingStore.buildView()` — the Zustand store — and pushed into `PlanService` via mutable module-level `_runtime` state. Business reasoning lives in the presentation layer. This is the clearest case of *implementation driving architecture*: the decision logic is where it is because that is where the data happened to be assembled for rendering, not because that is where coaching belongs.

**A6 — Constraints are applied after construction, not before. (High. Violates L8, P13.)**
Injuries are applied as a *post-filter*: the reflow allocates a full session (potentially heavy squats for a knee-injured athlete) and *then* `applyInjuryRules` strips contraindicated exercises and appends rehab. Similarly the allocator *overshoots* its own volume target by 20–25% and relies on a ceiling to claw back — i.e., it builds past the constraint and trims. A coach reasons *inside* the constraints. Building-then-filtering produces incoherent sessions (a session designed around a squat, with the squat removed) and wastes the diagnosis (the injury was known before construction but not used to shape it).

**A7 — Runtime adapts volume but never intensity. (High. Violates 2.3, and basic autoregulation.)**
`intensityModifier` is hard-coded to 1.0. A fatigued athlete receives a *shorter* session at the *same* prescribed load/RPE. This is backwards: a coach managing fatigue drops *intensity and tonnage* first, often before cutting exercise count. Volume-only autoregulation is a direct artefact of the volume-first primitive (A1) — the engine adapts the only lever it models.

**A8 — Two parallel sport systems, diverging. (High. Violates P11, P15.)**
There are now *two* sport representations: the **legacy emphasis modules** (`lib/sports/*.js`) that actually drive programming, and the **Sport Knowledge Base** (`data/sport-knowledge/*.json`) that encodes real sport knowledge but is dormant. They overlap, can disagree, and there is no single source of truth for "what does this sport need." Every day they stay parallel, they drift. This is duplicated domain knowledge — the thing P11 exists to prevent.

**A9 — Periodisation is template lookup, not reasoning. (Medium. Violates 2.6, §8.)**
Block length, phase split, and deload placement come from fixed templates keyed by style/season. They do not reason from the athlete's training history, the block's objective, or the proximity and importance of competition (beyond a coarse season bucket). A block "objective" in the coaching sense (one dominant adaptation) does not exist; phases are labelled base/build/peak but carry the same muscle-volume logic with different ramp positions.

**A10 — No notion of position or individual demand. (Medium. Violates §8 layers 3–4.)**
The SKB authors per-position demands, but the engine has no position concept — every athlete in a sport gets the same emphasis. A goalkeeper and a midfielder train identically. The diagnosis layer that would consume position demand does not exist (A2).

## 14. Scientific weaknesses

**S1 — ACWR has been demoted to a soft input, but not fully removed from the deload path. (Medium — largely addressed. Touches L12, P10.)**
The knowledge base entry `load.acwr.validity` states plainly: *"ACWR is mathematically coupled → spurious correlation; the 'sweet spot' is flawed. Treat as ONE soft input, never a hard gate"* (Impellizzeri 2019/2020; Lolli). The engine has acted on this: ACWR is **already demoted to a soft input** (`trainingLoad.js`; see [04-PHYSIOLOGICAL-FRAMEWORK](04-PHYSIOLOGICAL-FRAMEWORK.md) §0) — it no longer forces a deload alone. The *residual*: it still participates in deload *corroboration* and in several SKB `force_deload` rules, and it is built from *endurance TRIMP* yet used to influence *gym* volume — a transfer with no evidence base; the 3-day "sustained" window is arbitrary. **Target (L12): absolute load and week-on-week change are the primary load signals; any ratio is a low-confidence, non-gating input — finish removing it from the corroboration path.**

**S2 — Subjective wellness is now weighted in recovery, but does not yet steer plan adaptation on its own evidence. (Medium — partly addressed. Touches 2.7.)**
The single best-evidenced monitoring signal is *subjective* wellness (Saw, Main & Gastin 2016: self-report is more sensitive to load than objective measures). The engine acts on this: a **60/40 subjective-over-objective recovery blend** already ships (`recovery.js`, Saw 2016), and the physiological index layer computes a Wellness index ([04-PHYSIOLOGICAL-FRAMEWORK](04-PHYSIOLOGICAL-FRAMEWORK.md)). The *residual*: the evidence-based **re-weighting of the readiness integrator** that would let subjective signals actually *steer plan adaptation* is the deliberately-deferred, behaviour-changing step (Spec B in [05-INDEX-LAYER-FOLLOWUPS](05-INDEX-LAYER-FOLLOWUPS.md)); and illness / travel / life-stress remain coarse flags rather than first-class graded state. **Target: subjective wellness weighted ≥ objective in the integrator that drives the plan, with richer state modelling.**

**S3 — Volume is still the organising *target*, even though the acute overshoot is fixed. (Architectural — the acute defect is resolved. The F1 finding.)**
The acute defect is **shipped-fixed**: the allocator enforces a hard weekly **MRV ceiling on *actual delivered* volume** (`allocator.js`: `weeklyDelivered` vs `weeklyCeiling` — picks that would breach MRV are skipped) plus an overshoot penalty; the evaluation's "34.5% of build plans over MRV" fell to **0** in the post-fix sweep. What **remains is architectural, not a number**: volume is still the *organising target* (a per-muscle ramp toward MAV/MRV) rather than a guardrail downstream of an adaptation decision (see A1/A3), and the MEV/MAV/MRV landmarks are expert-opinion heuristics (L5) the engine still treats as harder numbers than the evidence — a diminishing-returns *curve* (Pelland 2024/25) — supports. **Target: volume becomes a validated ledger and ceiling, not the plan (P7, L5).**

**S4 — The event taper is correct. (Resolved — the F4 finding shipped.)**
*Resolved.* The peaking taper now **cuts volume hard while holding intensity** (`allocator.js`: `2 × 3 @ RPE 8`, *"taper — keep the load, just fewer sets"*), per Bosquet 2007 / Travis & Mujika 2020 — it no longer behaves like a deload. Retained here only to record that the law (taper holds intensity; see the Programming Model §34) is *met* in the current engine, not pending.

**S5 — No model of energy systems, RFD, or elasticity. (High for the mission. Violates 2.4, P6.)**
The engine cannot represent the qualities that actually distinguish sports: aerobic/anaerobic capacity, rate of force development, reactive/elastic (stretch-shortening-cycle) strength, repeat-sprint ability. "Power" exists as a coarse binary gate on ~5 exercises; everything else is muscle and "general." A sport-performance engine that cannot represent the force-velocity-energy demands of sport cannot reason about transfer. This is the scientific face of A1/A3.

**S6 — Strength standards are static and generic. (Low–Medium.)**
The beginner→elite 1RM bands are fixed ratios by sex; they do not individualise, do not track demonstrated rate of progress, and are not yet wired into milestone/progression logic for the vertical-pull lift. Useful as priors, but they should become *learning anchors* (Part VII), updated by the athlete's real trajectory.

**S7 — Prevention efficacy is treated as more certain than it is. (Low.)**
The injury system is strong, but some prevention magnitudes (e.g., Nordic hamstring ~51% vs. inconclusive reappraisal; GRADE conditional) are applied with implicit high confidence. The knowledge base *does* tag these conditionally — but, as with ACWR, the tag is not yet *operative* on the decision. (See the Confidence Model, §28: real-world adherence systematically erodes trial-grade prevention effects; design for adherence, not the optimal protocol.)

## 15. Software weaknesses and technical debt

**W1 — The engine is embedded in the client read path. (High. Violates Part X, P12 in practice.)**
`generatePlan` is pure, but it is only ever reached through `PlanService.generated()` after a synchronous `Database.getProfile()` read, and the *adaptive* layer reads mutable `_runtime` state set by the UI store. The pure core is therefore wrapped in an impure, client-coupled shell. There is no clean engine boundary a server, an `apps/web` coach dashboard, or an AI layer can call. (The reasoning core *can* be a pure library; today it is entangled with how the app stores and renders.)

**W2 — Duplicated decision logic with no parity test. (High.)**
The weekly-target ramp formula and the split-resolution logic are implemented *twice* — once in the generator and once in `PlanService` for the reflow — and must be kept numerically identical by hand. There is no test asserting parity. A change to one silently diverges the baseline plan from its own reflow. (This is implementation-driven architecture: the reflow re-derives what the generator already computed because there was no shared decision object to call.)

**W3 — Committed-intent and adaptation state are device-local. (Medium. Violates portability, brushes L10.)**
Session overrides (Train-Now and freeze-on-start snapshots) live only in `localStorage` and are never synced. An athlete who starts a session on their phone and opens the tablet sees a *different* (reflowed) session — the frozen intent does not travel. The freeze guarantee is correct in spirit but device-bounded in fact.

**W4 — Mutable module-level runtime state. (Medium.)**
`PlanService` holds `let _runtime = {...}` mutated by the store. This is global mutable state in what should be a pure reasoning module; it makes the reflow non-reentrant, order-dependent, and hard to test in isolation. (A pure `reflow(plan, athleteState)` would have no such state.)

**W5 — Volume math exists in multiple places with subtle differences. (Medium.)**
Counting/target/contribution logic spans `targets.js`, `volume.js`, `contributions.js`, `rollingVolume.js`, and the allocator's internal scoring. Each is individually sound, but the same concept ("how many sets did/should muscle M get") is computed in several spots — a refactor hazard and a source of the overshoot (the allocator's internal accounting and the target accounting are not the same computation).

**W6 — Knowledge present but inert. (Medium. The meta-debt.)**
The platform has built a knowledge base with provenance/confidence, an SKB with 21 evidence-tagged sections, an injury profile system — and then *not wired most of it to decisions.* The gap between "knowledge authored" and "knowledge consumed" is the dominant form of technical debt here. It is benign (additive, non-breaking) but it means the codebase's apparent sophistication overstates the engine's actual reasoning.

**W7 — `CLAUDE.md` and code have drifted. (Low, but corrosive.)**
The canonical project doc says the engine is in `apps/mobile/src/lib/` and `packages/engine` is empty; the engine is in `packages/engine`. Stale canonical docs erode trust in *all* docs. (This EDS should be kept current as a deliberate act; see §41.)

## 16. Hidden assumptions

The engine makes a number of assumptions it never states. Surfacing them is half of fixing them.

| # | Hidden assumption | Why it's risky |
|---|-------------------|----------------|
| H1 | "More volume (up to a wall) is better." | The evidence is diminishing returns; the engine's ramp-toward-MRV plus overshoot operationalises "more is better" past the point it's true (S3). |
| H2 | "Sport need = muscle re-weighting." | Sport need is a force/velocity/energy/skill profile; muscle emphasis is a shadow of it (A1, A4). |
| H3 | "Fatigue is managed by shortening sessions." | Fatigue is managed primarily by reducing intensity/tonnage; the engine can't (A7). |
| H4 | "The athlete is a single device, online-ish, logging consistently." | Overrides are device-local (W3); readiness needs daily logging; no model for the chronic non-logger beyond conservative defaults. |
| H5 | "Injuries are a late filter." | Injuries are a *primary constraint* that should shape construction (A6). |
| H6 | "ACWR is meaningful for gym load." | Built from endurance TRIMP, applied to gym volume, on a discredited ratio (S1). |
| H7 | "A sport is its emphasis vector." | A sport is a structured demand model; the vector is lossy (A4, A8). |
| H8 | "The deload need is captured by readiness + ACWR + recovery ratings." | No model of cumulative neural fatigue, life stress, or true tissue tolerance; the 3-day window is arbitrary (S1, H3). |
| H9 | "Every session should be filled to its time budget." | Directly violates minimum-effective-dose (L5); the allocator fills, then a finisher rounds out remaining time. |
| H10 | "Position and individual difference don't matter yet." | They are first-class coaching inputs the architecture currently can't represent (A10). |

## 17. The bodybuilding bias, structurally traced

The brief asks specifically to identify bodybuilding bias. It is not incidental — it is *structural*, and it shows at every layer. Tracing it precisely:

**17.1 At the primitive.** The unit of planning is weekly hard sets per muscle with MEV/MAV/MRV landmarks — the Renaissance-Periodisation hypertrophy model. This is the *chassis*; strength, functional, and sport are *trim levels* on it (`STYLE_TOP` just changes where the same muscle-volume ramp tops out).

**17.2 At goal resolution.** `bodybuilding` sets `STYLE_TOP = 1.4`, ramping volume *past MAV toward MRV* — the only style that deliberately chases the high-volume end. Emphasis bumps shoulders/biceps/triceps — *aesthetic* muscles, not performance qualities.

**17.3 In sport handling.** Sport emphasis is *multiplicative after the muscle-volume ramp*. So a sport never *replaces* the hypertrophy logic — it only *down-weights* it. Concretely (from the evaluation): a **sprinter gets 12 sets of chest/week** plus Cable Fly and Spider Curl; a **distance runner gets chest flyes**; **every sport session opens with a squat/hinge anchor**, so a *swimmer* front-squats before pulling. The evidence (Llanos-Lagos 2024; Crowley 2017) says submaximal bodybuilding volume is *less* effective for these athletes — high-load strength and plyometrics drive transfer. The engine can't express that because it has no plyometric/RFD primitive (S5) and because sport is a modifier on a hypertrophy base (A1, A4).

**17.4 In the fill philosophy.** The allocator's instinct is to *fill the session* (and a finisher tops up leftover time). That is a bodybuilding instinct ("more quality volume is good"), not a coaching one ("minimum effective dose, then bank the time"). It even *overshoots* the volume target (S3) — the bias is so strong the engine exceeds its own prescription.

**17.5 Vestigially, in copy.** Phase taglines still read "Build the aerobic engine" on pure gym plans — endurance-era leftovers — and session titles are generic ("Upper · push") rather than purpose-named, because a hypertrophy split *has* no per-session performance purpose to name (F3, F7).

**The fix is not to remove bodybuilding** — it is a legitimate, fully supported goal (2.8). The fix is to **demote the hypertrophy model from chassis to one demand profile among many**, sitting beside "sprint," "distance run," "swim," and "GAA midfielder" as peers, all consumed by a sport-agnostic decision core (Part V). Bodybuilding then becomes "the sport whose demand profile *is* muscle hypertrophy" — and the muscle-volume machinery, which is genuinely good, becomes the *correct* engine *for that profile* and a *downstream accounting ledger* for all the others.

## 18. What is genuinely strong (and must not regress)

A critique that only attacks is dishonest. These properties are excellent and are *load-bearing assets* for the redesign. The migration must preserve them.

- **G1 — Purity and determinism of `generatePlan`.** Same profile ⇒ identical plan; ~60k plans, zero crashes; golden-master-testable. *This is the single most valuable property in the codebase* (P12). Any redesign must keep the planning core pure.
- **G2 — Fractional (synergist-weighted) set counting.** The evidence-endorsed accounting method (Pelland 2024). Keep it — but as a *downstream ledger*, not the primitive.
- **G3 — The injury subsystem.** Data-driven, phase-staged contraindications; a rehab library; evidence-linked prevention; a schema validator. *This is the model the entire engine should follow* — knowledge as validated data, reasoning as code over it. Its main flaw (post-hoc application) is an *ordering* fix, not a redesign.
- **G4 — The knowledge base with provenance.** `evidenceLevel`, `source`, `confidence`, `lastReviewed` per entry. The seed of the Confidence Model (§28). It exists; it must become *operative*.
- **G5 — The Sport Knowledge Base schema.** A 21-section, evidence-tagged, privacy-validated per-sport model. *This is the target knowledge architecture, already designed and authored.* The redesign's job is largely to *consume* it (§30).
- **G6 — Freeze-on-commit.** The discipline that a committed session never silently changes (L10). Correct and important; needs to become device-portable (W3).
- **G7 — Conservative composition under uncertainty.** Stacking modifiers by taking the smaller, flooring the cut — directionally right (be cautious when unsure). Needs to become *symmetric* (able to add when an athlete is demonstrably primed) and *intensity-aware* (A7).
- **G8 — Privacy by validation.** Raw vitals can never be flagged coach-visible; a validator *fails the build* otherwise (L13). Exactly the right mechanism — enforce invariants in code, not in review.
- **G9 — Stable session keys + epoch guard.** Completion state maps across regenerations without leaking across a restart. Subtle and correct; preserve it.

> **Design stance:** the redesign is **not a rewrite.** It is a *re-seating* — keep the strong machinery (volume accounting, injury system, knowledge base, SKB, purity, freeze-on-commit) and put a *coaching decision layer on top of it* that reasons in qualities and adaptations, consumes the sport knowledge, applies constraints first, validates after, and learns. Most of Part IV's findings are dissolved by *changing the order and the primitive*, not by discarding code.

---

# Part V — Decision Architecture (the heart)

This is the most important part of the specification. It defines the engine's mind: the unit it reasons in, the decisions it makes, how they depend on one another, and how they resolve. If only one part of this document survives, it should be this one.

## 19. The atomic unit: the coaching decision

The current engine's atomic unit is a number (a per-muscle set target). The new engine's atomic unit is a **decision**: an explicit, inspectable reasoning step. The engine is not a pipeline of functions that pass data; it is a **graph of decisions** that each take a question, consult knowledge and athlete state, and emit an answer *with its reasoning and confidence attached*.

Every decision in the engine conforms to one contract:

```
DECISION
  id            a stable name (e.g. "diagnose.limiting-factors")
  purpose       the coaching question it answers, in one sentence
  inputs        the athlete-state and knowledge it requires (typed, explicit)
  reasoning     HOW it decides — the rule/algorithm/model, stated plainly
  output        the answer it emits (typed), CARRYING its own rationale
  confidence    how sure it is (derived from input confidence + evidence)  →  L12
  dependencies  which decisions must run first (its parents in the graph)
  consumers     which decisions/modules read its output (its children)
  failureModes  how it can be wrong, and how it degrades safely  →  L14
  rationale     a plain-English "why", emitted with the output  →  L11
```

Three properties make this powerful:

1. **Purity (P12).** A decision is a pure function `decide(inputs) → {output, confidence, rationale}`. Same inputs ⇒ same output. Each decision is independently unit-testable and golden-master-able.
2. **Inspectability (L11).** Because every decision emits a rationale and confidence, the engine can explain *any* recommendation by walking the decision graph backward: *"This session develops reactive strength (priority quality) because low reactive strength is your top limiting factor for sprinting (diagnosis), and these three exercises drive it at the minimum dose your knee injury and Tuesday track session allow (constraints)."*
3. **Substitutability (P10, §42).** Because decisions have typed boundaries, any single decision can be replaced — by a better algorithm, by an AI model, by a human coach's override — without touching the others, *provided it honours the contract.* This is how the AI layer (Stage 6) and the coach override (Team package) plug in: at decision boundaries, not by forking the engine.

> **The rule that makes the architecture extensible:** the engine core *runs the decision graph*; it does not contain the decisions' domain knowledge. Each decision reasons from the Knowledge Architecture (Part VII). Adding a sport, a quality, an injury, or a progression model is *new knowledge*, consumed by *existing decisions* — zero core edits (P11).

## 20. The decision catalogue

The decisions the engine makes, in dependency order. This is the spine of §8 made executable. Each is given its full contract. (Doses, thresholds, and exact models live in the Knowledge Architecture and Domain Models, Parts VII–VIII; here we define *the decisions*, not their parameters.)

> Notation: **▶ inputs**, **⚙ reasoning**, **◀ output**, **~ confidence**, **�beforewhich = dependencies**, **→ consumers**, **✗ failure modes**. Every output additionally carries a plain-English rationale (omitted from the notation for brevity but required by L11).

### D1 · Athlete Assessment
- **Purpose** — Build the structured model of *who this athlete is right now*.
- **▶** Onboarding answers; tracked lifts; training history; demonstrated qualities (from logs); demographics; learning priors (per-athlete, if any).
- **⚙** Normalise inputs; classify training age and capability per quality; estimate current quality levels (strength from lifts vs. standards; others from history/assessment or population priors where unmeasured); attach confidence to each estimate (high if measured, low if inferred).
- **◀** *Athlete model*: capability per quality, training age, lift estimates, equipment, availability, injury history, constraints, goal.
- **~** Per-attribute: high where measured, low where inferred. Whole-model confidence grows with data (P9).
- **deps** none (root). **→** D2, D4, all downstream.
- **✗** Sparse onboarding ⇒ many low-confidence estimates ⇒ wider margins downstream (L14), never a halt. Mis-entered lifts ⇒ caught by sanity bounds and later by learning (D16).

### D2 · Demand Resolution
- **Purpose** — Determine what the athlete's goal/sport *requires*, as a structured demand profile.
- **▶** Goal/sport (+ event, season, intent) from the athlete model; the Sport Knowledge module for that sport (or the goal-as-sport demand profile for build goals).
- **⚙** Look up the sport's demand profile (physical-quality importances, energy-system mix, movement/force/velocity demands, injury risks, competition/season structure, transfer characteristics). For build goals, resolve the goal's quality-importance profile (e.g., "build muscle" ⇒ hypertrophy-dominant quality weights). *This decision contains no sport-specific code — it reads the sport knowledge module.* (P11)
- **◀** *Demand profile*: ranked quality requirements, energy-system targets, key movements, injury-risk map, season context.
- **~** Inherits the SKB section confidences (evidence-tagged per quality).
- **deps** D1. **→** D3, D4, D6, D7, D11.
- **✗** Sport stub/unknown ⇒ fall back to a generic athletic demand profile + flag low confidence; never invent demands.

### D3 · Position / Individual Demand Refinement
- **Purpose** — Refine the demand profile for the athlete's position/event and personal specifics.
- **▶** Demand profile (D2); position/event (if any); individual notes (history, asymmetries, stated priorities).
- **⚙** Apply position modifiers from the sport module; fold in individual demand signals. Where no position is given, pass through.
- **◀** *Refined demand profile*.
- **~** Position modifiers carry SKB confidence; individual refinements are athlete-specific (grow with data).
- **deps** D2. **→** D4. **✗** Missing position ⇒ pass-through (safe).

### D4 · Limiting-Factor Diagnosis  ★ the pivot
- **Purpose** — Identify what is *most constraining* the athlete's sport performance now.
- **▶** Athlete model (D1) and refined demand profile (D3); injury status; recent performance/assessment data.
- **⚙** Compute the *gap* per quality: `demand_importance × (target_level − current_level)`, adjusted by trainability-now (is this quality safe and timely to train given injuries, season, and recoverability?) and by injury-risk (a high-risk, under-developed quality is a priority *limiter and protector*). Rank the gaps. This is the engine's central act of judgement.
- **◀** *Ranked limiting factors*, each with magnitude, rationale, and confidence.
- **~** Driven by the weakest-confidence inputs (current-level estimates often low early; sharpens with assessment/learning).
- **deps** D1, D3. **→** D5. **✗** No measured current levels ⇒ diagnose from population priors + sport risk profile, low confidence, conservative priorities. *Never* produce no diagnosis — a generic athlete still has generic limiters.

### D5 · Priority-Quality Selection
- **Purpose** — Choose the small set of qualities to develop this block for highest return.
- **▶** Ranked limiting factors (D4); season/phase context; recoverability budget; concurrent-training constraints.
- **⚙** Select the top *k* limiters that (a) are trainable now without compromising the sport (L1), (b) fit within the recoverable budget alongside sport load (L3), and (c) are compatible with each other (don't prescribe maximal-strength and maximal-endurance emphases in the same week without sequencing). Prefer the highest-leverage, including injury-prevention qualities. `k` is small (typically 1–3) — focus beats breadth.
- **◀** *Priority qualities* for the block, ordered, each tracing to a limiting factor.
- **~** Inherits diagnosis confidence; selection adds margin when confidence is low (fewer priorities, more conservative).
- **deps** D4. **→** D6, D7, D9. **✗** Conflicting high-priority limiters ⇒ sequence across blocks (D7), don't cram.

### D6 · Training Strategy
- **Purpose** — Decide the macro approach: how qualities are sequenced and concurrency is managed.
- **▶** Priority qualities (D5); demand profile (D2); constraints; training history.
- **⚙** Choose a concurrent-training model and sequencing rule (strength-first within sessions; separate interfering modalities; choose emphasis/maintenance balance across qualities). Encode interference law (running interferes with lower-body strength more than cycling; trained athletes more affected — strength-first sequencing, modality separation). Decide whether the block *develops* one quality while *maintaining* others, or develops two compatibly.
- **◀** *Strategy*: sequencing rules, concurrency model, develop/maintain map.
- **~** Strong evidence base (concurrent-training literature is L1) ⇒ usually high confidence.
- **deps** D5. **→** D7, D8, D11, D13. **✗** Over-constrained schedule ⇒ prioritise sport-protection and the top quality; explicitly down-scope and record it (L15).

### D7 · Periodisation / Block Objective
- **Purpose** — Structure the macrocycle into blocks, each with one dominant objective.
- **▶** Strategy (D6); priority qualities (D5); season/competition calendar; training history.
- **⚙** Assign each block a *single dominant adaptation objective* aligned to a priority quality and the season (e.g., off-season: maximal-strength base; pre-season: convert to power; in-season: maintain with minimal fatigue; peak: taper). Choose block length, intensity/volume trajectory, and deload rhythm from the block objective and the athlete's recoverability — *not* from a fixed style template (A9). Place a real taper before key competition (volume down, intensity held — S4/L-correct).
- **◀** *Periodised blocks*, each with objective, length, trajectory, deloads, taper.
- **~** Periodisation-beats-non-periodisation is L1; exact block lengths are heuristic (moderate).
- **deps** D6. **→** D8. **✗** No event date ⇒ rolling block model with conservative deload rhythm; never assume a peak that isn't there.

### D8 · Weekly Objective (microcycle)
- **Purpose** — Give each week a loading pattern and objective within its block.
- **▶** Block (D7); strategy (D6); the fixed sport schedule (team/individual); fixture congestion.
- **⚙** Lay out the week's loading (heavy/power/recovery/prevention days) around the sport schedule so gym load complements rather than clashes with sport load (microcycle templates by fixture density: one match/week, congested, etc.). Set the week's volume/intensity targets from the block trajectory.
- **◀** *Weekly objective*: per-day intent, weekly volume/intensity targets, sport-aware spacing constraints.
- **~** Moderate–high (microcycle structuring is well-evidenced; congestion models less so).
- **deps** D7. **→** D9, D13. **✗** Fixture clash ⇒ sport wins; gym day moves or lightens (L1).

### D9 · Session Objective
- **Purpose** — Give each session exactly one purpose. (L7)
- **▶** Weekly objective (D8); priority qualities (D5); the day's intent.
- **⚙** Assign a single named objective per session (e.g., "develop maximal lower-body force," "in-season power maintenance," "posterior-cuff prevention + scapular endurance"). The objective dictates the session's quality target, intensity zone, and acceptable fatigue cost.
- **◀** *Session objective* (named, with target quality, intensity zone, fatigue budget).
- **~** Inherits weekly/priority confidence.
- **deps** D8. **→** D10, D11, D12, D14. **✗** Two competing purposes ⇒ split or pick one (never a muddled session).

### D10 · Movement / Quality Requirements
- **Purpose** — Translate the session objective into *movement and loading characteristics* needed — before any exercise is named. (P5)
- **▶** Session objective (D9); demand profile movements (D2); injury contraindications.
- **⚙** Derive the required movement patterns, force-velocity profile (heavy/slow vs. light/fast vs. elastic), contraction emphasis (eccentric/isometric/concentric), and any sport-specific movement signatures — as *requirements*, not exercises. Subtract contraindicated patterns up front (L8).
- **◀** *Movement/quality requirements* for the session.
- **~** Inherits objective confidence.
- **deps** D9. **→** D11. **✗** All ideal patterns contraindicated ⇒ fall to the best available transfer; record the compromise.

### D11 · Intervention Selection
- **Purpose** — Choose the *minimum effective set of interventions* (exercises, and future energy-system work) that satisfy the movement/quality requirements. (P3, P5)
- **▶** Movement/quality requirements (D10); the Exercise/Intervention knowledge (tagged by adaptation, fatigue cost, joint/spinal/neural load, equipment, competency); constraints (equipment, time, level, injuries); priority + the value hierarchy.
- **⚙** Value-ordered selection (not volume-driven fill): for each requirement, pick the highest-transfer, lowest-cost intervention the athlete can do safely; cover the primary requirement first, then supporting, then prevention, then optional quality work — stopping when the session objective is met within its fatigue budget (L5). The value hierarchy (§34) orders any spare capacity; beyond the recoverable dose, *bank the time*.
- **◀** *Selected interventions* (ordered), each tracing to a requirement and a quality.
- **~** Exercise transfer ratings carry SKB/knowledge confidence.
- **deps** D10. **→** D12, D14. **✗** Sparse equipment ⇒ best available regressions; never an empty or junk-filled session.

### D12 · Dose Assignment
- **Purpose** — Assign sets, intensity, reps, tempo, and density to each intervention — the minimum effective dose for the target adaptation. (P3, P7)
- **▶** Selected interventions (D11); session objective + intensity zone (D9); adaptation dose-response models (Knowledge); recoverability budget; readiness (runtime); per-athlete dose-response priors (learning).
- **⚙** For each intervention, read the dose-response model for its target adaptation and the athlete's demonstrated tolerance; assign the *smallest* dose expected to drive the adaptation, scaled by readiness (volume **and** intensity — A7 fixed) and bounded by the fatigue budget. Volume is *computed here as an output*, then handed to validation as a *ledger to check*, not a target to hit.
- **◀** *Dosed session*: each intervention with sets × intensity × reps × tempo × rest.
- **~** Dose-response direction is strong; exact magnitudes are athlete-specific (sharpen via learning).
- **deps** D11. **→** D14, D13. **✗** Unknown tolerance ⇒ conservative dose + observe (the hypothesis is deliberately cautious).

### D13 · Scheduling
- **Purpose** — Place sessions on days to optimise recovery and minimise interference. (Already strong — G-grade today.)
- **▶** Dosed sessions; weekly objective spacing constraints (D8); sport schedule; recovery/interference rules.
- **⚙** Minimise an interference/recovery penalty (same-muscle adjacency, neural-fatigue adjacency, axial-load adjacency, sport-day proximity, key-session protection).
- **◀** *Scheduled week*.
- **~** High (well-evidenced spacing principles).
- **deps** D8, D12. **→** D14. **✗** Too many sessions for the week ⇒ greedy placement + flag suboptimal spacing.

### D14 · Validation  ★ after construction, not before
- **Purpose** — Verify the constructed week/session is recoverable, sport-compatible, balanced, lawful, and scientifically consistent. (Part IX)
- **▶** The scheduled, dosed week; recoverability model; sport-compatibility rules; the engine laws; volume ledger; constraint set.
- **⚙** Run every validator (§35). On a violation, *trim or veto* (not "build more"): e.g., over MRV ⇒ trim lowest-value volume to the ceiling and record the trim (L15); sport-compromising load on a key day ⇒ lighten or move; contraindicated exercise that slipped through ⇒ substitute. Resolve conflicts by the priority order (§37).
- **◀** *Validated week* (+ a validation report: what passed, what was trimmed/vetoed and why).
- **~** Each validator carries its own confidence; safety validators (recoverability, contraindication, sport-protection) act even at moderate confidence; optimisation validators defer when unsure.
- **deps** D12, D13. **→** the athlete (render); D15. **✗** Irreconcilable constraints ⇒ produce the safest satisfiable session and *surface* the compromise; never silently ship an unsafe or law-violating plan.

### D15 · Runtime Adaptation (reflow)
- **Purpose** — Reshape *pending* work in response to reality, over the immutable plan. (L10)
- **▶** The immutable plan; what was actually done; today's readiness (subjective-weighted, intensity-aware); load (absolute + change); active injuries (as inputs now, not post-filter — A6 fixed); committed-session freezes; sport decision rules.
- **⚙** Re-run the *relevant* downstream decisions (D9–D14) for pending sessions only, with reality folded into their inputs: missed adaptation re-prioritised (not just missed *volume* caught up), readiness scaling *both* volume and intensity, injuries shaping selection up front. Respect freezes (committed sessions are never reshaped). Symmetric: can ease *or*, when the athlete is demonstrably primed and under-loaded, progress.
- **◀** *Adapted pending sessions* (a read-time projection).
- **~** Bounded by readiness/load confidence; conservative when uncertain (L12), but no longer *only* conservative (G7 fixed).
- **deps** D14 (baseline), live athlete state. **→** the athlete; D16. **✗** Missing signals ⇒ fall back to the baseline plan (L14); never a broken or empty week.

### D16 · Learning
- **Purpose** — Update the engine's beliefs so the next loop is better. (P9, Part VI §25)
- **▶** Prescribed vs. actual (completion, loads, RPE); readiness/recovery responses; performance/assessment changes over time.
- **⚙** Update three tiers of prior — *population*, *sport*, *athlete-specific* — each at its own learning rate and confidence. E.g., infer this athlete's real recovery rate, real volume tolerance per muscle/quality, real rate of progress per quality, real readiness baselines. Feed these back as priors consumed by D1, D4, D7, D12. *Learning never edits a plan (L9);* it edits the priors the next planning pass reads.
- **◀** *Updated priors* (per-athlete; aggregated to sport/population offline).
- **~** Low early (little data) → rising; confidence is itself a learned quantity.
- **deps** accumulated history. **→** D1, D4, D7, D12 (next loop). **✗** Noisy/sparse data ⇒ slow learning rate, wide posterior; never overfit a single session.

## 21. The decision graph

The decisions form a directed acyclic graph. The planning pass runs it top-to-bottom (D1→D14); the runtime re-runs the lower subgraph (D9–D14) over the immutable baseline; the learning loop runs asynchronously and feeds priors back to the top.

```
            ┌──────────────────────── KNOWLEDGE ARCHITECTURE (Part VII) ───────────────────────┐
            │  Athlete · Sport(SKB) · Quality/Adaptation · Exercise · Recovery · Programming ·   │
            │  Constraint · Validation · Evidence/Confidence   — all read by the decisions below │
            └───────────────────────────────────────────────────────────────────────────────────┘
                                              ▲ (every decision reads knowledge)
   PLANNING PASS (pure, deterministic — P12)  │
   ───────────────────────────────────────────┼───────────────────────────────────────────────
   D1 Assess ─▶ D2 Demand ─▶ D3 Position ─▶  D4 DIAGNOSE  ─▶ D5 Prioritise ─▶ D6 Strategy
                                                  ▲ (the pivot)                      │
                                                  │                                  ▼
                                          (learning priors)                  D7 Block objective
                                                                                     │
                                                                                     ▼
                                                                            D8 Weekly objective
                                                                                     │
                                                                                     ▼
                                                                            D9 Session objective
                                                                                     │
                                                                                     ▼
                                                               D10 Movement/quality requirements
                                                                                     │
                                                                                     ▼
                                                                        D11 Intervention selection
                                                                                     │
                                                                                     ▼
                                                                             D12 Dose assignment
                                                                                     │
                                                                          D13 Schedule ◀┘
                                                                                     │
                                                                                     ▼
                                                              D14 VALIDATE ──▶ immutable PLAN (hypothesis)
   ───────────────────────────────────────────────────────────────────────────────────────────
   RUNTIME (read-time projection — L10)        reality (done · readiness · load · injuries · freezes)
                                                                                     │
                                              D15 ADAPT  re-runs D9–D14 for PENDING work only ▼
                                                                                     │
                                                                          adapted pending sessions
   ───────────────────────────────────────────────────────────────────────────────────────────
   LEARNING (async — L9)   D16 LEARN  ──updates priors──▶ (back to D1, D4, D7, D12 next loop)
```

Read this graph as the literal architecture: **boxes are pure decisions, arrows are typed data, the knowledge band feeds them all, and nothing in the core hard-codes a sport, an injury, or a quality** (P11). The pivot (D4) is drawn prominently because it is where understanding becomes response — the act the current engine omits entirely.

## 22. Decision trees (worked)

Two worked examples show the graph producing *categorically different* reasoning for two athletes the current engine would treat as muscle-emphasis variants. (Compare to §17.3, where both get bodybuilding volume.)

### 22.1 In-season distance runner, healthy, 2 gym days/week

```
D2 Demand    : aerobic capacity (10), running economy via tendon stiffness (9), 
               eccentric hamstring robustness (9, top injury risk), max strength (6),
               hypertrophy (LOW — added mass harms economy)
D4 Diagnose  : limiting factors = (1) low eccentric-hamstring capacity [injury+performance],
               (2) modest tendon stiffness; hypertrophy gap IGNORED (not a limiter; would harm)
D5 Prioritise: develop eccentric-hamstring robustness + maintain max strength; 
               k=2; in-season ⇒ MINIMAL fatigue (L1: don't compromise the running)
D6 Strategy  : strength-first, FAR from key runs; maintenance dose; no hypertrophy emphasis
D7 Block     : in-season maintenance; no volume ramp toward MRV
D9 Session   : "durability + economy maintenance, minimal fatigue"
D10 Movement : heavy-slow + eccentric hip-hinge; reactive calf/tendon loading; NOT chest/arms
D11 Select   : Nordic/RDL (eccentric ham), heavy calf/pogo (tendon), 1 heavy compound to maintain;
               NO chest fly, NO spider curl  (value hierarchy stops at the recoverable dose)
D12 Dose     : low volume, high-ish intensity to maintain; small eccentric dose; bank the rest
D14 Validate : recoverable alongside weekly mileage? sport-compatible (not near long run)? ✓
```

The current engine, by contrast, would hand this runner a down-weighted full-body hypertrophy session including chest flyes (§17.3). The difference is not tuning — it is *reasoning vs. re-weighting*.

### 22.2 Off-season novice sprinter, prior hamstring strain, 3 gym days/week

```
D1 Assess    : novice (low technical competency → L4 gates Olympic lifts, depth jumps OUT),
               prior hamstring strain (recurrence risk high)
D2 Demand    : rate of force development (10), max strength base (9), reactive strength (8),
               anaerobic power (8)
D4 Diagnose  : limiters = (1) max-strength base (prerequisite to RFD; novice), 
               (2) hamstring robustness (recurrence protection), (3) RFD — but BLOCKED by competency
D5 Prioritise: build max-strength base + hamstring robustness NOW; defer plyometric RFD until 
               competency + base exist (sequencing across blocks, not cramming)
D6 Strategy  : off-season base; strength-first; progress competency toward future power block
D10 Movement : heavy bilateral + unilateral lower; heavy eccentric hamstring; teach hinge/squat
D11 Select   : trap-bar DL, squat, Nordic/RDL, single-leg — NOT hang clean/depth jump (L4)
D12 Dose     : progressive overload on the base; controlled eccentric ham dose
D7 (future)  : next block converts base → power once competency gate passes
```

Same "sprint" sport, *different reasoning* from the runner — and *different reasoning from an advanced sprinter* (who would get the power/plyometric work the novice is gated out of). The engine reasons about *this athlete*, not a sport template (2.10, P9).

---

# Part VI — The Three Loops

The decision graph (Part V) is the engine's anatomy. The three loops are its physiology — how it operates over time. They run at different cadences and must be kept architecturally distinct (L9): conflating planning with learning is how engines overfit, and conflating planning with adaptation is how they mutate plans they should treat as hypotheses.

## 23. The Coaching Loop (the season-long cadence)

The outermost loop. It is the human coaching process of §5, executed continuously across a macrocycle. It is not a function call — it is the *shape of the engine's relationship with the athlete over months*.

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │                          THE COACHING LOOP                             │
   │                        (runs across the season)                        │
   │                                                                        │
   │   OBSERVE ──▶ ASSESS ──▶ DIAGNOSE ──▶ PRIORITISE ──▶ PLAN ──▶ INTERVENE│
   │     (D-in)     (D1)        (D4)         (D5)        (D6–14)    (render) │
   │     ▲                                                            │      │
   │     │                                                            ▼      │
   │   LEARN ◀────────────────── VALIDATE ◀───────────────────── (athlete   │
   │   (D16)                       (D14 +                          trains)   │
   │     │                      outcome check)                               │
   │     └────────────── priors feed the next turn of the loop ─────────────┘
   └──────────────────────────────────────────────────────────────────────┘
```

- **Cadence**: a full turn spans a block (weeks); re-diagnosis happens at block boundaries and on significant events (injury, goal change, a competition result, a sustained readiness shift).
- **Trigger to re-enter at DIAGNOSE**: end of block; new injury; goal/sport change; a learning signal that a prior has shifted enough to change the diagnosis (e.g., a quality the athlete has now developed past its limiting threshold).
- **Why it's a loop, not a pipeline**: the athlete is non-stationary. Their limiting factors *change* as they develop. A static plan is a coaching failure by month two even if it was optimal in week one. The loop exists to keep re-asking "what is the highest-value intervention *now*?" (the one question, §1).

## 24. The Planning Loop (the deterministic core)

The planning loop is one full traversal of D1→D14: athlete state in, immutable plan out. It is **pure and deterministic** (P12) — the platform's crown-jewel property (G1).

```
   athlete state (+ priors)  ──▶  [ D1 → D2 → D3 → D4 → D5 → D6 → D7 →
                                     D8 → D9 → D10 → D11 → D12 → D13 → D14 ]  ──▶  PLAN (hypothesis)
                                              ▲
                                   reads Knowledge Architecture (Part VII)
   properties:
     • same (state, priors, knowledge) ⇒ byte-identical plan        (golden-master testable)
     • no I/O, no clock, no storage, no UI                          (a pure library — Part X)
     • every decision emits {output, confidence, rationale}         (explainable — L11)
     • constraints applied BEFORE construction                      (L8)
     • volume computed as OUTPUT, then validated                    (P7, L5)
```

Three rules govern the planning loop:

1. **It plans; it does not learn or adapt.** It reads priors (from D16) and reality is *not* an input here — reality enters only at the runtime loop (D15). This keeps the core pure.
2. **It produces a hypothesis, not a promise.** The whole macrocycle is generated, but only the near term is treated as firm; later blocks are explicitly provisional and will be re-planned as the athlete develops (2.6).
3. **Construct, then validate.** Construction (D9–D13) is followed by validation (D14) that can trim or veto. The loop never ships unvalidated work (L8, §35).

### Planning vs. adaptation (the critical separation)

| | Planning loop (D1–D14) | Runtime/adaptation loop (D15) |
|---|---|---|
| **Question** | "What *should* the macrocycle be?" | "What should the athlete do *this week*, given reality?" |
| **Inputs** | Athlete state + priors + knowledge | Immutable plan + what actually happened + today's readiness/load/injuries |
| **Output** | Immutable plan (hypothesis) | Read-time projection over pending work only |
| **Purity** | Pure, deterministic | Pure function of (plan, live state); no mutation of the plan |
| **Scope** | The whole macrocycle | Current + near-term pending sessions; respects freezes |
| **Cadence** | On (re)plan: onboarding, block boundary, goal/injury change | Continuously, as state changes |

This is the boundary the current engine *blurs* (the reflow re-derives planning logic in the UI layer, A5/W2). The EDS makes it crisp: **one pure planner, one pure adaptor, sharing decisions D9–D14 as a common library — not as duplicated code.**

## 25. The Learning Loop (becoming bespoke)

The learning loop is what turns a generic engine into *this athlete's* coach (P9). It runs asynchronously, never on the critical path of planning, and never mutates a plan (L9). Its job: convert outcomes into improved priors.

```
   prescribed ──┐
                ├─▶ [ D16 LEARN ] ──▶ updated priors at three tiers ──▶ consumed by next planning loop
   actual ──────┘                         │
   (done, loads, RPE,                     ├─ POPULATION priors   (slow, aggregated, cross-athlete)
    readiness response,                   ├─ SPORT priors        (per-sport, cross-athlete-in-sport)
    performance change)                   └─ ATHLETE priors      (fast, this athlete only)
```

### The three evidence tiers

Decisions blend three sources of belief, weighted by confidence:

1. **Population evidence** — the published science and cross-athlete aggregates. The starting prior for everything. High coverage, low specificity. (e.g., generic MEV/MAV/MRV, dose-response curves, taper magnitudes.)
2. **Sport evidence** — what is true for athletes *in this sport* (the SKB, plus cross-athlete-in-sport aggregates). More specific. (e.g., swimmers' shoulder-load tolerance, runners' interference sensitivity.)
3. **Athlete-specific evidence** — what *this athlete* has actually demonstrated. Most specific, initially least data. (e.g., this athlete's real recovery rate, their real MRV per muscle, their rate of strength gain, their readiness baseline.)

As athlete data accumulates, its weight rises and the population prior's weight falls — *for that quantity, for that athlete* — a standard shrinkage/Bayesian-updating posture. **Confidence is itself learned**: the engine knows not just its best estimate of, say, the athlete's recovery rate, but how *sure* it is — and that certainty governs how much margin it leaves (L12).

### What the engine learns (examples)

| Quantity | Population prior | Becomes athlete-specific via |
|---|---|---|
| Recovery rate / capacity | Age/sex/training-age norms | Observed readiness rebound after known loads |
| Volume tolerance (MRV) per muscle/quality | Generic landmarks (L5) | Observed performance/readiness vs. delivered volume |
| Dose-response per quality | Published curves | Observed progress vs. prescribed dose |
| Readiness baseline & sensitivity | Population HRV/sleep norms | This athlete's own rolling baselines |
| Adherence pattern | None | Observed completion by day/time/context (informs realistic planning) |
| Injury susceptibility | Sport risk profile | This athlete's flare-ups and triggers |

### How uncertainty influences decisions

This is the operational core of the Confidence Model (§28), stated here as loop behaviour:

- **Low confidence ⇒ conservative.** Wider safety margins, smaller priorities (smaller `k` in D5), lower doses, demotion of uncertain signals to non-gating. The novice with no history gets a cautious, generic-but-sound plan.
- **Rising confidence ⇒ sharper and bolder.** As the engine learns an athlete tolerates more, recovers faster, or responds strongly to a quality, it can prescribe more precisely and progress more assertively (the symmetric autoregulation that G7 currently lacks).
- **Confidence is surfaced.** "We're still learning your recovery — this plan is deliberately conservative" is a *feature* (L11): it sets expectations and invites the data that will sharpen it.

> **The learning loop is the difference between an app that gives everyone the same good plan and a coach who knows *you*.** It is deferred in the current roadmap (Stage 6+), but the architecture must reserve its seams *now*: decisions D1/D4/D7/D12 must read priors as typed inputs from day one, even when those priors are pure population defaults. Retrofitting learning into decisions that never expected priors is the kind of implementation-driven debt this document exists to prevent.

---

# Part VII — Knowledge and Data Architecture

## 26. Knowledge Architecture

The central architectural principle, restated as the load-bearing wall of the whole system:

> **Knowledge is separated from decision logic. The engine reasons *from* structured, evidence-tagged knowledge; it does not embed knowledge in code.** Adding a sport, an injury, a quality, a progression model, or a recovery metric is a *data* change — a new entry in a knowledge module and (if new in kind) a registry line — with *zero edits to the reasoning core* (P11).

This is the lesson the injury subsystem already proves (G3): contraindications, rehab, and prevention live as validated *data*; the reasoning over them is small, generic code. The EDS generalises that pattern to the entire engine.

### 26.1 The knowledge modules

Knowledge is partitioned into modules, each a body of evidence-tagged data with a schema and a validator. Decisions (Part V) read these; they never hard-code their contents.

| Module | What it holds | Primarily read by | Today |
|---|---|---|---|
| **Athlete knowledge** | The athlete model schema; capability/ training-age classification rules; how qualities are estimated from inputs | D1, D4 | Partial (profile shape exists; quality estimation absent) |
| **Sport knowledge (SKB)** | Per-sport demand profiles: qualities, energy systems, movement/force/velocity demands, injury risks, positions, season/microcycle structure, transfer, KPIs, decision rules | D2, D3, D8, D11 | **Authored (21 sections × 8 sports); ~95% dormant** — the migration's biggest unlock |
| **Quality / Adaptation knowledge** | The physical-quality taxonomy; per-quality dose-response models, fatigue cost, recovery time, assessment methods, prerequisites | D5, D10, D12 | **Absent** — must be built (only a 3-value `quality` tag exists) |
| **Exercise / Intervention knowledge** | Per-exercise: adaptations/qualities driven, force-velocity profile, fatigue & joint/spinal/neural cost, equipment, competency, sport transfer, regressions/progressions | D10, D11, D12 | Partial (rich attributes exist; quality/cost tagging thin) |
| **Recovery knowledge** | Readiness model weights (subjective ≥ HRV); illness/travel/stress rules; recovery-time models; capacity estimation | D12, D15 | Partial (objective-heavy; subjective under-used — S2) |
| **Programming knowledge** | Periodisation models; rep/intensity schemes per quality & phase; progression models; deload/taper rules | D7, D8, D12 | Partial (template-based, style-keyed — A9) |
| **Constraint knowledge** | How time, equipment, schedule, injuries, and recoverability bound the solution; how to compute the constraint box | D6–D14 | Partial (equipment/level exist; injuries late — A6) |
| **Validation knowledge** | The validators and their thresholds; conflict-resolution priority | D14 | Partial (MRV ceiling incomplete — S3) |
| **Evidence / Confidence knowledge** | The provenance + confidence layer attached to *every* entry in *every* module above | all decisions | **Exists** (knowledge base with `evidenceLevel/source/confidence`) — but inert (W6) |

### 26.2 The shape of a knowledge entry

Every fact in every module carries provenance and confidence (this already exists in the knowledge base and the SKB — the EDS makes it *universal and operative*):

```
KNOWLEDGE ENTRY
  id            stable identifier
  value         the fact (a number, curve, rule, mapping, profile…)
  appliesTo     which decisions/qualities/sports it informs
  evidenceLevel L1 (meta-analysis/major RCT) … L5 (expert/anatomical reasoning)
  confidence    high | moderate | low
  source        real citation(s) — NEVER fabricated  (SKB evidence policy)
  lastReviewed  date — knowledge is perishable and must be re-checked
```

Two rules make this trustworthy:
- **No fabricated evidence, ever.** Where evidence is thin, label it expert consensus and tag `confidence: low` / `evidenceLevel: L5`. (The SKB already mandates this; the EDS makes it a platform-wide law in spirit.)
- **Confidence is operative, not decorative (L12).** The `confidence` field is *read by decisions* and governs authority: high-confidence facts can gate; low-confidence facts may only inform. This is the fix for the ACWR defect (S1) generalised: the engine stops treating a low-confidence ratio with the same authority as a high-confidence dose-response curve.

### 26.3 Registries — how new knowledge plugs in

Each module that has many interchangeable members (sports, injuries, qualities, progression models, goal profiles) is a **registry**: a lookup from id → knowledge object, validated on load. Decisions consult the registry, never a specific member.

```
   D2 Demand Resolution
        │  reads
        ▼
   sportRegistry.get(athlete.sport)  ──▶ Sport demand profile
        │
        └─ to add "tennis": author tennis.json (21 sections), add one registry line. Done.
           The decision code does not change. (P11)
```

This is exactly the orchestrator pattern the `02-REFACTOR-ROADMAP` already targets (core coordinates registries; core holds no domain knowledge; "adding a sport = a new file + registry entry, zero core edits"). The EDS adopts it wholesale and extends it from *sports* to *all* knowledge kinds.

## 27. Data Architecture

A clean separation of three data kinds, by lifetime and ownership. Conflating them is a major source of current debt (W1, A5).

| Data kind | What it is | Lifetime | Owner | Examples |
|---|---|---|---|---|
| **Knowledge** | Evidence-tagged domain facts (Part VII §26) | Versioned, slow-changing, shared by all athletes | The platform (curated, reviewed) | Sport profiles, dose-response curves, volume landmarks, validators |
| **Athlete state** | What is true about one athlete | Long-lived, per-athlete, private | The athlete | Profile, history, logs, readiness inputs, injuries, learned priors |
| **Derived artefacts** | What the engine computes from the above | Ephemeral / recomputable | (computed) | The plan, the adapted week, readiness/load signals, the coach's derived view |

Architectural rules following from this split:

1. **The plan is derived, not stored as truth.** It is recomputed from athlete state + knowledge (it is today — keep this). Persist *state and outcomes*, recompute *artefacts*. This is what keeps the engine pure and the plan honest (a hypothesis, regenerable).
2. **Athlete state is the only thing that must be durably, portably persisted.** Including *committed-session freezes* and *learned priors* — the two things currently device-local or absent (W3). The freeze must travel with the athlete, not the device (L10 in practice).
3. **Derived signals are computed by decisions, in the engine — not in the UI store.** Readiness and load are *decisions* (parts of D15's inputs), not view-model side-effects. Moving them out of `buildView` into the engine is the fix for A5/W4.
4. **Privacy is a data-architecture invariant, enforced by validation (L13, G8).** Raw vitals (HRV, sleep, RHR) are athlete-state of the most sensitive kind. They may roll *up* into a derived readiness/load artefact that crosses the coach boundary; they may never cross it themselves. The SKB's privacy validator (which *fails the build* if a raw-vital KPI is flagged coach-visible) is the canonical mechanism; the data architecture extends it to all cross-person surfaces.

### 27.1 The team data surface

The Team package adds *one derived, privacy-bounded read surface* (the coach view) and *one constraint source* (the fixed schedule). It does **not** add a second engine, second store of truth, or any new path to raw vitals.

```
   PLAYER (athlete state, private)                         COACH (derived view only)
   ├─ raw vitals (HRV, sleep, RHR) ─────[ roll UP ]────▶ readiness score, load state
   ├─ plan / adherence ─────────────────────────────────▶ adherence %
   ├─ injuries (status/availability) ───────────────────▶ available | modified | out
   └─ injury notes, raw vitals  ──────[ NEVER cross ]──✗  (validator fails the build if attempted)

   COACH (fixed schedule) ──────[ constraint ]──────────▶ each player's D8/D13 (sport-aware spacing)
```

This is the architecture of `../product/TEAM-ARCHITECTURE.md`, restated as a data-architecture invariant: *additive, team-scoped, derived-only, raw-vitals-never*.

## 28. The Confidence & Evidence Model

Confidence is not a feature bolted onto the engine; it is a *dimension of every fact and every decision*. This section defines how it works, because it is the mechanism that lets the engine "reason from evidence without being replaced by it" (P10) and that fixes the structural defect behind ACWR (S1).

### 28.1 The evidence scale

| Level | Meaning | Default authority |
|---|---|---|
| **L1** | Meta-analysis / systematic review / major RCT | May gate (hard rule) if also operationally validated |
| **L2** | RCT / large cohort | May gate with margin |
| **L3** | Small RCT / sport-specific study / strong consensus | Soft input, can strongly inform |
| **L4** | Expert consensus / mechanistic reasoning | Soft input, informs |
| **L5** | Expert opinion / anatomical logic | Weak input; default conservative |

Confidence (`high/moderate/low`) is a coarser, decision-facing summary derived from evidence level *and* operational validation *and* (for athlete-specific facts) data sufficiency.

### 28.2 How confidence flows

Confidence composes *up* the decision graph: a decision's output confidence is a function of its inputs' confidences and its own evidence. A diagnosis (D4) built on low-confidence current-level estimates is itself low-confidence, and that propagates to priority selection (D5), which responds by narrowing focus and widening margins.

```
   input confidences ──▶ decision ──▶ output confidence ──▶ next decision …
                            │
                            ├─ HIGH  : may act decisively; may gate; narrow margins
                            ├─ MOD   : act with margin; prefer reversible choices
                            └─ LOW   : inform only; never gate; widen margins; conservative dose;
                                       surface the uncertainty to the athlete (L11)
```

### 28.3 The three authority tiers (the ACWR fix, generalised)

Every signal is assigned one of three authority tiers, by its confidence:

1. **Gate** — high-confidence, operationally validated facts may *constrain or veto* (e.g., contraindication for an active injury; the recoverability ceiling; technical-competency gates). Safety gates act even at moderate confidence.
2. **Soft input** — moderate/low-confidence facts may *shift* a decision but never *force* it (e.g., load ratios, exact MEV/MAV/MRV magnitudes, prevention-effect sizes). They tilt; they don't decide.
3. **Reported metric** — very-low-confidence or purely-informational signals are *shown* but do not affect decisions (e.g., a raw ACWR number displayed for transparency).

**ACWR moves from Gate to (at most) Soft input/Reported metric** — exactly what the engine's own knowledge base demands and the runtime has not fully done (S1). The same machinery prevents the *next* over-trusted metric from becoming a hidden gate.

### 28.4 Confidence and the athlete relationship

Surfacing confidence is a trust-builder, not a weakness (2.10, L11):

- Early on: *"This plan is conservative while we learn how you respond."* Sets honest expectations and motivates logging.
- As data accrues: *"We've learned you recover quickly from lower-body work — we've increased your squat frequency."* Demonstrates the engine is *listening*.
- On contested science: *"We treat load ratios as a hint, not a rule — the evidence isn't strong enough to change your plan on its own."* Builds credibility precisely by *not* overclaiming.

> The Confidence Model is what separates this engine from both a spreadsheet (which is falsely certain) and a chatbot (which is fluently certain about everything). The engine is *calibrated*: as sure as the evidence warrants, no more, and honest about the difference.

---

# Part VIII — Domain Models

These are the conceptual schemas the engine reasons over. They are implementation-independent: a model describes *what the engine knows about a thing and why*, not a database table. Each model states its purpose, its core concepts, what is wrong with the current equivalent, and the target.

## 29. The Athlete Model

**Purpose.** Represent who the athlete is, richly enough to diagnose limiting factors and dose interventions, and *increasingly individually over time* (P9).

**Core concepts.**
- **Identity & demographics** — age, sex, bodyweight, height (capacity normalisation only).
- **Goal** — the sport or goal-as-sport, with intent, event date, season, position/event.
- **Capability per quality** — for *each* physical quality (§31), an estimated current level *with confidence*: measured (from lifts/assessments/logs) or inferred (from training age + population priors). This is the object the diagnosis compares against demand — and the current model's biggest gap (it stores muscles and lifts, not qualities).
- **Training age / competency** — overall and per-movement; gates interventions (L4).
- **History & demonstrated response** — what was prescribed, done, and how the athlete responded; the substrate of learning (D16). Includes adherence patterns.
- **Constraints** — available days/duration, equipment, fixed sport schedule, active injuries.
- **Learned priors** — this athlete's demonstrated recovery rate, volume tolerance, dose-response, readiness baselines (D16 output).

**Current vs. target.** Today the athlete is a profile of demographics, goal fields, five lifts, availability, equipment, and injuries — a good *capability snapshot* but *quality-blind* and *history-thin* (the engine doesn't represent "current reactive strength" because it has no quality taxonomy). Target: add a *per-quality capability vector with confidence*, and a *demonstrated-response history* that feeds learning. The five lifts become *anchors that estimate maximal-strength qualities*, not the whole capability model.

## 30. The Sport Model

**Purpose.** Give the engine a *structured, evidence-tagged model of what a sport demands*, so D2/D3/D4 can reason about demand and transfer — not just re-weight muscles (A4).

**This model already exists and is excellent: the Sport Knowledge Base (SKB).** The EDS's position is not to redesign it but to **elevate it from dormant data to the primary driver of sport reasoning**, and to *retire the legacy emphasis modules* (A8) once parity is reached.

**Core concepts (the SKB's 21 sections, grouped by the decision that consumes them):**

| SKB sections | Consumed by | Role in reasoning |
|---|---|---|
| `physicalProfile` (18 ranked qualities), `energySystems`, `movementProfile` | D2 Demand, D10 Movement | *What the sport requires* — the demand profile |
| `positions`, `developmentPriorities` | D3 Refinement | Position/age modifiers on the demand profile |
| `injuryProfile`, `injuryPreventionLibrary` | D4 Diagnose, D11 Select | Limiting-factor risk weighting; prevention interventions |
| `seasonalModel`, `microcycles` | D7 Block, D8 Week | Season/fixture-aware structure |
| `gymPhilosophy`, `exerciseLibrary` | D11 Select | Transfer ratings → intervention value-ordering |
| `loadManagement`, `readinessModel` | D12 Dose, D15 Adapt | Sport-specific load/readiness weighting |
| `assessments` | D1 Assess, D16 Learn | How to measure the qualities (close the diagnosis loop) |
| `decisionRules` | D15 Adapt | The one wired section today — runtime trims |
| `kpiFramework`, `coachDashboard`, `athleteDashboard` | rendering, Team | Privacy-validated KPI surfaces (L13) |
| `validation`, `references` | Confidence Model (§28) | Evidence audit trail |

**Why the SKB is the right model.** It is sport-agnostic at the schema level (every sport is the same 21-section shape), evidence-tagged (every recommendation carries confidence/source), privacy-validated (raw vitals can't be coach-visible — the validator fails the build), and extensible (adding a sport = a JSON file + a registry line, zero core edits — P11). It is, in effect, *the knowledge architecture of Part VII already realised for sports*. The tragedy of the current system is that this exists and the engine doesn't use it; the redemption is that *wiring it is mostly consumption work, not design work* (§41).

**The retirement of emphasis vectors.** The legacy per-muscle emphasis multipliers (`lib/sports/*.js`) are the lossy shadow of the SKB's rich demand model. Target: D2 reads the SKB demand profile; D11 reads SKB transfer ratings; the muscle-emphasis vector is *derived* from the demand profile *if still needed for the volume ledger*, not authored as the source of truth. One sport model, not two (A8).

## 31. The Physical-Qualities & Adaptation Model

**Purpose.** Provide the *organising taxonomy of training content* (P6, 2.4) — the vocabulary in which the engine decides *what to develop*, replacing "muscles" as the primitive.

**This model is largely absent today** (only a 3-value `quality` tag on ~25 exercises) and is the **single most important thing to build** for the migration, because the entire decision graph above the intervention layer (D4–D10) needs qualities to reason about.

### 31.1 The quality taxonomy

A working taxonomy (to be refined with a sports scientist; this is the design intent, not the final list). Qualities are grouped by the adaptation family they draw on:

| Family | Qualities | Primary adaptations |
|---|---|---|
| **Maximal force** | Maximal strength; relative strength | Neural drive, motor-unit recruitment, muscle CSA |
| **Explosive force** | Rate of force development (RFD); power; strength-speed; speed-strength | Rate coding, intermuscular coordination |
| **Elastic / reactive** | Reactive strength; elasticity (stretch-shortening cycle); plyometric ability | Tendon stiffness, SSC efficiency |
| **Endurance of force** | Strength-endurance; muscular endurance | Capillarisation, fibre-type, fatigue resistance |
| **Energy systems** | Aerobic capacity; anaerobic (glycolytic) capacity; anaerobic (alactic) power; repeat-sprint ability | Mitochondrial density, buffering, PCr kinetics *(future: programmed directly — §42)* |
| **Robustness** | Tissue robustness/durability; injury resilience; eccentric capacity | Tendon/muscle remodelling, eccentric tolerance |
| **Control & range** | Mobility; stability; balance; unilateral control; bracing/anti-rotation; rotational strength | Motor control, ROM, neuromuscular coordination |
| **Morphology** | Hypertrophy (muscle CSA) — *the bodybuilding goal-as-quality* | Myofibrillar/sarcoplasmic growth |

Note that **hypertrophy is one quality among many** — the demotion of §17 made concrete. For a bodybuilder it is the dominant priority quality; for a distance runner it is usually *anti*-prioritised (added mass harms economy). The same taxonomy serves both because it is sport-agnostic.

### 31.2 What each quality carries (the quality knowledge entry)

```
QUALITY
  id                 e.g. "reactive-strength"
  family             e.g. "elastic/reactive"
  adaptations        the physiological changes that develop it
  doseResponse       how dose (intensity/volume/velocity) maps to adaptation, WITH confidence
  fatigueCost        neural/metabolic/mechanical cost per unit dose
  recoveryTime       time to recover the adaptation's training capacity
  prerequisites      qualities/competencies required first (e.g. max-strength base before high plyo)
  assessment         how to measure current level (links to SKB assessments)
  trainabilityNotes  age/season/injury constraints on training it now
  evidence           provenance + confidence (§26.2)
```

**Why this changes everything.** With a quality model, D4 can diagnose "low reactive strength relative to sprint demand," D5 can prioritise it, D10 can specify "high-velocity, short-contact, elastic loading," D11 can select exercises *tagged as driving reactive strength*, and D12 can dose them from the *reactive-strength dose-response model* — a chain of reasoning the current engine cannot form because it has no node for "reactive strength." Muscles remain as a *downstream ledger* (where does the fatigue land? is any muscle over MRV?), which is exactly what the excellent existing volume machinery (G2) is for.

## 32. The Exercise (Intervention) Model

**Purpose.** Describe each intervention by *what it does and what it costs*, so D11 can value-order and D12 can dose (P5).

**Core concepts (extending the genuinely good current exercise schema):**
- **Adaptations/qualities driven** — primary and secondary (this is the key addition; today only ~25 exercises are quality-tagged).
- **Force-velocity profile** — heavy-slow / light-fast / elastic / isometric — so movement requirements (D10) can match.
- **Sport transfer** — per-sport transfer ratings (the SKB `exerciseLibrary` already has these, 1–10).
- **Costs** — fatigue cost, and joint/spinal (axial)/neural load (axial load already modelled — G; neural/CNS partially).
- **Constraints** — equipment, technical competency / level, contraindication patterns (injury — already modelled in the injury system).
- **Substitution graph** — regressions/progressions and equipment fallbacks (already present as intent-chains and the despine variant-graph — reuse it).
- **Muscle contribution** — fractional synergist weighting (the excellent existing `PATTERN_CONTRIB` — G2), retained as the *ledger* input, not the selection driver.

**Current vs. target.** The current exercise object is attribute-rich (pattern, equip, level, role, axial load, unilateral, stretch-bias, sport tags) but *adaptation-thin*. Target: make *adaptation/quality and cost* first-class on every exercise, so the engine selects by *transfer-per-fatigue toward the target quality*, not by *muscle-deficit pay-down*. The exercise stops being "a thing that adds sets to muscles" and becomes "an intervention that drives an adaptation at a cost."

## 33. The Recovery Model

**Purpose.** Estimate the athlete's capacity to train hard today (readiness) and over a window (recoverability), to *size* sessions (D12) and *adapt* them (D15).

**Core concepts (fixing S2, A7):**
- **Readiness** — a derived score blending **subjective wellness weighted ≥ objective** (Saw 2016 — the current model's inversion is S2), smoothed over a trend (not gated on a single noisy night), plus **first-class state**: illness, travel, life stress (currently binary/absent).
- **Recoverability / capacity** — a window-level budget for total load (gym + sport + life), *learned per athlete* over time (D16), used as the hard ceiling (L3).
- **Readiness → prescription mapping** — readiness scales **both volume and intensity** (the A7 fix), symmetrically (ease *or* progress — G7 fix), with state overrides (illness ⇒ rest; travel ⇒ easy).
- **Sport-specific weighting** — the SKB `readinessModel` weights the right signals per sport (e.g., shoulder soreness for swimmers, lower-limb soreness for runners) — currently authored, dormant.

**Privacy (L13).** Readiness is the canonical *derived* signal: it is computed from raw vitals but *contains none of them*, and is the thing a coach may see. The raw vitals never leave the athlete.

## 34. The Programming Model

**Purpose.** Turn objectives and doses into the concrete structure of blocks, weeks, sessions, and progressions.

**Core concepts:**
- **Periodisation models** — selectable by goal/quality (not one fixed style template — A9 fix): linear, block, undulating, conjugate, in-season maintenance, etc. Each block has *one dominant adaptation objective* (D7).
- **Scheme models** — rep/intensity/tempo/rest by *target quality and phase* (e.g., maximal strength: low reps, high load, long rest; RFD: low reps, maximal intent, full recovery; strength-endurance: higher reps, short rest). Read from quality knowledge, not hard-coded per style.
- **Progression models** — how load advances within a block, per quality, *anchored to the athlete's demonstrated rate of progress* (learning — D16). Replaces static strength-standard ratios as the progression driver (S6).
- **Deload & taper models** — deload = fatigue clearance (volume *and* intensity down); **taper = volume down, intensity held** (the S4/F4 fix). Both can be *adaptive* (forced/deferred by readiness/load — already partly built).
- **The session value hierarchy** — the ordering used by D11 to spend (or bank) any capacity beyond the primary dose. Stated verbatim because it is a coaching law made concrete:

  > **Within the recoverable ceiling, fill highest-value first, then stop:**
  > 1. Primary compound (the session's main quality driver)
  > 2. Secondary compound (supports the primary objective)
  > 3. Sport-specific injury-prevention (evidence-graded protocols)
  > 4. Sport-specific accessory (movement the sport demands)
  > 5. Targeted hypertrophy to a genuinely lagging muscle *within MRV*
  > 6. Core / anti-rotation
  > 7. Mobility
  >
  > **Beyond the recoverable dose, time is banked, not spent (L5).**

This hierarchy is the antidote to the "fill the time / overshoot the target" defect (A1, S3, 17.4). It encodes minimum-effective-dose as an *ordering with a stopping rule*: cover what matters, in value order, until the objective is met or the fatigue budget is spent — then stop, and tell the athlete they're done (L11, L15).

---

# Part IX — Validation and Constraints

The brief is emphatic: **validation occurs *after* construction, not before.** This inverts the current engine's instinct (which builds *toward* a volume target and trims with a ceiling — A6, S3). The discipline is: *construct the best session you can within the constraint box, then check it against every validator, and trim or veto on failure.* Construction proposes; validation disposes.

## 35. The Validation Framework

After D11–D13 produce a constructed, dosed, scheduled week, D14 runs every validator. Each validator is a pure function `validate(week, athleteState, knowledge) → {pass | trim | veto, reason, confidence}`. Validators are independent and composable; their conflicts are resolved by §37.

### 35.1 The validators

| Validator | Checks | On failure | Authority |
|---|---|---|---|
| **Recoverability** | Total load (gym + sport + life) within the athlete's modelled capacity over the window | Trim lowest-value volume to ceiling; veto if still over | **Gate** (L3) |
| **Sport compatibility** | No gym session compromises a key sport session (interference, proximity, fatigue) | Lighten/move the gym session | **Gate** (L1) |
| **Movement balance** | Push/pull, bilateral/unilateral, anterior/posterior balance over the week | Trim/rebalance | Soft |
| **Joint loading** | No joint over its recoverable loading (e.g., knee, shoulder) | Substitute lower-load variant | Soft→Gate if injury-adjacent |
| **Spinal (axial) loading** | Axial load within budget; heavy-axial days spaced | Swap to lower-axial variants (the existing despine pass — G) | Soft→Gate |
| **Neural fatigue** | High-CNS work spaced; not stacked | Re-sequence/space | Soft |
| **Volume sanity (MRV)** | Per-muscle *actual* weekly volume ≤ MRV (+buffer) — the F1 fix | Trim lowest-value sets to ceiling; record the trim (L15) | **Gate** |
| **Exercise redundancy** | No wasteful duplication of stimulus | Drop the redundant | Soft |
| **Equipment** | Every prescribed exercise is doable with the athlete's kit (the F2 leak fix) | Substitute available | **Gate** |
| **Session duration honesty** | Estimated time matches real time (sets × rest + overhead) — the F5 fix | Trim to fit; correct the estimate | **Gate** (honesty, L15) |
| **Constraint compliance** | Days, schedule, fixed sport sessions respected | Reschedule | **Gate** (L8) |
| **Technical suitability** | No exercise above the athlete's competency — the L4 check | Regress | **Gate** (L4) |
| **Injury contraindication** | No contraindicated pattern for an active injury (now an *input* to D10/D11, re-checked here) | Substitute + insert prevention | **Gate** (L4, L8) |
| **Scientific consistency** | Doses/schemes match the target quality's evidence (e.g., taper holds intensity — F4) | Correct the scheme | Soft→Gate |
| **Purpose coherence** | Session content matches its named objective; title reflects content — the F3/F7 fix | Re-title / re-scope | **Gate** (L7) |
| **Lawfulness** | No Engine Law (Part I §4) violated | Veto; rebuild safest satisfiable | **Gate** (absolute) |

### 35.2 The validation report

D14 emits not just a validated week but a *report*: what passed, what was trimmed or vetoed, and why — feeding both the athlete's explanation (L11) and the no-silent-truncation rule (L15). If volume was trimmed to the ceiling, the athlete can see "we capped your posterior-chain volume to keep you recoverable"; if a deload was forced, they see why. **Validation is a source of explanation, not just a gate.**

### 35.3 Why after, not before

Validating *after* construction (rather than constraining the construction so tightly it can't fail) has three virtues:
1. **Separation of concerns.** Construction optimises for *value*; validation enforces *safety and law*. Tangling them produces the current allocator, whose internal scoring tries to do both and overshoots (S3).
2. **Explainability.** A distinct validation pass produces a distinct, inspectable verdict per check — the substrate of the report (35.2).
3. **Substitutability.** Either construction *or* validation can be improved independently (P10) — an AI could propose a session (D11/D12) and the deterministic validators still guarantee it is safe and lawful before it ships. *This is the safety harness for the future AI layer* (§42).

## 36. The Constraint Framework

Constraints are the *box inside which construction happens* (L8). They are computed first (during D1/D6/D8) and every constructed session must satisfy them. Distinguish constraints (hard bounds on the solution) from validators (post-hoc checks): a constraint *shapes* construction; a validator *verifies* it. Most appear as both — computed up front to shape D10/D11, re-checked in D14.

| Constraint | Source | Shapes (decision) | Re-checked (validator) |
|---|---|---|---|
| Available days & duration | Athlete model | D8, D11, D12 | Duration honesty, constraint compliance |
| Equipment | Athlete model | D11 | Equipment |
| Fixed sport schedule | Athlete model / Team coach | D8, D13 | Sport compatibility, constraint compliance |
| Active injuries | Athlete model | **D10, D11** (up front — A6 fix) | Injury contraindication |
| Technical competency | Athlete model (D1) | D11 | Technical suitability |
| Recoverability ceiling | Recovery model (learned) | D5, D12 | Recoverability, MRV |
| Lawfulness (Engine Laws) | Part I §4 | all | Lawfulness |

**The key reform:** injuries (and all constraints) move from *post-filter* to *pre-shape*. D10 subtracts contraindicated patterns before requirements are set; D11 never proposes a contraindicated exercise in the first place. The post-hoc validator becomes a *safety net for edge cases*, not the *primary mechanism* (A6 fixed). A knee-injured athlete's session is *designed* around the knee, not designed and then *stripped*.

## 37. Conflict resolution

Validators and constraints will conflict (e.g., the recoverability ceiling says "less volume" while the block objective says "more stimulus"; or the only high-transfer exercise is contraindicated). Conflicts resolve by a fixed **priority order** — itself a direct encoding of the Engine Laws:

```
   1. SAFETY & LAW        — never violate a law; never an unsafe or contraindicated prescription
   2. SPORT PROTECTION    — never compromise the sport (L1)
   3. RECOVERABILITY      — never exceed capacity (L3)
   4. ATHLETE INTENT      — honour committed/frozen choices (L10); honour stated constraints
   5. OBJECTIVE FIDELITY  — serve the session/block objective as fully as the above allow
   6. OPTIMISATION        — efficiency, balance, variety, preference — the "nice to haves"
```

Higher tiers win absolutely. So: a contraindicated exercise is dropped *even if* it best serves the objective (1 > 5); volume is trimmed below the block target *to stay recoverable* (3 > 5); a perfectly balanced week yields to the fixed sport schedule (2 > 6). When a conflict forces a compromise, the engine **records and surfaces it** (L15): "we couldn't fully develop X this week because your match schedule left no recoverable slot — we'll prioritise it next week." Confidence modulates within a tier (a low-confidence soft validator yields to a high-confidence one) but *never across* tiers (no amount of optimisation confidence overrides a safety gate).

> Conflict resolution is where the engine's *values* become executable. The priority order is not an implementation detail — it is the Engine Laws, compiled. An engineer unsure how to resolve a trade-off consults this order; if the order doesn't decide it, the conflict belongs in Open Questions (§44), not in an ad-hoc code branch.

---

# Part X — Software Architecture

This part is the most implementation-adjacent, and is kept deliberately principled: it describes *how the code must be shaped to honour the architecture above*, not specific frameworks. It aligns with and formalises the orchestrator target already set out in `02-REFACTOR-ROADMAP`.

## 38. Architecture principles

**SA1 — The engine is a pure library with a hard boundary.** `@performance-os/engine` exposes the decision graph and knows nothing of React, Supabase, localStorage, the network, or the clock. Everything it needs arrives as typed inputs; everything it produces is returned as typed outputs. (Fixes W1: the engine is currently reachable only through a client-coupled shell.) Consumers — `apps/mobile`, `apps/web`, a future server/AI layer — depend on the engine; the engine depends on none of them.

**SA2 — Core coordinates; knowledge lives in registries; decisions are pure.** The core *orchestrator* runs the decision graph (Part V). It imports the decision functions and the knowledge registries; it imports *no specific sport, injury, quality, or goal*. Domain knowledge lives in registries (Part VII §26.3). (Adopts the panel-review/roadmap orchestrator pattern; the brief's "adding a sport = a new file + a registry entry, zero core edits.")

**SA3 — Decisions are independently pure and testable.** Each decision (D1–D16) is a pure function with the contract of §19. It can be unit-tested in isolation, golden-master-tested across an archetype matrix, and replaced without touching its neighbours (P12, §42).

**SA4 — One planner, one adaptor, shared decisions.** The planning loop (D1–D14) and the runtime adaptor (D15, re-running D9–D14) call the *same* decision functions, eliminating the duplicated split/target logic (W2). There is no second implementation of any decision.

**SA5 — Derived signals are engine outputs, not view-model side-effects.** Readiness, load, and adaptation are computed *in the engine* (as inputs to / parts of D15), not in the UI store (fixes A5/W4). The store *renders* engine outputs; it does not *compute coaching*.

**SA6 — State (and learned priors and freezes) is durable and portable, not device-local.** Athlete state that affects reasoning — including committed-session freezes (W3) and learned priors — persists with the athlete and syncs across devices. The plan remains *derived* (recomputed), never stored as truth.

**SA7 — Knowledge is versioned and reviewable.** Knowledge modules carry provenance, confidence, and a review date (§26.2). Changing a threshold is a *reviewed knowledge edit*, not a code edit buried in an allocator. Knowledge has its own change log and its own validators (the SKB and injury validators are the templates).

**SA8 — Validation is a separable safety layer.** The deterministic validators (D14, §35) are a distinct module that *any* construction path must pass — including, in future, an AI-proposed one. This is the platform's safety harness (SA1 + SA8 = "an AI can propose, but the deterministic validators dispose").

**SA9 — Determinism and golden-masters are CI-enforced.** The planning core's purity is protected by golden-master tests over an archetype matrix; any change that alters output without an intended, reviewed reason fails CI. (Generalises the existing engine test discipline.)

**SA10 — Explainability is a first-class output, not a log line.** Each decision returns its rationale and confidence as data (§19); the explanation surfaced to the athlete is *assembled from these*, not reconstructed after the fact. (L11 is unachievable if rationale is an afterthought.)

## 39. Module responsibilities

A responsibility map for the target architecture. Names are conceptual; the point is the *boundaries*, not the filenames.

| Module | Responsibility | Must NOT |
|---|---|---|
| **`core/orchestrator`** | Run the decision graph; compose decisions; assemble explanations | Contain any sport/injury/quality knowledge; touch storage/UI |
| **`core/contracts`** | Typed definitions + runtime validators for every decision's inputs/outputs | Contain decision logic |
| **`decisions/*`** | The pure decision functions D1–D16 | Read storage; hold mutable state; import a specific sport |
| **`knowledge/athlete`** | Athlete-model schema; quality-estimation rules | Decide priorities |
| **`knowledge/sports` (SKB registry)** | Per-sport demand models (21-section) + registry | Contain reasoning |
| **`knowledge/qualities`** | The quality/adaptation taxonomy + dose-response models | — |
| **`knowledge/exercises`** | The intervention library (adaptation/cost-tagged) + substitution graph | — |
| **`knowledge/recovery`** | Readiness/recoverability models + weights | Read raw vitals across a person boundary |
| **`knowledge/programming`** | Periodisation/scheme/progression/deload/taper models + value hierarchy | — |
| **`knowledge/injuries` (registry)** | Taxonomy, contraindication profiles, rehab, prevention | Apply itself post-hoc (it's an *input* now) |
| **`knowledge/base`** | Cross-cutting evidence-tagged constants + the Confidence Model | — |
| **`validation/*`** | The validators (§35) + conflict resolution (§37) | Construct sessions |
| **`learning/*`** | Prior estimation & update (D16); three-tier evidence | Mutate plans; run on the planning critical path |
| **(platform) `app shell`** | Onboarding, rendering, the session runner, state sync | Compute coaching decisions |
| **(platform) `sync/storage`** | Durable, portable, privacy-bounded persistence | Hold business logic |

## 40. Architecture diagrams

### 40.1 Layered architecture (target)

```
   ┌──────────────────────────────────────────────────────────────────────────┐
   │  PLATFORM (apps/mobile player · apps/web coach · future server/AI)         │
   │   onboarding · rendering · session runner · state sync · explanations UI   │
   └───────────────────────────────┬──────────────────────────────────────────┘
                                    │ typed calls in / typed results out (SA1)
   ┌────────────────────────────────▼──────────────────────────────────────────┐
   │  @performance-os/engine  (PURE LIBRARY — no I/O, no clock, no UI)           │
   │                                                                            │
   │   core/orchestrator  ─ runs the decision graph, assembles explanations     │
   │        │                                                                   │
   │   decisions D1…D16   ─ pure, independently testable (§19)                   │
   │        │  read ▼                              ▲ validate                    │
   │   knowledge registries & models  ────────  validation/* (§35) + conflict   │
   │   (athlete·sports/SKB·qualities·exercises·   resolution (§37)               │
   │    recovery·programming·injuries·base)                                     │
   │        ▲ priors                                                            │
   │   learning/*  (async, off critical path — D16)                             │
   └────────────────────────────────┬──────────────────────────────────────────┘
                                    │ athlete state (durable, portable, private)
   ┌────────────────────────────────▼──────────────────────────────────────────┐
   │  PERSISTENCE  (state + outcomes + priors + freezes; plan is RE-DERIVED)     │
   │   privacy invariant: raw vitals never cross a person boundary (L13, G8)     │
   └──────────────────────────────────────────────────────────────────────────┘
```

### 40.2 The same picture, contrasted with today

```
   TODAY (implementation-driven)                 TARGET (architecture-driven)
   ─────────────────────────────                 ────────────────────────────
   Screens                                       Platform shell (render only)
     │ reads compute coaching in buildView()       │ typed calls
     ▼   (A5: decisions in the UI store)           ▼
   trainingStore.buildView()  ── readiness,      engine boundary (SA1)
     │  load, deload decided here                   │
     ▼  pushes mutable _runtime (W4)              orchestrator runs D1…D16 (pure)
   PlanService (in apps/mobile, not engine)        │  reads knowledge registries
     │  re-derives split/target logic (W2)          │  validates after construct (§35)
     ▼  injuries applied AFTER reflow (A6)         learning feeds priors (async)
   generatePlan (pure) ── volume-first (A1)       persistence (state only; plan derived)
     │  reads legacy emphasis vectors (A8)
     ▼  SKB authored but dormant (W6)             knowledge: SKB primary; one sport model;
   allocator: greedy fill toward muscle volume    qualities/adaptation first-class
```

### 40.3 Where the future plugs in (no core edits)

```
   add a SPORT          →  author <sport>.json (21 sections) + registry line        (P11)
   add an INJURY        →  author injury profile + registry line
   add a QUALITY        →  add taxonomy entry + dose-response model
   add a PROGRESSION    →  add a periodisation/scheme model
   add ENDURANCE PROG.  →  add energy-system INTERVENTIONS + dose models (§42)       (no new engine)
   add an AI LAYER      →  replace/augment a DECISION behind its contract;           (§19, SA8)
                           deterministic validators still gate the output (safety harness)
   add the COACH (Team) →  add a derived read surface + schedule constraint;          (§27.1)
                           one engine, raw vitals never cross (L13)
```

Every row above is a *data or boundary* change, not a core-logic change. That is the test of whether the architecture is right: **the things most likely to be added are the things that require touching the least.**

---

# Part XI — Migration Strategy

The redesign is a *re-seating, not a rewrite* (§18). The strong machinery stays; the order and the primitive change; the dormant knowledge gets wired. This section sequences the journey from the engine of Part III to the engine of Parts V–X, prioritised by *value-to-the-mission per unit of risk*, and protected at every step by the determinism guarantee.

### Migration principles

1. **Golden-master first.** Before any change, lock the current `generatePlan` output across an archetype matrix (this is the existing test discipline; formalise it as the safety net). Behaviour-preserving steps must stay byte-identical; behaviour-changing steps are explicit, reviewed, and excluded from the golden-master with a documented rationale.
2. **Additive before subtractive.** Build the new capability alongside the old, prove parity, *then* retire the old. (The SKB was built this way; continue the pattern.)
3. **Wire the knowledge you already have before authoring more.** The highest-leverage early work is *consumption*, not creation — the SKB and knowledge base are authored and inert (W6).
4. **Each stage ships value.** No stage is pure refactor; each improves a real defect from Part IV.

### Staged plan

The stages below *extend* the existing `02-REFACTOR-ROADMAP` (which already sequences KB → sport modules → recovery/load contracts → injuries → engine extraction). The EDS reframes that roadmap around the decision architecture and adds the quality model and learning seams.

| Stage | Goal | Fixes | Risk | Determinism |
|---|---|---|---|---|
| **M0 — Safety net** | Golden-master over archetype matrix; CI-enforce determinism | (protects all) | low | establishes it |
| **M1 — Make confidence operative** | Wire the knowledge base's `confidence` into authority tiers (§28.3) platform-wide. ACWR is *already* demoted to a soft input — **finish** the job (remove it from the deload corroboration path) and generalise the pattern so no low-confidence number can gate | S1, W6 | low | small (most of the load change already shipped) |
| **M2 — Recovery model honest** | Build on the shipped 60/40 subjective blend + index layer: re-weight the **readiness integrator** so subjective ≥ objective actually *steers the plan* (Spec B, [05](05-INDEX-LAYER-FOLLOWUPS.md)); illness/travel/stress first-class; readiness scales **intensity too** | S2, A7 | med | behaviour-changing (reflow), gated |
| **M3 — Validation-after-construction** | Extract validators (§35) into one pass + conflict order (§37). The **MRV ceiling** (F1) and **intensity-holding taper** (F4) already exist in the allocator — this stage *centralises* them as named validators rather than building them anew | S3 (architectural), A6(partial) | med | mostly structural (F1/F4 behaviour already shipped) |
| **M4 — Constraints before content** | Injuries become an *input* to selection (D10/D11), not a post-filter; equipment/duration/title honesty fixes (F2/F3/F5) | A6, L7/L8 defects | med | behaviour-changing |
| **M5 — The quality model** | Build the quality/adaptation taxonomy + dose-response models; tag exercises by adaptation/cost | A1(begins), A3, S5 | high | new capability, parallel to volume ledger |
| **M6 — The decision layer** | Introduce explicit D4 (diagnosis) and D5 (priority) reading the SKB demand profile; D9 session objectives; D10 movement requirements | A1, A2, A3, A4 | high | the core re-seating |
| **M7 — SKB primary, emphasis retired** | D2/D11 read the SKB; derive any needed muscle-emphasis from the demand profile; retire legacy `lib/sports/*` | A4, A8 | med | parity-gated |
| **M8 — Engine boundary clean** | Move reflow + derived-signal computation into the pure engine; one shared decision library; state/freezes portable | A5, W1–W4 | med | structural, parity-gated |
| **M9 — Learning seams** | Decisions read typed priors (population defaults at first); begin athlete-specific estimation (D16) | (enables P9) | med | additive |
| **M10 — Position & individualisation** | D3 position refinement; individual demand signals | A10 | low–med | additive |

**Sequencing logic.** M1–M4 are *high-value, lower-risk corrections* to defects the engine already half-acknowledges — they make the *current* engine honest (confidence, recovery, validation, constraints) and ship immediately. M5–M8 are *the re-seating* — building the quality model and decision layer, then making the SKB primary and cleaning the boundary; these are higher-risk and gated by golden-masters and parity tests. M9–M10 *unlock the long-term vision* (learning, individualisation). Critically, **M1–M4 are independent of M5–M8** and can ship first, so the platform improves continuously rather than waiting on the big re-seating.

> The migration must never regress the assets of §18. Determinism (G1), the injury system (G3), the SKB schema (G5), freeze-on-commit (G6), and privacy-by-validation (G8) are invariants *through* the migration, not casualties of it.

---

# Part XII — Future Expansion Strategy

The architecture's worth is measured by how gracefully it admits the things it does not yet do. Each expansion below should require *data and boundary* changes, not core re-architecture (§40.3). They are listed in roughly the platform's roadmap order.

**E1 — The Team package (next priority).** Already designed (`TEAM-ARCHITECTURE.md`). One engine; a player is an athlete; the coach adds *constraints* (the fixed schedule → D8/D13) and consumes a *derived, privacy-bounded read surface* (§27.1). No second reasoning system; raw vitals never cross (L13). *Expansion type: a constraint source + a derived surface.*

**E2 — Real endurance/energy-system programming (the big one).** Today the engine *consumes* sport load as a constraint; the future engine *prescribes* run/cycle/swim/conditioning sessions. The architecture is built for this: **an energy-system session is just another intervention (D11) driving an adaptation (aerobic/anaerobic capacity, D5/D12).** Expansion requires: energy-system *qualities* in the taxonomy (already sketched, §31.1), energy-system *interventions* with dose-response models, and *session types* beyond resistance. The decision graph is unchanged — it already reasons about qualities and interventions; endurance work is new *content*, not a new *engine*. *Expansion type: new interventions + dose models.*

**E3 — The AI coaching layer (Stage 6).** Claude (or successor) augments or overrides specific decisions behind their contracts (§19, SA8). Candidate decisions for AI: D4 (diagnosis — pattern-rich), D11 (selection — preference-rich), D16 (learning — inference-rich), and the *explanation assembly* (natural language). **The deterministic validators (D14) remain the safety harness**: an AI may *propose*, but the lawful/recoverable/sport-safe validators *dispose* — the AI cannot ship an unsafe plan because it does not get the last word. The API key lives server-side (Edge Function), never in the browser. *Expansion type: decision substitution behind a contract, gated by validators.*

**E4 — Native app + wearable depth (Stage 7).** HealthKit, richer continuous signals. These feed the *recovery model* and the *learning loop* with denser data; they sharpen priors and confidence. The engine consumes richer athlete-state; its reasoning is unchanged. *Expansion type: richer state inputs.*

**E5 — New goals/sports/qualities.** The everyday expansion. A new sport is a 21-section knowledge file + a registry line; a new goal is a demand profile; a new quality is a taxonomy entry + dose model. *Expansion type: data (P11).*

**E6 — Nutrition / sleep / lifestyle prescription.** A future intervention class: the engine already *consumes* sleep/wellness as readiness inputs; prescribing them is a new intervention family driving recovery/body-composition adaptations. *Expansion type: new interventions.*

**E7 — Richer learning (cross-athlete).** As the population grows, sport and population priors (D16's outer tiers) become data-driven rather than purely literature-seeded — the engine learns what works *for athletes like this one*, not just *for this one*. Requires privacy-preserving aggregation (derived, never raw — L13). *Expansion type: aggregation pipeline feeding priors.*

The unifying theme: **the decision graph is stable; expansions are new knowledge, new interventions, new state, or substituted decisions.** If a proposed feature would require re-architecting the decision graph, that is a signal the feature is misframed — or that the architecture has a genuine gap worth recording in Open Questions (§44).

---

# Part XIII — Design Rationale

Why the major decisions in this specification are what they are. This is the "we considered the alternatives" record, so future engineers inherit the *reasoning*, not just the conclusion — and can reopen a decision if its premises change.

**R1 — Why "the decision" is the atomic unit (not the session, not the set).**
Alternatives considered: (a) session-as-unit (the workout-generator model) — rejected because it makes reasoning implicit and unexplainable (A2); (b) muscle-volume-as-unit (the current model) — rejected as the wrong primitive for sport (A1). The decision-as-unit is the only choice that makes the engine *explainable* (L11), *substitutable* (AI/coach overrides, §42), and *aligned with how coaches actually think* (§5). Cost: more upfront modelling. Worth it: every other property depends on it.

**R2 — Why physical qualities over muscles.**
Muscles are *where fatigue and hypertrophy land*; qualities are *what transfers to sport*. Organising around muscles forces every sport question through a hypertrophy translation (§17). Organising around qualities lets the engine reason about transfer directly, and *demotes muscles to a downstream ledger* — which is exactly what the (excellent) existing volume machinery is good at. We keep the muscle accounting; we just stop letting it drive (G2). Bodybuilding is preserved as "the goal whose priority quality is hypertrophy" (2.8).

**R3 — Why adaptation-first (volume as validation).**
Volume-first answers "how much?" before "of what, and why?" — inverting the coaching order and producing the overshoot and non-specificity defects (S3, A3, 17.4). Adaptation-first asks "what change creates the most return?" then doses the minimum effective intervention, then *validates* the resulting volume against a recoverability ceiling. Volume becomes a guardrail (L5, P7), which is its correct role.

**R4 — Why validate after construction.**
Tangling optimisation and safety into one scoring pass produced the current allocator that overshoots its own targets (S3). Separating them lets construction optimise for *value* and validation enforce *safety/law* independently, yields per-check explanations (35.2), and creates the safety harness for a future AI proposer (SA8). The cost — a second pass — is trivial against these gains.

**R5 — Why constraints before content.**
Post-hoc injury filtering builds a session around an exercise, then removes it, producing incoherent sessions and wasting a known constraint (A6). Computing the constraint box first and constructing inside it is how coaches work and how coherent sessions arise (L8). The post-hoc validator survives only as an edge-case net.

**R6 — Why keep the engine pure and deterministic.**
Determinism is the codebase's most valuable asset (G1): it makes the engine testable, sweepable, and safe to change under golden-masters. Introducing AI or learning *inside* the planning core would forfeit this. Instead, learning updates *priors* the pure core reads (L9), and AI substitutes *decisions* behind contracts with deterministic validators as a backstop (SA8). Purity is preserved precisely so the engine can evolve safely.

**R7 — Why confidence is operative, not decorative.**
The ACWR defect (S1) is a special case of a general disease: treating a low-confidence number with high authority. The cure is to make confidence *govern authority* (L12, §28.3) everywhere — so the disease cannot recur with the next over-trusted metric. This also lets the engine be honestly calibrated to the athlete (28.4), which is the foundation of trust (2.10).

**R8 — Why elevate the SKB rather than design a new sport model.**
The SKB is already an excellent, evidence-tagged, privacy-validated, extensible sport model (G5) — it is the knowledge architecture of Part VII already realised. Designing a new one would discard authored work and violate "wire what you have first" (§41). The work is *consumption*, not creation. The legacy emphasis vectors are retired as the lossy shadow they are (A8).

**R9 — Why one engine for Individual and Team.**
A second reasoning system for teams would duplicate logic, drift, and multiply the privacy attack surface. A player *is* an athlete; a team adds constraints and a derived read surface (§27.1). One engine, many constraint/visibility configurations. Simpler, safer, and the only way the coach view can be guaranteed to never expose raw vitals (L13).

**R10 — Why energy-system programming is "just more interventions."**
Framing endurance work as a new *engine* would fork the architecture. Framing it as new *interventions driving energy-system qualities* (E2) means the decision graph already handles it — the same diagnosis→priority→dose→validate machinery applies. This is the strongest test that the quality/intervention abstraction is the right one: the platform's single biggest future feature requires *no new reasoning*, only new content.

---

# Part XIV — Open Questions, Research Gaps, Future Research

Honesty about what this specification does *not* settle. These are not failures of the design; they are the genuine hard problems, recorded so they are addressed deliberately rather than resolved by accident in a code branch (§37).

## 44.1 Open design questions (engineering)

| # | Question | Why it's open | Where it bites |
|---|---|---|---|
| Q1 | How exactly is a *limiting factor* scored from athlete-vs-demand, when current quality levels are mostly unmeasured? | D4 is the pivot, and early data is sparse; the gap formula (§20 D4) is a starting heuristic, not validated | D4, D5 |
| Q2 | What is the right *recoverability budget* model that combines gym + sport + life into one ceiling? | No clean published unit spans these; the engine must invent a defensible composite | D5, D12, §35 recoverability |
| Q3 | How are qualities *measured* cheaply, without lab kit, for a self-coached individual? | Diagnosis needs current levels; field tests are noisy and adherence is low | D1, D16, SKB assessments |
| Q4 | How is *transfer* quantified — does developing quality X actually improve sport Y for *this* athlete? | The core efficacy question; literature gives directions, not per-athlete magnitudes | D2 transfer, D16 |
| Q5 | What is the right learning rate / shrinkage for athlete-specific priors so the engine adapts without overfitting one bad week? | Classic bias-variance; needs real data to tune | D16 |
| Q6 | How should the engine handle *multi-sport* athletes (e.g., triathlete) where demands compete? | Demand profiles must combine, not just be selected | D2, D5 |
| Q7 | How is *intensity* autoregulated from readiness without lab measures (velocity/load tracking)? | The A7 fix needs a defensible readiness→intensity mapping | D12, recovery model |
| Q8 | Where exactly should the AI layer sit, and how are its proposals bounded beyond the validators? | §42 sets the frame; the contracts and guardrails per decision are unspecified | E3, SA8 |

## 44.2 Research gaps (sports science the platform leans on but the evidence is thin)

| # | Gap | Current handling | Confidence |
|---|---|---|---|
| RG1 | Exact MEV/MAV/MRV landmarks, especially the high end | Expert-opinion heuristics, used as soft caps | low (L5) |
| RG2 | Load-ratio (ACWR) validity for injury / for gym load | Demoted to soft/reported (§28.3) | low (contested) |
| RG3 | Magnitude of prevention effects under *real-world adherence* | Treat as conditional; design for adherence not optimum (§28) | moderate |
| RG4 | Precise taper magnitudes per athlete/quality | Direction solid (volume↓ intensity held); exact % athlete-specific | moderate |
| RG5 | Quantitative transfer of gym qualities to specific sport performance | SKB transfer ratings are expert-weighted, not measured | moderate→low |
| RG6 | Single-day HRV/readiness reliability | Use 7-day trends + subjective; never gate on one night | moderate |
| RG7 | Individual variability in dose-response (how different are people, really?) | The premise of the learning loop; magnitude unknown | low early |

For every one of these, the *architectural* answer is the same and is already in the design: **tag it low-confidence, treat it as a soft input, widen margins, and let the learning loop replace population guesses with athlete-specific evidence over time** (§28, §25). The architecture is explicitly built to be *robust to weak science* — that robustness is a feature, given how much of the field is contested.

## 44.3 Future research opportunities (what this platform could *contribute*)

The platform is, uniquely, a deterministic engine generating hypotheses and a learning loop observing outcomes at scale — i.e., **a research instrument**, not just a product. Opportunities:

- **FR1 — Individual dose-response at scale.** Per-athlete prescribed-vs-response data could quantify individual variability (RG7) far beyond small lab studies.
- **FR2 — Real-world prevention efficacy.** Adherence-realistic prevention outcomes (RG3) across many athletes.
- **FR3 — Transfer validation.** Whether developing a prioritised quality actually moves the sport KPI (RG5, Q4) — measurable when the platform also tracks performance metrics.
- **FR4 — Readiness signal value.** Which readiness signals (subjective vs. objective) actually predict performance/injury *for this population* (S1, S2, RG6).
- **FR5 — Limiting-factor diagnosis validation.** Does the engine's diagnosis (D4) predict the highest-return intervention? The platform can A/B its own priorities.

These require the privacy-preserving aggregation of E7 (derived signals only, raw vitals never — L13) and an explicit research-ethics posture. They are noted here not as commitments but as the *latent scientific value* of building the engine as a calibrated, hypothesis-generating, outcome-observing system rather than a black box.

---

# Part XV — Self-review through three lenses

The brief requires reviewing this specification as three sceptical experts, finding real weaknesses, and revising. The critiques below are genuine — each lens found things the draft got wrong or glossed. The **revisions** are then folded back as amendments to the relevant parts (and summarised in §45.4).

## 45.1 Lens 1 — Head of Performance at an Olympic Institute

*"I've read a lot of 'AI coach' decks. This is better than most because it puts diagnosis at the centre and refuses to let the gym become the point. But a few things would worry me on the track."*

- **C1.1 — The diagnosis is only as good as the assessment, and you've hand-waved assessment.** D4 compares current quality levels to demand, but for a self-coached runner with a phone, you have *almost no measured current levels*. A diagnosis built on inferred levels is a guess wearing a lab coat. *This is the central scientific risk of the whole design and it's under-specified.* → **Revision:** elevated to **Open Question Q1/Q3** and made explicit in D4's failure mode; added the principle (28.2) that low-confidence diagnosis *narrows* priorities and *widens* margins rather than pretending to precision. Also added FR5 — the platform should *validate its own diagnoses* against outcomes. **The honest position: early diagnosis is a low-confidence hypothesis, and the engine must say so (L11) and behave accordingly — not present a guess as an assessment.**

- **C1.2 — "Minimum effective dose" can become "under-dosing" without progression discipline.** A coach knows that *sufficient* stimulus must still be *progressively overloaded*. The spec is strong on "don't overshoot" but weaker on "ensure enough, and advance it." → **Revision:** clarified in the Programming Model (§34) that progression models are first-class and anchored to demonstrated progress; added to the value hierarchy that the *primary* dose must meet the adaptation threshold *before* anything is banked. Minimum-effective means *the smallest dose that still works* — not the smallest dose.

- **C1.3 — Concurrent training is mentioned but not respected enough for true multi-sport.** A triathlete's aerobic, strength, and the three disciplines interfere in ways a single "strategy" decision won't capture. → **Revision:** added **Q6 (multi-sport)** as an explicit open question; flagged that demand profiles must *combine*, not be *selected*, for multi-sport athletes — a genuine gap this draft does not fully solve.

- **C1.4 — Robustness/availability is the real Olympic currency, and it's a bit buried.** Availability (staying healthy and trainable) beats peak capacity. The injury system is strong but the *prioritisation* of robustness as a quality could be stronger. → **Revision:** robustness/durability is named as a quality family (§31.1) and injury-risk explicitly weights diagnosis (D4); added emphasis in 2.1/L1 that protecting training availability is a first-order objective, not a side constraint.

*Verdict:* "Architecturally sound and refreshingly sport-first. The believability gap is assessment and individual diagnosis — be loud about its uncertainty, and let the learning loop earn the precision. Don't oversell day-one personalisation."

## 45.2 Lens 2 — Principal Engineer at a world-class software company

*"The decision-graph framing is the right call and the purity discipline is mature. My concerns are about whether this can actually be built and maintained by a small team without collapsing under its own abstraction."*

- **C2.1 — This is a big abstraction for a one-developer codebase. Risk of architecture-astronautics.** Sixteen decisions, ten knowledge modules, a confidence model, a learning loop — beautiful, but a beginner-coded solo project could stall building the framework before shipping value. → **Revision:** this is why **Migration M1–M4 are explicitly independent of the big re-seating (M5–M8)** and ship value first (§41). Added the principle that the abstraction is introduced *incrementally* — you do not build all sixteen decisions before shipping; you wire confidence, fix recovery, add validation, and *only then* introduce the diagnosis/quality layer. **The EDS is the destination; it does not demand a big-bang.** Also reinforced P15 (simplicity) and added that any decision with no current consumer should remain a thin pass-through, not speculative machinery.

- **C2.2 — "Pure decision functions reading registries" can still become a tangle without strict contract enforcement.** The contracts (§19) are described but their *enforcement* is aspirational. → **Revision:** SA3 + the `core/contracts` module (§39) made responsible for *runtime-validated* typed boundaries; added SA9 (CI-enforced determinism + golden-masters) as the mechanism that keeps the graph honest. Without enforced contracts, the decision graph degrades into the same implicit pipeline it replaced — this is called out as a build-time risk.

- **C2.3 — The learning loop is a large surface with privacy and correctness hazards; deferring it is right but the seams could rot.** → **Revision:** M9 makes decisions read typed priors *from day one* (population defaults), so the seams are exercised even before real learning exists (§25 closing note). This prevents the retrofit debt the spec warns about — the cheapest way to keep a seam alive is to use it trivially now.

- **C2.4 — "Plan is always re-derived" assumes generation is cheap forever.** As the engine grows (energy systems, AI), regenerating the whole macrocycle on every read may not stay cheap. → **Revision:** noted as an implementation concern; the memoisation-by-signature pattern already in use is the mitigation, and the engine boundary (SA1) means generation can move server-side if needed. Added to Open Questions implicitly via Q8/E3 (server/AI). The *principle* (derive, don't store-as-truth) holds; the *performance* is an implementation tactic.

- **C2.5 — Where are the failure/observability semantics?** A reasoning engine needs to be debuggable in production. → **Revision:** the per-decision rationale + validation report (35.2, SA10) double as an *execution trace* — every recommendation can be replayed and explained, which is exactly the observability a deterministic engine affords. Made explicit that the explanation substrate *is* the debug substrate.

*Verdict:* "The architecture is correct and the purity/validation discipline is genuinely strong — the validator-as-safety-harness for a future AI is the standout idea. The real risk is scope for a solo developer. The migration's 'M1–M4 ship first, independent of the re-seating' answer is the thing that makes me comfortable. Keep ruthlessly choosing the smallest version of each abstraction."

## 45.3 Lens 3 — Sports Scientist reviewing a research platform

*"As an evidence platform this is unusually honest — confidence tiers, no fabricated citations, contested science demoted. That's rare and right. My critiques are about scientific rigour and falsifiability."*

- **C3.1 — The quality taxonomy is plausible but not yet operationalised, and taxonomies are where pseudo-precision hides.** Naming "reactive strength" doesn't mean you can measure or dose it. → **Revision:** §31.2 requires each quality to carry a *dose-response model, an assessment method, and prerequisites with confidence* — i.e., a quality is not admitted to the taxonomy until it can be (at least roughly) measured and dosed. Flagged RG5/Q4 (transfer) and Q3 (cheap measurement) as the honest gaps. A quality with no assessment and no dose model is a *label*, and the spec now forbids acting on labels.

- **C3.2 — Diagnosis (D4) risks being unfalsifiable.** If the engine says "your limiting factor is reactive strength" and you train it and don't improve, was the diagnosis wrong, the dose wrong, or the transfer absent? → **Revision:** added **FR5** (the platform should validate whether its diagnoses predict the highest-return intervention) and made D16 responsible for *checking the hypothesis*, not just tuning doses. The single most important scientific commitment this platform can make is to *treat its own diagnoses as falsifiable hypotheses and measure them* — now stated explicitly (2.6, §25, FR5).

- **C3.3 — Confidence tiers are good but the mapping from evidence-level to authority is itself a judgement that needs governance.** Who decides L3 is "soft input" not "gate"? → **Revision:** SA7 (knowledge is versioned and reviewed) + the `lastReviewed` field + §28.1's default authorities make this a *reviewed, dated, explicit* mapping — not an implicit one. Added that the evidence→authority mapping is itself a knowledge entry subject to review, not hard-coded. (It is governance, and governance must be visible.)

- **C3.4 — The platform consumes a lot of contested literature (ACWR, MEV/MAV/MRV, Nordic magnitudes) — make sure demotion is real, not cosmetic.** The very defect found in the *current* engine (S1: KB says "soft" but code still gates). → **Revision:** M1 ("make confidence operative") is sequenced *first* in the migration precisely to ensure demotion is *executed in decisions*, not just *written in the KB*. The lesson of S1 — that a confidence tag is worthless unless a decision reads it — is now a migration priority and a law (L12).

- **C3.5 — Healthy populations only; the spec should state its safety boundary.** Reasoning about injuries as training constraints is not medical diagnosis. → **Revision:** added to System Boundaries (§7.2) that the engine is not a diagnostic tool and must defer high-risk presentations to professionals (the injury taxonomy already flags `high_risk` → referral). Made explicit as a boundary.

*Verdict:* "The intellectual honesty is the best thing here — most products in this space are confidently wrong. If you (a) only admit qualities you can measure and dose, (b) treat diagnoses as falsifiable and check them, and (c) make confidence-demotion real in code, this is a credible research-grade coaching platform, not a wellness toy."

## 45.4 Revisions folded back (summary)

The self-review produced these concrete amendments, now reflected in the relevant parts:

1. **Assessment honesty (C1.1, C3.2):** early diagnosis is an explicit low-confidence, *falsifiable* hypothesis; the engine says so (L11) and the learning loop validates it (FR5). *Do not oversell day-one personalisation.*
2. **Minimum-effective ≠ minimum (C1.2):** the primary dose must meet the adaptation threshold and be progressively overloaded *before* any banking; progression is first-class (§34).
3. **Multi-sport is an unsolved gap (C1.3, C3-adjacent):** recorded as Q6; demand profiles must *combine* for multi-sport athletes.
4. **Scope discipline for a solo team (C2.1):** M1–M4 ship value independently of the M5–M8 re-seating; abstractions are introduced incrementally and kept minimal (P15); unused decisions stay pass-throughs.
5. **Contract enforcement is a build-time requirement (C2.2):** `core/contracts` runtime-validates boundaries; CI enforces determinism (SA9). The graph degrades to a tangle without this.
6. **Keep learning seams alive trivially now (C2.3):** decisions read typed priors (population defaults) from day one (M9).
7. **Qualities must be measurable and dosable to be admitted (C3.1):** no acting on labels (§31.2).
8. **Confidence-demotion must be executed, not just written (C3.4):** M1 ("make confidence operative") is sequenced first — directly applying the lesson of the current engine's ACWR defect (S1).
9. **Safety boundary stated (C3.5):** not a medical/diagnostic tool; high-risk presentations defer to professionals (§7.2).

**Standing tension the review did *not* fully resolve (recorded honestly):** the design is ambitious relative to the team that will build it. The mitigation is real (incremental migration, smallest-version-of-everything), but the risk that the *framework* absorbs effort that should go to *athlete value* is genuine and permanent. The governing instruction, therefore, is **P15 made operational: at every step, build the smallest thing that improves a real athlete outcome, and let the architecture pull you forward — never build the architecture for its own sake.** This EDS is the map of the destination; it is explicitly *not* a mandate to build everything at once.

> **Final position after self-review.** The specification is a *world-class foundation* in its philosophy, its decision architecture, its honesty about uncertainty, and its alignment of software and coaching reasoning. Its believability rests on three commitments it must keep: **measure before you claim** (qualities, diagnoses), **demote contested science in code, not just in comments**, and **ship athlete value incrementally rather than building the cathedral first.** Hold those three, and this is the governing document for a coaching decision engine — not a workout generator.

---

# 46. Glossary

Plain-language definitions of every load-bearing term, alphabetised. (Conceptual definitions in dependency order are in §6.)

- **Adaptation** — the physiological change training causes (e.g., tendon stiffening, more mitochondria, muscle growth). The engine decides which adaptation to chase *before* how much work to prescribe.
- **Adaptation projection (reflow)** — the read-time reshaping of *pending* sessions to fit reality. Applied *over* the immutable plan, never *into* it.
- **ACWR (acute:chronic workload ratio)** — a load metric the platform treats as a *low-confidence, non-gating hint*, because the evidence shows it is mathematically flawed as an injury predictor.
- **Athlete model** — the engine's structured understanding of one athlete: their qualities, training age, history, constraints, and goal. Grows more individual over time.
- **Block (mesocycle)** — a multi-week training phase with one dominant objective.
- **Confidence** — how much the engine trusts a fact or a decision. Governs whether something can *gate* (decide), merely *inform*, or only be *displayed*.
- **Constraint** — a hard bound on the solution (time, equipment, schedule, injury, recoverability). Computed first; content must fit inside it.
- **Decision** — the atomic unit of the engine: an explicit reasoning step with inputs, rationale, output, confidence, dependencies, and failure modes. The engine is a graph of these.
- **Demand profile** — the structured set of qualities, energy systems, and movements a sport (or goal) requires. The thing the athlete is compared against.
- **Deload** — a planned recovery period: volume *and* intensity reduced to clear fatigue. (Contrast taper.)
- **Dose** — the magnitude of an intervention: sets, intensity, reps, tempo, frequency. Computed as the *minimum effective* amount for the target adaptation.
- **Energy system** — the metabolic pathway powering an effort (aerobic, anaerobic glycolytic, anaerobic alactic). A future intervention target.
- **Engine Law** — a non-negotiable invariant the engine must never violate (Part I §4).
- **Evidence level (L1–L5)** — the strength of the science behind a fact, from meta-analysis (L1) to expert opinion (L5).
- **Fractional set counting** — counting a synergist's contribution to a muscle as a fraction of a set (e.g., a squat = 1.0 quad + 0.5 glute sets). The evidence-endorsed accounting method.
- **Freeze-on-commit** — once an athlete starts a session, what they were shown is locked; adaptation never silently changes a committed session.
- **Goal-as-sport** — a non-sport goal (get stronger, build muscle, functional) modelled exactly like a sport: as a demand profile.
- **Golden-master test** — a test that locks the engine's output for known inputs, so unintended changes are caught.
- **Hypertrophy** — muscle growth. One *quality* among many — the dominant priority for a bodybuilder, usually anti-prioritised for an endurance athlete.
- **Intervention** — anything prescribed to drive an adaptation: an exercise + dose, an energy-system session, a prevention protocol, a rest directive. Exercises are interventions, not objectives.
- **Knowledge module** — a body of evidence-tagged domain data (sports, qualities, exercises, etc.) the engine reasons *from*. Separate from decision logic.
- **Limiting factor** — the specific deficit most constraining the athlete's sport performance now. Diagnosing it is the pivot of coaching.
- **Load** — accumulated training stress over time. Reported as absolute load and week-on-week change (ratios are soft hints).
- **MEV / MAV / MRV** — Minimum Effective / Maximum Adaptive / Maximum Recoverable Volume: per-muscle weekly set landmarks. Useful heuristics (low confidence at the high end); a *ceiling and ledger*, not a target.
- **Microcycle** — a training week; a loading pattern within a block.
- **Minimum effective dose** — the *smallest dose that still produces the required adaptation* — not merely the smallest dose. Must still be progressively overloaded.
- **Periodisation** — structuring training into phases with progressing objectives over time.
- **Physical quality** — a trainable performance attribute (max strength, RFD, reactive strength, aerobic capacity, mobility, robustness, …). The organising unit of training content.
- **Plan (hypothesis)** — the engine's deterministic best guess: a full macrocycle, derived purely from athlete state. Immutable; a hypothesis, not a promise.
- **Prior** — a belief the engine holds before seeing this athlete's data (population/sport), updated toward athlete-specific evidence by the learning loop.
- **Quality (see physical quality).**
- **Rate of force development (RFD)** — how fast force can be produced. Critical for sprint/jump/throw sports; currently unmodelled.
- **Readiness** — a derived, today-local estimate of capacity to train hard, from subjective wellness (weighted heavily) + objective signals + state flags. Contains no raw vitals.
- **Reactive / elastic strength** — using the stretch-shortening cycle (tendon elasticity) to produce force quickly. A distinct quality the current engine cannot represent.
- **Recoverability / capacity** — the athlete's modelled ability to absorb total load over a window. A hard ceiling.
- **Registry** — a validated lookup (id → knowledge object) for interchangeable knowledge members (sports, injuries, …). Adding one = data, not code.
- **SKB (Sport Knowledge Base)** — the platform's per-sport knowledge model: 21 evidence-tagged sections per sport. The target sport model; currently mostly dormant.
- **Strategy** — the macro approach to sequencing qualities and managing concurrent-training interference.
- **Taper** — pre-competition sharpening: volume cut ~40–60% while *intensity is held*. (Not a deload.)
- **Transfer** — the degree to which a gym adaptation improves sport performance. The core efficacy question.
- **Validation** — the post-construction safety/law check that can trim or veto a session. Construction proposes; validation disposes.
- **Value hierarchy** — the order in which spare session capacity is spent (primary compound → … → mobility), then banked.

---

## Closing note

This document describes how the platform should *think*. It is deliberately ahead of what is built — that is the point of a constitution. The current engine is a strong, evidence-based gym generator; this specification is the map from there to an evidence-based coaching decision engine that happens to express itself, today, mostly through gym work, and tomorrow through the full breadth of an athlete's preparation.

Three sentences carry the whole document:

1. **The engine makes coaching decisions; sessions are how those decisions become visible.**
2. **The sport is the objective; the gym, the volume, the exercises all serve it — and the engine reasons in qualities and adaptations, with muscles and volume as the ledger, not the goal.**
3. **Be exactly as confident as the evidence warrants — measure before you claim, demote contested science in code, and earn personalisation through the learning loop rather than asserting it.**

Hold these, and every future engineering decision has a place to come home to.

*— End of Engine Design Specification v1.0 —*













