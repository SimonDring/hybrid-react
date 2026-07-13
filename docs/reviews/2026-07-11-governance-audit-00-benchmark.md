# Governance Audit 00 — The World-Class Benchmark

**Class: REVIEW (T5) · dated evidence, never current state · 2026-07-11**
**Pin: frozen set v1.0 (2026-07-01) · `main @ fc5e3f8` · KSV 1.30.0**
**Spec: [`docs/superpowers/specs/2026-07-11-governance-forensic-audit-design.md`](../superpowers/specs/2026-07-11-governance-forensic-audit-design.md)**

---

This document is the yardstick for the 2026-07-11 governance forensic audit
(deliverables 01–09). It is built **first-principles** from the platform's
ambition sources (`docs/strategy/VISION.md`, `docs/product/TEAM-ARCHITECTURE.md`
ambition sections, `CLAUDE.md` North Star, the HANDOFF stage map) and from
elite sports-performance practice — deliberately **without** re-reading the
governing documents, so the yardstick is not bent toward what they already say
(spec §5.6). Every later deliverable cites capabilities here by ID (`P2.4`).

## §1 The standard

**What "best-in-class, doesn't exist yet" means.** The mission is to open
elite strength & conditioning to clubs, teams, and individuals who could never
afford an elite S&C coach. The reference is therefore not any existing
consumer fitness app — it is the **full performance department of an elite
club**: strength & conditioning, sports science, performance analysis, and
medical/recovery staff operating as ONE system around each athlete. That
department produces two inseparable products:

1. **The programme** — periodised, individualised, sport-serving training,
   diagnosed before prescribed, adapted continuously to what the athlete
   actually does and how they actually recover.
2. **The understanding of the athlete** — a longitudinal, evidence-graded
   model of who this athlete is: tested capacities, training history, injury
   history, on-pitch output, recovery patterns — the data asset that makes
   every programming decision defensible and every trend visible years later.

A platform that automates only the first is a plan generator with good
manners. World-class means both: elite programming **and** elite athlete data
analysis — performance on the pitch, performance in the gym, recovery, and
everything in between — delivered to people who currently get neither.

**Translated to an automated platform**, the standard becomes: every
capability an elite club delivers through expert staff must be delivered
through governed automation —

- **Deterministic and explainable where it decides.** The coaching decision
  core behaves like a great coach whose reasoning can be printed: the same
  athlete state always yields the same decision, and every decision can say
  why, in plain language a non-specialist trusts.
- **Scientific where it knows.** Knowledge enters graded by evidence quality,
  carries its confidence into the authority it may exert, updates on a
  cadence, and can be contested and retired without rewriting the machine.
- **Analytical where it observes.** Athlete data is a first-class product,
  not exhaust: captured with known provenance, quality-controlled, modelled
  longitudinally, compared against norms, rolled up to squads — and fed back
  into decisions traceably, not decoratively.
- **Safe and ethical where it touches people.** Privacy boundaries are
  architectural, not policy; medical limits are explicit hand-off lines; the
  human retains final authority; the athlete owns an explanation of
  everything done to them, at every age and stage of development.
- **Extensible where the ambition grows.** New sports, endurance programming,
  team workflows, native platforms and wearables must be absorbable as data
  and configuration — growth in scope must not require rebuilding the core or
  the governance around it.

**Judged at full end-state ambition (spec §2.3).** Today's product stage
(gym-only, wearable-light, no match data) is irrelevant to this benchmark.
The governing documents are judged on whether they could govern the complete
vision — elite programming + full athlete data analysis + team analytics +
real endurance programming + AI coaching + native/wearable platforms — the
moment each stage arrives. A capability the governance is silent on still
counts against it if the end-state needs it; the audit records when it bites
and whether existing abstractions can absorb it.

**What this benchmark is not.** It is not a market survey of commercial
products (spec §8), not an implementation review (Sprint 2 did that), and not
a status claim about what is built (status lives in HANDOFF.md). It defines
what world-class **governance** must cover, so each document audit can ask:
does this document govern its slice of that, world-classly?

## §2 The six pillars, decomposed

Each capability has a stable ID, a name, and a one-sentence "world-class
means…" statement specific enough to verdict a document against. The seed set
from the design spec is retained in full; two capabilities (P1.10, P5.7) are
added where elite practice demanded slices the seed set did not isolate —
justifications inline.

### P1 — Science-based programming

- **P1.1 Diagnosis-first coaching decisions** — world-class means: no dose,
  exercise, or plan structure is ever prescribed before an explicit diagnosis
  of who the athlete is and what limits them, and every prescription is
  traceable back to a named limiting factor it addresses.
- **P1.2 Sport-demand modelling (incl. position/event)** — world-class means:
  each sport is modelled as a demand profile of physical qualities —
  differentiated by position, event, or discipline where the sport
  differentiates (a prop is not a winger; a sprinter is not a marathoner) —
  and that profile, not a generic template, steers what the gym must supply.
- **P1.3 Periodisation to the sporting calendar** — world-class means:
  programming is phased against the athlete's real competitive calendar
  (off-/pre-/in-season, fixtures, taper and peak weeks), so the same athlete
  gets structurally different training in March than in August, with the
  transitions governed rather than improvised.
- **P1.4 Individualisation (age/sex/training-age/injury)** — world-class
  means: two athletes with the same sport and goal receive materially
  different plans when their age, sex, training age, injury history, or
  recovery profile differ, and the rules for how each factor modifies
  programming are explicit and evidence-graded.
- **P1.5 Progression & long-term development** — world-class means: the
  platform holds a multi-year model of how this athlete should advance —
  progression rules per quality, criteria for advancing or repeating a block,
  and a developmental arc beyond the current plan — so week 1 of next year is
  informed by everything since week 1 of this one.
- **P1.6 Safety & recoverability governance** — world-class means: every
  prescription passes recoverability and safety limits that override
  optimisation — hard caps that cannot be argued away by any goal, sport, or
  ambition setting — and violations are structurally impossible, not merely
  discouraged.
- **P1.7 Minimum-effective-dose discipline** — world-class means: the system
  prescribes the least training that produces the targeted adaptation and can
  justify every addition above that minimum, because athlete time and
  recovery capacity are treated as the scarcest resources in the plan.
- **P1.8 Endurance + concurrent-training programming** — world-class means:
  the platform can generate real endurance sessions (run/cycle/swim intervals,
  tempo, long work) and govern the interference problem — sequencing,
  same-day ordering, and weekly interleaving of strength and endurance so
  each protects rather than erodes the other.
- **P1.9 Return-to-play / rehab integration** — world-class means: injury
  triggers a governed pathway — staged rehab criteria, graduated exposure,
  and objective return-to-play gates integrated into the same plan — rather
  than a filter that merely deletes contraindicated exercises.
- **P1.10 Session-level autoregulation** *(added: the seed set governs
  block-level periodisation and plan-level adaptation but isolates no
  capability for the day-scale decision an elite coach makes every session —
  adjusting today's dose to today's athlete)* — world-class means: the day's
  prescribed load, volume, and intensity are adjusted against the athlete's
  presented state (readiness, prior-session outcomes, reported effort) under
  explicit rules, and a session once begun is a stable contract, not a moving
  target.

### P2 — Athlete data & analytics platform

- **P2.1 Testing & assessment batteries as first-class data assets** —
  world-class means: structured test protocols (strength, power, speed,
  aerobic capacity, movement quality) exist as scheduled, versioned,
  repeatable assessments whose results persist as comparable data points —
  not one-off onboarding questions.
- **P2.2 Daily monitoring (wellness/readiness/HRV/sleep)** — world-class
  means: daily subjective and objective monitoring streams are captured with
  defined semantics, individually baselined (an athlete is compared to their
  own normal, not a population constant), and summarised into signals with
  stated derivations.
- **P2.3 Gym-performance capture & analysis (loads, velocity, e1RM trends,
  adherence)** — world-class means: every session's prescribed-versus-done is
  captured at set granularity and analysed into trends (estimated 1RM
  trajectories, tonnage, velocity where measurable, adherence rates) that
  quantify whether training is working, not just whether it happened.
- **P2.4 On-pitch/match performance data (GPS/load, match stats,
  availability)** — world-class means: external sport load and match output
  (GPS/accelerometry where available, minutes played, match schedule,
  availability) are first-class inputs with a defined ingestion path, so gym
  programming reacts to the athlete's total load, not just the gym slice.
- **P2.5 Recovery analytics** — world-class means: recovery is analysed as
  its own domain — how this athlete's markers respond to given training
  doses, how long recovery takes, what accelerates it — producing a
  per-athlete recovery profile that programming consumes.
- **P2.6 The longitudinal athlete model (career-long, versioned)** —
  world-class means: one versioned, append-only model of the athlete spans
  their entire history on the platform — tests, training, injuries, plans,
  decisions — so any past state can be reconstructed and any long-horizon
  trend queried.
- **P2.7 Team-level analytics & squad readiness** — world-class means:
  individual signals roll up into squad views (readiness distribution,
  collective load, availability) that answer a coach's actual questions —
  "who is at risk, who is ready, is the squad doing too much?" — in plain
  English, without exposing any player's raw data.
- **P2.8 Benchmarking & normative comparison** — world-class means: an
  athlete's tested capacities are positioned against governed normative bands
  (by sport, position, sex, age, training age) with the provenance and
  confidence of every norm stated, so "you are weak here" is a defensible
  claim, not a house opinion.
- **P2.9 Data quality, provenance & missingness handling** — world-class
  means: every datum carries source and reliability, sensor and self-report
  are never silently conflated, and analyses degrade explicitly under missing
  data (stating what is unknown) rather than imputing silently.
- **P2.10 Analytics→decision loop** — world-class means: analysis changes the
  plan through defined, traceable pathways — each analytic signal is either
  wired to a named decision with stated authority, or explicitly advisory —
  so no insight silently steers and none silently rots unread.
- **P2.11 Reporting & insight delivery (athlete-facing, coach-facing)** —
  world-class means: insights reach each audience in their language — the
  athlete sees progress and rationale without jargon, the coach sees squad
  state without raw vitals — with the delivery surfaces governed for accuracy
  against the underlying data.

### P3 — Evidence pipeline

- **P3.1 Evidence grading & confidence-to-authority mapping** — world-class
  means: every piece of coaching knowledge carries an evidence grade, and
  that grade mechanically bounds the authority it may exert — strongly
  evidenced knowledge may hard-gate decisions, contested knowledge may only
  advise — with the mapping itself written down.
- **P3.2 Knowledge versioning & review cadence** — world-class means: the
  knowledge base is versioned as a whole and per entry, every change is
  auditable, and each entry has a review date and owner so no claim can
  quietly become five years stale.
- **P3.3 Contested-science handling** — world-class means: where the
  literature genuinely disagrees, the platform represents the disagreement
  (positions, strength of each) and constrains that knowledge to soft
  influence, rather than picking a side and encoding it as fact.
- **P3.4 Knowledge retirement/supersession** — world-class means: knowledge
  can be superseded or retired through a governed process that records what
  replaced it and why, and retired knowledge stops influencing decisions
  everywhere at once — no orphaned rules living on in corners.
- **P3.5 Internal evidence generation** — world-class means: the platform's
  own accumulated athlete data becomes research-grade internal evidence —
  which protocols worked for which populations — under privacy-preserving
  aggregation, feeding the same graded pipeline external science enters
  through.

### P4 — AI leverage

- **P4.1 Deterministic-core protection** — world-class means: the boundary
  between the deterministic decision core and any AI is architecturally
  enforced — AI may propose, interpret, and explain, but no AI output reaches
  an athlete's plan except through validation gates the core controls, and
  the platform remains fully functional with AI off.
- **P4.2 AI communication/education** — world-class means: AI translates
  decisions, data, and rationale into natural language tuned to each audience
  (beginner athlete, non-specialist coach) with factual-accuracy constraints
  against the underlying decision record — it may rephrase the truth, never
  improvise it.
- **P4.3 AI insight surfacing over athlete data** — world-class means: AI
  scans the athlete's longitudinal data for patterns a human coach would
  spot (plateaus, anomalies, correlations worth a look) and surfaces them as
  attributed, checkable hypotheses — never as silent plan changes.
- **P4.4 AI-assisted knowledge curation** — world-class means: AI accelerates
  knowledge intake — drafting entries, screening literature, flagging stale
  or contradictory claims — with every AI-drafted item passing the same
  human-approved, evidence-graded gate as any other knowledge before it can
  influence a decision.
- **P4.5 AI evaluation, monitoring & track-record governance** — world-class
  means: every AI capability ships with an evaluation harness and a live
  track record (accuracy, failure modes, drift), capabilities are individually
  kill-switchable, and expanded AI authority must be earned by measured
  performance, not granted by enthusiasm.

### P5 — Safety, ethics, privacy, development

- **P5.1 Raw-data inviolability & derived-signal boundaries** — world-class
  means: raw health vitals never cross a person boundary — coaches, teams,
  and aggregates see only defined derived signals — and the raw→derived
  boundary is enforced in the data architecture itself, so a leak would
  require changing the schema, not just breaking a habit.
- **P5.2 Injury & medical-boundary governance** — world-class means: the
  platform knows the edge of its competence — explicit criteria for which
  symptoms, injuries, and red flags it must refuse to program around and
  instead direct to a medical professional — and that hand-off line is
  governed, not left to model judgement.
- **P5.3 LTAD & youth/masters duty of care** — world-class means:
  long-term athlete development stages and age-band constraints (youth
  maturation, masters recovery and injury profiles) are explicit governance —
  what may and may not be prescribed at each stage — not an assumption that
  every user is a 25-year-old adult.
- **P5.4 Overtraining/under-recovery safeguarding** — world-class means: the
  platform detects sustained mismatch between load and recovery and is
  obligated — not merely enabled — to intervene with defined escalations
  (deload, halt, human referral) that the athlete's own enthusiasm cannot
  override indefinitely.
- **P5.5 Human final authority & override** — world-class means: a human —
  the athlete, or an accountable coach — can always see, question, and
  override any automated decision, every override is recorded and respected
  downstream, and no autonomous pathway exists that a human cannot stop.
- **P5.6 Explainability as an athlete right** — world-class means: for any
  decision affecting them, the athlete can get a truthful, plain-language
  answer to "why?" — derived from the actual decision record, not generated
  after the fact — as a guaranteed property of every decision pathway.
- **P5.7 Athlete data ownership & consent** *(added: the seed set governs
  data protection but isolates no capability for the athlete's affirmative
  rights over their data — a first-order duty-of-care obligation once teams,
  minors, and internal research enter)* — world-class means: the athlete
  affirmatively controls what is shared with whom (joining a team grants
  scoped, revocable visibility), can export and delete their data, and any
  secondary use such as internal evidence generation (P3.5) happens under
  explicit, informed consent.

### P6 — Extensibility

- **P6.1 New sports as data** — world-class means: adding a sport — demand
  profile, positions, calendar structure, norms — is authoring governed data
  against a schema, requiring zero decision-core changes, and the schema is
  proven rich enough to express sports as unlike as marathon running and
  rugby without special-casing.
- **P6.2 New decision types without core rewrites** — world-class means: the
  decision framework can absorb genuinely new decision categories (endurance
  session construction, taper design, RTP gating) by extension — each new
  decision slotting into the existing diagnosis, validation, and
  explainability machinery rather than forking it.
- **P6.3 Team/coach workflows (fixtures→constraints, squad planning)** —
  world-class means: a coach's real workflow — entering fixtures and shared
  sessions, planning around congested weeks, managing availability — feeds
  the engine as first-class constraints on every player's plan, with the
  translation from calendar to constraint governed, not ad hoc.
- **P6.4 Wearables/native platform absorption** — world-class means: new
  data sources and platforms (HealthKit, Fitbit, GPS vendors, native mobile)
  attach through a defined ingestion boundary that normalises
  vendor-specific data into the platform's own semantics, so a new wearable
  is an adapter, not an architecture event.
- **P6.5 The governance process itself scaling** — world-class means: the
  amendment pipeline, document ownership map, and staleness controls are
  load-tested for a 10× documentation surface — amendments flow at a usable
  cadence, every concept keeps exactly one owner, and drift is detected by
  process rather than heroics.

**Seed-set disposition:** all 41 seed capabilities retained; none removed;
P1.10 and P5.7 added with justifications inline above. Total: 43 capabilities.

## §3 Document-ownership map

For each governing document: the capability slices it **should** own or
co-own given its role — regardless of what it currently says. This table is
the work order for deliverables 01–07: each per-document audit verdicts its
document against every capability in its row. **Owner** = the document that
should carry the primary, binding statement; **co-owner** = a document that
should carry a load-bearing part of the capability from its own altitude.

Roles are taken from the documents' places in the governance hierarchy, not
from re-reading their contents (spec §5.6).

| Document (role) | Should OWN | Should CO-OWN |
|---|---|---|
| **Constitution** — supreme principles; the tie-breaker for every conflict | P1.6 · P1.7 · P5.1 · P5.2 · P5.3 · P5.4 · P5.5 · P5.6 · P5.7 | P1.1 · P3.1 · P4.1 (each as principle; mechanics owned elsewhere) |
| **Decision Ontology** — the catalogue and formal definition of decision types | P2.10 · P6.2 | P1.1 · P1.10 (as typed decisions) |
| **Knowledge Architecture** — how knowledge is structured, graded, versioned, and consumed as data | P3.1 · P3.2 · P3.3 · P3.4 · P3.5 · P2.8 · P6.1 (sports as governed data) | P4.4 · P2.9 (provenance/confidence semantics) |
| **EDS** — the engine design specification: how coaching decisions are reasoned and validated | P1.1 · P1.2 · P1.3 · P1.4 · P1.5 · P1.8 · P1.9 · P1.10 · P2.2 · P2.5 · P2.6 · P6.3 (fixtures as decision constraints) | P1.6 · P1.7 (as mechanism) · P2.3 · P2.10 · P6.1 (consumption side) · P6.2 · P5.6 (decision-record mechanics) |
| **TAS** — the technical architecture: data flow, storage, sync, isolation, platforms | P2.1 · P2.3 · P2.4 · P2.7 · P2.9 · P2.11 · P6.4 | P2.6 (storage/versioning) · P5.1 (enforcement) · P5.7 (enforcement) · P6.3 (coach-surface side) · P3.5 (aggregation infrastructure) |
| **AIGAS** — AI governance: where AI may act and under what gates | P4.1 · P4.2 · P4.3 · P4.4 · P4.5 | P2.11 (AI-rendered delivery) · P5.5 · P5.6 (AI-facing guarantees) |
| **DOC-GOVERNANCE + INDEX** — the process: precedence, lifecycle, amendment, ownership | P6.5 | P3.2 · P3.4 (process side) |

**Coverage check:** every capability P1.1–P6.5 appears in at least one row
above.

**Candidate NEW-DOCUMENT territory.** The athlete data & analytics cluster —
**P2.1, P2.4, P2.5, P2.6, P2.7, P2.8, P2.9, P2.10, P2.11, P3.5** — is
assigned above to the TAS/EDS/KA by altitude, but no governing document's
role is *"how the platform measures, models, analyses, and reports the
athlete."* At end-state ambition this cluster plausibly warrants a **Data &
Analytics Architecture Specification** peer to the EDS (per spec §3
Part 4); deliverable 08 tests this hypothesis and deliverable 09 rules on it.
A second, smaller candidate: **P5.3 + P5.7** (LTAD stages, consent regimes)
may outgrow constitutional principle into a dedicated athlete-safeguarding
specification once youth/team cohorts are live — the Constitution audit (01)
should judge whether principle-level coverage suffices.

## §4 How to read verdicts

Deliverables 01–08 verdict each owned capability with exactly one of the
following tokens (spec §3 Part 2):

- **`WORLD-CLASS`** — the document governs this capability at the standard
  §1–§2 define; nothing material missing at end-state ambition.
- **`ADEQUATE`** — governed soundly, but short of world-class in depth,
  precision, or end-state reach.
- **`THIN`** — mentioned or partially governed; the coverage would not
  survive contact with the end-state stage that needs it.
- **`SILENT`** — the document says nothing load-bearing about a capability
  its role requires it to govern.
- **`PRECLUDES`** — the document's current rules actively obstruct the
  capability as the end-state requires it.

Every `SILENT` or `PRECLUDES` verdict must additionally state: **what
breaks**, **when it bites** (which product stage), and **absorbable without
amendment? yes/no + why**.

Every finding is classed as exactly one of (spec §3 Part 4):

- **`COVERED`** — governance already world-class here; recorded honestly as a
  positive finding.
- **`SPEC-FILLABLE`** — gap closable by a new supporting/T3 spec under
  existing governance; no amendment needed.
- **`AMENDMENT CANDIDATE`** — requires amending a frozen document; queued
  with rationale per the amendment process, never applied.
- **`NEW-DOCUMENT CANDIDATE`** — a missing governing document entirely.

Finding IDs are `GA-<block><nn>`, block-allocated per document (Constitution
GA-1xx · Ontology GA-2xx · Knowledge Architecture GA-3xx · EDS GA-4xx · TAS
GA-5xx · AIGAS GA-6xx · Doc-governance GA-7xx · Data-pillar deep-dive
GA-8xx). Deliverable 09 aggregates; it mints no new IDs. The audit is honest
in both directions: `WORLD-CLASS` verdicts are findings too (class
`COVERED`), and no problem is manufactured to seem rigorous.
