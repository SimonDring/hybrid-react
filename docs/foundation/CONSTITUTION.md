# The Engine Constitution

> **The immutable principles of the platform.**
> This document sits *above* the Engine Design Specification (EDS). Nothing in the
> platform — no engine module, no algorithm, no database schema, no AI model, no
> product feature, no coaching rule — may violate it. Where any other document
> conflicts with this one, this one wins.

---

| | |
|---|---|
| **Status** | v1.1 — foundational, governing · amended 2026-07-13 — 2026-07 amendment batch (AQ-1…AQ-9); proposals in docs/design/amendment-batch-2026-07/ |
| **Authority** | The highest document in the platform. Supersedes and unifies the EDS's Core Philosophy (§2), First Principles (P1–P15), and Engine Laws (L1–L15), which are now *derivations* of the Articles here (see the [mapping table](#appendix-a--mapping-the-eds-onto-the-articles)). |
| **Scope** | Platform-wide: engineering, coaching, product, data, and AI. Not engine-only. |
| **Technology-independence** | Every Article must remain valid regardless of future technology — language, framework, model, or device. It speaks of athletes, coaches, evidence, and decisions, never of React, Supabase, or a particular model. |
| **Audience** | Every contributor — engineer, sports scientist, coach, product designer, or AI system — present and future. |
| **Companions** | [`DECISION-ONTOLOGY.md`](DECISION-ONTOLOGY.md) (the vocabulary), [`KNOWLEDGE-ARCHITECTURE.md`](KNOWLEDGE-ARCHITECTURE.md) (how knowledge is structured), and the engine-level [`EDS`](../engine/00-ENGINE-DESIGN-SPECIFICATION.md) (how the engine reasons). |
| **Amendment** | Articles change rarely and only by the process in [§ Amendment & Stewardship](#amendment--stewardship). Definitions and the as-built reality belong elsewhere; this document holds only what must not change. |

---

## Preamble

We are building the world's leading sports-science coaching operating system: a
system that delivers evidence-based coaching to competitive amateur athletes and
teams who cannot afford full-time elite support.

The platform is **not a workout generator**. It is an elite performance coach
expressed in software. Its purpose is to make coaching decisions that maximise an
athlete's long-term performance. Training sessions are merely the most visible
output of those decisions.

An elite coach does not think in muscles, sets, or templates. A coach reasons:
*understand the athlete; understand the sport; understand the desired outcome;
diagnose the limiting factors; choose the highest-value adaptations; select the
interventions most likely to produce them; organise those into recoverable,
purposeful sessions; observe the response; learn; repeat.* This Constitution exists
to make that reasoning the permanent shape of the platform, so that — across a
decade, dozens of contributors, and technologies not yet invented — everyone who
builds here shares one mental model of how the platform thinks.

That reasoning consumes and produces a second thing of permanent value. An
elite performance department delivers two inseparable products: the
**programme**, and the **understanding of the athlete** that makes the
programme right — a longitudinal, evidence-graded model of who this athlete
is: tested capacities, training and injury history, competition output,
recovery patterns. The platform builds both. The understanding is not a rival
objective and never becomes one; it exists so that every coaching decision —
this week's, and one made five years from now — is made about the real
athlete, from evidence, and can say so. A platform that produced only the
programme would be a plan generator with a coach's vocabulary.

Every recommendation the platform makes answers a single question:

> **"What is the highest-value intervention for this athlete now — given their
> goal, their sport, their limiting factors, their recoverability, and the life
> they actually live — that maximises their long-term performance?"**

If a feature, a number, a module, or a decision cannot trace its existence back to
that question, it does not belong in the platform. The trace may be direct — an
intervention for this athlete now — or it may run through the understanding of
the athlete: capturing, keeping, and analysing the evidence without which the
question cannot be answered well, for this athlete or the next. Work that
serves the understanding serves the question; work that serves neither still
does not belong.

## How to read this document

The Articles are grouped into five Titles. Articles are numbered in order of
adoption, not position: an amendment that adds an Article gives it the next
unused number and places it within its Title, so no existing Article's number
ever changes (thus Title III runs 8–11, then 21–22). Each Article states one
principle, then explains it under a fixed template:

- **Principle** — the rule, in one sentence (the quotable invariant).
- **Why it exists** — the reasoning behind it.
- **In practice** — concrete examples of the Article holding or being broken.
- **Implications** — what necessarily follows.
- **Governs** — the architectural decisions this Article constrains.
- **Failure mode if violated** — what goes wrong, and how it shows up.

When two Articles pull in different directions, the [conflict order](#when-principles-conflict)
decides. A contributor unsure how to resolve a trade-off consults that order before
writing code; if the order does not settle it, the question is a genuine open
problem (EDS §44), not a matter for an ad-hoc branch.

---

# Title I — Purpose

*What the platform optimises for, and for whom.*

## Article 1 — Athlete performance is the primary objective

> **The platform optimises the athlete's long-term performance in the pursuit they
> have chosen. Everything else — volume, exercise selection, session count,
> adherence, engagement — is instrumental, never the objective.**

- **Why it exists.** A coaching system must know what it is *for*. Without a single
  primary objective, the platform drifts toward whatever is easiest to measure
  (sets completed, sessions logged, time-in-app) and optimises the proxy instead of
  the athlete. Proxies are how good intentions become workout generators.
- **In practice.** *Holds:* the engine banks unused training time rather than
  filling it, because more volume would not improve the athlete. *Violated:* a
  feature that maximises weekly session count "for engagement," or an allocator
  that overshoots its own volume target because more sets *feel* like more progress.
- **Implications.** Long-term development outranks short-term output. The platform
  may prescribe *less* this week to enable *more* across the season. Metrics are
  read *off* the optimisation; they are never the optimisation.
- **Governs.** The choice of the *coaching decision* (not the session, not the set,
  not the weekly volume number) as the engine's atomic unit; the "bank, don't pad"
  stopping rule; the prohibition on engagement-as-objective in product design.
- **Failure mode if violated.** The platform becomes a content mill: technically
  busy, athletically pointless. It produces work that looks like training and isn't
  coaching.

## Article 2 — The gym serves the sport; the sport is never subordinated to the gym

> **For an athlete who trains a sport, performance in that sport is the sole outcome
> that matters. Strength, size, power, and mobility are means. No gym prescription
> may knowingly reduce the athlete's capacity to perform or train their sport.**

- **Why it exists.** This is the platform's defining stance and the correction of
  its origin: the engine began as a hypertrophy planner, and the gravest, most
  recurrent error is to let the gym become the point. A stronger back squat that
  costs a sprinter the freshness to sprint is a *failure*.
- **In practice.** *Holds:* an in-season distance runner gets a minimal-fatigue
  durability session scheduled far from key runs. *Violated:* a swimmer is
  prescribed heavy front squats before pulling work; a distance runner is given
  chest flyes because the muscle-volume ledger had room.
- **Implications.** Sport demand is a first-class input to *every* training
  decision, never a late modifier. Gym work is sequenced and dosed *around* sport
  load. When gym and sport conflict, the sport wins.
- **Governs.** Sport as a structured demand model consumed before construction
  (not a cosmetic emphasis multiplier applied after); the conflict order placing
  Sport Protection above Objective Fidelity and Optimisation; the constraint that
  the fixed sport schedule shapes the training week.
- **Failure mode if violated.** Athletes get "good gym programmes" that erode their
  actual sport — the most expensive failure, because it harms the very thing the
  athlete came for, often invisibly.

## Article 3 — The goal belongs to the athlete

> **The platform discovers the athlete's goal; it never imposes one. The
> architecture is sport-agnostic by construction: every goal — including
> bodybuilding — is data describing a demand profile, not logic baked into the core.**

- **Why it exists.** A coach serves the athlete's ambition, not the coach's
  preferred sport. An architecture that privileges one goal (historically:
  hypertrophy) bends every other goal into a distorted shadow of it.
- **In practice.** *Holds:* "build muscle," "get stronger," "run a faster 10k,"
  and "make the first team" are all resolved the same way — as demand profiles the
  engine reasons against. *Violated:* hypertrophy logic is the chassis and sports
  are trim levels bolted onto it.
- **Implications.** Bodybuilding is a fully supported, first-class pathway — *the
  goal whose priority quality is hypertrophy* — sitting beside sprinting, distance
  running, and team sport as peers. The core knows nothing about any specific goal
  or sport; it consults knowledge modules.
- **Governs.** The knowledge-vs-logic separation (Article 17); goals and sports as
  registry entries; the prohibition on hard-coding any sport, goal, or "default"
  programming lens into the reasoning core.
- **Failure mode if violated.** Every non-favoured goal is served badly, and adding
  a new goal means editing the core — the platform calcifies around its first use
  case.

---

# Title II — The Coaching Method

*How the platform must reason. These Articles are the order of operations of
coaching, made permanent.*

## Article 4 — The platform makes coaching decisions; sessions are how decisions become visible

> **The atomic unit of the engine is the coaching decision — an explicit,
> inspectable reasoning step — not the session, the set, or the volume number. The
> engine is a graph of decisions; training content is rendered from them.**

- **Why it exists.** What separates a great coach from a mediocre one is not the
  set-and-rep scheme on paper; it is the *decisions behind it* — what to develop,
  what to leave alone, what to notice and respond to. A platform that models
  content cannot reason, explain, or improve at the level that matters.
- **In practice.** *Holds:* "develop reactive strength" exists as a decision with
  inputs, rationale, and confidence, and a session is derived from it. *Violated:*
  the only thing the engine can represent is "allocate N sets to muscle M," so the
  reasoning is implicit in a procedural fill and nowhere inspectable.
- **Implications.** Every decision carries its own rationale and confidence; the
  engine can explain any recommendation by walking the graph backward. Decisions
  have typed boundaries, so any one can be replaced — by a better algorithm, an AI,
  or a human coach — without disturbing its neighbours.
- **Governs.** The decision contract (purpose, inputs, reasoning, output,
  confidence, dependencies, consumers, failure modes, rationale); the substitution
  seam for the AI layer and coach overrides; the explanation system.
- **Failure mode if violated.** The platform cannot say *why*, cannot be tested at
  the level of judgement, and cannot accept an override at a decision boundary —
  because there are no decision boundaries, only function calls.

## Article 5 — Diagnosis precedes prescription; the platform reasons in qualities, not muscles

> **Understanding comes before response. The platform builds a model of the athlete
> and of the sport's demands, diagnoses the limiting factors, and only then
> prescribes. It organises training around physical qualities and adaptations;
> muscles are a downstream accounting ledger, not the organising goal.**

- **Why it exists.** Diagnosis is where coaching actually happens — the pivot from
  *what is true* to *what to do about it*. And a coach thinks in qualities (maximal
  strength, rate of force development, reactive strength, aerobic capacity,
  robustness) because those are what transfer to sport. Organising around muscles
  forces every sport question through a hypertrophy translation.
- **In practice.** *Holds:* the engine diagnoses "low eccentric-hamstring capacity
  is this runner's top limiter (injury + performance)" and prescribes against it.
  *Violated:* "priority" is a hard-coded emphasis multiplier with no diagnosis
  behind it, so the engine knows *that* it down-weights chest for a runner but not
  *why*.
- **Implications.** There must be explicit limiting-factor diagnosis and
  priority-quality selection as first-class decisions. The domain model centres on a
  quality/adaptation taxonomy; muscle volume is derived from it, as a guardrail.
  Because an athlete's current quality levels are often *inferred* rather than
  measured, an early diagnosis is an explicit **low-confidence hypothesis** (Articles
  12, 16), not an assessment — the platform says so, narrows its priorities, and
  widens its margins rather than presenting a guess as a finding.
- **Governs.** The reasoning hierarchy (athlete → demand → diagnosis → priority →
  adaptation → intervention); the quality taxonomy as the organising primitive; the
  retention of fractional-set muscle accounting as a *ledger*, not a driver.
- **Failure mode if violated.** The platform re-weights instead of reasoning. Two
  athletes who need categorically different training (high-velocity/elastic vs.
  maximal-load) receive the same session with different set counts.

## Article 6 — Adaptation is chosen before dose; volume is a guardrail, not a goal

> **The first question is always "what adaptation creates the highest return for
> this athlete now?" Only then: "how is that adaptation best achieved, and at what
> dose?" Volume is computed as an output and checked as a ceiling — never set as a
> target to be filled.**

- **Why it exists.** Volume-first reasoning answers "how much?" before "of what, and
  why?" — inverting the coaching order and producing non-specific training and the
  instinct to fill or overshoot. Dose must follow from an adaptation target under a
  recoverability ceiling.
- **In practice.** *Holds:* the engine decides "develop maximal lower-body force,"
  derives the movement and loading characteristics, selects interventions, and only
  then computes the resulting volume and validates it against the ceiling.
  *Violated:* a per-muscle volume target is computed first and then filled with
  whatever exercises pay it down.
- **Implications.** The pipeline runs *adaptation → movement requirement →
  intervention → dose → validate volume*. Muscle volume becomes a check on the plan,
  not the plan.
- **Governs.** The decision ordering; the role of the volume ledger as validation
  input; the value-ordered selection (not volume-driven fill); the separation of
  construction (optimises for value) from validation (enforces ceilings).
- **Failure mode if violated.** The engine optimises a means (volume) at the expense
  of the end (adaptation/transfer), and tends to overshoot — prescribing fatigue
  with no adaptation rationale (a direct breach of Article 9).

## Article 7 — The minimum effective intervention — sufficient, progressed, never padded

> **The right dose is the smallest one that still produces the required adaptation —
> and that dose must be genuinely sufficient and progressively overloaded. Work is
> never prescribed merely to hit a volume target or to consume available time.**

- **Why it exists.** Two opposite errors must be forbidden at once. *Over-dosing:*
  extra fatigue beyond the recoverable dose is not extra progress — it is the
  opposite, and "fill the booked time" is its signature. *Under-dosing:* "minimum"
  taken too far becomes a stimulus too small to adapt to. The principle is
  *minimum-effective*, with both words load-bearing.
- **In practice.** *Holds:* a session covers its primary objective at a dose proven
  to drive the adaptation, progresses it week to week, then *stops* and banks the
  remaining time. *Violated:* a "finisher" rounds out leftover minutes with junk
  volume; or, conversely, a single light set is called a strength stimulus.
- **Implications.** Every prescribed exercise must trace to the session's objective.
  Spare capacity beyond the recoverable dose is offered as *optional* quality work
  or banked — never padded. Progression is first-class: a sufficient stimulus must
  still advance over time.
- **Governs.** The session value hierarchy with an explicit stopping rule;
  progression models anchored to the athlete's demonstrated rate of progress; the
  prohibition on time-filling finishers.
- **Failure mode if violated.** Either accumulated junk fatigue that degrades the
  sport (over-dosing) or a plan too timid to drive adaptation (under-dosing). Both
  are coaching failures.

---

# Title III — Safety and the Athlete

*The protections that override performance. Higher than optimisation, always.*

## Article 8 — Athlete safety and availability override performance optimisation

> **Protecting the athlete's health and their ability to keep training is a
> first-order objective, not a side constraint. The platform never prescribes beyond
> an athlete's demonstrated technical competency or readiness, and treats staying
> healthy and trainable as more valuable than any single adaptation.**

- **Why it exists.** Availability is the real currency of long-term performance: the
  athlete who is healthy and training every week beats the one who chases a peak and
  breaks. Safety is also non-negotiable ethically — the platform serves people, not
  numbers.
- **In practice.** *Holds:* a novice is gated out of depth jumps and heavy snatches
  however well they would "fit the volume"; an athlete with a prior hamstring strain
  gets robustness work prioritised as protection. *Violated:* a contraindicated or
  beyond-competency exercise is prescribed because it best serves the objective.
- **Implications.** Competency and injury status are inputs that *shape*
  construction, not filters applied afterward. Robustness/durability is a trainable
  quality the diagnosis can prioritise. Safety gates act even under only moderate
  confidence.
- **Governs.** Constraints-before-content; injury contraindications as inputs to
  selection; competency gating; the conflict order placing Safety & Law at the top;
  the boundary that the platform is not a medical/diagnostic tool and defers
  high-risk presentations to professionals.
- **Failure mode if violated.** Injuries the platform was meant to prevent;
  prescriptions the athlete cannot safely perform; loss of the trust that is the
  product.

## Article 9 — Recoverability is a ceiling, and no fatigue is prescribed without a reason

> **The combined load of gym, sport, and life must stay within the athlete's
> modelled capacity to recover. That ceiling can trim or veto any prescription and
> can never be overridden to "use the time." Every unit of prescribed fatigue must
> be justified by an adaptation it is expected to drive.**

- **Why it exists.** Adaptation happens within recoverable load; beyond it, training
  digs a hole. Fatigue with no adaptation rationale is pure cost. The ceiling is the
  hard boundary that makes minimum-effective dosing enforceable.
- **In practice.** *Holds:* the engine trims the lowest-value volume to stay under
  the recoverable ceiling and tells the athlete it did so. *Violated:* a session is
  expanded to fill its time budget, pushing total load past what the athlete can
  absorb alongside their sport.
- **Implications.** Recoverability spans gym + sport + life as one budget, learned
  per athlete over time. It is a ceiling, not a target — being *under* it is fine;
  being over it is forbidden. Fatigue is always traceable to an intended adaptation.
- **Governs.** The recoverability validator as a gate; the composition of modifiers
  toward caution under uncertainty; the conflict order placing Recoverability above
  Objective Fidelity; the prohibition on fatigue-without-rationale.
- **Failure mode if violated.** Overtraining, stalled progress, elevated injury
  risk, and a plan that competes with the athlete's sport for recovery it cannot
  spare.

## Article 10 — The human is the final authority; the engine recommends, it does not dictate

> **A human is always the final decision-maker — the coach in a team, the athlete as
> their own coach in the individual case. Every recommendation is overridable, and
> once an athlete commits to a session, what they were shown is what they get; the
> engine never silently overwrites committed intent.**

- **Why it exists.** Coaching is a relationship, not an oracle's pronouncement. The
  engine carries genuine uncertainty (Article 12) and must defer to the human who
  has context it lacks. Trust requires that the athlete is never surprised by a plan
  changing under them after they committed.
- **In practice.** *Holds:* an athlete starts a session and it is frozen — later
  adaptation reshapes only *pending* work, never the committed session; a coach
  overrides the engine's selection and the override is recorded and learned from.
  *Violated:* a committed session is silently reflowed; an override is discarded or
  cannot be expressed because there is no decision boundary to override.
- **Implications.** Every decision must be overridable at its contract boundary.
  Overrides and commitments are captured as durable athlete state and feed the
  learning loop. Runtime adaptation is a projection over an immutable plan, applied
  only to provisional work (freeze-on-commit).
- **Governs.** The decision-boundary substitution seam (humans and AI plug in the
  same way); the immutable-plan / read-time-projection split; the persistence of
  commitments and overrides as portable state; the conflict order's "Athlete intent"
  tier.
- **Failure mode if violated.** The athlete loses trust the moment a committed plan
  changes without consent; the coach is reduced to a spectator; valuable override
  signal is thrown away instead of learned from.

## Article 11 — Privacy of raw athlete data is inviolable

> **Raw, sensitive athlete data — heart-rate variability, sleep, resting heart rate,
> and the like — never crosses a person boundary. It may roll *up* into a derived
> signal (readiness, load state) that another party can see; the raw values
> themselves may never be seen by a coach, teammate, or anyone but the athlete.**

- **Why it exists.** Health data is among the most sensitive a person has. The
  platform's expansion to teams creates pressure to share it; that pressure must
  meet an absolute boundary. Privacy enables the trust without which athletes will
  not share the data the engine needs.
- **In practice.** *Holds:* a coach sees "this player is amber on readiness," never
  the player's HRV or sleep score; a validator *fails the build* if a raw-vital
  metric is flagged coach-visible. *Violated:* a dashboard exposes a player's
  resting heart rate to staff.
- **Implications.** Privacy is a structural invariant enforced in code, not a policy
  enforced by reviewer vigilance. Cross-person surfaces carry only derived signals,
  plan/adherence, and injury status/availability. Any cross-user access extends
  athlete-owned access deliberately and is tested.
- **Governs.** The data architecture's raw-vs-derived split; the team data surface
  (additive, team-scoped, derived-only); the privacy validator; row-level access
  rules that extend, never bypass, athlete ownership.
- **Failure mode if violated.** A privacy breach that is simultaneously an ethical
  failure, a legal liability, and the end of athlete trust — unrecoverable
  reputational damage.

## Article 21 — The platform prescribes for the athlete's developmental stage, never for a default adult

> **Every prescription honours the athlete's developmental stage. What may and
> may not be prescribed to a developing or an ageing athlete is explicit,
> governed knowledge — never an assumption that the athlete is a mature adult —
> and where age-modulated evidence is thin, the platform defaults to the
> conservative choice. The athlete's long-term development outranks any
> short-term adaptation, at every age.**

- **Why it exists.** The platform's target customer — clubs and teams without
  an S&C budget — prominently includes youth squads, and masters athletes are
  already in the individual package. The gravest way to harm the people the
  platform exists to serve is to reason about a fifteen-year-old or a
  sixty-year-old from the physiology of a twenty-five-year-old. No other
  Article supplies this duty: competency gating (Article 8) and
  caution-under-uncertainty (Articles 13, 16) are age-blind, and a duty of
  care belongs in the unamendable floor, not in a lower document's
  discretion.
- **In practice.** *Holds:* a youth athlete's programming is bounded by
  maturation stage — movement competency, skill acquisition, and appropriate
  loading before maximal expressions — however well heavier work would "fit
  the plan"; a masters athlete gets recovery-weighted dosing and
  tissue-appropriate progressions by default, not by exception. *Violated:* a
  minor onboards and receives programming reasoned entirely from adult
  assumptions because nothing forbade it; an age-band rule lives only in a
  code comment no scientist can review.
- **Implications.** Developmental stage is a first-class input that *shapes*
  diagnosis and construction, never a filter applied afterward. The stage
  rules themselves — what is gated, moderated, or emphasised at each stage of
  an athlete's development — enter as governed, evidence-tagged knowledge
  under Article 17, reviewable by specialists and versioned, never hard-coded.
  Thin evidence for an age band lowers confidence, and lower confidence
  narrows what may be prescribed (Article 13): for a developing athlete the
  margin always widens toward safety, never toward stimulus.
- **Governs.** Age and developmental stage as inputs to every training
  decision; maturation-aware competency gating; the knowledge home for
  age-band and long-term-development rules; the conservative default wherever
  stage-specific evidence is thin; the onboarding of youth squads under the
  team package.
- **Failure mode if violated.** The platform harms a developing athlete it
  was built to serve — an ethical failure before it is anything else, and the
  single fastest way to lose the trust of the clubs the mission depends on.

## Article 22 — The athlete owns their data; consent is the basis of every grant

> **An athlete's data belongs to the athlete. Any visibility another party
> holds — a coach, a team, the platform itself — exists only by the athlete's
> informed consent: specific in scope, freely given, and revocable. The athlete
> may take their data with them or have it erased, and secondary use — research,
> evidence generation, benchmarking — happens only under explicit,
> privacy-preserving consent.**

- **Why it exists.** Article 11 protects what others may *see*; it does not
  say why they may see anything at all. Without a consent basis of
  constitutional rank, team membership silently becomes a visibility grant,
  internal research over athlete data has no principle to be validated
  against, and export and deletion arrive as ad-hoc product choices rather
  than rights. As the platform's second product — the longitudinal
  understanding of the athlete — grows in value, the athlete's ownership of
  it must be settled *before* anyone is tempted to treat it as the
  platform's asset rather than the athlete's.
- **In practice.** *Holds:* joining a team grants the coach a scoped,
  derived-only view because the athlete consented to exactly that grant, and
  revoking it — or leaving the team — closes the view; an athlete leaving the
  platform exports their full history; athlete data enters an internal
  evidence study only under explicit, informed, privacy-preserving consent.
  *Violated:* team membership implies coach visibility with no recorded
  consent behind the grant; athlete histories are aggregated into research
  nobody agreed to; a deletion request becomes an unanswered support ticket.
- **Implications.** Consent is durable, inspectable athlete state — scoped
  (what, to whom, for what purpose), revocable without penalty to the
  coaching the athlete receives, and never a formality buried in onboarding.
  Consent widens *who* may see; it never deepens *what* crosses — a grant can
  expose no more than Article 11 permits, so no consent can authorise a raw
  vital across a person boundary. Export and erasure are governed rights with
  defined behaviour, not favours. Where the athlete is a minor, consent
  involves the guardian as applicable law requires, and Article 21's duty of
  care extends to the consent itself.
- **Governs.** The consent model beneath every team and cross-user
  visibility surface; the recording of grants and revocations as durable
  athlete state; data portability and erasure; the gate on all secondary use
  of athlete data; the rule that cross-user access extends athlete ownership
  deliberately — now with its consent basis named — and is tested.
- **Failure mode if violated.** The platform quietly comes to own what it
  merely stewards: a legal exposure that compounds the moment minors or
  research enter, and an ethical breach of the trust that persuades athletes
  to share data at all.

---

# Title IV — Evidence and Honesty

*How the platform knows what it knows, and how honestly it acts on it.*

## Article 12 — Science informs decisions; athlete response validates them

> **Evidence sets priors and bounds; it rarely dictates the single right answer for
> one athlete on one day. Every plan is a falsifiable hypothesis, and the athlete's
> lived response is the referee. The platform treats its own diagnoses and plans as
> hypotheses to be tested, not truths to be asserted.**

- **Why it exists.** The science of training is real but incomplete and often
  contested; individuals vary enormously. A system that outsources judgement to a
  citation is brittle; one that never checks its own guesses is unfalsifiable. The
  honest posture is: reason *from* evidence, *toward* a decision, then *measure*.
- **In practice.** *Holds:* the engine prescribes a priority quality, then checks
  whether developing it actually moved the athlete's performance, and updates its
  beliefs. *Violated:* a diagnosis is presented as an assessment and never revisited,
  so when the athlete fails to improve, nothing is learned.
- **Implications.** Planning and learning are distinct activities. Plans are
  provisional by nature — only the near term is firm; later blocks are explicitly
  re-planned as the athlete develops. The platform is, by design, a hypothesis-
  generating, outcome-observing instrument.
- **Governs.** The separation of the planning loop from the learning loop; plans as
  immutable hypotheses regenerated from state; the commitment to validate diagnoses
  against outcomes; the research posture of the platform.
- **Failure mode if violated.** Confident wrongness — the platform asserts
  precision it has not earned, cannot tell a good diagnosis from a bad one, and
  never improves.

## Article 13 — Confidence governs authority

> **How much a fact or decision may influence the plan is determined by how much the
> platform trusts it. A high-confidence, validated fact may gate (decide); a
> moderate or low-confidence one may only inform; a very-low-confidence signal may
> only be displayed. Contested science never gates. Uncertainty widens safety
> margins; it never halts reasoning.**

- **Why it exists.** The platform's most insidious recurring disease is treating a
  low-confidence number with high authority (the ACWR lesson). The cure is to make
  confidence *operative everywhere* — a property decisions actually read — so the
  next over-trusted metric cannot quietly become a hidden rule. And because data is
  often missing, the engine must degrade gracefully: less data means wider margins,
  not a broken plan.
- **In practice.** *Holds:* a contested load ratio is shown for transparency but
  cannot force a deload; with no wearable and minimal onboarding, the engine still
  produces a sound, conservative plan. *Violated:* a flawed ratio gates a decision;
  or the engine refuses to plan because a signal is absent.
- **Implications.** Every fact carries an evidence level and a confidence; every
  decision composes input confidences into an output confidence. Authority comes in
  three tiers — *gate*, *soft input*, *reported metric*. Confidence-demotion must be
  executed in code, not merely written in comments. Missing data lowers confidence;
  it never blocks a value.
- **Governs.** The evidence/confidence model attached to all knowledge; the
  three-tier authority mechanism; graceful degradation under missing inputs; the
  rule that the evidence→authority mapping is itself a reviewed knowledge entry, not
  a hard-coded constant.
- **Failure mode if violated.** The platform acts decisively on bad science (harmful
  and untrustworthy) or freezes when data is incomplete (useless in the real world,
  where data is always incomplete).

## Article 14 — Every recommendation must be explainable

> **For any recommendation, the platform must be able to say — in plain English —
> what it decided, why, on what evidence, and how sure it is. A recommendation that
> cannot be explained must not be made.**

- **Why it exists.** Trust is the product, and explainability is how trust is
  earned. Explanation is also an *architectural* requirement: if a concept cannot be
  explained plainly, the engine should not act on it, because an inexplicable
  decision cannot be reviewed, debugged, or improved. The explanation substrate is
  the debugging substrate.
- **In practice.** *Holds:* "This session develops reactive strength because low
  reactive strength is your top limiter for sprinting, with these three exercises at
  the smallest dose your knee and Tuesday track session allow." *Violated:* a number
  appears with no traceable reason, or an explanation is reconstructed after the
  fact rather than emitted by the decision that made it.
- **Implications.** Rationale and confidence are first-class *outputs* of every
  decision, assembled into the athlete-facing explanation — never a log line bolted
  on afterward. The same trace makes the engine observable in production.
- **Governs.** The decision contract's mandatory rationale + confidence; the
  explanation assembly; the validation report (what was trimmed/vetoed and why); the
  rule against acting on concepts that cannot be stated plainly.
- **Failure mode if violated.** A black box. Athletes cannot trust it, coaches
  cannot supervise it, engineers cannot debug it, and a wrong recommendation is
  indistinguishable from a right one.

## Article 15 — No silent truncation, no silent debt

> **If the platform drops work, defers a deload, forgives missed volume, caps
> coverage, or diagnoses a need it cannot yet serve, it records that fact and can
> surface it. The athlete is never misled into believing they received the full
> prescription when they did not.**

- **Why it exists.** Silent omission is a form of dishonesty that compounds: a
  forgiven debt the athlete doesn't know about becomes a hole in their preparation;
  a diagnosed-but-untreated limiting factor that vanishes is a coaching gap nobody
  can see. Honesty about limits is part of explainability (Article 14).
- **In practice.** *Holds:* "we capped your posterior-chain volume to keep you
  recoverable"; "we diagnosed an aerobic-capacity limiter, which gym work can only
  partly address — here is what we're doing and what is out of our current scope."
  *Violated:* volume is trimmed and the athlete is shown a "complete" plan; a deload
  is deferred with no record; a limiter the engine cannot treat is silently dropped.
- **Implications.** Every trim, veto, deferral, forgiveness, cap, and unservable
  diagnosis produces a record. Coverage limits are stated, not implied. A need the
  platform cannot meet (e.g. endurance session programming, while deferred) is
  surfaced, never quietly discarded.
- **Governs.** The validation report; the no-silent-cap rule across all bounded
  coverage; the handling of diagnosed-but-unservable needs; the honesty of session
  duration and content estimates.
- **Failure mode if violated.** The athlete trusts a plan that is quietly
  incomplete; gaps accumulate unseen; the platform's honesty — its core
  differentiator — is hollow.

## Article 16 — Become more personal as evidence accumulates; learn, don't assume

> **On day one the platform reasons from population and sport evidence. As
> athlete-specific data accumulates, it reasons increasingly from *this athlete's*
> demonstrated responses. Learning is driven by observed data, not by unexamined
> assumptions, and the platform never oversells the personalisation it has not yet
> earned.**

- **Why it exists.** The difference between an app that gives everyone the same good
  plan and a coach who knows *you* is learning. But premature personalisation is a
  guess wearing a lab coat: early on, the engine has almost no measured truth about
  the individual, and pretending otherwise is dishonest (Article 12).
- **In practice.** *Holds:* "this plan is deliberately conservative while we learn
  how you respond"; later, "we've learned you recover quickly from lower-body work,
  so we've increased your squat frequency." *Violated:* the engine claims a bespoke
  plan on day one from a five-question onboarding; or it bakes in an assumption ("the
  athlete logs consistently") it has never checked.
- **Implications.** Decisions read priors as typed inputs from day one — even when
  those priors are pure population defaults — so the learning seam is alive before
  real learning exists. Confidence rises with data and is itself surfaced. Stated
  assumptions are made explicit and tested, not hidden.
- **Governs.** The three-tier prior model (population → sport → athlete-specific);
  the learning loop as a separate, asynchronous activity that updates priors and
  never mutates plans; the reservation of learning seams in every relevant decision;
  the honest surfacing of confidence to the athlete.
- **Failure mode if violated.** Either a static engine that never becomes anyone's
  coach, or a falsely confident one that asserts personalisation it cannot back —
  and overfits a single bad week.

---

# Title V — Architecture and Stewardship

*The structural commitments that keep the platform correct, extensible, and
maintainable for a decade.*

## Article 17 — Knowledge is separate from reasoning

> **The platform reasons *from* structured, evidence-tagged, versioned knowledge; it
> does not embed knowledge in code. Adding a sport, a quality, an exercise, an
> injury, or a programming philosophy is primarily a matter of adding knowledge —
> not modifying the reasoning core.**

- **Why it exists.** This is the load-bearing wall of a system meant to grow for ten
  years and absorb sports, qualities, and philosophies not yet imagined. If domain
  knowledge lives in code, every addition risks the core, knowledge cannot be
  reviewed by scientists, and the same fact drifts across the places it is
  duplicated.
- **In practice.** *Holds:* adding tennis is authoring a knowledge file plus one
  registry line, with zero edits to the reasoning core; the injury subsystem already
  works this way — contraindications and rehab are validated data, the reasoning is
  small generic code. *Violated:* a sport's needs are expressed as multipliers
  scattered through an allocator; two parallel representations of the same sport
  diverge.
- **Implications.** Knowledge modules carry provenance, confidence, and a review
  date. Interchangeable knowledge members live in registries the core consults by
  id. There is one source of truth per domain fact. Decisions never hard-code the
  contents of a knowledge module.
- **Governs.** The knowledge-module architecture and registries; the orchestrator
  pattern (core coordinates, knowledge lives in registries); the retirement of any
  duplicated or hard-coded domain knowledge; the eight-way data taxonomy that keeps
  knowledge, logic, inference, and derived data distinct.
- **Failure mode if violated.** The core ossifies: every new sport or idea means
  risky surgery, scientists cannot contribute, and the codebase's apparent
  sophistication masks an engine that cannot actually be extended.

## Article 18 — The reasoning core is pure and deterministic; adaptation enters only through priors and bounded, validated substitution

> **The function that turns athlete state into a plan is pure and deterministic — the
> same inputs always produce the same plan. Learning never mutates a plan; it updates
> the priors the next planning pass reads. AI or human judgement may replace a
> decision only behind its contract, and the deterministic validators always have
> the last word.**

- **Why it exists.** Determinism is the platform's most valuable property: it makes
  the engine testable, sweepable across thousands of cases, and safe to change under
  golden-master protection. Personalisation and AI are essential — but introducing
  them *inside* the pure core would forfeit determinism. The resolution is to let
  both enter through disciplined seams that preserve purity.
- **In practice.** *Holds:* learning infers the athlete's real recovery rate and
  stores it as a prior; the next pure planning pass reads it; an AI proposes a
  session and the deterministic safety validators still gate it. *Violated:* an AI
  call or a clock read sits inside the planning core; learning edits a generated plan
  in place; mutable runtime state makes the same inputs produce different plans.
- **Implications.** The core takes typed inputs and returns typed outputs with no
  I/O, clock, storage, or UI. Plans are derived (recomputed), not stored as truth.
  Learning is asynchronous and off the planning critical path. Every substitutable
  decision honours a contract; an AI may *propose* but never *dispose*.
- **Governs.** The engine as a pure library with a hard boundary; golden-master and
  determinism CI enforcement; priors as the only channel for learning; the
  decision-contract substitution seam; validators as the universal safety harness
  for any construction path, including AI.
- **Failure mode if violated.** The engine becomes untestable and unpredictable;
  changes cannot be verified safe; an AI can ship an unsafe plan because it got the
  last word; the crown-jewel property that lets the platform evolve safely is lost.

## Article 19 — Validation is a separable safety layer; construction proposes, validation disposes

> **Constraints are computed before content, and construction happens inside that
> box. After a plan is constructed, an independent set of deterministic validators
> checks it for safety, recoverability, sport-compatibility, lawfulness, and
> scientific consistency, and may trim or veto it. No plan ships unvalidated —
> whatever produced it.**

- **Why it exists.** Tangling optimisation and safety into one pass produces an
  engine that overshoots its own targets and cannot explain itself. Separating them
  lets construction optimise for *value* and validation enforce *safety and law*
  independently — and creates one safety harness that every construction path,
  including a future AI proposer, must pass.
- **In practice.** *Holds:* an injury shapes the session up front (a knee-injured
  athlete's session is *designed* around the knee), and a post-construction
  validator catches any contraindication that slipped through and substitutes.
  *Violated:* a full session is built and then contraindicated exercises are stripped
  out, leaving an incoherent session designed around an exercise that is no longer
  there.
- **Implications.** Constraints (time, equipment, schedule, injuries,
  recoverability, competency, law) shape construction and are re-checked by
  validators. Each validator is a pure, independent check that passes, trims, or
  vetoes, with a reason. Conflicts resolve by the fixed [conflict order](#when-principles-conflict).
  The validators produce the report that feeds explanation (Article 14) and honesty
  (Article 15).
- **Governs.** Constraints-before-content; the validator suite and conflict
  resolution as a distinct module; the AI safety harness (propose-then-validate); the
  validation report.
- **Failure mode if violated.** Incoherent sessions, silent overshoot, no
  per-check explanation, and no safe seam for an AI proposer — the platform cannot
  guarantee that what ships is safe and lawful.

## Article 20 — Simplicity is a feature; complexity must earn its place

> **At every step, the platform builds the smallest thing that improves a real
> athlete outcome. Every module, abstraction, and number must justify itself against
> the question: can this be data, generic, removed, or deferred? The architecture is
> a destination that pulls the work forward — never a cathedral to be built before
> athletes are served.**

- **Why it exists.** The platform's design is ambitious relative to the team that
  builds it; the permanent risk is that the *framework* absorbs effort that should go
  to *athlete value*. A constitution that demanded everything at once would
  guarantee that failure. Longevity comes from restraint, not cleverness.
- **In practice.** *Holds:* a decision with no current consumer stays a thin
  pass-through rather than speculative machinery; high-value, low-risk corrections
  ship before the big re-seating. *Violated:* sixteen decisions and ten knowledge
  modules are built in full before a single athlete benefits; abstraction is added
  for elegance rather than need.
- **Implications.** Capabilities are introduced incrementally, smallest version
  first, each shipping real value. Unused seams are kept alive trivially, not built
  out prematurely. The other Articles describe the destination; this one governs the
  pace.
- **Governs.** The incremental migration strategy (independent, value-shipping
  stages); the bias toward data over code; the "smallest version of every
  abstraction" rule; the deferral of capability until a consumer exists.
- **Failure mode if violated.** Architecture astronautics: a beautiful framework
  that never ships, a solo or small team stalled building infrastructure, athlete
  value indefinitely postponed.

---

# When principles conflict

Articles will sometimes pull against each other — Article 9 (recoverability) says
"less volume" while Article 6/7 (serve the objective) wants more stimulus; the only
high-transfer exercise is contraindicated by Article 8. Conflicts resolve by a
fixed priority order. **Higher tiers win absolutely; confidence modulates *within* a
tier but never *across* tiers.**

```
   1. SAFETY & LAW        never violate an Article; never an unsafe or
                          contraindicated prescription      (Art 8, 11, 18, 19, 21, 22)
   2. SPORT PROTECTION    never compromise the athlete's sport     (Art 2)
   3. RECOVERABILITY      never exceed the recoverable ceiling     (Art 9)
   4. ATHLETE INTENT      honour committed/frozen choices and the
                          human's overrides and stated constraints (Art 10)
   5. OBJECTIVE FIDELITY  serve the session/block objective as
                          fully as the tiers above allow           (Art 5, 6, 7)
   6. OPTIMISATION        efficiency, balance, variety, preference
                          — the "nice to haves"                    (Art 20 restraint)
```

So: a contraindicated exercise is dropped even if it best serves the objective
(1 > 5); volume is trimmed below target to stay recoverable (3 > 5); a perfectly
balanced week yields to the fixed sport schedule (2 > 6). When a conflict forces a
compromise, the platform **records and surfaces it** (Article 15). This order *is*
the Constitution, compiled into a decision procedure. If the order does not resolve
a conflict, the question is a genuine open problem and belongs in the EDS's Open
Questions, not in an ad-hoc code branch.

---

# Amendment & Stewardship

A constitution earns its authority by changing rarely and deliberately.

- **What may never be amended.** The protections of Title III (safety, the human as
  final authority, raw-data privacy, the developmental-stage duty of care, and the
  athlete's ownership of their data) and the honesty commitments of Title IV are the
  platform's ethical floor. They may be *clarified* but never weakened.
- **How an Article changes.** An amendment is proposed in writing with its rationale,
  reviewed against the whole document for consistency, and recorded with a date and a
  version bump. The EDS and the other foundational documents are then reconciled to
  the amended Article in the same change. An Article is never edited silently.
- **Precedence.** This document outranks the EDS and all other specifications. Where
  a lower document is found to contradict an Article, the lower document is wrong and
  is corrected — the Article is not bent to fit the code.
- **Living derivations, fixed principles.** The *principles* here are stable; their
  *derivations* (the EDS's laws, the validators, the thresholds) evolve as evidence
  and the codebase evolve. A change to a derivation is a normal engineering act; a
  change to an Article is a constitutional one.
- **The standing instruction.** Article 20 is the governor on all the others: hold
  the destination in view, but at every step build the smallest thing that improves a
  real athlete outcome. This Constitution is the map, not a mandate to build
  everything at once.

---

# Appendix A — Mapping the EDS onto the Articles

This Constitution supersedes and unifies the EDS's three former principle systems.
Every Core-Philosophy statement (§2.x), First Principle (P#), and Engine Law (L#) is
preserved as a *derivation* of one or more Articles below. Nothing is orphaned. The
EDS should carry a pointer to this table; its 2.x/P/L sections remain as the
detailed engineering expression of these Articles.

| Article | Subsumes (EDS) |
|---|---|
| **1** — Athlete performance is the objective | §2.1, §2.2, P2; "the one question" (§1) |
| **2** — Gym serves the sport | §2.1, P1, L1 |
| **3** — The goal belongs to the athlete | §2.8, P11 (sport-agnostic facet), §7.3 |
| **4** — Decisions are the atomic unit | §5, P2; A2 critique; L6, L7 (traceability/one-purpose) |
| **5** — Diagnosis before prescription; qualities not muscles | §2.4, P6, the §8 pivot; L7 |
| **6** — Adaptation before dose; volume is a guardrail | §2.5, P3, P5, P7, L5 |
| **7** — Minimum effective, sufficient, progressed | §2.3, P3, L2, L5, L6; self-review C1.2 |
| **8** — Safety & availability override optimisation | L1, L4, §2.1 (availability), §7.2 (not medical) |
| **9** — Recoverability ceiling; no fatigue without reason | P13, L2, L3, L5 |
| **10** — Human is final authority; recommend not dictate | L10; conflict tier 4; (new) overridability |
| **11** — Raw-data privacy is inviolable | P14, L13 |
| **12** — Science informs; response validates | §2.6, §2.7, P8, P10; self-review C3.2 / FR5 |
| **13** — Confidence governs authority | P4, P10, L12, L14; §28 |
| **14** — Every recommendation is explainable | §2.10, P4, L11, SA10 |
| **15** — No silent truncation or debt | L15 |
| **16** — Become personal; learn, don't assume | §2.9, P9, §25; self-review C1.1 |
| **17** — Knowledge separate from reasoning | P11, §26, SA2, SA7 |
| **18** — Pure deterministic core; priors + bounded substitution | P12, L9, L10, R6, SA1, SA8 |
| **19** — Validation as a separable safety layer | L8, §35, §37, SA8 |
| **20** — Simplicity earns its place | P15; self-review C2.1 |

> Every Engine Law L1–L15 and First Principle P1–P15 appears above at least once.
> Where a law expresses an enforcement mechanism (e.g. L13's build-failing
> validator), the mechanism stays in the EDS as the engineering *how*; the Article
> states the immutable *what* and *why*.

**The AI layer.** The AI Governance & Architecture Specification (AIGAS, ratified 2026-07-13) extends these Articles to artificial intelligence — most directly Articles 10, 13, 14, 15, 18 and 19 — under the same rule as the EDS: the Articles state the immutable *what* and *why*; AIGAS states the *how* for the AI layer, and its Appendix A traces every clause back to this document. Where AIGAS and any foundational document conflict, the foundational document wins and AIGAS is corrected.

---

*— End of the Engine Constitution v1.1 —*
