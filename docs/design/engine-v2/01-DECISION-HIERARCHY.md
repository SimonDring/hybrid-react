# Decision Engine V2 — The Coaching Decision Hierarchy

**Status: PROPOSAL — working doc (T4) · 2026-07-14 · not canonical; adopted only via DEVELOPMENT-PLAN §5.3**
**Sprint spec: [`docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md`](../../superpowers/specs/2026-07-14-decision-engine-v2-design.md)**

---

## §0 How to read this document

This document names the **thirteen levels of coaching judgement** V2 is built
from — the altitudes at which an elite coach makes a different *kind* of
decision, from "who is this?" down to "what advances next week?" and back up
through "was I right?". It is the vocabulary bridge between
[`00-ARCHITECTURE.md`](00-ARCHITECTURE.md) §1 (the coaching loop as narrative)
and [`02-COACHING-PIPELINE.md`](02-COACHING-PIPELINE.md) (the loop as stage
contracts). Every later document in this set uses these thirteen level names
verbatim.

Three rules govern everything below:

1. **One owner per concept.** Each level links the
   [Decision Ontology](../../foundation/DECISION-ONTOLOGY.md) (v1.1) entity
   that owns its concept and adds only operational depth. This document
   defines no new entity, no new structure, and no new pipeline stage.
2. **Nothing exists because "that's how gyms normally work."** Every level
   carries a *what-breaks-without-it* justification. Where a level's shape
   has a conventional origin (the seven-day week is the honest case), that is
   said out loud and the level is justified — or restructured — on coaching
   grounds.
3. **"Maps to" is provisional.** Stage IDs cite the ratified D1–D17 catalogue
   (EDS §20, v1.1). `02-COACHING-PIPELINE.md` (Task 4) is the naming
   authority; every "Maps to" cell below is provisional until it lands, and
   the whole-set review (Task 15) re-verifies the mapping.

A caution inherited from the Ontology: the brief this hierarchy descends from
once presented these levels as a single top-to-bottom chain, and the Ontology's
first correction (Ontology §1) was to split that chain into orthogonal
structures — the Reasoning Spine, the Containment Hierarchy, the Diagnostic
Triangle, and (by the 2026-07 amendment) the Analysis Spine. This document
therefore ends where it must: §14 reconciles all thirteen levels against those
four structures, one home each, so the hierarchy can never be misread as the
conflated chain the Ontology already dismantled.

### The thirteen levels at a glance

| # | Level | The question at this altitude | Maps to (provisional — Task 4 fixes) |
|---|---|---|---|
| 1 | Athlete | Who am I coaching? | D1 |
| 2 | Goals | What are they training for? | input boundary of D2 (deliberately no engine decision) |
| 3 | Performance Outcomes | What, measurably, would success be? | inside D2; referee for D16 |
| 4 | Adaptation Targets | Which physiological changes close the gaps that matter? | D4 → D5 (the pivot) |
| 5 | Interventions | By what means, and can those means coexist? | D6 (class commitment; concrete selection is level 9) |
| 6 | Training Block Objectives | What does this month develop dominantly? | D7 |
| 7 | Weekly Objectives | How does this week's load fit around the sport? | D8 |
| 8 | Session Objectives | What is today for? | D9 |
| 9 | Exercise Selection | What is the minimum effective set that serves today? | D10 → D11 |
| 10 | Programming Variables | At what dose does this drive the adaptation? | D12 (placed by D13; disposed by D14) |
| 11 | Progression | What must be true next week that is not true now? | cross-stage: D7 · D12 · D15 (designed in `07-PROGRESSION.md`) |
| 12 | Review | What actually happened, and what does it mean? | D17 (async band) |
| 13 | Iteration | What do we now believe that we did not before? | D16 → next pass (D1, D4) |

The hierarchy is a **loop, not a ladder**: level 13 feeds level 1. The two
products of `00-ARCHITECTURE.md` §1.11 — the program and the understanding of
the athlete — are respectively what levels 1–10 emit and what levels 12–13
accumulate.

One compression to declare up front, because it is where a generator and a
coach look most alike on paper: between level 3 (Performance Outcomes) and
level 4 (Adaptation Targets) runs the entire **Diagnostic Triangle** (Ontology
§1.3) — demand resolution, capability comparison, limiting-factor diagnosis,
priority selection. The hierarchy names the endpoints of that edge; V2 never
jumps it. "A workout generator has no triangle — it jumps from goal to
exercises" (Ontology §1.3). Level 4's section carries the full expansion.

---

## §1 Level 1 — Athlete

**Definition.** The working model of the human being coached — the owning
entity is **[Athlete](../../foundation/DECISION-ONTOLOGY.md)** (Ontology §3):
capability per Physical Quality with confidence, training age and per-movement
competency, injury history and status, developmental stage, constraints, and
learned priors. At this level the engine decides what it *believes* about the
athlete, and — critically — how sure it is: what has been measured versus
merely assumed (Constitution Art 5's low-confidence-hypothesis duty).

**The decision made here.** *"Who is this — what can they demonstrably do,
what has been measured versus assumed about them, and where are they in their
athletic life?"*

**Why this level exists.** Every later judgement inherits this one
(`00-ARCHITECTURE.md` §1.1): prescribe to an imagined athlete and the plan is
built for someone who does not exist. Two failure classes make the level
load-bearing rather than ornamental. First, the epistemics: at the audit pin,
one of ten qualities was ever measured, so the diagnosis the whole
architecture pivots on ran on training-age stereotypes (SR-02; audit 07 ·
audit 03 §1) — which is why this level owns the measured/assumed distinction,
not just a profile form. Second, the duty of care: an athlete model without a
developmental stage reasons about a fifteen-year-old from the physiology of a
twenty-five-year-old — the exact harm Constitution Art 21 exists to forbid.
Developmental stage is a first-class input *here*, shaping everything
downstream, never a filter applied afterward (Art 21).

**Feeds / fed by.** Fed by onboarding, by Test Results and observations as
they accumulate (Family VIII, Ontology §10), and — closing the loop — by
level 13's updated priors and retaken capability estimates. Feeds level 2
(the same goal means different things for a novice and a veteran — Ontology
§2) and, through it, every level below.

**Maps to (provisional).** **D1 Athlete Assessment** (EDS §20). The measured
estimators that deepen D1 are `03-PERFORMANCE-MODEL.md` §5's subject
(commitment C8, `00-ARCHITECTURE.md` §2.3).

---

## §2 Level 2 — Goals

**Definition.** What the athlete is training *for*, in their own words and
intent — the owning entity is **[Goal](../../foundation/DECISION-ONTOLOGY.md)**
(Ontology §4): a sport they train or a goal-as-sport, discovered at
onboarding, never imposed (Constitution Art 3).

**The decision made here.** *"Have I heard what this athlete actually wants —
and can I resolve it into something coachable without substituting my own
preferences for theirs?"* The judgement at this level is deliberately small,
and its smallness is the point: the engine records, clarifies, and resolves;
it does not choose.

**Why this level exists.** Without a named Goals level, the goal becomes
implicit — and an implicit goal is whichever goal the system's defaults
prefer. The failure modes are concrete: equipment scarcity silently rewriting
"get faster" into "get bigger" (the silent-demotion class — audit 01 §7,
carried as C2/C6 context in `06-CONSTRAINT-ENGINE.md`'s remit); a sport
athlete optimised for bodybuilding because volume templates are the path of
least resistance (the spec's own success criterion forbids exactly this,
spec §7). The level exists to make Art 3 structural: everything below serves
this object, and any narrowing of *means* downstream may never substitute the
*end* recorded here.

**Feeds / fed by.** Fed by level 1 (understanding precedes intent — the
Athlete → Goal edge, Ontology §2). Feeds level 3: a goal is an intention and
must resolve to something measurable before it can steer anything.

**Maps to (provisional).** The athlete-supplied input at the head of **D2
Demand Resolution** (EDS §20). No D-number *decides* a goal — that absence is
constitutional (Art 3), not a gap. The engine's first decision *about* the
goal is its resolution, which is level 3's and level 4's territory.

---

## §3 Level 3 — Performance Outcomes

**Definition.** The measurable competitive result the goal implies — the
owning entity is **[Performance Outcome](../../foundation/DECISION-ONTOLOGY.md)**
(Ontology §4): a time, a placing, a selection, a KPI on the sport's
scoreboard, with a deadline where one exists. The Ontology reinstated this
entity deliberately (Ontology §12, change 2); this hierarchy keeps it a
first-class level for the same reason.

**The decision made here.** *"What, measurably, will tell us this worked —
and by when?"*

**Why this level exists.** It is what makes the goal falsifiable. Without it,
the plan is a hypothesis with no referee (Constitution Art 12): level 12
(Review) would have nothing to score transfer against, level 13 (Iteration)
nothing to re-diagnose from, and the platform could never distinguish
coaching that worked from coaching that merely happened. The audit's severed
learning loop — falsifiable block verdicts computed, then discarded unread
(audit 03 §3.4) — is what a pipeline looks like when this level exists on
paper but nothing downstream consumes it; V2 wires it through to the transfer
check (Match Performance is the ratified ground truth that check reads —
Ontology §10).

**Feeds / fed by.** Fed by level 2. Feeds demand resolution immediately (an
outcome sharpens which qualities matter — Ontology §4) and the Review/
Iteration levels ultimately (the transfer validation in Learning, Ontology
§9).

**Maps to (provisional).** Resolved within **D2 Demand Resolution** and
consumed by **D16 Learning**'s transfer validation (EDS §20). No dedicated
stage; the entity, not a stage, is what carries it.

---

## §4 Level 4 — Adaptation Targets

**Definition.** The specific physiological changes chosen to close the gaps
that matter most — the owning entity is
**[Adaptation](../../foundation/DECISION-ONTOLOGY.md)** (Ontology §5), with an
Adaptation Target being an Adaptation chosen as the aim of a block. The
Ontology keeps Adaptation deliberately distinct from Physical Quality
(Ontology §12, change 3): a quality is the trainable attribute; an adaptation
is the change that develops it. This level's output is targets in *adaptation*
terms, which is what makes dosing (level 10) substitutable from selection
(level 9).

**The compressed pivot, expanded.** Between level 3 and this level runs the
whole of diagnosis — the hierarchy names the endpoints; the engine walks
every step of the edge (Ontology §1.1, §1.3):

```
Performance Outcome → Sport/Position → Demand Profile          (understanding)
              ══════ THE PIVOT (Diagnostic Triangle) ══════
Demand Profile × Capability → Limiting Factors → Priority Qualities
                                                → Adaptation Targets   (response)
```

The hierarchy compresses this edge because its levels are *altitudes of
judgement*, not a stage list — but the compression is exactly where a
generator hides. A generator jumps from goal to exercises; a coach crosses
this edge one diagnosis at a time (Ontology §1.3). V2's position: the edge is
never jumped, the unservable Limiting Factor is surfaced rather than dropped
(Ontology §5; Constitution Art 15), and an early diagnosis made from inferred
capabilities is stated as the low-confidence hypothesis it is (Art 5).

**The decision made here.** *"Of everything that could be better, which few
physiological changes — one, two, at most three — would close the gaps that
are holding this athlete back most, and which diagnosed gaps are we
consciously parking?"*

**Why this level exists.** It is the pivot from understanding to response —
where coaching actually happens (Constitution Art 5). Without it, two
failures follow immediately. Training targets exercises or muscles instead of
changes: the engine "knows *that* it down-weights chest for a runner but not
*why*" (Art 5's violated-case, verbatim). And dose loses its rationale:
adaptation is chosen before dose (Art 6), so with no adaptation target every
prescribed unit of fatigue is unjustified — a direct Art 9 breach. The
refusal built into the decision sentence ("at most three… consciously
parked") is Art 7's economy applied at diagnosis altitude: chasing everything
trains nothing (`00-ARCHITECTURE.md` §1.4).

**Feeds / fed by.** Fed by level 3 via the Diagnostic Triangle (with level
1's capabilities as the athlete side and the constraints rail bounding
trainability-now). Feeds level 5 (the means are chosen for these targets) and
level 6 (each block's objective traces to a priority — Ontology §7).

**Maps to (provisional).** **D4 Limiting-Factor Diagnosis → D5
Priority-Quality Selection** (EDS §20), with D2/D3 resolving the demand side
of the triangle. Adaptation targets emerge from D5's output in the ratified
spine (Ontology §1.1).

---

## §5 Level 5 — Interventions

**Definition.** The chosen *means* — the owning entity is
**[Intervention](../../foundation/DECISION-ONTOLOGY.md)** (Ontology §6):
anything the engine prescribes to drive an Adaptation. At this level the word
is used at its strategic altitude: the commitment of intervention *classes*
to each Adaptation Target — heavy-slow resistance for tendon stiffness,
eccentric protocols for hamstring robustness, reactive/plyometric work for
elasticity — together with the concurrency and sequencing judgement that
makes those classes coexist in one athlete's recovery budget. That judgement
is the **Strategy** (Ontology §7).

**Two altitudes, declared.** The brief's hierarchy places Interventions above
the horizon objectives; the Ontology's Reasoning Spine places Intervention
Selection below Session Objective (Ontology §1.1). Both are right, because
"intervention" is decided twice, at two altitudes: the **class commitment**
here (you cannot sequence blocks without knowing which modalities must
coexist and how they interfere), and the **concrete selection** at level 9
(you cannot pick the exercise before the session's purpose and requirements
exist). This document keeps the altitudes distinct rather than restructuring
the level away; §14 reconciles the two against the spine, and
`02-COACHING-PIPELINE.md` fixes the stage boundaries.

**The decision made here.** *"By what means do we drive each chosen
adaptation — and can those means live together in this athlete's week, in
what sequence, without cancelling each other out?"*

**Why this level exists.** Without a means level between targets and
calendar, periodisation sequences abstractions with no interference model:
concurrent-training conflicts surface only at session-build time, when the
week is already laid out — too late to separate interfering work or trade it
deliberately. The Ontology states the stake plainly: without the Strategy, "a
multi-quality plan self-sabotages" (Ontology §7). The audit's macro-strategy
finding — no strategy object, season-phased templates in its place (audit 03
§1, D6/D7/D8 row) — is what the gap looks like in practice: block sequences
that are calendar templates rather than managed concurrency.

**Feeds / fed by.** Fed by level 4 (targets) under the constraints rail
(equipment and competency bound which classes are available at all). Feeds
level 6: the Strategy governs the block sequence (Ontology §7), and each
block's dominant adaptation presumes the class committed to it here.

**Maps to (provisional).** **D6 Training Strategy** (EDS §20) for the class
commitment and concurrency model; concrete per-session selection is level 9's
**D11**. Whether the class-commitment judgement needs any contract surface
beyond D6's is `02-COACHING-PIPELINE.md`'s call — under EDS §20.1 discipline
if anything genuinely new surfaces (see `00-ARCHITECTURE.md` §4.1, AE-2).

---

## §6 Level 6 — Training Block Objectives

**Definition.** The one dominant adaptation a multi-week block develops while
everything else is held — the owning entity is
**[Mesocycle (Block)](../../foundation/DECISION-ONTOLOGY.md)** (Ontology §7),
whose Block Objective is its *purpose attribute*, not a separate entity
(Ontology §7's closing note). The objective traces to exactly one Priority
Quality (Ontology §7).

**The decision made here.** *"What is this month for — which single
adaptation does it develop dominantly, what does it merely maintain, and how
does its ending hand over to the next block?"*

**Why this level exists.** Because adaptation has biological timescales, not
because programs traditionally come in blocks. Tissue remodels, qualities
consolidate, and dose-response accrues over *weeks* of consistent stimulus —
and adaptations compete for the same recovery, so a horizon that concentrates
weeks on one dominant change while holding the rest is physiology expressed
as structure. Run the convention test honestly: if adaptation were
instantaneous, this level would vanish — nothing about it survives on gym
tradition alone. What breaks without it is `00-ARCHITECTURE.md` §1.4's cost
in calendar form: everything chased at once, stimulus diluted below the
threshold where adaptation accrues, and no handover moment at which a block's
bet can be scored (which level 12 needs — a Review with no block boundary has
no natural unit to review).

**Feeds / fed by.** Fed by level 5 (the Strategy governs the sequence) and by
the season calendar (Competition anchors the arc — build far from
competition, sharpen approaching it; Ontology §4, `00-ARCHITECTURE.md` §1.5).
Feeds level 7: each week inherits the block's objective and its
volume/intensity trajectory.

**Maps to (provisional).** **D7 Periodisation / Block Objective** (EDS §20).

---

## §7 Level 7 — Weekly Objectives

**Definition.** The loading pattern of a training week laid out around the
athlete's fixed sport schedule — the owning entity is
**[Microcycle (Week)](../../foundation/DECISION-ONTOLOGY.md)** (Ontology §7),
whose Weekly Objective is its purpose attribute (Ontology §7's closing note):
per-day intent (heavy / power / recovery / prevention), sport-aware spacing,
fixture congestion handling.

**The decision made here.** *"Given this week's fixtures, pitch sessions, and
life, on which days does which kind of work land — so the gym and the sport
complement each other instead of colliding?"*

**Why this level exists — and the honest convention check.** The seven-day
period *is* a calendar convention, and this document says so: nothing in
physiology privileges seven days. The level survives the test because its
essence is not the week — it is the **recurring collision between training
and the athlete's fixed schedule**. Fixtures, work, and school recur on the
athlete's calendar, and that calendar happens to be weekly for almost every
athlete the platform serves; the microcycle inherits its period *from the
sport schedule as data*, not from convention as a constant. A congested
fixture fortnight or a four-day turnaround is a legitimate microcycle; V2
treats the period as a constraint-layer input (`06-CONSTRAINT-ENGINE.md`'s
Sport Calendar kind), not a hard-coded seven. What must never be the
justification is the template week — "Monday is chest day" is precisely the
horizon-without-inherited-objective defect the Ontology names as forbidden
(Ontology §7; Constitution Art 7). What breaks without the level is Art 2 in
miniature: heavy CNS work stacked against sprint days, gym sessions adjacent
to matches, the sport sabotaged by its own support work — the collisions the
audit found this engine's scheduling layer most coach-like at preventing
(audit 03 §2), which is exactly why the level that *sets the week's intent*
must exist upstream of the scheduler that spaces it.

**Feeds / fed by.** Fed by level 6 (the block's objective and trajectory) and
by the sport schedule as a Constraint — in the Team package, authored by the
Coach (Ontology §3). Feeds level 8: you know it is an in-season maintenance
week *before* you choose any session's purpose (Ontology §2).

**Maps to (provisional).** **D8 Weekly Objective (microcycle)** (EDS §20).

---

## §8 Level 8 — Session Objectives

**Definition.** One named purpose per training session — the owning entity is
**[Session](../../foundation/DECISION-ONTOLOGY.md)** (Ontology §7), whose
Session Objective is its purpose attribute (Ontology §7's closing note):
target quality, intensity zone, fatigue budget, honest duration.

**The decision made here.** *"What is today for — one purpose I could say in
a sentence to the athlete — and what fatigue budget does that purpose earn?"*

**Why this level exists.** The session is the unit the athlete actually
experiences, and it needs a stated purpose for three structural reasons.
Traceability: every prescribed item must trace to the session's objective
(Constitution Art 7) — with no objective there is nothing to trace to, and
the anti-filler rule cannot even be expressed. Explanation: "why this
session" is the first of the six questions the explanation layer must answer
(Art 14; `08-EXPLAINABILITY.md`), and it is answerable only if the purpose
was decided rather than implied. Sufficiency: smallest-sufficient (Art 7 both
words) is measured *against the objective* — without one, "sufficient" has no
referent and the session becomes a container to fill. The convention check:
the session itself is not gym convention but a human and physiological unit —
one bout of work bounded by within-bout fatigue and by the athlete's actual
availability window; it would exist if gyms did not.

**Feeds / fed by.** Fed by level 7 (the week's per-day intent) inside the
resolved constraint envelope (time, equipment, injuries, readiness — the box
is drawn before construction; Constitution Art 19, `06-CONSTRAINT-ENGINE.md`).
Feeds level 9: the objective specifies movement and loading characteristics
*before* any exercise is named (Ontology §2).

**Maps to (provisional).** **D9 Session Objective** (EDS §20).

---

## §9 Level 9 — Exercise Selection

**Definition.** The concrete choice of exercises for a session — owning
entities are **[Movement Requirement](../../foundation/DECISION-ONTOLOGY.md)**
and **[Exercise](../../foundation/DECISION-ONTOLOGY.md)** (Ontology §6), in
that order: a derived specification of the movement and loading
characteristics the session needs, stated before any exercise is named, then
the minimum effective set of exercises that satisfies it. The Ontology's
distinction between Movement Pattern (knowledge an exercise is classified by)
and Movement Requirement (a derived spec a session needs) is load-bearing
here (Ontology §12, change 8).

**The decision made here.** *"What movement and loading characteristics does
today's objective require — and what is the smallest set of exercises this
athlete can actually and safely do that genuinely satisfies them?"*

**Why this level exists.** This is the level where gym convention most wants
to govern and must not: "that's what a leg day looks like" is a selection
rule, just an unexaminable one. The requirements-first split breaks it.
Without the requirement step, selection is habit — unexplainable (nothing
connects the exercise to the diagnosis), unsubstitutable (no stated spec for
a replacement to satisfy — which also breaks equipment fallback and injury
subtraction), and unauditable (a wrong exercise cannot even be *wrong*
against anything). With it, exercises become interchangeable satisfiers of a
stated need (Constitution Art 5), contraindicated patterns are subtracted up
front rather than filtered late (Art 8; the constraint envelope from
`06-CONSTRAINT-ENGINE.md`), and the stopping rule has meaning: select by
value until the requirement is served, then stop and bank the rest (Art 7 —
the behaviour the audit rated the shipped engine's selection at its most
coach-like when present, audit 03 §2).

**Feeds / fed by.** Fed by level 8 (the objective) and the constraint
envelope. Feeds level 10: a chosen intervention is nothing until dosed
(Ontology §2).

**Maps to (provisional).** **D10 Movement / Quality Requirements → D11
Intervention Selection** (EDS §20). `05-SESSION-BUILDER.md` develops the
construction flow.

---

## §10 Level 10 — Programming Variables

**Definition.** The configurable parameters of how each chosen exercise is
performed — the owning entity is
**[Programming Variable](../../foundation/DECISION-ONTOLOGY.md)** (Ontology
§6): sets, intensity (load / %1RM / RPE / velocity), reps, tempo, rest,
density, frequency. A **Dose** (Ontology §6) is the coherent bundle of them,
computed as the minimum effective amount for the target adaptation under the
recoverability ceiling — the atomic-knob / bundle distinction is the
Ontology's, kept deliberately (Ontology §12, change 8).

**The decision made here.** *"At what sets, load, reps, tempo, and rest does
this exercise actually drive the target adaptation for this athlete today —
and what is the smallest amount that genuinely does?"*

**Why this level exists.** Dose is where adaptation targeting becomes
physical reality: the same exercise at different variables trains different
qualities entirely (a squat at 3×3 heavy and at 3×20 light are different
interventions in everything but name). Without an explicit variables level,
dose collapses into fixed scheme labels — the "3×12 for everyone" class the
audit found in isolation/core dosing (SR-14; audit 07) — and three
constitutional duties become unenforceable: adaptation-before-dose (Art 6)
needs a dose that was *computed from* an adaptation target; minimum-effective
(Art 7) needs magnitudes to minimise; and the volume ledger (Art 6) needs
prescribed variables to aggregate — volume is read off the dosed plan and
checked as a ceiling, never set as a target and filled. Readiness scales the
variables symmetrically (volume *and* intensity — Ontology §8).

**Feeds / fed by.** Fed by level 9's selections, the adaptation target's dose-
response knowledge, the session's fatigue budget, and today's readiness.
Feeds the rendered session (via scheduling and validation — construction
proposes, validation disposes, Art 19) and level 11: these variables are what
progression advances.

**Maps to (provisional).** **D12 Dose Assignment** (EDS §20), with **D13
Scheduling** placing the dosed work and **D14 Validation** disposing of it.
The hierarchy carries no separate scheduling/validation levels: placement and
the signature are how decisions *reach* the athlete safely, not further
altitudes of coaching judgement — they inspect and arrange what levels 8–10
decided (Art 19's separation of writing from signing).

---

## §11 Level 11 — Progression

**Definition.** The temporal dimension of every level above: the decision
discipline that advances objectives, selections, and doses over time,
anchored to the athlete's demonstrated rate of progress. The Ontology
deliberately names no "Progression" entity — and this level proposes none:
progression is a *property of decisions at existing levels* (a dose that
advances, a block objective that hands over, a capability estimate that
creeps), owned in principle by Constitution Art 7 ("sufficient, progressed,
never padded" — progression is first-class) and expressed through the
existing entities: Dose, Capability, Prior, Block Objective. Progression
*knowledge* (schemes, ramps, advancement rules) lives in the knowledge layer
(Constitution Art 17; homed in `04-KNOWLEDGE-OWNERSHIP-MAP.md`).

**The decision made here.** *"What must be true next week — and next block —
that is not true now? And what still advances if this athlete never logs a
single set?"*

**Why this level exists.** A plan whose week six equals week five is a failed
hypothesis (Constitution Art 12): the plan's entire purpose is that the
athlete changes, so a hierarchy without a progression level plans for an
athlete who stays the same. The audit's most critical scientific finding is
this level absent in practice: within-phase loads bit-identical for
non-logging athletes — progressive overload, the most basic promise of
coaching, available only to logging athletes on five lifts (SR-01; audit 07 ·
G9; audit 08 · audit 03 §3). The second sentence of the decision is the
level's hard case and its reason for being explicit: the non-logging athlete
must still progress, on estimator-driven advancement with honest confidence
labelling — which only works if progression is designed as an architecture
with driver signals and fallbacks, not left as an emergent side-effect of
logging. And progression is bidirectional: deload, hold, and rebuild are
progression decisions too (Art 9's ceiling applied over time).

**Feeds / fed by.** Fed by level 10 (the variables being advanced), level 1's
demonstrated capability (progression is anchored to demonstrated progress —
Art 7), and level 12's evidence (trend insights as driver signals). Feeds the
next cycle of levels 6–10: next week's objectives and doses differ from this
week's *because of* this level.

**Maps to (provisional).** No single stage — deliberately. Progression is
expressed *inside* **D7** (block-over-block handover), **D12** (dose
advancement), and **D15** (runtime adjustment over pending work), informed by
**D17** trend insights and **D16** priors (EDS §20). `07-PROGRESSION.md`
designs the full eight-level architecture (adaptation → exercise → weekly →
mesocycle → block → season → annual → LTAD, the last bounded by Constitution
Art 21). If that design surfaces a genuinely new pass, it enters through EDS
§20.1's admission criteria (`00-ARCHITECTURE.md` §4.1, AE-2) — never an
ad-hoc stage here.

---

## §12 Level 12 — Review

**Definition.** The interpretation of what actually happened — before anyone
reacts to it. Owning entities are **Family VIII**'s (Ontology §10): the
evidence captured (**[Test Result](../../foundation/DECISION-ONTOLOGY.md)**,
**Match Performance**, **External Load Observation**, plus Training History,
Ontology §8) and the interpreted product built from it (**Insight** — a
derived, attributed interpretation carrying its derivation, confidence, and
the authority tier that confidence grants). Review's structural home is the
**Analysis Spine** (Ontology §1.4): CAPTURE → MODEL → INSIGHT → DECISION —
the path evidence travels, ratified as the fourth structure precisely so this
level has one.

**The decision made here.** *"What actually happened — what was done versus
prescribed, how did loads and readiness move, what do the tests and the
matches say — and what does it* mean*, read against this athlete's own
baselines, before anyone acts on it?"*

**Why this level exists.** Without it, the platform never finds out whether
it was right — the audit's fourth elite-coach gap, verbatim (audit 03 §3):
block verdicts computed and discarded unread, no outcomes layer, the coaching
loop severed at its last arc. And the level's *meaning-before-action*
discipline is as load-bearing as its existence: a coach who does not watch
flies blind, but a coach who reacts to every observation turns wobble into
whiplash (`00-ARCHITECTURE.md` §1.9) — a single bad morning is noise; a
three-week drift is a message. Structurally, that discipline is the ratified
D15/D16/D17 boundary: interpretation is its own decision family, off the
planning path, and an insight never reshapes a plan by itself (EDS §20;
`00-ARCHITECTURE.md` §2.1 property 7). This is no gym convention — it is the
scientific method applied to coaching: the plan is a hypothesis (Art 12), and
Review is where the hypothesis meets its data.

**Feeds / fed by.** Fed by everything the delivered plan produces: completed
and skipped sessions (Training History / Outcome, Ontology §8), Test Results,
Match Performances, External Load Observations (Ontology §10). Feeds level 13
(insights as evidence for learning and re-diagnosis triggers), the runtime
pass (derived signals as typed inputs), and the humans (Reports — audience-
scoped, derived-only for coaches; Ontology §10; Constitution Art 11).

**Maps to (provisional).** **D17 Observation & Analysis** (EDS §20) — the
family, in the async band, insights forward-only. Its Analysis Spine
touchpoints, named per Ontology §1.4: CAPTURE (the Family VIII observations),
MODEL (the athlete's longitudinal record — DAAS §3 territory, *designate, in
review*), INSIGHT (D17's products), DECISION (entry into diagnosis, runtime,
and learning — and delivery as Reports). Review is *evidence moving toward a
decision*, distinct from the decisions themselves.

---

## §13 Level 13 — Iteration

**Definition.** The closing of the loop: outcomes update beliefs, and the
diagnosis is retaken. Owning entities are
**[Learning](../../foundation/DECISION-ONTOLOGY.md)** and
**[Prior](../../foundation/DECISION-ONTOLOGY.md)** (Ontology §9): the
asynchronous process that converts Training Outcomes into updated Priors at
three tiers (population → sport → athlete-specific), and the beliefs those
updates sharpen — the only channel through which the engine becomes personal
without breaking the pure core (Constitution Arts 16, 18).

**The decision made here.** *"Was my bet right — and what do I now believe
about this athlete that I did not believe before? And given what closing one
gap has changed, what is the limiter* now*?"*

**Why this level exists.** It is what separates a coach from a program: the
thousandth decision is better than the first, and better *about this athlete
specifically* (`00-ARCHITECTURE.md` §1.10). Without it, every cycle restarts
from the same assumptions — the athlete grows, the coaching does not, and the
platform's second product (the compounding understanding of the athlete)
simply never accrues. The audit's verdict on the gap is the bluntest in the
set: "You built the notebook and never opened it" (audit 03 §6). The level's
discipline matters as much as its existence: learning writes *only priors* —
it never mutates a plan, never edits a committed week; its updates reach the
athlete exclusively through the next pure planning pass (Art 18; the
D15/D16/D17 boundary, EDS §20). And iteration includes re-diagnosis: closing
one gap promotes another to limiter, so the hierarchy's level 4 is re-entered
with sharpened inputs, not resumed from stale ones.

**Feeds / fed by.** Fed by level 12 (insights as evidence, outcome records,
overrides — a human's overrides are signal, not noise; Ontology §9). Feeds
level 1 (sharpened capabilities and athlete-tier priors) and level 4 (the
retaken diagnosis) on the next pass — the loop, closed.

**Maps to (provisional).** **D16 Learning** (EDS §20), re-entering **D1** and
**D4** on the next planning loop. Distinct from D15 (runtime projection of
the current plan) and D17 (interpretation): D17 decides what the data means,
D15 what the athlete does about it this week, D16 what the engine believes
differently next time (the EDS's load-bearing boundary note, EDS §20).

---

## §14 One spine, one containment — the hierarchy reconciled

The thirteen levels are levels of *judgement*. The Ontology's four structures
(§1.1–§1.4) are where each judgement, and each artefact it produces, actually
lives. Per the Ontology's own rule — every entity belongs to exactly one
structure — here is the assignment, level by level:

| # | Level | Structure it belongs to | Reconciliation note |
|---|---|---|---|
| 1 | Athlete | Reasoning Spine (§1.1, head) | Also the athlete *side* of the Diagnostic Triangle: Capability inputs originate here |
| 2 | Goals | Reasoning Spine (§1.1) | The engine decides nothing; the level marks the spine's athlete-supplied root (Art 3) |
| 3 | Performance Outcomes | Reasoning Spine (§1.1) | The falsifiability anchor; also the referee Learning scores against |
| 4 | Adaptation Targets | Reasoning Spine (§1.1) | The pivot — the Diagnostic Triangle (§1.3) runs *inside* the level-3→4 edge; the triangle is relational, not a level of its own |
| 5 | Interventions | Reasoning Spine (§1.1) | The Strategy step at this altitude; concrete Intervention Selection recurs at level 9 — same spine, two positions, one entity family (Ontology §6) |
| 6 | Training Block Objectives | Reasoning Spine (§1.1) | Decided top-down mid-spine; the Mesocycle artefact it stamps lives in the Containment Hierarchy |
| 7 | Weekly Objectives | Reasoning Spine (§1.1) | As above, for the Microcycle |
| 8 | Session Objectives | Reasoning Spine (§1.1) | As above, for the Session |
| 9 | Exercise Selection | Reasoning Spine (§1.1) | Movement Requirements → Intervention Selection, in the spine's ratified order |
| 10 | Programming Variables | Reasoning Spine (§1.1) | The Dose step; the configured variables nest inside the Session artefact (containment), the *decision* sits on the spine |
| 11 | Progression | Reasoning Spine (§1.1) | Not a new spine step: the temporal discipline *of* existing steps (D7/D12/D15); proposes no entity and no stage |
| 12 | Review | **Analysis Spine (§1.4)** | Evidence moving toward a decision — CAPTURE → MODEL → INSIGHT → DECISION — via the D17 family; the ratified fourth structure is this level's structural home |
| 13 | Iteration | Reasoning Spine (§1.1, tail) | Learning is the spine's closing step; it *consumes* the Analysis Spine's products as evidence and writes only Priors |

Four consequences, stated explicitly:

**1 · No level is a containment entity.** The Containment Hierarchy (Ontology
§1.2) nests the *artefacts* the decisions produce — Macrocycle ⊃ Mesocycle ⊃
Microcycle ⊃ Session ⊃ Intervention ⊃ Programming Variables — and it is
bottom-up aggregation of structure, never the order of deciding. The brief's
original chain hung "Session → Week → Block → Season" on the reasoning
chain's tail, and the Ontology's first correction was to cut it loose
(Ontology §1, §12 change 4). This hierarchy honours the cut: levels 6–8
*decide horizons top-down in the middle of the reasoning* (you know it is an
in-season maintenance week before you choose the session's purpose — Ontology
§2), and the artefacts those decisions produce nest separately. The hierarchy
runs one direction; the artefacts nest in the other; nothing in this document
re-tangles them.

**2 · Objectives are purpose-attributes of horizons, not entities.** Per the
Ontology's explicit callout (Ontology §7): Block, Weekly, and Session
Objectives are the purpose attribute each horizon carries, inherited top-down
from the Priority Qualities and Adaptation Targets. Levels 6–8 are therefore
*decisions that stamp an inherited purpose onto an artefact* — they introduce
no new entities, and a horizon carrying a template label instead of an
inherited objective ("Upper · push") is the defect Constitution Art 7
forbids, which is precisely what those three levels exist to make impossible.

**3 · The Diagnostic Triangle is inside an edge, not on a level.** The
triangle (Ontology §1.3) is a relational structure — Capability and Demand
meeting across a shared Physical Quality axis — and it runs inside the
level-3→4 edge, fed by level 1's athlete side. Flattening it into a level
would repeat the brief's original conflation; naming it inside the edge keeps
the hierarchy honest about where the platform's identity lives: the triangle
sits between goal and exercises, which is exactly what a generator lacks.

**4 · Review and Iteration have a ratified structural home.** Before the
2026-07 amendment there were three structures, and evidence-side work had no
place to stand; the ratified Analysis Spine (Ontology §1.4) and Family VIII
(Ontology §10) now give Review its home outright — evidence travelling
CAPTURE → MODEL → INSIGHT → DECISION, with the D17 family doing the
interpreting (EDS §20) — and give Iteration its clean seam: D16 sits on the
Reasoning Spine as its closing step, *consuming* the Analysis Spine's
products (an insight describes the athlete's data; a prior parameterises
future decisions — the EDS's boundary, verbatim in spirit). The two levels
the old three-structure model would have forced into awkward corners are the
two the amended set was built to house.

**The finding, in one line:** all thirteen levels resolve into the ratified
structures with nothing left over — no new entity, no new structure, no new
stage, and no level whose justification rests on gym convention. This is the
hierarchy-level confirmation of `00-ARCHITECTURE.md` §3's verdict (13 AGREES ·
8 DEEPENS · 0 DIVERGES) and its empty Amendment Register: V2's decision
hierarchy is the amended v1.1 set's own shape, operationalised.

---

*Next in the reading order: [`02-COACHING-PIPELINE.md`](02-COACHING-PIPELINE.md)
— the stage-naming authority that turns these levels into per-stage contracts
and fixes every provisional "Maps to" above.*
