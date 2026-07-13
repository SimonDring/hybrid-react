# Governance Audit 02 — The Decision Ontology vs the Benchmark

**Class: REVIEW (T5) · dated evidence, never current state · 2026-07-11**
**Pin: frozen set v1.0 (2026-07-01) · `main @ fc5e3f8` · KSV 1.30.0**
**Spec: [`docs/superpowers/specs/2026-07-11-governance-forensic-audit-design.md`](../superpowers/specs/2026-07-11-governance-forensic-audit-design.md) · Benchmark: [`…-00-benchmark.md`](2026-07-11-governance-audit-00-benchmark.md)**

---

## §1 Role and owned slices

`docs/foundation/DECISION-ONTOLOGY.md` (v1.0, frozen) is **the canonical
vocabulary of the platform**: every concept the coaching engine reasons about,
defined exactly once, with attributes, relationships, and its place in the
reasoning. Its self-declared scope is **platform-wide — "engine, app, team, AI,
and data model"** (Ontology header table, *Scope*), and its binding Principle is
that *"Nothing should be implemented until the entity it manipulates is defined
here. New concepts are added to this ontology first, then built."* It sits below
the Constitution and above the EDS in precedence; where the EDS glossary and the
Ontology overlap, the Ontology wins (Ontology header, *Relationship to the EDS*).

Per the benchmark's ownership map (00 §3), the Decision Ontology:

- **Owns:** **P2.10** (analytics→decision loop) · **P6.2** (new decision types
  without core rewrites)
- **Co-owns:** **P1.1** (diagnosis-first, as typed decisions) · **P1.10**
  (session-level autoregulation, as typed decisions)

Because the Ontology claims the *whole platform's* vocabulary — including the
data model — this audit additionally runs the brief's ontology-specific probes
against the capabilities whose **vocabulary slice** necessarily lands here even
though their primary owners are the TAS/EDS: P2.1, P2.4, P2.7, P2.11, P6.3.
Those rows are marked *(probe — vocabulary slice)* in §2 and verdict only the
slice the Ontology's role demands: does the concept have a canonical entity, or
does the platform's naming authority have nothing to say about it?

## §2 Coverage table

### Owned and co-owned capabilities (00 §3)

| Capability | Verdict | Cited Article/§ | Reasoning |
|---|---|---|---|
| **P1.1** Diagnosis-first (co-own, as typed decisions) | WORLD-CLASS | Ontology §1.3, §2, §5 (Family III) | The Diagnostic Triangle (§1.3) plus the PIVOT in the Reasoning Spine (§2 — "everything above is understanding; everything below is response") give diagnosis-first a complete typed vocabulary: Capability, Demand Profile, Limiting Factor, Priority Quality are all first-class with produced-from/feeds/consumers stated. The vocabulary makes prescription-before-diagnosis structurally inexpressible — "a workout generator has no triangle" (§1.3). |
| **P1.10** Session-level autoregulation (co-own, as typed decisions) | WORLD-CLASS | Ontology §8 (Readiness), §7 (Adaptation Projection, Session), §6 (Dose) | Exactly the benchmark's shape: Readiness is a today-local derived entity that "sizes today's session *before it is built*" and scales Dose in volume *and* intensity (§8); Adaptation Projection reshapes only *pending* work over the immutable Plan (§7); Session carries a commitment/freeze state and "once committed, is frozen" (§7) — the stable-contract property P1.10 demands, named and typed. |
| **P2.10** Analytics→decision loop (own) | ADEQUATE | Ontology §9 (Confidence, Learning, Decision), §8 (Load, Readiness) | The wiring *pattern* is world-class in kind: every entity states its Consumers; Confidence grants an explicit authority tier ("gate \| soft input \| reported metric", §9); ACWR is by definition "a low-confidence, non-gating hint" (§8 Load); Learning updates Priors read by named decisions D1/D4/D7/D12 (§9). But the loop's *input vocabulary* stops at training-state signals (Load/Fatigue/Recovery/Readiness/Recoverability) plus Priors. The analytic products the end-state loop must wire from — test results, trends, e1RM trajectories, insights, benchmark positions — have no entities, so most of pillar-2 analysis has nothing named to enter the loop *through* (see GA-203, GA-205–GA-209). |
| **P6.2** New decision types without core rewrites (own) | ADEQUATE | Ontology §9 (Decision), §6 (Intervention), §10, §11; header *Principle* | The extension story is strong: Decision is a generic typed template (id, purpose, typed I/O, dependencies, confidence, failure modes) and "the engine *is* a directed acyclic graph of Decisions" (§9); Intervention is explicitly the future-proofing category — "endurance programming, nutrition, and AI-proposed protocols all enter as new *kinds of Intervention*, not new engines" (§6); Override/AI substitute at the same contract seam, still gated by Validation (§9, §10). Short of world-class on two counts: the Reasoning Spine (§2) is drawn as a closed linear sequence with no stated rule for how a new decision registers into the DAG, and the header Principle ("new concepts are added to this ontology *first*") combined with frozen status routes every new decision's entities through frozen-document amendment (GA-204). |

### Probe capabilities (vocabulary slice only; primary owners per 00 §3 are TAS/EDS)

| Capability | Verdict | Cited Article/§ | Reasoning |
|---|---|---|---|
| **P2.1** Testing/assessment batteries *(probe — vocabulary slice)* | SILENT | Ontology §5 (Physical Quality, Capability), §4 (Sport) | Assessment exists only as attributes of other entities — Physical Quality carries an "assessment method", Capability a "source (measured from lifts/assessments/logs…)", Sport an SKB "assessments" section. There is no **Test/Assessment** entity and no **Test Result** entity: a scheduled, versioned, repeatable protocol whose results persist as comparable data points has no canonical name. **What breaks:** the assessment build (the engine audit's top gap — G1, "the diagnosis pivot runs on priors"; engine-audit 08) has no ontological contract to build against, so testing gets implemented as ad-hoc profile fields — the exact vocabulary drift the Ontology exists to prevent. **When it bites:** immediately — G1 is the audit's P0 — and fully at the data-platform stage. **Absorbable without amendment? No** — the Ontology's own Principle requires the entity be defined *here first*, and the document is frozen; there is also no existing family (Families I–VII) whose template hosts a measurement event + result pair. |
| **P2.4** On-pitch/match performance data *(probe — vocabulary slice)* | THIN | Ontology §8 (Load, Recoverability), §4 (Competition) | Family VI was defined total-load from the start — Load is "accumulated training stress over time, from gym + sport" and Recoverability the ceiling on "*total* load (gym + sport + life)" (§8) — so on-pitch load is *conceptually* inside the model, which is genuine coverage. But Competition is a calendar anchor only ("a dated event… that anchors periodisation and the taper", §4): there is no **Match Performance** entity (minutes, output, availability) and no **External Load datum** entity (the GPS/accelerometry observation itself, with provenance). The sport half of "gym + sport" has no named carrier. |
| **P2.7** Team-level analytics & squad readiness *(probe — vocabulary slice)* | THIN | Ontology §3 (Coach, Team), §8 (Readiness), §10 | The privacy-bounded coach surface is defined relationally — Coach has "a *derived, team-scoped, raw-vitals-never* read surface" (§3) and Readiness is "the canonical *derived* signal a coach may see" (§8) — but the squad-level *objects* are unnamed: no Squad Readiness roll-up, no team loading view, no availability board entity. Evidence that the need is real and already downstream: `docs/product/TEAM-ARCHITECTURE.md` §"Data model" defines a concrete `player_status` derived surface with no ontological home. Family I holds actors, Family VI holds per-athlete state; nothing hosts a per-team derived signal. |
| **P2.11** Reporting & insight delivery *(probe — vocabulary slice)* | THIN | Ontology §9 (Recommendation, Validation), §7 (Plan) | Decision-facing delivery is well-typed: Recommendation bundles advice + rationale + confidence (§9), Validation emits a report (§9), the Plan carries its decision trace (§7). But *analytical* delivery has no vocabulary: no **Report**, no **Insight**, no athlete-progress or coach-facing analytical artefact. The benchmark's "insights reach each audience in their language" has entities for coaching advice only, not for analysis products. |
| **P6.3** Team/coach workflows → constraints *(probe — vocabulary slice)* | ADEQUATE | Ontology §3 (Coach, Team), §4 (Competition), §8 (Constraint), §10 | The constraint pathway is complete and typed: the Coach "feeds the fixed sport schedule into each athlete's weekly/scheduling decisions as a **Constraint**" (§3), a Team's schedule "becomes a **Constraint** on each member's plan" (§3, §10), Competition carries "the fixture schedule and congestion" for teams (§4), and Constraint records its source ("athlete model or **Coach**", §8). What keeps it from world-class at this altitude: the schedule items themselves (fixture, shared pitch session) live as attribute blobs, not shaped entities — absorbable, because Constraint is open-typed with a declared source (GA-210). |

## §3 What is world-class here

Recorded honestly; the first four become COVERED findings in §4.

1. **The Diagnostic Triangle and the PIVOT (§1.3, §2).** The single idea that
   most distinguishes a coaching engine from a plan generator is given a formal,
   typed home: quality as shared axis, Capability vs Demand, Limiting Factor as
   the weighted gap. Diagnosis-first is not exhorted — it is made the only thing
   the vocabulary can express (GA-201).
2. **Autoregulation with a stable contract (§7, §8).** Readiness→Dose scaling
   before construction, Adaptation Projection over (never into) the immutable
   Plan, and freeze-on-commit on Session match the benchmark's P1.10 statement
   almost clause for clause (GA-202).
3. **The quality taxonomy is knowledge, not ontology (§5).** Physical Qualities
   are "authored as Knowledge (the quality taxonomy)" with an open-ended list
   ("…and so on"), so the quality vocabulary grows by data authoring, with no
   amendment. The fixed-projection failure was implementation truncating what
   was authored (SR-05; engine-audit 07 · B3; engine-audit 04 — evidence only),
   not an ontology rule; and the guard "*a quality with no assessment and no
   dose model is a label, and the platform may not act on labels*" (§5, citing
   Constitution Art 12) is elite honesty discipline (GA-211).
4. **The Load/Fatigue/Recovery/Readiness/Recoverability disambiguation (§8).**
   Five chronically confused terms defined precisely and distinctly, with
   Fatigue made first-class and total load (gym + sport + life) in scope from
   the first line — the canonical semantic base P2.2/P2.5 monitoring needs
   (GA-212).
5. **Template discipline as governance.** Every entity states Definition,
   Purpose, Attributes, Relationships (with cardinality), Produced-from/Feeds,
   Consumers, Example — so "who reads this and with what authority" is never
   implicit; Confidence is attached to every input and output and maps to an
   authority tier (§9). §10's cardinality table and §11's record of deliberate
   changes (with reasoning) are the kind of self-documenting rigour most
   ontologies never reach.
6. **Override as a first-class entity (§9, §11.7)** — "the human is the final
   authority" made structural, recorded, and learned from, at the same seam an
   AI would use, still bounded by Validation.

## §4 Findings (GA-2xx)

| ID | Capability | Verdict | Citation | Narrative | Class | Proposed direction |
|---|---|---|---|---|---|---|
| **GA-201** | P1.1 (co-own) | WORLD-CLASS | Ontology §1.3, §2, §5 | The Diagnostic Triangle + PIVOT give diagnosis-first a complete typed vocabulary that makes prescription-before-diagnosis inexpressible. | COVERED | None — record as a positive in 09. |
| **GA-202** | P1.10 (co-own) | WORLD-CLASS | Ontology §7, §8 | Readiness→Dose scaling, Adaptation Projection over the immutable Plan, and freeze-on-commit type day-scale autoregulation exactly as the benchmark defines it, stable contract included. | COVERED | None — record as a positive in 09. |
| **GA-203** | P2.10 | ADEQUATE | Ontology §8 (Load), §9 (Confidence, Learning) | The consumer/authority wiring pattern is world-class in kind, but the loop's input vocabulary stops at training-state signals; analytic products (test results, trends, insights) have no entities to enter the loop through. | AMENDMENT CANDIDATE | Extend the entity catalogue with the measurement/analysis family (GA-205–GA-209) so each analytic product declares its Consumers and authority tier like every existing entity. |
| **GA-204** | P6.2 | ADEQUATE | Ontology header *Principle*, §2, §9 (Decision), §11 | The Decision template + Intervention generality + same-seam substitution absorb new decision types in kind, but the spine is drawn closed with no registration rule for new decisions, and the "concepts added here first" Principle × frozen status makes every extension a frozen-doc amendment — a growth tax the end-state cadence (endurance, RTP, taper, analytics decisions) will pay repeatedly. | AMENDMENT CANDIDATE | Add an extension clause distinguishing *additive* entity/decision registration inside an existing family (versioned, routine) from *structural* change to the three structures (constitutional amendment). |
| **GA-205** | P2.1 (vocabulary slice) | SILENT | Ontology §5 (Physical Quality, Capability), §4 (Sport) | No Test/Assessment or Test Result entity anywhere in Families I–VII; assessment exists only as attributes of other entities. Breaks the assessment build's contract (G1; engine-audit 08 — evidence); bites now (P0 gap) and fully at the data-platform stage; not absorbable without amendment — no host family, and the Ontology's Principle requires definition here first. | AMENDMENT CANDIDATE | Add a Measurement & Analysis family (Family VIII) whose first entities are Assessment (protocol, versioned) and Test Result (comparable datum feeding Capability). |
| **GA-206** | P2.4 (vocabulary slice) | THIN | Ontology §8 (Load, Recoverability), §4 (Competition) | Total load is conceptually in scope ("gym + sport + life") but the sport half has no named carriers: no Match Performance entity, no External Load datum entity; Competition is only a calendar anchor. | AMENDMENT CANDIDATE | Same family as GA-205: add Match/Competition Performance and External Load Observation entities, feeding Load and the Performance Outcome transfer check. |
| **GA-207** | P2 pillar-wide (esp. P2.10, P2.6; probe 3) | SILENT | Ontology §1 (the three structures), §8 (Athlete State), §9 (Learning) | The three orthogonal structures accommodate coaching reasoning only; there is no structure for the analysis lifecycle (data → model → insight → decision). Learning (outcomes → priors) is the sole analysis pathway, and "everything else is derived" (§8 Athlete State) treats analysis products as exhaust. **What breaks:** when the analytics platform is built, contributors have no canonical map for the data domain — the ambiguity the Ontology exists to prevent recurs wholesale in the platform's second product. **When it bites:** partially now (coach dashboard signals), fully at the athlete-data-analysis stage. **Absorbable without amendment? No** — a fourth structure is an addition to §1, the document's load-bearing frame. | AMENDMENT CANDIDATE | Add an Analysis Spine as a fourth structure in §1 (capture → model → insight → decision), with its entities in the new family; whether the *mechanics* warrant a Data & Analytics Architecture Specification peer to the EDS is deliverable 08/09's ruling — the *names* belong here by the Ontology's own scope. |
| **GA-208** | P2.7 (vocabulary slice) | THIN | Ontology §3 (Coach, Team), §8 (Readiness); evidence: `docs/product/TEAM-ARCHITECTURE.md` §"Data model" | The coach's derived read surface is defined relationally, but squad-level derived objects (squad readiness roll-up, team loading view, availability board) are unnamed; the `player_status` derived surface specified in TEAM-ARCHITECTURE.md has no ontological home. | AMENDMENT CANDIDATE | Add a Squad Signal (derived, per-team, raw-vitals-never) entity to the new family, typed to the same Confidence/authority discipline as Readiness. |
| **GA-209** | P2.11 (vocabulary slice) | THIN | Ontology §9 (Recommendation, Validation), §7 (Plan) | Coaching-advice delivery is typed (Recommendation, Validation report, decision trace); analytical delivery is not — no Report or Insight entity for athlete progress or coach analytics. | AMENDMENT CANDIDATE | Add Report/Insight entities (audience, source data, derivation, confidence) so delivery surfaces are governed for accuracy against underlying data. |
| **GA-210** | P6.3 (vocabulary slice) | ADEQUATE | Ontology §3, §4 (Competition), §8 (Constraint) | The coach-schedule→constraint pathway is fully typed, but schedule items themselves are attribute blobs, not shaped entities. Absorbable: Constraint is open-typed with a declared source (coach), so the team-schedule spec can define item shapes as Constraint content without amendment. | SPEC-FILLABLE | The coach-schedule→constraints design spec defines fixture/shared-session item shapes as typed Constraint payloads, citing Ontology §8. |
| **GA-211** | P6.1/P6.2 (quality-vocabulary growth) | WORLD-CLASS | Ontology §5 (Physical Quality) | The quality taxonomy is knowledge data with an open-ended list, so the quality vocabulary grows without amendment; the fixed-projection truncation was implementation, not ontology (SR-05; engine-audit 07 · B3; engine-audit 04 — evidence only), and the "may not act on labels" clause is elite honesty. | COVERED | None — record as a positive in 09. |
| **GA-212** | P2.2/P2.5 (state-vocabulary slice) | WORLD-CLASS | Ontology §8 (Family VI) | Load/Fatigue/Recovery/Readiness/Recoverability precisely disambiguated, Fatigue first-class, total load in scope from the first line — the canonical semantic base monitoring and recovery analytics need. | COVERED | None — record as a positive in 09. |

## §5 Over-specification risks

1. **The concepts-first Principle × frozen status is a platform-wide growth
   bottleneck.** "Nothing should be implemented until the entity it manipulates
   is defined here… added to this ontology *first*" (header Principle) is
   exactly right as discipline — but the document is frozen, so *every* new
   concept in *any* domain (analytics, endurance, RTP, nutrition, native
   platforms) requires a constitutional-grade amendment before a line of code.
   At end-state cadence this either throttles delivery through the amendment
   pipeline (a P6.5 load the process may not bear) or — worse — trains
   contributors to bypass the ontology, recreating the vocabulary drift it
   exists to prevent. GA-204's extension clause is the release valve.
2. **The Reasoning Spine reads as normative and closed.** §2 presents *the*
   order of coaching with edge-by-edge rationale, which is superb pedagogy —
   but decisions the end-state adds that do not originate at the Athlete→Goal
   root (an analysis-triggered mid-block reassessment from a test result; an
   RTP gate opened by a rehab milestone) have no drawn entry point. If the
   diagram is treated as exhaustive rather than exemplary, new decision types
   get force-fitted onto the linear chain.
3. **Hard cardinalities frozen as law.** §10 states `Athlete —has→ Goal 1:1`
   with multi-goal handled by combination into one Demand Profile — honestly
   flagged as open (EDS Q6, cited at §4 Goal) — but a frozen `1:1` in the
   cardinality table is the kind of precise commitment that hybrid athletes and
   concurrent life-goals may falsify, forcing an amendment where a `1..*
   (combined)` would have absorbed it.

## §6 Load-bearing assumptions the end-state falsifies

1. **"Everything else is derived" (§8 Athlete State).** The Ontology assumes
   Athlete State is the only durable, portable record and all analysis products
   are recomputable exhaust. The end-state's second product — the longitudinal
   understanding of the athlete (benchmark §1; P2.6) — makes test results,
   match data, reports, and analytical baselines durable assets in their own
   right, with their own provenance and versioning. **Falsified.**
2. **Learning-to-priors is the only analysis pathway (§9 Learning).** The
   end-state adds analysis products that are *not* prior updates: insight
   surfacing (P4.3), benchmarking against norms (P2.8), squad roll-ups (P2.7),
   reports (P2.11). The single-pathway assumption is **falsified**; the
   priors channel survives as one pathway among several.
3. **Competition is a calendar anchor, not a data source (§4).** End-state
   match performance data (P2.4) makes the Competition also a producer of
   observations that feed Load and the Performance Outcome transfer check.
   **Falsified in half** — the anchoring role survives untouched.
4. **A Team adds "constraints + a derived read surface — not a second
   reasoning system" (§3 Team).** The end-state honours the no-second-engine
   half, but squad planning ("is the squad doing too much?", P2.7) requires a
   first-class *aggregation* layer with its own entities — more than a read
   surface, less than a second engine. **Partially falsified.**
5. **Vocabulary change is rare enough to freeze flat.** The freeze treats all
   ontology change as equally constitutional. Each end-state stage arrives
   with an entity family (measurement, analysis, endurance, RTP, squad); the
   assumption of low change cadence is **falsified**, and GA-204's
   additive-vs-structural distinction is the survivable form of the freeze.

## §7 Document verdict

For the role it set itself — the canonical vocabulary of coaching reasoning —
the Decision Ontology is genuinely world-class, and this audit found nothing
in that core to manufacture doubt about: the three-structure separation (§1),
the Diagnostic Triangle, the Load/Fatigue/Recovery/Readiness/Recoverability
disambiguation (§8), first-class Override (§9), and the uniform
consumers-and-confidence template are governance most elite organisations
never write down, and its §11 record of *why* it differs from its own brief is
exemplary stewardship. But the document claims the whole platform's vocabulary
— "engine, app, team, AI, **and data model**" — and against that claim it
governs only one of the benchmark's two products. The programme vocabulary is
complete; the athlete-understanding vocabulary stops at training-state
signals: no test result, no match performance, no external-load datum, no
insight, no report, no squad-level signal, and no structural home for the
analysis lifecycle at all (GA-205–GA-209, GA-207). The gaps are additive — a
new family and a fourth structure, not a rewrite; the three structures and
every existing entity survive contact with the end-state — but by the
document's own concepts-first Principle none of it can be built until the
frozen document is amended, which makes the missing family a hard gate, not a
backlog item. Verdict: **world-class at its core, materially incomplete for
its declared scope; amendable without structural damage, and amendment is the
only path its own rules allow.**
