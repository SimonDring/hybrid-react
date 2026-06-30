# The Decision Ontology

> **The canonical vocabulary of the platform.**
> Every concept the coaching engine reasons about is defined here, exactly once,
> with its attributes, relationships, and place in the reasoning. If two contributors
> mean different things by "readiness," "quality," or "limiting factor," the platform
> has a bug before a line of code is written. This document is the shared mental
> model that prevents that.

---

| | |
|---|---|
| **Status** | v1.0 — foundational |
| **Authority** | Governs all naming and modelling across the platform. Subordinate to the [Constitution](CONSTITUTION.md); the canonical home for *what each concept is*. The [EDS](../engine/00-ENGINE-DESIGN-SPECIFICATION.md) and code must use these terms with these meanings. |
| **Scope** | Platform-wide: engine, app, team, AI, and data model. |
| **Relationship to the EDS** | The EDS defines *decisions* (D1–D16) and *domain models* operationally; this document defines the *entities those decisions operate on* and their relationships. Where the EDS §6 glossary and this document overlap, this document is the canonical definition; the EDS points here. |
| **Principle** | Nothing should be implemented until the entity it manipulates is defined here. New concepts are added to this ontology *first*, then built. |

---

## How to read this document

The ontology is in three movements:

1. **The three structures** (§1) — the single most important correction this document
   makes. The platform's concepts are not one hierarchy; they are *three orthogonal
   structures* that the original brief mashed together. Getting them apart dissolves
   most ambiguity.
2. **The reasoning spine** (§2) — the challenged-and-improved order in which decisions
   are made, with a rationale for *every* edge.
3. **The entity catalogue** (§3–§9) — every entity, grouped into seven families, each
   defined under a fixed template:

   - **Definition** — what it is.
   - **Purpose** — why it exists in the model.
   - **Attributes** — what it carries.
   - **Relationships** — how it connects to other entities (with cardinality where it
     matters: `1`, `0..1`, `1..*`, `*`).
   - **Produced from / Feeds** — what creates it and what it flows into.
   - **Consumers** — which decisions or entities read it.
   - **Example** — a concrete instance.

A term in **Title Case** is a defined entity; follow it to its definition. Synonyms
in common coaching use are noted so contributors can map their language onto the
canonical term.

> **This is a vocabulary, not a build mandate.** Defining ~40 entities does *not*
> mean building 40 modules before serving an athlete (that would breach Constitution
> Article 20). The ontology exists so that *when* something is built, it is named and
> related correctly. Many entities begin life as thin pass-throughs or population
> defaults and are fleshed out only when a consumer needs them. The ontology is the
> map of the territory; it does not dictate the order of construction.

---

# 1. The three structures

The brief proposes a single top-to-bottom hierarchy: *Athlete → Goal → Performance
Outcome → … → Session → Week → Block → Season.* **This is the document's first thing
to challenge, because it conflates three different relationships into one chain, and
that conflation is the source of most modelling confusion.** There are three distinct
structures, and every entity belongs to one of them:

### 1.1 The Reasoning Spine (temporal: what is decided before what)

The order in which coaching *decisions* are made. It is **top-down**: you cannot
select an exercise before you know the session's purpose, and you cannot know the
session's purpose before you have diagnosed what the athlete needs. This is the
order of operations of coaching, and getting it right makes most defects impossible
to express. (Detailed in §2.)

```
   Athlete → Goal → Performance Outcome → Sport/Position → Demand Profile
        → [PIVOT] Limiting Factors → Priority Qualities → Adaptation Targets
        → Strategy → Block Objective → Weekly Objective → Session Objective
        → Movement Requirements → Intervention Selection → Dose
        → Validation → Adaptation Projection → Learning
```

### 1.2 The Containment Hierarchy (structural: what is part of what)

A *part-of* relationship between the artefacts the engine produces. This is
**bottom-up aggregation** of structure, and it is **not** the order decisions are
made (the brief's chain wrongly implies you build a session, then a week, then a
block). You *decide* horizons top-down (§1.1) and the artefacts *nest* like this:

```
   Macrocycle (Season)
     └─ contains 1..*  Mesocycle (Block)
           └─ contains 1..*  Microcycle (Week)
                 └─ contains 1..*  Session
                       └─ contains 1..*  Intervention
                             └─ configured by 1..*  Programming Variables
```

### 1.3 The Diagnostic Triangle (relational: how a need is found)

The conceptual engine of the whole platform, and the thing the original hierarchy
hides entirely. A **Physical Quality** is a shared axis. The athlete sits on one
side of it (**Capability** — how much of the quality they have). The sport sits on
the other (**Demand** — how much the quality matters for the outcome). The
**Limiting Factor** is the *gap* between them, weighted by importance:

```
                       PHYSICAL QUALITY  (the shared axis, e.g. "reactive strength")
                        ╱                          ╲
            CAPABILITY                               DEMAND
       (athlete-side level,                  (sport-side importance,
        with confidence)                      from the Demand Profile)
                        ╲                          ╱
                         ▼                        ▼
                          LIMITING FACTOR
                 gap = demand_importance × (target_level − current_level),
                 adjusted by trainability-now and injury-risk
```

**Why this matters:** because the platform reasons in qualities (Constitution
Article 5), this triangle is *how it thinks*. Every limiting factor is a gap on a
quality axis; every priority is a chosen gap to close; every intervention is a way
to close it. A workout generator has no triangle — it jumps from goal to exercises.
This platform's identity is that the triangle sits between them.

> **The single biggest improvement over the brief's hierarchy:** separating these
> three structures. The brief's chain is the Reasoning Spine with the Containment
> Hierarchy wrongly tacked on its tail and the Diagnostic Triangle missing. Once
> separated, each entity has exactly one home and the relationships stop tangling.

---

# 2. The Reasoning Spine, challenged and justified

Below is the improved spine. Each step states **what it is** and **why this edge
exists** (why this decision must come after the one before it). Cross-cutting
**rails** bound every step and so are drawn beside the spine, not on it.

```
   ┌───────────────────────── CROSS-CUTTING RAILS (bound every step) ─────────────────────────┐
   │  • Constraints (time · equipment · sport schedule · injuries · recoverability · competency)│
   │  • Training History & Learned Priors (the learning rail — grows the model's individuality) │
   │  • Confidence (attached to every input and every output; governs authority)                │
   └───────────────────────────────────────────────────────────────────────────────────────────┘

   Athlete                  who they are: capability per quality, training age, history
      │  ▼ you cannot prescribe before you understand
   Goal                     what they are training FOR (theirs, never imposed)
      │  ▼ a goal is an intention; it must resolve to something measurable
   Performance Outcome      the measurable competitive result the goal implies
      │  ▼ an outcome is produced in the context of a sport (or goal-as-sport)
   Sport  →  Position       the demand context, refined by position/event
      │  ▼ sport + position + individual specifics resolve to a structured requirement
   Demand Profile           ranked quality requirements + energy/movement demands + risks
      │
 ══════════════════════════ THE PIVOT: DIAGNOSIS (the Diagnostic Triangle) ══════════════════════════
   Limiting Factors         demand − capability, per quality, ranked → what holds performance back
      │  ▼ of all the gaps, which to close now for highest return?
   Priority Qualities       the small set (k≈1–3) chosen to develop this block
      │  ▼ a quality is developed by driving a physiological change
   Adaptation Targets       the specific physiological changes that close each gap
 ═════════════════════════════════════════════════════════════════════════════════════════════════════
      │  ▼ adaptations are pursued within a macro structure, top-down
   Strategy                 concurrency model + sequencing (manage interference)
      │  ▼
   Block Objective          one dominant adaptation per mesocycle
      │  ▼
   Weekly Objective         loading pattern around the sport schedule
      │  ▼
   Session Objective        one named purpose per session
      │  ▼ an objective specifies movement/loading characteristics BEFORE any exercise
   Movement Requirements    patterns · force-velocity profile · contraction emphasis
      │  ▼ requirements are satisfied by choosing interventions
   Intervention Selection   minimum effective set of exercises/protocols that satisfy them
      │  ▼ a chosen intervention must be dosed
   Dose                     programming variables: sets · load/RPE · reps · tempo · rest
      │  ▼ construction proposes; validation disposes
   Validation               recoverable? sport-safe? lawful? balanced? → trim/veto + report
      │  ▼ the validated plan meets reality
   Adaptation Projection    reshape PENDING work to what actually happened (over the immutable plan)
      │  ▼ outcomes update beliefs
   Learning                 update priors at three tiers → sharpen the next pass
```

### Edge-by-edge rationale

- **Athlete → Goal.** Understanding precedes intent: the same goal means different
  things for a novice and a veteran. *(If reversed, the platform imposes goals — a
  Constitution Article 3 breach.)*
- **Goal → Performance Outcome.** *This edge is the brief's; the EDS dropped it, and
  reinstating it is a deliberate improvement.* A Goal ("get faster") is an
  intention; a Performance Outcome ("sub-40 10k by October," "selected for the
  first team") is the *measurable* thing that makes the goal falsifiable and is what
  transfer is ultimately validated against (Constitution Article 12). Without it,
  the platform cannot tell whether its coaching worked.
- **Performance Outcome → Sport → Position.** An outcome is achieved in a sport
  context; the sport supplies the demand knowledge; the position/event refines it. A
  goalkeeper and a midfielder share a sport but not a Demand Profile.
- **Sport/Position → Demand Profile.** The sport's knowledge is resolved into *this
  athlete's* concrete requirement set. This is the object the diagnosis compares
  against.
- **Demand Profile → Limiting Factors (THE PIVOT).** Everything above is
  *understanding*; everything below is *response*. The gap between demand and
  capability, ranked, is where coaching happens. *(The EDS's central critique is
  that the current engine lacks this edge entirely — it jumps from emphasis to
  exercise.)*
- **Limiting Factors → Priority Qualities.** You cannot train every gap at once;
  focus beats breadth. This edge applies recoverability, concurrency, and
  trainability-now to pick the few highest-return gaps.
- **Priority Qualities → Adaptation Targets.** *This edge is kept separate
  deliberately, against the brief, which collapses them into "Priority
  Adaptations."* A Quality (e.g. reactive strength) is the *trainable attribute*; an
  Adaptation (e.g. increased tendon stiffness) is the *physiological change* that
  develops it. Keeping them distinct lets one quality be driven by several
  adaptations and makes dosing (which targets adaptations) substitutable from
  selection (which targets qualities).
- **Adaptation Targets → Strategy → Block → Week → Session Objective.** *This is the
  second correction to the brief.* These horizons are decided **top-down, here in the
  middle of the spine** — not aggregated bottom-up at the end. You know it is an
  in-season maintenance week *before* you choose the session's purpose, which is
  *before* you choose exercises. The brief's "…→ Session → Week → Block → Season"
  tail reverses this and is wrong for periodisation.
- **Session Objective → Movement Requirements.** A coach specifies *what movement and
  loading characteristics are needed* ("high-velocity, short ground contact,
  elastic") before naming an exercise. This makes interventions substitutable and
  explainable.
- **Movement Requirements → Intervention Selection → Dose.** Requirements are
  satisfied by the minimum effective set of interventions, which are then dosed.
  Selection optimises for transfer-per-fatigue; dosing computes the smallest
  sufficient amount.
- **Dose → Validation → Adaptation Projection → Learning.** Construction is checked,
  then projected onto reality (pending work only), then mined for learning. These are
  three separate activities (Constitution Articles 18, 19) and must not blur.

The three rails bound *every* edge: a step never produces something the
**Constraints** forbid, every step reads the **Learned Priors** for this athlete,
and every input and output carries **Confidence** that governs how decisively it is
used.

---

# 3. Family I — Actors & Organisation

The people and groups the platform serves. The platform ships in two packages —
**Individual** (one self-coached athlete) and **Team** (players plus a coach) — and
these entities are where the difference, and the privacy boundary, live.

## Athlete
- **Definition.** The human subject of all coaching decisions; the person whose
  long-term performance the platform optimises.
- **Purpose.** Every decision exists to serve an Athlete. The entire reasoning spine
  begins here.
- **Attributes.** Identity & demographics (age, sex, bodyweight, height — for
  capacity normalisation only); training age / competency (overall and per movement);
  **Capability** per **Physical Quality** (with confidence); **Goal**; **Constraints**;
  **Injury** history and status; **Training History**; **Learned Priors**.
- **Relationships.** Has `1` active **Goal** (rarely `0..1` during onboarding; see
  Goal for multi-goal handling). Belongs to `0..1` **Team** (none in the Individual
  package). Owns all of their **Athlete State**. In the Team package, *is* a player —
  there is no separate "player" entity; a player is an Athlete plus a Team membership.
- **Produced from / Feeds.** Built by the assessment decision from onboarding and
  history; feeds every downstream decision.
- **Consumers.** All decisions; the diagnosis (D4) compares the Athlete's Capability
  against the Demand Profile.
- **Example.** A 34-year-old club runner, training age 6 years, targeting a sub-40
  10k, two gym days a week, prior hamstring strain.

## Coach
- **Definition.** A human responsible for a **Team**'s athletes, who supplies the
  team's fixed schedule and consumes a privacy-bounded overview. Exists only in the
  Team package.
- **Purpose.** Encodes the Constitution's "human is the final authority" (Article 10)
  for teams: the Coach supervises, constrains, and overrides; the engine advises.
- **Attributes.** Identity; the **Team(s)** they coach; the team **Competition**
  schedule and fixed sessions they author; their override history.
- **Relationships.** Coaches `1..*` **Teams** within `1` **Organisation**. Has a
  *derived, team-scoped, raw-vitals-never* read surface over their team's athletes
  (Constitution Article 11). May **Override** any **Recommendation** for their
  athletes; the override is recorded and feeds **Learning**.
- **Produced from / Feeds.** Feeds the fixed sport schedule into each athlete's
  weekly/scheduling decisions as a **Constraint**; feeds overrides into the engine at
  decision boundaries.
- **Consumers.** The weekly-objective and scheduling decisions consume the coach's
  schedule; the team dashboard consumes the derived overview.
- **Example.** A GAA club S&C lead, not an exercise physiologist, who sets the week's
  pitch sessions and match and wants a plain-English "who is doing too much / too
  little" view.

## Team
- **Definition.** A named group of **Athletes** coached together, with a shared fixed
  schedule of **Competitions** and sport sessions.
- **Purpose.** The unit of the Team package. A Team adds *constraints* (the fixed
  schedule) and a *derived read surface* (the coach view) to a set of otherwise
  ordinary Athletes — it does **not** add a second reasoning system.
- **Attributes.** Roster (`1..*` **Athletes**); the fixed schedule; the sport (and
  per-**Position** structure); the **Organisation** it belongs to.
- **Relationships.** Has `1..*` **Athletes** and `1..*` **Coaches**; belongs to `1`
  **Organisation**. A Team's schedule becomes a **Constraint** on each member's plan.
  Athletes in a Team can never see each other's data (data isolation, §9.3).
- **Produced from / Feeds.** Authored by a Coach/Organisation; feeds constraints into
  every member's reasoning spine.
- **Consumers.** Weekly-objective and scheduling decisions; the coach dashboard.
- **Example.** "Senior hurlers," 30 athletes across positions, two pitch sessions and
  one match most weeks in season.

## Organisation
- **Definition.** The top-level account that owns **Teams**, **Coaches**, and the
  contractual relationship with the platform (a club, school, or federation).
- **Purpose.** The boundary of administration, billing, and the outermost
  data-isolation scope. Cross-team access is mediated here and is always additive and
  explicit.
- **Attributes.** Identity; owned **Teams** and **Coaches**; access policy.
- **Relationships.** Has `1..*` **Teams** and `1..*` **Coaches**. An Organisation
  never sees another Organisation's data; a Coach never sees another Organisation's
  athletes.
- **Produced from / Feeds.** Administrative; bounds the access rules that every
  cross-user read must extend (never bypass).
- **Consumers.** Access control; billing; team management — not the coaching engine
  itself (the engine reasons about Athletes, not Organisations).
- **Example.** A GAA club with senior, intermediate, and minor teams under one
  account.

> **Account / User** is the authentication identity behind an Athlete or Coach. It is
> a *platform-service* entity, not a coaching entity, and is deliberately kept out of
> the engine (Constitution Article 18: the engine knows nothing of auth). One Account
> maps to one Athlete and/or Coach persona.

---

# 4. Family II — Aspiration (what the athlete is training for)

The chain from intention to a structured, comparable requirement.

## Goal
- **Definition.** What the **Athlete** is training *for*, in their own words and
  intent — a **Sport** they train (run, swim, GAA…) or a **goal-as-sport** (get
  stronger, build muscle, functional fitness).
- **Purpose.** The root of the reasoning spine below the Athlete; everything
  downstream serves it. The Goal is the athlete's, discovered, never imposed
  (Constitution Article 3).
- **Attributes.** Type (sport | goal-as-sport); intent; target **Performance
  Outcome**; **Competition**/event date; season; **Position**/event where relevant.
- **Relationships.** Belongs to `1` **Athlete**; resolves to `1` **Demand Profile**
  (via Performance Outcome + Sport). Multi-goal athletes (e.g. triathletes) hold
  Goals that must *combine* into a single Demand Profile, not be selected between — an
  open problem (EDS Q6) flagged, not hidden.
- **Produced from / Feeds.** Captured at onboarding; feeds demand resolution.
- **Consumers.** Demand resolution; strategy; the athlete-facing framing of every
  recommendation.
- **Example.** "Run a faster 10k this autumn." Type: sport (running, long-distance
  discipline).

## Performance Outcome
- **Definition.** The *measurable* competitive result the **Goal** implies — a time,
  a placing, a selection, a KPI on the sport's scoreboard.
- **Purpose.** *Reinstated against the EDS, which collapsed it into Sport.* It makes
  the Goal falsifiable and is the ultimate referee of transfer: did developing the
  prioritised qualities actually move *this*? Without it, the platform cannot know if
  its coaching worked (Constitution Article 12).
- **Attributes.** Metric; target value; deadline/**Competition**; current value
  (where known); the sport KPI it maps to (the SKB's KPI framework).
- **Relationships.** Implied by `1` **Goal**; achieved in the context of `1`
  **Sport**; validated against by **Learning** (transfer check). Connects to the
  sport's **KPI framework**.
- **Produced from / Feeds.** Derived from the Goal at onboarding; feeds the transfer
  validation in the learning loop and the athlete's motivation framing.
- **Consumers.** Learning (transfer validation); demand resolution (an outcome
  sharpens which qualities matter); the athlete dashboard.
- **Example.** "10k in under 40:00 by 12 October." Maps to the running KPI
  "race-pace economy."

## Sport
- **Definition.** A structured, evidence-tagged **Knowledge** module describing a
  sport's demands — *not code*. Bodybuilding and other goals-as-sport are modelled in
  exactly the same shape.
- **Purpose.** The single source of truth for "what does this pursuit require?" It
  lets the engine reason about demand and transfer instead of re-weighting muscles
  (Constitution Articles 2, 3, 5).
- **Attributes.** The SKB's 21 sections — ranked **Physical Quality** importances,
  energy-system mix, **Movement Pattern** profile, **Injury** risks, **Positions**,
  season/microcycle structure, exercise transfer ratings, decision rules, readiness
  weighting, assessments, KPI framework, references — each evidence-tagged.
- **Relationships.** Resolves (with Position + Performance Outcome) into `1` **Demand
  Profile**. Lives in the sport **Registry** (add a sport = a file + a registry line).
  Has `0..*` **Positions**. Authored as **Knowledge**, carrying **Evidence** and
  **Confidence**.
- **Produced from / Feeds.** Authored by sports scientists as data; feeds demand
  resolution, selection, scheduling, dosing.
- **Consumers.** Demand resolution; position refinement; intervention selection (via
  transfer ratings); weekly structure; dosing/adaptation (sport-specific weighting).
- **Example.** `running_long.json` — aerobic capacity 10, tendon stiffness 9,
  eccentric-hamstring robustness 9 (top injury risk), hypertrophy low (mass harms
  economy).

## Position
- **Definition.** A role within a **Sport** that modifies the Demand Profile (a
  goalkeeper, a midfielder, a sprint vs. distance discipline).
- **Purpose.** Two athletes in one sport can need categorically different training;
  Position is how that difference enters the model. *(The EDS notes the current
  engine has no position concept — every athlete in a sport trains identically; this
  ontology makes Position first-class so the gap is fillable.)*
- **Attributes.** Position id; per-quality demand modifiers; position-specific injury
  risks and movement signatures.
- **Relationships.** Belongs to `1` **Sport**; refines `1` **Demand Profile**.
  Where no position applies, it is a pass-through.
- **Produced from / Feeds.** Authored within the Sport knowledge; feeds the
  refinement step of demand resolution.
- **Consumers.** Position-refinement decision; diagnosis.
- **Example.** "Midfielder" in GAA — higher repeat-sprint and aerobic demand than a
  corner-back.

## Competition
- **Definition.** A dated event the athlete is preparing for — a race, match,
  fixture, or meet — that anchors periodisation and the taper.
- **Purpose.** Time-anchors the **Macrocycle**: a real **Performance Outcome** has a
  date, and the plan must peak the athlete for it (volume down, intensity held).
- **Attributes.** Date; importance (key vs. minor); type; for teams, the fixture
  schedule and congestion.
- **Relationships.** Targeted by `1..*` **Goals/Performance Outcomes**; shapes the
  **Macrocycle** and **Block** structure; for teams, supplied by the **Coach** as a
  **Constraint**.
- **Produced from / Feeds.** From the athlete's calendar or the coach's schedule;
  feeds periodisation and the taper.
- **Consumers.** Periodisation/block decision; weekly objective (fixture congestion);
  scheduling.
- **Example.** "County final, 12 October" (key); midweek league fixtures (minor).

## Demand Profile
- **Definition.** The resolved, ranked set of **Physical Quality** requirements,
  energy-system targets, key **Movement Patterns**, and **Injury**-risk map that a
  **Goal/Performance Outcome/Sport/Position** imposes on *this* athlete.
- **Purpose.** The object the **Athlete**'s **Capability** is compared *against* to
  find **Limiting Factors**. It is the sport side of the Diagnostic Triangle.
- **Attributes.** Per-quality importance (1–10, with confidence); energy-system mix;
  required movement/force-velocity characteristics; injury-risk weighting; season
  context. For multi-goal athletes, a *combined* profile.
- **Relationships.** Resolved from `1` **Sport** + `0..1` **Position** + `1`
  **Performance Outcome**; compared against the **Athlete**'s **Capability** to
  produce **Limiting Factors**.
- **Produced from / Feeds.** Output of demand resolution; feeds diagnosis, movement
  requirements, and selection.
- **Consumers.** Diagnosis (the pivot); movement requirements; intervention
  selection.
- **Example.** For the sub-40 runner: aerobic capacity (importance 10), tendon
  stiffness (9), eccentric-hamstring robustness (9), max strength (6), hypertrophy
  (2, anti-prioritised).

---

# 5. Family III — The Diagnostic Core (the pivot)

The Diagnostic Triangle (§1.3) made explicit. These are the entities most absent
from a workout generator and most central to a coaching engine.

## Physical Quality
- **Definition.** A trainable attribute that contributes to performance — maximal
  strength, rate of force development, reactive/elastic strength, strength-endurance,
  aerobic/anaerobic capacity, mobility, stability, robustness, hypertrophy, and so on.
- **Purpose.** *The organising primitive of training content* (Constitution Article
  5). The shared axis of the Diagnostic Triangle: the athlete has a level of it
  (**Capability**), the sport requires an amount of it (**Demand**), and training
  develops it (via **Adaptations**). Replaces "muscle" as the thing the engine
  reasons about.
- **Attributes.** Id; quality family; the **Adaptations** that develop it;
  dose-response model (with confidence); fatigue cost; recovery time; prerequisite
  qualities/competencies; assessment method; trainability constraints; **Evidence**.
- **Relationships.** Developed by `1..*` **Adaptations**; measured on the athlete as
  a **Capability**; weighted by the **Demand Profile**; the subject of **Limiting
  Factors** and **Priority Qualities**; driven by **Interventions**. *A quality with
  no assessment and no dose model is a label, and the platform may not act on labels*
  (Constitution Article 12).
- **Produced from / Feeds.** Authored as **Knowledge** (the quality taxonomy); feeds
  diagnosis, prioritisation, movement requirements, dosing.
- **Consumers.** Diagnosis; priority selection; movement requirements; dose
  assignment; exercise tagging.
- **Example.** "Reactive strength" — family elastic/reactive; adaptations: tendon
  stiffness, stretch-shortening-cycle efficiency; prerequisite: a maximal-strength
  base; assessed by reactive-strength index (drop jump).

## Capability
- **Definition.** The **Athlete**'s current level of a given **Physical Quality**,
  with a confidence reflecting whether it was measured or inferred.
- **Purpose.** The athlete side of the Diagnostic Triangle. Distinguishes "what this
  athlete *has*" from "what the sport *needs*," so the gap between them is computable.
- **Attributes.** Quality id; current level (on the quality's scale); source
  (measured from lifts/assessments/logs, or inferred from training age + population
  priors); **Confidence**; last updated.
- **Relationships.** Held by `1` **Athlete** for each **Physical Quality**; compared
  against the **Demand Profile** to yield a **Limiting Factor**; sharpened by
  **Learning** as assessments and history accumulate.
- **Produced from / Feeds.** Estimated by the assessment decision; updated by
  learning; feeds diagnosis.
- **Consumers.** Diagnosis; progression (anchored to demonstrated capability).
- **Example.** Reactive strength: "low, inferred from training age" (confidence: low,
  early) → later "moderate, measured RSI 1.4" (confidence: high).

## Limiting Factor
- **Definition.** The specific deficit — a **Physical Quality** gap relative to the
  **Demand Profile** — that is most constraining the athlete's **Performance
  Outcome** now.
- **Purpose.** *The pivot of coaching* (Constitution Article 5). It is where
  understanding becomes response. Everything above it is diagnosis; everything below
  is treatment.
- **Attributes.** Quality id; gap magnitude (`demand_importance × (target − current)`,
  adjusted by trainability-now and injury-risk — *a starting heuristic, not a
  validated formula; EDS Q1*); rationale; **Confidence** (inherits the weakest input,
  often low early); whether it is currently *servable* by an available **Intervention**
  class.
- **Relationships.** Computed from `1` **Demand Profile** and the **Athlete**'s
  **Capability**; ranked against other Limiting Factors; the top few become **Priority
  Qualities**. An *unservable* Limiting Factor (e.g. an aerobic-capacity gap while
  endurance programming is deferred) is surfaced, never silently dropped (Constitution
  Article 15).
- **Produced from / Feeds.** Output of the diagnosis decision; feeds prioritisation.
- **Consumers.** Priority selection; the athlete-facing explanation ("here's what's
  holding you back, and how sure we are").
- **Example.** "Low eccentric-hamstring capacity" — gap = high (importance 9 × large
  deficit), also the top injury risk → a limiter *and* a protector.

## Priority Quality
- **Definition.** A **Physical Quality** selected, because of a **Limiting Factor**,
  as a focus for the current **Block**.
- **Purpose.** The bridge from diagnosis to intervention. Focus beats breadth: of all
  the gaps, the few highest-return ones that are trainable now without compromising
  the sport.
- **Attributes.** Quality id; the Limiting Factor it traces to; rank; develop-vs-
  maintain designation; the recoverability budget allotted; **Confidence**.
- **Relationships.** Selected from ranked **Limiting Factors** (typically `1..3`);
  constrained by **Recoverability**, **Strategy** (concurrency), and trainability;
  drives the **Block Objective** and **Adaptation Targets**.
- **Produced from / Feeds.** Output of the priority-selection decision; feeds strategy
  and block objectives.
- **Consumers.** Strategy; block objective; movement requirements.
- **Example.** "Develop eccentric-hamstring robustness (develop) + maintain max
  strength (maintain); k=2; in-season → minimal fatigue."

## Adaptation
- **Definition.** The physiological change training is intended to cause — increased
  motor-unit recruitment, tendon stiffening, mitochondrial density, muscle
  cross-sectional area, eccentric tissue tolerance.
- **Purpose.** *Kept distinct from Physical Quality, against the brief's "Priority
  Adaptations" collapse.* A Quality is the trainable attribute; an Adaptation is the
  change that develops it. One quality may need several adaptations; one adaptation
  may serve several qualities. This separation makes **Dose** (which targets
  adaptations) independent of **Selection** (which targets qualities).
- **Attributes.** Id; the **Qualities** it develops; dose-response model (with
  confidence); recovery/remodelling time; fatigue character (neural/metabolic/
  mechanical); **Evidence**.
- **Relationships.** Develops `1..*` **Physical Qualities**; targeted by **Dose**;
  driven by **Interventions**. An **Adaptation Target** is an Adaptation chosen as the
  aim of a block/session.
- **Produced from / Feeds.** Authored as **Knowledge**; feeds dosing and the
  scientific-consistency validator.
- **Consumers.** Dose assignment; scheme selection; validation.
- **Example.** "Increased tendon stiffness" — develops reactive strength and running
  economy; driven by heavy-slow and plyometric loading; long remodelling time.

---

# 6. Family IV — Interventions (how an adaptation is driven)

What the platform actually prescribes. Exercises are *interventions, not objectives*
(Constitution Article 5).

## Intervention
- **Definition.** Anything the engine prescribes to drive an **Adaptation** — most
  often an **Exercise** at a **Dose**, but also (future) an energy-system session, a
  mobility or prevention protocol, or a rest/recovery directive.
- **Purpose.** The general category that makes the architecture future-proof:
  endurance programming, nutrition, and AI-proposed protocols all enter as new
  *kinds of Intervention*, not new engines (Constitution Article 18; EDS E2).
- **Attributes.** Type; the **Adaptation**(s)/**Quality**(ies) it drives; transfer
  value per sport; fatigue and joint/spinal/neural cost; required equipment and
  competency; contraindication patterns.
- **Relationships.** Satisfies `1..*` **Movement Requirements**; drives `1..*`
  **Adaptations**; configured by a **Dose**; placed in a **Session**. **Exercise** is
  its primary subtype today.
- **Produced from / Feeds.** Chosen by the selection decision; feeds dosing and
  scheduling.
- **Consumers.** Selection; dose; validation; the session runner.
- **Example.** "Nordic hamstring curl" (an Exercise intervention) — drives eccentric
  hamstring tissue tolerance; high transfer for runners; low equipment.

## Exercise
- **Definition.** A specific movement the athlete performs — the primary kind of
  **Intervention** today.
- **Purpose.** Modelled by *what adaptations/qualities it drives and at what cost*,
  not merely by which muscles it works — so selection optimises transfer-per-fatigue
  (Constitution Articles 5, 6).
- **Attributes.** Id; **Movement Pattern**; primary/secondary **Qualities** and
  **Adaptations** driven; force-velocity profile; fatigue + joint/spinal (axial)/
  neural cost; equipment; competency level/role; per-sport transfer rating; injury
  contraindications; substitution graph (regressions/progressions); fractional muscle
  contribution (the *ledger* input, not the selection driver).
- **Relationships.** Belongs to `1` **Movement Pattern**; is an **Intervention**;
  satisfies **Movement Requirements**; contributes fractional sets to muscles (the
  **Load**/volume ledger); lives in the exercise **Registry**.
- **Produced from / Feeds.** Authored as **Knowledge** (the exercise library); feeds
  selection, dosing, validation.
- **Consumers.** Selection; dose; validation (equipment, competency,
  contraindication, axial-load).
- **Example.** "Trap-bar deadlift" — hinge pattern; drives max strength; axial load
  1; barbell; primary role; high transfer for sprinters.

## Movement Pattern
- **Definition.** A fundamental category of movement an **Exercise** belongs to —
  squat, hinge, lunge, horizontal/vertical push, horizontal/vertical pull, carry,
  core, plus sport-specific signatures.
- **Purpose.** *Distinguished from Movement Requirement, which the brief lists as one
  entity.* A Pattern is a **Knowledge** taxonomy an exercise *is classified by*; a
  Requirement is a *derived spec a session needs*. The Pattern is how the engine
  ensures balanced coverage and substitutes like-for-like.
- **Attributes.** Id; description; balance pairing (push/pull, bilateral/unilateral,
  anterior/posterior); the exercises that express it.
- **Relationships.** Classifies `1..*` **Exercises**; referenced by **Movement
  Requirements** and the movement-balance validator.
- **Produced from / Feeds.** A fixed taxonomy in **Knowledge**; feeds requirements,
  selection variety, and balance validation.
- **Consumers.** Movement requirements; selection; validation.
- **Example.** "Hinge" — posterior-chain dominant; pairs with squat; expressed by
  deadlift, RDL, hip thrust, kettlebell swing.

## Movement Requirement
- **Definition.** A *derived* specification of the movement and loading
  characteristics a **Session** needs — patterns, force-velocity profile, contraction
  emphasis (eccentric/isometric/concentric) — stated *before any exercise is named*.
- **Purpose.** Implements "specify the requirement, then choose the intervention"
  (Constitution Article 5). Makes interventions substitutable and selection
  explainable, and lets contraindicated patterns be subtracted up front.
- **Attributes.** Required **Movement Patterns**; force-velocity target; contraction
  emphasis; sport-specific movement signatures; subtracted (contraindicated) patterns.
- **Relationships.** Derived from `1` **Session Objective** and the **Demand
  Profile**, minus **Injury** contraindications; satisfied by **Intervention
  Selection**.
- **Produced from / Feeds.** Output of the movement-requirements decision; feeds
  selection.
- **Consumers.** Intervention selection.
- **Example.** For a sprint power session: "high-velocity bilateral lower-body
  triple-extension, short ground contact; exclude deep-knee-flexion loading
  (patellar tendinopathy)."

## Programming Variable
- **Definition.** A single configurable parameter of how an **Intervention** is
  performed — sets, intensity (load / %1RM / RPE / velocity), reps, tempo, rest,
  density, frequency.
- **Purpose.** *Named as the brief requests, and distinguished from Dose.* A
  Programming Variable is the atomic knob; a **Dose** is a coherent bundle of them.
  Separating them lets scheme **Knowledge** speak about one variable (e.g. "rest ≥ 3
  min for maximal strength") independently of a full prescription.
- **Attributes.** Variable type; value/range; the **Quality**/phase it is appropriate
  for; **Evidence** for its scheme.
- **Relationships.** Bundled into a **Dose**; constrained by scheme **Knowledge** keyed
  to the target **Quality** and phase.
- **Produced from / Feeds.** Set by the dose decision from scheme knowledge; feeds the
  rendered session and the duration-honesty validator.
- **Consumers.** Dose; validation (duration, scientific consistency); the session
  runner and rest timer.
- **Example.** `rest = 180s`, `intensity = RPE 8`, `tempo = 3-0-1`.

## Dose
- **Definition.** The complete prescribed magnitude of an **Intervention** — a
  coherent bundle of **Programming Variables** computed as the *minimum effective*
  amount for the target **Adaptation** under the recoverability ceiling.
- **Purpose.** Where "adaptation before volume" becomes concrete (Constitution
  Articles 6, 7): dose is *computed from* an adaptation target and a fatigue budget,
  then volume is read off it as a ledger to validate — not set as a target to fill.
- **Attributes.** Per-intervention sets × intensity × reps × tempo × rest; the
  **Adaptation** targeted; the readiness scaling applied (volume *and* intensity);
  the fatigue budget consumed.
- **Relationships.** Configures `1` **Intervention**; targets `1..*` **Adaptations**;
  scaled by **Readiness**; bounded by **Recoverability**; aggregated into the
  **Load**/volume ledger; checked by **Validation**.
- **Produced from / Feeds.** Output of the dose decision; feeds validation, the
  rendered session, and (as actual-vs-prescribed) **Learning**.
- **Consumers.** Validation; the session; learning (dose-response).
- **Example.** "Back squat 3 × 4 @ RPE 8, 3 min rest" — minimum effective dose to
  maintain max strength in-season; scaled down on a low-readiness day in both load
  and sets.

---

# 7. Family V — Planning Horizons & Artefacts

The structures the engine produces, nested per the Containment Hierarchy (§1.2).
Each horizon carries an **Objective** inherited from the diagnosis, not from a
template.

## Strategy
- **Definition.** The macro approach to sequencing **Priority Qualities** and managing
  concurrent-training interference across the **Macrocycle**.
- **Purpose.** Encodes the science of doing several things at once without them
  cancelling out (e.g. strength-first sequencing; separating interfering modalities).
  Without it, a multi-quality plan self-sabotages.
- **Attributes.** Concurrency model; sequencing rules; develop/maintain map across
  qualities; interference-management rules.
- **Relationships.** Derived from **Priority Qualities** + **Demand Profile** +
  **Constraints**; governs the **Macrocycle** and **Block** structure.
- **Produced from / Feeds.** Output of the strategy decision; feeds periodisation.
- **Consumers.** Periodisation; weekly objective; scheduling.
- **Example.** "Strength-first, gym far from key runs; develop hamstring robustness
  while maintaining max strength; no hypertrophy emphasis."

## Macrocycle (Season)
- **Definition.** The full planning horizon spanning to the key **Competition** — a
  sequence of **Mesocycles**. *Synonyms:* season, programme.
- **Purpose.** The whole hypothesis: the engine's deterministic best guess at the
  athlete's path to the **Performance Outcome**. Only the near term is firm; later
  blocks are explicitly provisional (Constitution Article 12).
- **Attributes.** Total duration; the **Block** sequence; key **Competition** and
  taper placement; the governing **Strategy**.
- **Relationships.** Contains `1..*` **Mesocycles**; anchored to `1..*`
  **Competitions**; *is* the **Plan**.
- **Produced from / Feeds.** Output of periodisation; the top of the Containment
  Hierarchy.
- **Consumers.** The athlete (rendered); the runtime (which projects over it).
- **Example.** A 16-week macrocycle to the county final: base → build → peak/taper.

## Mesocycle (Block)
- **Definition.** A multi-week phase with **one dominant Adaptation objective**.
  *Synonyms:* block, phase.
- **Purpose.** Focus at the month scale: a block develops one quality (and maintains
  others) rather than chasing everything, so adaptation actually accrues.
- **Attributes.** **Block Objective** (one dominant adaptation tied to a Priority
  Quality); length; volume/intensity trajectory; deload rhythm; taper (if terminal).
- **Relationships.** Belongs to `1` **Macrocycle**; contains `1..*` **Microcycles**;
  objective traces to `1` **Priority Quality**.
- **Produced from / Feeds.** Output of periodisation; feeds weekly objectives.
- **Consumers.** Weekly objective; scheduling; the athlete.
- **Example.** "Off-season max-strength base, 5 weeks, deload week 5."

## Microcycle (Week)
- **Definition.** A training week — a loading pattern within a **Mesocycle**.
  *Synonym:* week.
- **Purpose.** Where gym load is laid out *around* the sport schedule so the two
  complement rather than clash (Constitution Article 2).
- **Attributes.** **Weekly Objective** (per-day intent: heavy/power/recovery/
  prevention); weekly volume/intensity targets; sport-aware spacing constraints;
  fixture congestion.
- **Relationships.** Belongs to `1` **Mesocycle**; contains `1..*` **Sessions**;
  shaped by the **Team**/athlete **Competition** schedule.
- **Produced from / Feeds.** Output of the weekly-objective decision; feeds session
  objectives and scheduling.
- **Consumers.** Session objective; scheduling; the athlete.
- **Example.** "One match Saturday → heavy gym Monday, power primer Thursday,
  prevention only Friday."

## Session
- **Definition.** A single training unit with **one named purpose** (Constitution
  Article 7 / EDS L7) — the most visible artefact.
- **Purpose.** The container the athlete actually performs; its title, content, and
  dose must all reflect its one objective (no muddled sessions).
- **Attributes.** **Session Objective** (named, with target quality, intensity zone,
  fatigue budget); ordered **Interventions** with **Doses**; estimated honest
  duration; scheduled day; commitment/freeze state.
- **Relationships.** Belongs to `1` **Microcycle**; contains `1..*` **Interventions**;
  realises `1` **Session Objective**; once committed, is frozen (Constitution Article
  10).
- **Produced from / Feeds.** Built by selection + dose + scheduling, checked by
  validation; feeds the runner and (as outcome) learning.
- **Consumers.** The athlete; the runtime (pending sessions only); learning.
- **Example.** "Lower-body max force — back squat, trap-bar DL, Nordic, calf; ~45
  min; Monday; frozen on start."

## Plan (hypothesis)
- **Definition.** The engine's deterministic, immutable best guess: a full
  **Macrocycle** of provisional sessions derived purely from **Athlete State** and
  **Knowledge**. *A hypothesis, not a promise* (Constitution Article 12).
- **Purpose.** The output of the planning loop. Immutable and *derived* (recomputed
  from state), never stored as truth — which is what keeps it honest and the engine
  pure (Constitution Article 18).
- **Attributes.** The whole macrocycle; the decision trace (rationale + confidence per
  decision); the validation report.
- **Relationships.** *Is* a **Macrocycle**; produced by the planning loop; reshaped at
  read time by the **Adaptation Projection**; never mutated.
- **Produced from / Feeds.** Output of D1–D14; feeds rendering and the runtime.
- **Consumers.** The athlete; the runtime; explanation.
- **Example.** The regenerable 16-week plan above, byte-identical for identical
  inputs.

## Adaptation Projection (Reflow)
- **Definition.** The read-time reshaping of *current, pending* work in response to
  what actually happened and today's **Readiness**/**Load**/**Injury** state — applied
  *over*, never *into*, the immutable **Plan**.
- **Purpose.** Lets the plan meet reality without mutating the hypothesis or
  overwriting committed intent (Constitution Articles 10, 18). *Synonym:* reflow.
- **Attributes.** The reshaped pending sessions; what changed and why; the freezes it
  respected.
- **Relationships.** A pure function of (**Plan**, live **Athlete State**); touches
  only pending work; respects committed/frozen **Sessions**; feeds **Learning**.
- **Produced from / Feeds.** Output of the runtime adaptation decision; feeds the
  athlete and learning.
- **Consumers.** The athlete; learning.
- **Example.** "You missed Tuesday and you're amber today, so Thursday drops a set
  and 5% load; next week is unchanged."

> **Objectives** (Block, Weekly, Session) are not separate entities but the *purpose
> attribute* each horizon carries, inherited top-down from the Priority Qualities and
> Adaptation Targets. They are called out because a horizon *without* an inherited
> objective (a template label like "Upper · push") is the defect Constitution Article
> 7 forbids.

---

# 8. Family VI — State, Load & Physiology

What is true about the athlete right now, and the load/fatigue/recovery system that
sizes and adapts their training. *This family contains the document's second major
correction: making Fatigue first-class and defining the four often-confused terms —
Load, Fatigue, Recovery, Readiness, Recoverability — precisely and distinctly.*

### The Load → Fatigue → Recovery → Readiness system

```
   TRAINING (gym + sport + life)
        │ produces
        ▼
   LOAD  ── accumulated stress over time (a measured/estimated quantity)
        │ deposits
        ▼
   FATIGUE  ── the accumulated cost of load not yet recovered from
        │ dissipated over time by
        ▼
   RECOVERY  ── the process/capacity that clears fatigue
        │ the net of fatigue vs recovery, plus state, gives
        ▼
   READINESS (today's capacity to train hard)   …bounded over a window by…
   RECOVERABILITY / CAPACITY (the ceiling on absorbable load)
```

## Athlete State
- **Definition.** The complete, durable, private record of one **Athlete** — the only
  thing that must be persisted portably (everything else is derived).
- **Purpose.** The single source of truth the pure engine reads. Includes the two
  things that must travel with the athlete and not the device: committed-session
  freezes and **Learned Priors** (Constitution Articles 10, 18).
- **Attributes.** Profile; **Goal**; **Capability** vector; **Training History**;
  **Injuries**; readiness/wellness inputs (raw vitals — most sensitive); **Learned
  Priors**; commitments/freezes; **Overrides**.
- **Relationships.** Owned by `1` **Athlete** (Constitution Article 11); the input to
  every decision; updated by **Learning**.
- **Produced from / Feeds.** Accreted from onboarding, logs, wearables, and outcomes;
  feeds the whole engine.
- **Consumers.** All decisions; the runtime; learning.
- **Example.** The runner's full record: profile, six lifts, 90 days of logs, the
  hamstring-strain history, last night's HRV, the learned "recovers fast from lower
  body" prior.

## Constraint
- **Definition.** A hard bound on the solution — available days/duration, equipment,
  the fixed sport schedule, active **Injuries**, **Recoverability**, technical
  competency, and lawfulness.
- **Purpose.** The *box inside which construction happens* (Constitution Article 19).
  Computed first; content must satisfy it; never filtered in afterward.
- **Attributes.** Type; the bound; the source (athlete model or **Coach**); whether it
  *shapes* construction, is *re-checked* by a validator, or both.
- **Relationships.** Derived from **Athlete State** and (teams) the **Coach**; shapes
  the relevant decisions; re-checked by **Validation**.
- **Produced from / Feeds.** Computed up front; feeds movement requirements,
  selection, dosing, scheduling, and validation.
- **Consumers.** Every construction decision; validation.
- **Example.** "Two days/week, 45 min, dumbbells only, knee injury (no deep flexion),
  Tuesday/Saturday are running days."

## Injury
- **Definition.** A current or historical musculoskeletal issue, modelled as both a
  **Constraint** (contraindicated patterns) and a **Limiting-Factor** risk weighting,
  with a return-to-performance stage.
- **Purpose.** Injuries are a *primary* input that *shapes* training, not a late
  filter (Constitution Articles 8, 19). Protecting and rebuilding tissue is
  first-order (availability is the currency).
- **Attributes.** Taxonomy id; severity/stage; contraindicated **Movement Patterns**/
  loads; rehab and prevention **Interventions**; recurrence risk; `high_risk` →
  referral flag.
- **Relationships.** Held by `1` **Athlete**; contributes a **Constraint** to D10/D11
  and a risk weight to **Diagnosis**; sourced from the injury **Registry**
  (taxonomy/profiles).
- **Produced from / Feeds.** From triage/onboarding; feeds movement requirements,
  selection, diagnosis, and validation.
- **Consumers.** Diagnosis; movement requirements; selection; validation; the coach's
  availability view (status only — never the clinical notes).
- **Example.** "Patellar tendinopathy, stage 2 — no deep-knee-flexion loading;
  isometric protocol prescribed; high-risk on plyometrics."

## Load
- **Definition.** Accumulated training stress over time, from gym + sport. Reported as
  *absolute* load and *week-on-week change*; any ratio (e.g. ACWR) is a low-confidence,
  non-gating hint (Constitution Article 13).
- **Purpose.** Tracks how much the athlete is doing, to manage progression and detect
  spikes. The measured/estimated *input* to the fatigue model.
- **Attributes.** Absolute load (per modality and total); week-on-week change;
  optional ratios (reported only); the window.
- **Relationships.** Produced by completed **Sessions** and sport activity; deposits
  **Fatigue**; bounded by **Recoverability**; an input to the runtime.
- **Produced from / Feeds.** Computed by the load decision from logs and wearables;
  feeds fatigue, the runtime, and learning.
- **Consumers.** Runtime adaptation; deload logic; learning; the coach's loading
  overview (derived).
- **Example.** "This week 18% above the 4-week average — flagged, not gating."

## Fatigue
- **Definition.** *The accumulated cost of **Load** the athlete has not yet recovered
  from* — neural, metabolic, and mechanical. *First-class in this ontology, against
  the EDS, which used the word everywhere without defining it.*
- **Purpose.** The thing training *deposits* and recovery *clears*. Distinguishing it
  from Load (the input), Recovery (the clearing process), and Readiness (today's net
  capacity) removes a pervasive ambiguity. A session has a *fatigue cost*; a block has
  a *fatigue budget*; a deload exists to *clear fatigue*.
- **Attributes.** Magnitude by type (neural/CNS, metabolic, mechanical/tissue);
  decay/recovery time per type; cumulative vs. acute.
- **Relationships.** Deposited by **Load**/**Dose**; cleared by **Recovery**; the
  negative term in **Readiness**; the thing the recoverability ceiling and deloads
  manage; its budget bounds **Dose** and **Selection**.
- **Produced from / Feeds.** Modelled from delivered load and recovery; feeds
  readiness, deload decisions, and scheduling (spacing high-CNS work).
- **Consumers.** Readiness; runtime (deload force/defer); scheduling; dosing (fatigue
  budget).
- **Example.** "High residual neural fatigue after Monday's heavy squats → no heavy
  pull within 48 h."

## Recovery
- **Definition.** The process and capacity by which the athlete clears **Fatigue** and
  re-adapts — modelled, not prescribed today.
- **Purpose.** The replenishing counterpart to fatigue. Its *rate* is one of the most
  valuable things to learn per athlete (Constitution Article 16); a fast recoverer can
  be progressed more assertively.
- **Attributes.** Recovery rate (population prior → learned per athlete); the inputs
  it integrates (sleep, wellness, time, nutrition where known); per-tissue/per-system
  recovery times.
- **Relationships.** Clears **Fatigue**; a key **Learned Prior**; an input to
  **Readiness** and **Recoverability**; weighted per sport by the SKB readiness model.
- **Produced from / Feeds.** Modelled from observed readiness rebound after known
  loads; feeds readiness, recoverability, and progression.
- **Consumers.** Readiness; recoverability; runtime; learning.
- **Example.** "Learned: this athlete's lower-body recovery is ~20% faster than the
  population prior → squat frequency raised."

## Readiness
- **Definition.** A *derived, today-local* estimate of the athlete's capacity to train
  hard *now* — blending **subjective wellness (weighted ≥ objective)**, objective
  signals (HRV, sleep, RHR), and state flags (illness, travel, life stress).
- **Purpose.** Sizes today's session *before it is built* and is the canonical
  *derived* signal a coach may see (it contains no raw vitals — Constitution Article
  11).
- **Attributes.** Value (0–100), **Confidence**, band (green/amber/red), the present
  contributors and missing inputs; the state overrides applied.
- **Relationships.** Derived from **Recovery** state, **Fatigue**, and raw vitals (by
  roll-up); scales **Dose** (volume *and* intensity, symmetrically); the signal in the
  team surface. Never contains raw vitals.
- **Produced from / Feeds.** Computed by the readiness index from athlete state; feeds
  the runtime and the coach view.
- **Consumers.** Runtime adaptation; dose; the coach dashboard (derived only).
- **Example.** "Amber (62), confidence 0.7, low on sleep, HRV missing → today's
  session: −1 set, −5% load."

## Recoverability (Capacity)
- **Definition.** The athlete's modelled ability to absorb and adapt to *total* load
  (gym + sport + life) over a window — a **hard ceiling** (Constitution Article 9).
- **Purpose.** The boundary that makes minimum-effective dosing enforceable: the
  budget the whole plan must fit inside. *Distinct from Readiness:* readiness is
  today; recoverability is the window-level capacity.
- **Attributes.** The window budget (learned per athlete over time); current
  utilisation; **Confidence**.
- **Relationships.** Bounds **Dose**, **Priority Quality** count, and the whole week;
  a key **Learned Prior**; enforced by the recoverability validator (a gate).
- **Produced from / Feeds.** Modelled from age/training-age priors, sharpened by
  observed performance/readiness vs. delivered load; feeds prioritisation, dosing, and
  validation.
- **Consumers.** Priority selection; dose; validation; learning.
- **Example.** "At ~90% of the recoverable weekly budget once Tuesday/Saturday
  running is counted → only one developable quality this block."

## Training History / Outcome
- **Definition.** The record of what was *prescribed* versus what was *actually done*,
  and how the athlete responded (completion, loads, RPE, readiness rebound,
  performance change).
- **Purpose.** The substrate of **Learning** and the reality against which every **Plan**
  (hypothesis) is tested (Constitution Article 12).
- **Attributes.** Prescribed vs. actual per session; logged loads/RPE; adherence
  patterns by day/context; readiness/recovery responses; **Performance Outcome**
  changes over time.
- **Relationships.** Produced by completed/skipped **Sessions**; the input to
  **Learning**; part of **Athlete State**.
- **Produced from / Feeds.** Accreted by the session runner; feeds learning and
  realistic re-planning.
- **Consumers.** Learning; diagnosis (recent performance); the runtime (catch-up).
- **Example.** "Prescribed 3×4 squat; did 3×4 @ RPE 7 (easier than target) → tolerance
  prior nudged up."

---

# 9. Family VII — Epistemics & the Engine

How the platform represents what it knows, how sure it is, what it decides, and how
it learns. These entities make the Constitution's honesty (Title IV) and architecture
(Title V) concrete. (Their *structure* is the subject of the
[Knowledge Architecture](KNOWLEDGE-ARCHITECTURE.md); here we define them as entities.)

## Decision
- **Definition.** The atomic unit of the engine — an explicit, inspectable reasoning
  step that takes a coaching question, consults **Knowledge** and **Athlete State**,
  and emits an answer with its rationale and confidence (Constitution Article 4).
- **Purpose.** Makes coaching *explainable, testable, and substitutable*. The engine
  *is* a directed acyclic graph of Decisions (the reasoning spine, §2).
- **Attributes.** Id; purpose (the question, one sentence); typed inputs; reasoning
  (the rule/model); typed output carrying its rationale; **Confidence**; dependencies
  (parents); consumers (children); failure modes.
- **Relationships.** Reads **Knowledge** and **Athlete State** (incl. **Priors**);
  depends on upstream Decisions; produces a **Recommendation**/artefact; may be
  replaced by an **Override** or an AI behind its contract; gated by **Validation**.
- **Produced from / Feeds.** Authored as pure code; feeds its consumers and the
  explanation trace.
- **Consumers.** Downstream decisions; the explanation system; tests (golden-master).
- **Example.** `diagnose.limiting-factors` — inputs: athlete capability + demand
  profile + injuries; output: ranked **Limiting Factors** with rationale and
  confidence.

## Knowledge
- **Definition.** A body of evidence-tagged domain *data* the engine reasons *from* —
  sports, qualities, adaptations, exercises, recovery models, programming schemes,
  injuries, validators — separate from the **Decision** logic that uses it
  (Constitution Article 17).
- **Purpose.** Lets the platform grow by *adding data, not editing the core*. The
  detailed model is the [Knowledge Architecture](KNOWLEDGE-ARCHITECTURE.md).
- **Attributes.** A **Knowledge Entry** carries: id; value (the fact — number, curve,
  rule, profile); `appliesTo`; **Evidence** level; **Confidence**; source; last
  reviewed.
- **Relationships.** Read by **Decisions**; organised into modules and **Registries**;
  every entry carries **Evidence** and **Confidence**.
- **Produced from / Feeds.** Authored and reviewed by scientists/engineers; feeds all
  decisions.
- **Consumers.** Every decision.
- **Example.** `volume.landmarks` — per-muscle MEV/MAV/MRV; evidence L5; confidence
  low; source cited; reviewed 2026-06.

## Evidence
- **Definition.** The provenance and scientific strength behind a piece of
  **Knowledge** — a level from L1 (meta-analysis/major RCT) to L5 (expert opinion),
  with a real, never-fabricated citation.
- **Purpose.** Makes the science *auditable* and *evolvable*, and is the raw material
  from which **Confidence** (and therefore authority) is derived (Constitution
  Articles 12, 13).
- **Attributes.** Evidence level (L1–L5); source citation(s); last reviewed date.
- **Relationships.** Attached to every **Knowledge Entry**; one input to that entry's
  **Confidence**; reviewed and versioned over time.
- **Produced from / Feeds.** Authored with the knowledge; feeds confidence and the
  evidence audit trail.
- **Consumers.** The confidence model; reviewers; the athlete-facing "how we know
  this."
- **Example.** "Taper holds intensity — Bosquet 2007, Travis & Mujika 2020 — L1."

## Confidence
- **Definition.** How much the platform trusts a fact or a **Decision** — a
  decision-facing summary (high/moderate/low, or a 0–1 score) derived from **Evidence**
  level, operational validation, and (for athlete-specific facts) data sufficiency.
- **Purpose.** *Governs authority* (Constitution Article 13): whether something may
  *gate*, *inform*, or only be *displayed*. The mechanism that stops contested science
  from deciding and keeps the engine honestly calibrated.
- **Attributes.** Level/score; the authority tier it grants (gate | soft input |
  reported metric); how it composes up the decision graph.
- **Relationships.** Derived from **Evidence** + validation + data sufficiency;
  attached to every **Knowledge Entry**, **Capability**, **Limiting Factor**,
  **Prior**, and **Decision** output; composes from inputs to outputs.
- **Produced from / Feeds.** Computed alongside every fact and decision; feeds the
  authority tiering, margin widths, and the surfaced "how sure we are."
- **Consumers.** Every decision; validation; the athlete-facing explanation.
- **Example.** "Reactive-strength diagnosis: low confidence (inferred capability) →
  narrower priorities, wider margins, and we say so."

## Prior
- **Definition.** A belief the engine holds *before* seeing this athlete's data,
  updated *toward* athlete-specific evidence by **Learning** — at three tiers:
  population, sport, and athlete-specific.
- **Purpose.** The channel through which the engine becomes personal *without*
  breaking the pure core (Constitution Articles 16, 18): learning updates Priors; the
  next pure planning pass reads them.
- **Attributes.** Quantity (e.g. recovery rate, volume tolerance, dose-response,
  readiness baseline); tier; value; **Confidence** (itself learned); learning rate.
- **Relationships.** Read by **Decisions** as typed inputs (population defaults from
  day one); updated by **Learning**; part of **Athlete State** at the athlete tier.
- **Produced from / Feeds.** Seeded from **Knowledge**, updated from **Training
  Outcomes**; feeds diagnosis, dosing, periodisation, recovery.
- **Consumers.** D1/D4/D7/D12 (the prior-reading decisions).
- **Example.** "Athlete-tier recovery-rate prior: 1.2× population, confidence rising
  with each logged week."

## Recommendation
- **Definition.** The athlete- or coach-facing *output* of a **Decision** (or the
  whole plan) — the advice itself, bundled with its rationale and **Confidence**.
- **Purpose.** What the human receives and may accept or **Override** (Constitution
  Article 10). The engine *recommends*; it does not dictate.
- **Attributes.** The advised content; plain-English rationale; confidence; the
  decision trace it came from; whether it was accepted, modified, or overridden.
- **Relationships.** Produced by a **Decision**; presented to an **Athlete**/**Coach**;
  may be replaced by an **Override**; its acceptance/rejection feeds **Learning**.
- **Produced from / Feeds.** Assembled from decision outputs; feeds the UI and the
  override/learning path.
- **Consumers.** The athlete/coach; learning.
- **Example.** "Recommended: drop Thursday to a primer (you're amber). Reason: …
  Confidence: moderate. [Accept] [Override]."

## Override
- **Definition.** A human's deliberate change to a **Recommendation** — the
  **Athlete** (self-coached) or the **Coach** (team) substituting their judgement at a
  decision boundary. *Added by this ontology to make Constitution Article 10
  structural.*
- **Purpose.** Encodes "the human is the final authority." Overrides are first-class
  so they can be honoured, recorded, and *learned from* — not discarded.
- **Attributes.** The decision overridden; the original recommendation; the human's
  choice; reason (optional); timestamp; author (athlete/coach).
- **Relationships.** Applied to a **Decision** at its contract boundary (the same seam
  an AI uses); recorded in **Athlete State**; feeds **Learning** (a coach who always
  overrides a recommendation is a signal); bounded by **Validation** (an override
  still cannot ship an unsafe/unlawful plan — Constitution Article 19).
- **Produced from / Feeds.** Captured from the human; feeds the plan and learning.
- **Consumers.** The plan; learning; the audit trail.
- **Example.** "Coach swapped the prescribed Nordic for a slider variation
  (equipment) — recorded; future selection learns the team's kit."

## Validation
- **Definition.** The post-construction safety/law check — a suite of independent,
  deterministic validators that verify a constructed plan is recoverable, sport-safe,
  balanced, lawful, and scientifically consistent, and may *trim* or *veto* it
  (Constitution Article 19).
- **Purpose.** The platform's safety harness: construction proposes, validation
  disposes — and *any* construction path, including a future AI, must pass it. Also
  the source of the explanation/honesty record.
- **Attributes.** Per-validator verdict (pass | trim | veto), reason, **Confidence**,
  and authority (gate vs. soft); the conflict-resolution order; the validation report.
- **Relationships.** Runs over the constructed **Plan**/week; reads **Recoverability**,
  sport rules, the Engine Laws, the volume ledger, **Constraints**; emits the report
  consumed by explanation and the no-silent-debt rule.
- **Produced from / Feeds.** The validation decision (D14); feeds the athlete, the
  report, and learning.
- **Consumers.** The athlete (via the report); the runtime; an AI proposer (as its
  gate).
- **Example.** "MRV validator trimmed 2 posterior-chain sets to the ceiling and
  recorded it; sport-compatibility moved heavy squats off the pre-match day."

## Learning
- **Definition.** The asynchronous process that converts **Training Outcomes** into
  updated **Priors** at three tiers, so the next planning pass is better — and that
  validates the engine's own diagnoses as hypotheses (Constitution Articles 12, 16).
- **Purpose.** Turns a generic engine into *this athlete's* coach. Runs off the
  planning critical path and *never mutates a plan* (Constitution Article 18); it edits
  the **Priors** the next pure pass reads.
- **Attributes.** Per-quantity learning rate; the three tiers (population/sport/
  athlete); confidence updates; the diagnosis-validation (did developing the priority
  quality move the **Performance Outcome**?).
- **Relationships.** Consumes **Training Outcomes** and **Overrides**; produces
  **Priors**; feeds D1/D4/D7/D12 on the *next* loop; aggregates (privacy-preserving,
  derived-only) to sport/population tiers.
- **Produced from / Feeds.** The learning decision (D16); feeds priors.
- **Consumers.** The next planning loop; the platform's research instrument
  (population learning).
- **Example.** "Across the team, eccentric-hamstring priority preceded fewer strains —
  the sport-tier prevention prior is updated (derived data only, raw vitals never)."

---

# 10. Relationship summary & cardinalities

The load-bearing relationships, collected for quick reference. (Read `A —rel→ B
[card]` as "A relates to B, with this cardinality on B.")

| Relationship | Cardinality | Notes |
|---|---|---|
| Organisation —has→ Team | `1 : 1..*` | Outermost isolation scope |
| Organisation —has→ Coach | `1 : 1..*` | |
| Team —has→ Athlete (player) | `1 : 1..*` | A player *is* an Athlete + membership |
| Team —coached by→ Coach | `1 : 1..*` | |
| Athlete —belongs to→ Team | `1 : 0..1` | None in the Individual package |
| Athlete —has→ Goal | `1 : 1` | Multi-goal *combines* into one Demand Profile |
| Goal —implies→ Performance Outcome | `1 : 1` | The measurable referee of transfer |
| Performance Outcome —in context of→ Sport | `1 : 1` | |
| Sport —has→ Position | `1 : 0..*` | |
| (Sport + Position + Outcome) —resolve to→ Demand Profile | `→ 1` | Combined for multi-sport |
| Demand Profile × Athlete Capability —yield→ Limiting Factor | `→ 1..*` | The Diagnostic Triangle |
| Physical Quality —developed by→ Adaptation | `1 : 1..*` | Kept distinct (vs. brief) |
| Physical Quality —measured as→ Capability (per athlete) | `1 : 1` | Athlete side of triangle |
| Limiting Factor —selected as→ Priority Quality | `1..* : 1..3` | Focus beats breadth |
| Macrocycle —contains→ Mesocycle —contains→ Microcycle —contains→ Session | `1 : 1..*` each | Containment Hierarchy |
| Session —contains→ Intervention —configured by→ Programming Variable | `1 : 1..*` each | Dose bundles the variables |
| Exercise —classified by→ Movement Pattern | `1..* : 1` | Pattern is knowledge; Requirement is derived |
| Intervention —drives→ Adaptation | `1 : 1..*` | |
| Decision —reads→ Knowledge / Athlete State | `* : *` | Plus Priors |
| Decision —may be replaced by→ Override / AI | `1 : 0..1` | Same contract seam; Validation still gates |
| Knowledge Entry —carries→ Evidence + Confidence | `1 : 1` | Universal |
| Training Outcome —updates→ Prior (via Learning) | `* : *` | Three tiers |

---

# 11. What this ontology deliberately changed (vs. the brief and the EDS)

A record of the challenges made, so future readers inherit the *reasoning*:

1. **Split one hierarchy into three structures** (§1) — Reasoning Spine, Containment
   Hierarchy, Diagnostic Triangle. The brief's single chain conflated them.
2. **Reinstated Performance Outcome** as a first-class entity between Goal and Sport
   (the EDS had folded it into Sport). It is what makes the goal falsifiable and
   transfer measurable.
3. **Kept Physical Quality and Adaptation distinct** rather than collapsing them into
   the brief's "Priority Adaptations." A quality is trained *by* an adaptation; the
   separation makes selection and dosing independent.
4. **Corrected the planning-horizon direction:** Strategy → Block → Week → Session are
   decided *top-down in the middle of the spine*, not aggregated bottom-up at its tail
   (the brief's "…Session → Week → Block → Season" is wrong for periodisation).
5. **Made Fatigue first-class** and precisely separated Load / Fatigue / Recovery /
   Readiness / Recoverability — five terms the EDS used somewhat interchangeably.
6. **Added the organisational entities** (Organisation, Team, Coach, Position) the EDS
   left implicit, with their cardinalities and the data-isolation boundary.
7. **Added Override** as a first-class entity, making "the human is the final
   authority" (Constitution Article 10) structural rather than incidental.
8. **Distinguished Movement Pattern (knowledge) from Movement Requirement (derived)**
   and **Programming Variable (atomic) from Dose (bundle)**, which the brief listed
   flat.
9. **Named the unservable-Limiting-Factor case** so a diagnosed need the platform
   cannot yet treat is surfaced, never silently dropped (Constitution Article 15).

---

*— End of the Decision Ontology v1.0 —*
