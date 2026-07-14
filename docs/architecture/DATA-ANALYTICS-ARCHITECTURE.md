# Data & Analytics Architecture Specification (DAAS)

*How the platform measures, models, analyses, and reports the athlete — the governing
document of the second product.*

> **PROPOSED — designate pending ratification via DOCUMENTATION-GOVERNANCE §Ratification.**
> This document is the ND-1 deliverable (amendment queue row ND-1; commissioned by
> governance audit 08 §4 under the GA-512 ruling). Until ratified it binds new work —
> data-pillar work is built and reviewed against it — but loses precedence conflicts
> against the ratified set (DOCUMENTATION-GOVERNANCE §1, §3).

| | |
|---|---|
| **Status** | v0.1 — PROPOSED designate (T2 candidate, peer to the EDS), pending adversarial panel review and ratification by Simon per DOCUMENTATION-GOVERNANCE §3 |
| **Authority** | Subordinate to the [Constitution](../foundation/CONSTITUTION.md), the [Decision Ontology](../foundation/DECISION-ONTOLOGY.md), and the [Knowledge Architecture](../foundation/KNOWLEDGE-ARCHITECTURE.md). Peer to the [EDS](../engine/00-ENGINE-DESIGN-SPECIFICATION.md) and the [TAS](TAS.md), coordinated with [AIGAS](AIGAS.md): the EDS governs how the platform *decides*, the TAS governs *where software responsibilities live*, AIGAS governs *what AI may be* — this document governs how the platform **measures, models, analyses, and reports the athlete**. Where it conflicts with a governing document, the governing document wins and this one is corrected. |
| **Scope** | Platform-wide and permanent: every capture stream, every element of the longitudinal athlete record, every analytical product (trend, insight, benchmark, squad signal, report), and every delivery surface for analytical content — present or future — is validated against this document before it is built. |
| **Commissioning evidence** | Benchmark capabilities P2.1–P2.11 + P3.5 ([governance audit 00 §2](../reviews/2026-07-11-governance-audit-00-benchmark.md)); the consolidated per-link requirements of [governance audit 08 §4](../reviews/2026-07-11-governance-audit-08-data-analytics-pillar.md); the GA-512 new-document ruling; the cross-document fixes GA-801, GA-803, GA-804 (audit 08 §5). |
| **Citation convention** | This document builds on the amended governing vocabulary of the 2026-07 amendment batch — the Analysis Spine and Family VIII (Ontology, [batch 02](../design/amendment-batch-2026-07/02-ontology.md), AQ-2), decision D17 and the §20.1 extension clause (EDS, [batch 03](../design/amendment-batch-2026-07/03-eds.md), AQ-3/AQ-4.2), Constitution Articles 21 and 22 ([batch 01](../design/amendment-batch-2026-07/01-constitution.md), AQ-6/AQ-7), and the derived-data doctrine clarification ([batch 04](../design/amendment-batch-2026-07/04-derived-data-doctrine.md), AQ-5). Until Simon's ratification PR applies the batch, citations to that vocabulary resolve to the batch proposal files; after it lands, they resolve to the amended sections themselves. **The pre-ratification consistency pass reconciles this document against the applied text; any drift is recorded as a finding, never silently fixed.** |
| **What this is not** | Not an implementation guide, not a database schema, not a product roadmap, and not a status document (status lives in HANDOFF.md only). It defines *governance*: what is captured, how it is modelled, what may claim what authority, and who sees it. Mechanisms — table designs, job cadences, chart types — belong to the Phase 3/4 supporting specs that cite this document. |
| **Traceability** | Every normative statement traces to a Constitution Article, a governing-document clause, or a commissioning evidence line (P2.x / GA-xxx). A statement with no trace does not belong here. The coverage map is §10. |

---

## The central principle

> **The platform's second product — the evidence-graded understanding of the athlete —
> is governed with the same discipline as the first. Every datum enters with known
> provenance; every derivation is attributed; every analytical claim carries exactly
> the authority its evidence quality earns, end to end; and nothing about an athlete
> crosses a person boundary except by the athlete's consent, and only ever as a
> derived signal.**

The Constitution's amended Preamble names the two inseparable products: the programme,
and the understanding of the athlete that makes the programme right (batch 01, AQ-1.1;
GA-113). The EDS governs the first. This document governs the second — not as a rival
reasoning system, but as the evidence lifecycle the reasoning system deserves: the
Analysis Spine (Ontology §1.4 as amended, AQ-2.1) given an architectural owner.

## How to read this document

Ten movements:

1. **Purpose & rank** (§1) — what this document owns, what it explicitly does not,
   and its first act: bringing the de-facto data estate under governance (GA-803).
2. **The five links** (§2) — the end-to-end chain CAPTURE → MODEL → ANALYSE → DECIDE
   → PRESENT, each link specified: data classes owned, Family VIII entities carried,
   knowledge domains touched, architecture home, decisions fed, privacy posture.
3. **The longitudinal athlete model** (§3) — the career-long, append-only, versioned
   data asset; the derived-data doctrine's historical-evidence permission made
   architecture.
4. **The metric dictionary and the propagation rule** (§4) — the one definition per
   metric (GA-804) and the single quality → confidence → authority rule for the whole
   chain (GA-801).
5. **Team & squad analytics** (§5) — the Squad Signal family and its privacy lineage.
6. **Benchmarking, norms & internal evidence** (§6) — population/positional norms as
   governed knowledge; the internal-evidence pathway (P3.5).
7. **Reporting & insight delivery** (§7) — the analytics read-model, accuracy
   governance, and the presentational-analytics line.
8. **Contracts & validation** (§8) — what D14-class validation means for analytical
   outputs; falsifiability; the silent list stays empty.
9. **Staging & build order** (§9) — what Phase 3/4 build first; explicit deferrals
   and when each bites.
10. **The coverage & audit map** (§10) — every commissioned capability mapped to its
    owning section, so an auditor can verdict each against this text.

Every section answers four questions: **what** is captured, modelled, or claimed;
**who owns** it (this document, or a named other); **how it is governed** (the rules
and their authority); and **what validates it** (the check that catches a violation).
A section that cannot answer all four is defective — file the defect, do not paper it.

---

# 1. Purpose & rank

## 1.1 The second product

An elite performance department produces two things: the programme, and a
longitudinal, evidence-graded model of who the athlete is — tested capacities,
training and injury history, competition output, recovery patterns (benchmark 00 §1;
Constitution Preamble as amended, AQ-1.1). Before this document, the platform governed
athlete data superbly *as an input to programming and as a privacy liability*, and
hardly at all *as a product in its own right* (audit 08 §3). This document is that
product's governing specification. Its subject is the **Analysis Spine** (Ontology
§1.4 as amended): the path evidence travels from observation to understanding to
decision and delivery.

**What "elite athlete data analysis" means here, concretely** — never as a slogan:
every measurable fact about the athlete enters with a stated source and reliability
(§2.1); those facts accumulate into one career-long record from which any past state
of the evidence can be honestly read (§3); the record yields attributed, confidence-
tiered interpretations — trends, anomalies, benchmark positions, squad states (§2.3,
§5, §6); those interpretations reach coaching decisions through exactly one governed
gate (§2.4) and reach humans in their own language with every figure traceable (§7);
and at every step, what a claim is allowed to *do* is bounded by the quality of the
data underneath it (§4.2).

## 1.2 Position in the hierarchy

- **Below** the Constitution (all Articles; Articles 11, 13, 14, 15, 17, 18, 20 bind
  constantly here, and Articles 21 and 22 — batch 01 — bind §3, §5, §6 by name), the
  Decision Ontology (this document adds no entity; Family VIII names everything it
  governs), and the Knowledge Architecture (the eight kinds, the evidence scale, and
  the confidence → authority mapping are consumed, never redefined).
- **Peer** to the EDS: the EDS owns every decision, including D17 — this document owns
  the data classes D17 reads and the product families it emits into the world.
- **Peer** to the TAS: the TAS owns the layers and boundaries — this document
  specifies *what fills* the analytics territory the TAS reserved (the L5 Analytics
  module, TAS §4.5; the read-model seam, TAS §11 and §16.1 C1) and never relocates a
  TAS boundary. Where an analytics requirement seems to need a new boundary, that is
  a TAS amendment candidate, not a DAAS invention.
- **Coordinated** with AIGAS: every AI touchpoint in this document (C4 summarisation,
  C5 analysis, C6 drafting, C2 rendering) stays behind AIGAS's categories, seams, and
  gates unchanged (AIGAS §6.2, §11); §2.3.4 defines the grounding surface AIGAS's
  per-capability declarations bind to.

## 1.3 What this document owns

One concept-owner each (DOCUMENTATION-GOVERNANCE §5). This document is the canonical
owner of:

- **The five-link chain as a governed whole** (§2) — the composition rule that no
  link ships output the next link has no home for.
- **The per-datum provenance & quality model** (§2.1.1) — source classes, reliability
  tagging semantics, sensor-vs-self separation, retention classes (GA-506, GA-309
  treatment).
- **The assessment-battery architecture** (§2.1.2) — protocols as versioned
  knowledge, scheduling, results as comparable data points (GA-502 + GA-421 + GA-205
  consolidation).
- **The second ingestion boundary** (§2.1.5) — match/pitch/availability data on the
  proven ACL pattern (GA-504 + GA-206 + GA-310 + GA-420).
- **The longitudinal athlete record** (§3) — append-only history, materialisation
  selection, reconstruction guarantees, retention (GA-508 + GA-414; the AQ-5
  permission exercised).
- **The Metric Dictionary** (§4.1) — the governed normalisation target every
  ingestion boundary maps into (GA-804).
- **The quality → confidence → authority propagation rule** (§4.2) — stated once,
  for the whole chain (GA-801).
- **The analytical product families and their contracts** (§2.3, §5, §6, §8) — trend
  products, recovery analytics, benchmark comparisons, Squad Signals, Insights,
  Reports (GA-503, GA-505, GA-307, GA-209 mechanics side).
- **The internal-evidence promotion gate** (§6.3) — how platform data becomes graded
  evidence (GA-306 + GA-513 composition; P3.5).
- **The analytics reporting read-model and accuracy governance** (§7), including the
  presentational-analytics line (audit 05 §5.1's undrawn line, drawn).
- **The AI grounding surface for longitudinal data** (§2.3.4) — the enumerated
  classes a C5 scan may read (audit 06 §6.5, routed here).

## 1.4 What this document does NOT own

**Hard rule: this document links to these owners; it never restates or re-derives
their content. A future edit that copies an owner's rule into this text is a defect.**

| Concept | Owner | This document's relation |
|---|---|---|
| Entity definitions: Assessment, Test Result, Match Performance, External Load Observation, Insight, Squad Signal, Report | Decision Ontology §10, Family VIII — Measurement & Analysis (batch 02, AQ-2.2) | Consumes the names; specifies their data-class governance and product mechanics |
| The Analysis Spine as a structure | Decision Ontology §1.4 (batch 02, AQ-2.1) | Is its architectural owner, not its definer |
| D17 · Observation & Analysis — contract, members, graph position, D15/D16/D17 boundary | EDS §20 (batch 03, AQ-3) | Feeds it; never widens its wiring (§2.4) |
| New-decision admission | EDS §20.1 (batch 03, AQ-4.2) + Ontology §13 (batch 02, AQ-4.1) | Routes every new analysis member through it |
| The eight kinds of "stuff"; Stored vs Derived Data | Knowledge Architecture §2 (as clarified by AQ-5.1) | Classifies its data classes by them |
| The evidence scale, confidence tiers, and the confidence → authority mapping | Knowledge Architecture §3.1, Domain 10 | §4.2 composes on top of the mapping; never re-maps |
| Per-source reliability scaling and the index contract | Knowledge Architecture Domain 7 | The propagation rule's derivation step is that contract |
| The derived-data doctrine (recompute-not-truth + the dated-history permission) | KA §2.1 / EDS §27 rule 5 / TAS §7 (batch 04, AQ-5) | §3 exercises the permission; grants nothing itself |
| The layered architecture, the ACL ingestion pattern, materialised server-side surfaces, offline-first sync | TAS §3–§4, §4.4, §16.1 | Instantiates; never relocates |
| The one-trace/three-audiences explanation read-model | TAS §11; EDS decision-record mechanics | §7 extends the pattern to analytical artefacts |
| AI categories, seams, gates, prohibitions, transparency | AIGAS §6, §11, §13, §15 | Every AI touchpoint here inherits them unchanged |
| Raw-vitals inviolability (the protection ceiling) | Constitution Art 11 | Restated nowhere; enforced everywhere |
| Consent basis, athlete ownership, export/erasure, secondary-use gate | Constitution Art 22 (batch 01, AQ-7) | §3.5, §5, §6.3 bind to it |
| Developmental-stage duty of care | Constitution Art 21 (batch 01, AQ-6) | §6.1's differentiation axes and conservative default bind to it |
| Team data isolation mechanics (RLS, `player_status`) | TEAM-ARCHITECTURE (T3, supporting) + TAS | §5 governs the signal family those mechanics serve |
| Learning, priors, and Predictions | EDS D16; KA Domain 12; TAS §10 | §2.3.2 draws the Insight/Prediction boundary; owns neither side's mechanics |

## 1.5 First act: the de-facto estate enters governance (GA-803)

At commissioning, the data pillar's operative semantics live in non-governing tiers:
the athlete-model schema in a living implementation reference
([`ATHLETE-MODEL.md`](ATHLETE-MODEL.md)), the database reality in a stale supporting
doc (`docs/SCHEMA.md`), and the coach-visible derived surface in a product doc
([TEAM-ARCHITECTURE](../product/TEAM-ARCHITECTURE.md)) — a precedence vacuum in which
implementation-speed choices harden into de-facto standards (GA-803).

**Hard rule: from this document onward, no data-pillar semantic or schema choice is
made except against this specification.** The ratify-or-supersede disposition:

1. **`docs/architecture/ATHLETE-MODEL.md`** — remains a T3 implementation reference,
   now validated against §3. Its *current-state* model (typed, field-justified,
   source/confidence-tagged) is ratified as the seed of the longitudinal record's
   current-state view. Where its shapes conflict with §3 (notably: latest-only
   history in `users.profile` JSONB — the TR-03 evidence), the conflict is a
   **recorded divergence with a migration obligation** (Phase 3), never a standard.
2. **`docs/SCHEMA.md`** — superseded: Phase 3 authors a DAAS-validated data reference
   as its successor; the stale document is archived per DOCUMENTATION-GOVERNANCE §4.
3. **`player_status` / `CoachVisibleStatus`** — ratified as the live first member of
   the Squad Signal lineage (§5.1); its derived-only posture is confirmed, its
   point-in-time-only limitation is a §9 staging item, not a design.

Validated by: the DOCUMENTATION-INDEX ownership registration performed at this
document's ratification (the GA-704 mechanism), and the Phase 3 specs' traceability
sections citing §3/§5 rather than the legacy docs.

---

# 2. The five links

World-class athlete data analysis is one unbroken chain (audit 08 §1): **CAPTURE →
MODEL → ANALYSE → DECIDE → PRESENT**. The chain is sequential in dependency; a
world-class fragment in one link is worth little if the next link has no home for its
output. Two chain-wide rules:

- **Hard rule — no orphan outputs.** No link may ship a data class or product whose
  consuming link has no governed home for it. A capture stream nothing models, a
  model field nothing analyses *and* nothing reports, an insight nothing consumes and
  no surface shows: each is an Art 20 violation filed against the proposer.
- **Hard rule — no smuggled links.** No component may collapse two links privately
  (e.g. a surface that captures *and* interprets, or an ingestion job that writes
  conclusions). Each link's work happens at its architecture home, under its rules.

The link-ownership table (each cell elaborated in the subsection cited):

| Link | Data classes owned (KA kind) | Family VIII entities | Knowledge touched | Architecture home (TAS) | Decisions fed | Privacy posture |
|---|---|---|---|---|---|---|
| **CAPTURE** §2.1 | Observations: test results, session outcomes, monitoring entries, wearable readings, match/external-load data (Stored Data) | Assessment · Test Result · Match Performance · External Load Observation | Metric Dictionary (§4.1); assessment protocols (KA Domains 2/3); source reliability (Domain 7) | L4 ingestion boundaries (ACLs) + Persistence; L6 logging surfaces (capture only) | none directly | Owner-only at rest (Art 11); consent recorded at grant (Art 22) |
| **MODEL** §3 | The longitudinal athlete record: observations + dated materialised derivations + decision/plan trace refs + baselines + consent grants (Stored Data, incl. Stored-Data-about-derivations per AQ-5) | (the record the entities compose into) | Baseline models (Domain 7); retention classes (this doc) | L4 Persistence (owner-private); stamps per TAS §4.1 | D17 reads it (sole reader for interpretation) | Owner-private; crossings only via §5's derived roll-up |
| **ANALYSE** §2.3 | Analytical products: trends, anomalies, recovery analytics, benchmark comparisons, squad aggregates, report content (Derived Data promoted to named entities) | Insight · Squad Signal · (Report content) | Norms (Domain 1); derivation models (Domain 7); evidence/authority (Domain 10) | L1 = D17 members (pure reasoning); L5 Analytics = orchestration + materialised read-models, off the request path | D17 emits; nothing else | Derivation-scoped: a product's privacy class is the max of its inputs' (§4.2 rule 6) |
| **DECIDE** §2.4 | none new — the wiring discipline | Insight (as D17 output) | Confidence→authority mapping (Domain 10) | L1 decision graph | D17 → D1/D4/D15/D16 + the re-diagnosis trigger, per the EDS — and only that | Decisions never widen visibility |
| **PRESENT** §7 | Composed delivery artefacts and analytics read-models | Report | none new (renders, never derives) | Read-models served via L3/L5; L6 renders only | none (delivery, not decision) | Audience scope applied at composition (Art 11 ceiling; Art 22 grant) |

## 2.1 CAPTURE — everything enters with known provenance

### 2.1.1 The per-datum provenance & quality model (P2.9)

**Every observation, at write time, carries:** its Metric Dictionary id (§4.1); its
**provenance class**; a **reliability tag**; its timestamp/window; and its recording
conditions or deviations where the metric's dictionary entry demands them. The
provenance classes are a small closed set, governed here:

- `measured` — an instrumented protocol under stated conditions (a Test Result from a
  supervised or condition-checked Assessment; a calibrated device in a defined test).
- `device` — a passive sensor stream; reliability defaults per device class from the
  Metric Dictionary entry (the KA Domain 7 scale: ecg / chest-strap / finger-ring /
  wrist-optical / …).
- `self-administered` — an athlete-run test protocol without supervision.
- `self-report` — subjective entries: wellness, RPE, check-ins. **Never conflated
  with sensor data**: a self-reported "sleep 8h" and a device-read sleep duration are
  distinct data points under distinct provenance, even for the same metric.
- `third-party` — ingested from an external system (a league feed, a coach's GPS
  export); carries the source system's identity.
- `coach-report` — entered by a coach about a session/availability fact within their
  consented scope (never a vital).

**Hard rules.** (1) A datum without a dictionary id and provenance class is rejected
at the ingestion boundary — malformed capture fails fast, exactly as malformed
knowledge does (KA §3.2). (2) Provenance is immutable: correcting an erroneous
observation is a new, superseding observation referencing the old (append-only,
Art 15's no-silent-rewrite applied to data), never an edit. (3) Provenance classes
carry **quality descriptors, not confidence** — observations are Stored Data, ground
truth about what was recorded; confidence attaches at derivation (§4.2). *(The KA
§2.1 "Stored Data: confidence n/a" row reads strictly correct under this treatment;
the clarifying sentence GA-309 suggests remains an amendment-queue candidate, noted
here and not applied.)*

Retention classes (governed per data class, mechanism deferred to Phase 3 specs):
`career` (test results, session outcomes, injuries — the longitudinal backbone),
`window` (high-frequency device streams retained raw for a bounded window, with
derived dailies materialised to `career` before expiry — expiry is a declared
truncation, surfaced per Art 15, never silent), `ephemeral` (transport artefacts).

Failure modes: an unknown vendor metric arrives ⇒ it is queued unmapped and reported,
never guessed into a dictionary id; a datum missing conditions its dictionary entry
requires ⇒ accepted with a `degraded` quality flag that §4.2 propagates; two sources
disagree for the same metric/window ⇒ both are kept under their provenances, and the
dictionary entry's precedence rule (§4.1) selects which one derivations prefer —
never a silent average.

### 2.1.2 Assessment batteries (P2.1)

Testing is a first-class, scheduled, versioned act — not an onboarding questionnaire.

- **Protocols are knowledge.** An Assessment (Ontology Family VIII) is authored as a
  versioned knowledge entry — procedure, conditions, equipment, the qualities it
  estimates and the mapping onto each quality's scale, typical error, competency
  prerequisites, injury contraindications, re-test cadence — under the KA universal
  entry shape, homed with the quality taxonomy (Domain 3) and sport batteries (the
  SKB `assessments` section, Domain 2). **A protocol change is a new version, never a
  silent edit** — versioning is what keeps a 2026 result comparable with a 2031 one.
- **Scheduling is a decision, not a habit.** Which assessments to run, and when, is
  assessment-scheduling reasoning — a future D17-adjacent decision admitted through
  EDS §20.1 when built (§9); until then, cadence guidance from the protocol entry is
  surfaced advisorily. Assessments placed in a Session are bounded by Constraints and
  contraindications like any prescribed activity (Ontology).
- **Results are the durable point.** Each administration produces one Test Result:
  raw value(s), the derived score with the mapping version used, protocol version,
  conditions/deviations, provenance (`measured` or `self-administered`). Test Results
  are Stored Data in the longitudinal record (§3) — Capability remains the
  recomputable current estimate; the Test Result is the evidence it is estimated from
  (Ontology Family VIII boundary).

Validated by: registry validation on protocol entries (KA §3.2); the §8 attribution
validator on any product citing a Test Result (protocol version must be present);
comparability tests (same protocol version ⇒ comparable scale) in the Phase 3 build.

### 2.1.3 Monitoring streams (P2.2)

Daily subjective and objective monitoring (wellness, readiness inputs, HRV, sleep,
resting HR) is captured under §2.1.1 with two additional rules:

- **Defined semantics only.** Every monitored metric has one Metric Dictionary entry
  (§4.1); "sleep score" from two vendors lands as either one normalised metric (if
  the dictionary judges them commensurable) or two (if not) — decided in the
  dictionary, per entry, with rationale; never decided ad hoc in an adapter.
- **Individually baselined.** Monitoring data is interpreted against the athlete's
  own baseline (§3.4), with baseline maturity tracked (KA Domain 7's
  `baselineMaturity`); population constants are a cold-start fallback that the
  derivation's confidence must reflect. Derivation semantics themselves (how
  readiness is computed) are owned by KA Domain 7 and the EDS — not here.

### 2.1.4 Gym-performance capture (P2.3, capture half)

Every session's prescribed-versus-done persists at set granularity — load, reps,
RPE where reported, completion, substitutions, and (when hardware arrives, §9) bar
velocity — with the prescription reference, so "what was asked vs what happened" is
one join, not a reconstruction. This is the platform's richest owned stream and the
first trend substrate (§2.3.1). Capture at this boundary is already governed by the
TAS persistence rules; this document adds only the §2.1.1 tagging duties and the §3
persistence guarantee. The *analysis* half is §2.3 — the split GA-503 demanded.

### 2.1.5 The second ingestion boundary — sport & match data (P2.4)

External sport load and match output enter through a **Sport & Match ingestion
boundary** built on the proven wearable-ACL pattern (TAS §4.4 — the template is
reused, not reinvented; GA-501): per-source adapters, queued ingestion, normalisation
into Metric Dictionary metrics, reliability tagging.

- **Data classes:** Match Performance (exposure — minutes, availability status;
  output KPIs mapped to the sport's KPI framework; context) and External Load
  Observation (GPS/accelerometry data, pitch-session RPE, distances, sprint counts) —
  the Ontology's entities, verbatim.
- **Sources, in staging order (§9):** manual athlete/coach logging first (a minutes +
  RPE entry is a valid, honest Match Performance), file/export import second, vendor
  APIs third. **The schema is source-agnostic from day one** — a hand-logged and a
  GPS-derived external load differ in provenance class and reliability, not in shape.
- **Availability** is a status fact (available / modified / unavailable + return
  horizon), never clinical detail (Ontology: Injury's rule); it feeds the coach's
  availability view and Load accounting.
- Raw external-load observations are athlete-owned and follow the raw-data posture:
  coach visibility of anything derived from them is by consented grant and derived
  roll-up only (Arts 11/22).

Failure modes: a vendor's proprietary "load score" with undisclosed derivation is
admitted only as a `third-party` metric whose dictionary entry marks its semantics
opaque — it may be reported, and §4.2 caps anything built on it at reported-metric
authority; missing match data for a fixture ⇒ Load accounting states the gap
(assumed-exposure entries are Assumptions and flagged as such, KA §2), never invents
a number.

## 2.2 MODEL

The MODEL link is §3 in full. Stated here only for the chain: capture without the
longitudinal record is trend-blind; nothing in §2.1 is done until its output has a
§3 home.

## 2.3 ANALYSE — the analysis layer, designed

The word at TAS L5 ("Analytics"), expanded (GA-512). Two architectural rules first:

- **Reasoning is D17; serving is L5.** Every analytical *interpretation* — anything
  that assigns meaning, detects, compares, or flags — is a D17 member: pure engine
  logic, `same (history, knowledge) ⇒ same insights` (EDS §20 D17, P12). The L5
  Analytics module is D17's impure shell: it schedules runs off the request path,
  materialises outputs as dated read-models (under the AQ-5 doctrine, §3.2), and
  serves them. **L5 holds zero interpretation logic of its own** — the same
  discipline that keeps coaching out of L3.
- **Read-models, not recomputation, on the read path.** Analytical surfaces are
  served from materialised read-models refreshed on events/schedules (the TAS §16.1
  C1 precedent generalised); the synchronous engine is never on an analytics fan-out
  path.

### 2.3.1 The product families

Each family below is a D17 member's output class, shipped under the §8 contract.
New families register additively via EDS §20.1 + Ontology §13 — a dated entry, not
an amendment.

1. **Trend products** (P2.3 analysis half) — per-metric and per-lift trajectories
   over the longitudinal record: estimated-1RM trajectories (method and its version
   named in every output), tonnage and volume by quality/pattern, adherence rates
   (prescribed-vs-done, by week and by block), monitoring-metric trends against
   baseline. Every trend states its window, its data count, and its derivation.
2. **Anomaly & change-point findings** — departures from the athlete's own baseline
   or established trajectory (a plateau, a sustained readiness shift, an adherence
   collapse), each an Insight with the rule and threshold that fired it attributed.
3. **Recovery analytics** (P2.5) — the descriptive family: how this athlete's
   monitoring markers responded to given dose classes, time-to-baseline after
   session types, what covaried with faster recovery. **Boundary (load-bearing):**
   descriptive recovery findings are D17 Insights, owned here; the *predictive*
   per-athlete recovery-rate parameter is a Prediction/prior — D16 and KA Domain 12
   territory, which may consume these Insights as evidence (EDS D15/D16/D17
   boundary). This document owns the description, never the prior.
4. **Benchmark comparisons** (§6) — position against personal baseline first, then
   governed norms.
5. **Squad roll-ups** (§5) — the Squad Signal family.
6. **Report content** (§7) — assembly of the above for an audience.

### 2.3.2 The three honesty rules of analysis

- **Stated derivations.** Every product names its source data (by reference), method
  + version, knowledge-set and engine versions, and window. A product that cannot be
  attributed does not exist (it fails §8 V-A1).
- **Explicit degradation.** Sparse or missing data ⇒ fewer, humbler outputs that say
  so ("not enough data to say" is a compliant, first-class output; EDS L14). Silent
  imputation is prohibited; any interpolation a method performs is declared in the
  derivation record.
- **Interpretation, never prescription.** An Insight describes; it never reshapes a
  session, edits a plan, or writes a prior (the D17 boundary, EDS). Any planning
  consequence travels §2.4's road.

### 2.3.3 What analysis knowledge is

Trend/anomaly rules, baseline models, thresholds, and norm bands are **knowledge**
(cited, confidence-tagged, versioned — KA §3.1), living in L2, consumed by D17 —
never literals in analysis code (TAS §6). Homes: signal-derivation and baseline
models with Domain 7; normative bands with Domain 1 (§6.1); evidence/authority
treatment with Domain 10. Method *logic* is engine code under engine versioning;
method *parameters* are knowledge. No new KA domain is created by this document.

### 2.3.4 The AI grounding surface (the C5 enumeration)

AIGAS C5 (analysis) capabilities may read, for a given requesting scope, exactly
these longitudinal classes — and AIGAS's per-capability declarations bind to this
list (audit 06 §6.5; AIGAS §6.1/§19 authorisation rule inherited):

- *Athlete-scoped scan (the athlete's own assistant):* the athlete's observations
  (§2.1 classes), their materialised derivation history (§3.2), their served Insights
  and Reports, their plan/decision traces, and L2 knowledge.
- *Coach-scoped scan:* the coach's consented, team-scoped derived surface only —
  Squad Signals, CoachVisibleStatus, availability, plan/adherence summaries — plus L2
  knowledge. **Never** member observations, member raw vitals (Art 11), or
  non-consented history (Art 22).
- *No scan* may read another athlete's anything outside those grants, or any datum
  whose consent grant excludes AI processing.

C5 outputs are hypotheses — attributed, checkable, never auto-acted (AIGAS §11); if
adopted, they enter the world only as §2.4 allows.

## 2.4 DECIDE — one gate, three routes, advisory by default

The decision-side discipline is owned elsewhere and **protected here, not
redesigned**: the confidence → authority mapping (KA Domain 10), the authority tiers
(EDS §28.3), and D17's contract and wiring (EDS §20 as amended). This document adds
the binding composition rules:

- **Hard rule — D17 is the sole entry.** No analytical product reaches any engine
  decision except as a typed D17 output, at the tier §4.2 grants it, through D17's
  declared consumers (D1 and D4 on the next planning loop; D15's typed runtime
  inputs; D16 as evidence; the §23 re-diagnosis trigger). No surface, job, store, or
  AI writes an analytic value into a decision input by any other path. A feature that
  needs a new consumer edge proposes an EDS amendment; it does not improvise one.
- **Advisory by default.** Every analytical product is born `reported metric`. It
  becomes a `soft input` only when a named decision consumes it under a stated
  rationale, and `gate` only under §4.2 rule 5's conditions. "Wired to a named
  decision with stated authority, or explicitly advisory" (P2.10) is thus a
  structural property: the §8 contract records which, for every product.
- **AI-origin analysis takes exactly three routes** (the GA-604 framing, adopted):
  (1) advisory to humans, labelled per AIGAS §15; (2) staged, validated priors via
  Seam 2; (3) user-confirmed structured state via C1. There is no fourth route, and
  this document creates none.
- **Nothing silently rots.** Every product family declares its consumers (decision,
  surface, or both) at registration; §8's coverage check fails a family whose
  outputs are consumed by nothing — computed-but-unread is a detected defect (the
  TR-02 lesson made structural), not an operational accident.

## 2.5 PRESENT

The PRESENT link is §7 in full. Chain statement: DECIDE's trace discipline is what
PRESENT renders; a delivery surface that cannot trace a figure to its derivation may
not show it.

---

# 3. The longitudinal athlete model

## 3.1 What it is

The career-long record of the athlete on the platform — **one athlete-owned,
append-only, versioned evidence store** from which any past state of the evidence can
be honestly read and any long-horizon trend queried (P2.6). It contains, per athlete:

1. **Observations** — every §2.1 class, immutable, dated, provenance-tagged.
2. **Materialised derivation history** — point-in-time derived values kept as dated
   historical evidence under the AQ-5 doctrine (§3.2).
3. **Decision & plan history references** — the committed-plan traces and freezes the
   TAS already persists (TAS §16.1 C3; freeze-on-commit, Art 10), referenced so the
   record can answer "what was decided, and from what".
4. **Baselines** (§3.4) and **consent grants** (§3.5) as durable state.

It is the *evidence* asset. It is not a second reasoning system, not a cache of
current answers (current values are always recomputed — AQ-5 rule 2), and not the
Athlete Model *estimate* (Capability remains recomputable; this record is what it is
recomputed *from* and the trail of what was computed before).

## 3.2 Materialisation — the AQ-5 permission, exercised

The derived-data doctrine permits (never mandates) materialising point-in-time
derived values as dated historical evidence (KA §2.1 / EDS §27 rule 5 / TAS §7, as
amended by AQ-5). This section is the scoping the permission delegated:

**Every materialised row carries:** computation date; `engineVersion ×
knowledgeSetVersion` (the TAS §4.1 stamp); the D17 member (or engine call) and method
version that produced it; and its derivation input references. **Append-only; read
strictly as "what was computed then"; never re-served as current.**

**The initial materialised set** (extended per the criteria below, each addition a
recorded, dated decision in this document's revision history):

- Daily readiness and load state, as computed that day.
- Estimated 1RM per tracked lift, on session close.
- Weekly adherence and volume roll-ups, at week close.
- `CoachVisibleStatus` / Squad Signal snapshots, on refresh (the "versus last season"
  substrate — §5).
- **Every Insight and Report served to a human.** What the platform told someone is
  itself evidence about the platform, and must be reproducible verbatim.

**Admission criteria for a class:** (a) a longitudinal consumer exists or is being
built (a trend, insight, report, or the internal-evidence pathway), **or** (b) it was
shown to a human. Materialisation without a consumer is storage vanity (Art 20);
a consumer without materialisation recomputes history under current knowledge and
gets numbers that are *wrong as history* (GA-802's core fact) — both are defects.

## 3.3 Reconstruction — the honest guarantee

**Hard rule: history is never back-computed.** Recomputing the past under later
knowledge fabricates evidence; a gap in the record is surfaced as a gap (Art 15).
The reconstruction guarantee therefore has three explicit grades:

- **R1 — the observational record**: exact for all time from first build; immutable
  observations make "what was known about the athlete on date X" a pure read.
- **R2 — the derivation record**: exact for each materialised class from that class's
  materialisation start date. Before that date, the platform says "not materialised
  then" — it does not synthesise a retro-trend.
- **R3 — the decision record**: committed decisions replayable via their stamps and
  persisted traces (TAS §14/§16.1 C3); uncommitted ephemera are not warranted.

Full input-state versioning (event-sourced athlete state, so that *any* derivation —
not just materialised ones — could be replayed under pinned versions) is **deferred**
(§9.2 D-6): append-only observations plus materialised derivations meet P2.6's
queries at orders-of-magnitude less machinery. The deferral bites if a *never-
materialised* value is later demanded historically; the mitigation is §3.2's
admission criteria erring toward materialising anything a human saw.

## 3.4 Baselines

Personal baselines (per monitored metric: rolling central tendency + spread +
maturity) are Derived Data, materialised on update as dated values under §3.2 — so
"compared to their own normal" (P2.2) is both current and reconstructable. Baseline
model parameters are Domain 7 knowledge; baseline *values* are athlete state. An
athlete with immature baselines is compared humbly (confidence reflects maturity),
never against a population constant presented as their normal.

## 3.5 Consent, ownership, and rights carried through the store

Article 22 (batch 01) binds the record end to end:

- The record is **the athlete's**. Export includes all of it — observations,
  materialised history, served insights/reports. Erasure removes it; **append-only
  binds the platform against silent rewriting, and never limits the athlete's
  erasure right** (the AQ-5 batch-wide reading, restated here as binding).
- Every consent grant and revocation is durable, inspectable state *in* the record.
  Coach/team visibility exists only per grant, and revocation closes it forward.
- Consent **widens who, never deepens what**: no grant exposes raw vitals across a
  person boundary (Art 11 is the ceiling; Art 22 the basis).
- Secondary use — internal evidence (§6.3), any research aggregate — requires the
  explicit, informed, purpose-scoped consent flag on the record; absence of the flag
  is exclusion. For minors, the grant machinery involves the guardian and Art 21's
  duty of care extends to the consent itself (Art 22, Implications).

## 3.6 Failure modes

A sync conflict on history ⇒ append both, reconcile by provenance and timestamp,
never last-writer-wins over evidence; a knowledge-version bump mid-week ⇒ old rows
keep their stamps, new rows carry the new stamp, and trend products spanning the bump
disclose it in their derivation (a visible seam, not a smoothed lie); storage
pressure ⇒ retention classes (§2.1.1) degrade by declared truncation with the derived
dailies preserved — never by silently thinning the career backbone.

Validated by: append-only enforcement at the persistence layer (no UPDATE path to
evidence rows); stamp-presence checks in CI for every materialised class; §8 V-A1 on
every consumer; RLS proofs extending the existing harness to history tables; export
completeness tests (export = the record, byte-honest).

---

# 4. The metric dictionary & the propagation rule

## 4.1 The Metric Dictionary (GA-804)

The platform-owned definition of every captured metric — the normalisation target the
TAS names ("manufacturer-independent metric model", TAS §4.4) and no document
defined. It is a **governed registry** (the KA §3.2 pattern): entries are versioned
data, validated on load, consulted by every ingestion boundary; adding a metric is a
data change.

**One entry per metric, and one metric per concept.** Each entry:

- `id` — stable dotted id (e.g. `hrv.rmssd.night`, `sprint.distance.session`).
- **Semantics** — what the number means, in one falsifiable sentence; unit; scale;
  valid range.
- **Source classes** — which §2.1.1 provenance classes may supply it, with per-class
  reliability defaults (extending the KA Domain 7 device scale) and the precedence
  rule when multiple sources cover one window.
- **Commensurability rulings** — which vendor fields map to it, and which
  superficially similar fields are *distinct metrics* (the two-vendor "sleep score"
  problem is settled per entry, with rationale, never in an adapter).
- **Privacy class** — `raw-vital` (owner-only forever, per Art 11's enumerated
  protection) or `derived-safe` (may appear in derived roll-ups). Privacy classing
  here is what the build-failing privacy validators check against.
- **Baseline treatment** — whether the metric is individually baselined and under
  which Domain 7 model.
- Provenance of the definition itself (author, date, review) per KA §3.1.

**Hard rule: no ingestion boundary, analysis method, or surface may reference a
metric that has no dictionary entry, and none may reinterpret an entry locally.**
Entry *definitions* are owned by this document's governance; entry *contents* are
authored knowledge under KA discipline; the corresponding Ontology registration of
measurement entities is Family VIII's (GA-804 direction). Semantic drift at an
ingestion boundary — an adapter mapping a vendor field to a dictionary id whose
semantics it does not satisfy — is a correctness bug of the highest class, because
every downstream derivation inherits it silently.

Validated by: registry validate-on-load; adapter conformance tests per mapping
(vendor fixture → expected dictionary metric + provenance + reliability); the CI
privacy sweep reading privacy classes from the dictionary (one source of truth).

## 4.2 The propagation rule (GA-801) — stated once, for the whole chain

Capture-time quality (TAS §4.4 tagging), datum semantics (KA §2), and decision
authority (KA Domain 10; EDS §28.3) are each governed; this rule is the connecting
law no single document owned. **It is the load-bearing rule of this document.**

> **A claim about an athlete may never exert more authority than the quality of the
> data underneath it, and the linkage is mechanical, not judged case by case.**

1. **At capture**, every datum carries provenance class + reliability (§2.1.1) —
   quality descriptors on ground truth, not confidence.
2. **At derivation**, confidence is born, computed under the KA Domain 7 contract
   discipline: input reliability, completeness, and baseline maturity scale the
   confidence, never the value; missing inputs lower confidence and are listed,
   never silently imputed.
3. **Across chained derivations**, confidence composes conservatively: no product is
   more confident than its weakest load-bearing input (KA Domain 10's composition
   rule, inherited — including its recorded open-problem status).
4. **At the seam**, authority is granted from confidence by the KA Domain 10 mapping
   into the EDS §28.3 tiers — gate / soft input / reported metric. Granted at birth,
   recorded in the §8 contract, re-checked at consumption.
5. **Authority only narrows downstream.** No consumer, surface, or rendering may
   promote a product above its granted tier. Promotion happens only at re-derivation
   from better inputs, or by the operational-validation path: gate-capable analytical
   findings are rare, require deterministic logic over high-confidence knowledge
   (Art 13), and require a recorded validation history — and **no AI-derived signal
   may ever occupy the gate tier** (AIGAS §16, inherited).
6. **Two hard caps ride the lineage.** *Privacy:* a product's privacy class is the
   most restrictive of its inputs' — deriving from a raw vital never launders it
   across a person boundary; only the governed roll-up crosses (Art 11; KA §7).
   *Contested science:* a product whose derivation rests on contested knowledge is
   capped at soft input, whatever its statistical confidence (Art 13).
7. **The lineage is inspectable.** For any product, "what quality of data is under
   this claim?" is answerable from its derivation record — the §8 contract makes the
   answer a stored field, and §7 makes it renderable.

*Worked example.* A six-week HRV downtrend from wrist-optical `device` data:
reliability low-moderate → derivation confidence moderate at best → authority: soft
input to D15/D4 at most, and the athlete-facing rendering says "based on your watch's
HRV, which is less reliable than a chest strap." The same trend built on `measured`
morning readings with a mature baseline may earn higher confidence — the *rule*
decides, not the feature author. A trend on a vendor's opaque `third-party` load
score: reported metric, full stop (§2.1.5).

Validated by: §8 V-A4 (authority compliance — a static+runtime check that granted
tier ≤ mapping(confidence) and consumer usage ≤ granted tier); lineage-completeness
checks (V-A1); the privacy validator reading rule 6 from dictionary privacy classes.

---

# 5. Team & squad analytics (P2.7)

## 5.1 The lineage — one path, no forks

```
member Athlete State (owner-private)
   → engine rollUp() / D17 squad roll-up member (server-side; derived only)
   → CoachVisibleStatus (per-member derived signal — the live first member)
   → Squad Signal (roster aggregate + per-member derived values; Family VIII)
   → coach dashboard render / coach-addressed Report (§7)
```

Every hop is governed elsewhere and composed here: the server-side roll-up is the
*only* person-boundary crossing (TAS §7 ⑧); the roll-up is engine logic, never
per-surface re-derivation (TAS §4.1); `player_status` is ratified as this lineage's
live realisation (§1.5). **A squad view that would need a raw vital fails the build**
(EDS L13 / the privacy validator — cited, already binding).

## 5.2 The signal family

Squad Signals answer a coach's actual questions in plain English — *who is at risk,
who is ready, is the squad doing too much or too little, who is available* — as typed
aggregates over members' derived signals: readiness distribution and flags, squad
acute load versus the squad's own rolling norm, availability board, adherence
summary. Rules:

- **Derived-only inputs, by construction** (Art 11; Ontology Squad Signal). Member
  contributions are the already-consented, already-derived per-member signals —
  never anything the member's grant does not cover (Art 22: joining a team *is* the
  scoped grant; leaving or revoking closes the view forward).
- **Aggregation for judgement, never for prescription.** A Squad Signal informs the
  coach; it re-enters any athlete's plan **only as Constraints** from the coach's
  scheduling decisions (Ontology; the Team package's founding rule — no second
  reasoning system, and never one athlete's plan steered by another's data).
- **History by materialisation.** Squad Signal snapshots materialise under §3.2, so
  "versus last month / last season" is a read of dated evidence, not a recompute
  under new knowledge. (This closes the point-in-time-only limitation recorded at
  §1.5.)
- **Small-roster honesty.** Within a team, per-member derived values are visible by
  grant, so intra-team aggregates make no anonymity claim — the protection is the
  derived-only ceiling, not k-anonymity. Anonymity thresholds belong to §6.3, where
  data leaves the team scope.
- Confidence rides along: a roll-up over members with sparse data says so (per-member
  and in aggregate), per §2.3.2 — a coach misled by a confident-looking board built
  on three data points is a governance failure, not a UX choice.

Failure modes: a member revokes mid-window ⇒ they drop from forward signals and the
signal notes composition change (no silent denominator shifts); a coach requests a
drill-down the grant does not cover ⇒ default-deny with the reason named (the
Membership & Access posture, TAS §4.4).

Validated by: the RLS proof harness extended to Squad Signal reads; privacy sweep on
signal type definitions (derived-only input lists); snapshot tests of the dashboard
against the read-model (§7.2).

---

# 6. Benchmarking, norms & internal evidence

## 6.1 Normative bands are governed knowledge (P2.8)

A normative comparison is a scientific claim ("for your sport, position, sex, age
band, and training age, this capacity sits here") and is governed like one. Norm
bands are knowledge entries (KA §3.1 — provenance, evidence level, confidence,
`lastReviewed`), homed with Domain 1 (Athlete Knowledge, alongside the
strength-standard priors it already consumes), one registry, per-band:

- **Population definition** — who the band describes (sport, position, sex, age
  band, training age, developmental stage) and how it was collected.
- **Differentiation axes are mandatory metadata**: a band silent on an axis is
  explicitly marked "undifferentiated on X", and comparisons render that limit.
- **Article 21 binds the axes.** A developing or ageing athlete is benchmarked only
  against stage-appropriate bands. **Where no stage-appropriate band exists, the
  platform declines to benchmark — it never defaults a fifteen-year-old onto adult
  norms** (the conservative default, Art 21). Declining is rendered honestly ("we
  don't have trustworthy comparison data for your age group"), per Art 15.

## 6.2 Comparison semantics

- **Own baseline first.** The primary comparative lens is the athlete against their
  own history (§3.4); norms are the secondary lens and always carry the band's
  provenance and confidence into the rendering.
- "You are weak here" is a **defensible claim or no claim**: a deficiency statement
  requires a `measured`/`self-administered` capability estimate (not a pure
  inference) *and* a band whose confidence the KA mapping permits to support it;
  below that, the comparison renders as context ("plotted against typical values —
  low confidence"), never as diagnosis.
- Benchmark comparisons enter decisions only as D17 Insights at their granted tier
  (§2.4) — typically soft inputs to D4's limiting-factor weighting; a norm may never
  hard-gate an individual's programming by itself (Art 13; §4.2 rule 6).

## 6.3 Internal evidence generation (P3.5)

The platform's own accumulated data becoming research-grade evidence — under
governance, or not at all:

1. **Inclusion** — only records whose Art 22 secondary-use consent flag covers the
   purpose (§3.5); revocation excludes the athlete from all future aggregations
   (past published aggregates are not retro-edited; they are dated evidence).
2. **Aggregation** — via the L5 Population Learning infrastructure (TAS §10 — the
   ADEQUATE machinery GA-513 recorded, reused not rebuilt): privacy-preserving,
   derived signals only, raw vitals never (Art 11), with minimum-cohort thresholds
   (an aggregate that cannot guarantee non-identifiability does not run — the TAS
   rule, inherited) — the k-threshold values are reviewed knowledge, not code
   literals.
3. **Candidate findings** — framed as falsifiable statements with cohort definition,
   effect estimate, and known confounds; AI may draft (C6) under AIGAS's gates.
4. **The promotion gate** — a human scientific review admits a finding into the KA
   pipeline as a knowledge entry labelled **internal-observational**, with real
   internal provenance (cohort, window, method), never a fabricated citation.
   *Grading note:* the KA evidence scale (L1–L5) has no rung for platform-internal
   observational evidence (GA-306); until that KA amendment is ratified, internal
   findings enter at the scale's observational-expert tier with an
   `internal-observational` marker, and **are capped at soft-input authority
   regardless of effect size** — internal evidence may tilt, never gate, until the
   scale itself says otherwise. The amendment remains queued; this document does not
   apply it.
5. **Same pipeline thereafter** — versioning, review cadence, contestation, and
   retirement exactly as external knowledge (KA §5); internal origin earns no
   exemption.

When this pathway is premature (small cohorts), it does not run — a truthful "not
enough data" is the compliant state (§9.2 D-5).

Validated by: consent-flag checks at aggregation time (a test that a non-consented
record cannot enter a cohort); cohort-threshold tests; the promotion gate leaving an
audit row per admitted finding; the KA registry validator on every internal entry.

---

# 7. Reporting & insight delivery (P2.11)

## 7.1 The analytics read-model — one derivation, three audiences

The decision-explanation pattern — one trace, rendered per audience, never
re-derived (TAS §11) — is extended to analytical artefacts: **one derivation record,
three renderings.**

- **Athlete** — progress and rationale in plain language, no jargon, uncertainty in
  plain words ("we're fairly sure" / "early signs only"), every figure theirs to
  drill into (Art 14 as an athlete right).
- **Coach** — squad state and member availability in coaching language, derived-only
  by construction (§5), scoped at composition to the coach's grants.
- **Engineer/scientist** — the full lineage: inputs, method versions, stamps,
  confidence arithmetic.

The **Report** (Ontology Family VIII) is the composed artefact: audience, period,
composed Insight/signal references, the privacy scope applied at composition (never
at display), generation date, and the versions it was composed under. Served Reports
materialise (§3.2) — what was said is reproducible verbatim.

## 7.2 Accuracy governance

**Hard rule: every figure on every analytical surface traces to the read-model row
it renders, and the read-model row traces to its derivation.** Enforcement, not
aspiration: surfaces are snapshot-tested against read-models; a surface-vs-read-model
divergence is a release-blocking defect class; rounding/unit rendering follows the
Metric Dictionary entry, so two surfaces cannot disagree about the same number.
Honesty markers survive rendering: confidence qualifiers, declared gaps, and
"insufficient data" states may be styled, never dropped (Art 15; AIGAS §7's rule,
applied to non-AI renderings too).

## 7.3 The presentational-analytics line (audit 05 §5.1, drawn)

Surfaces compute no coaching (TAS L6) — but they must be allowed to present. The
line:

- **A surface may perform lossless presentation transforms**: unit/locale rendering
  per the dictionary entry, sorting, filtering, pagination, charting of provided
  series, and arithmetic totals of displayed values where the total carries no
  semantic judgement.
- **A surface may never interpret**: any computation involving a threshold, band,
  baseline, comparison, or platform semantics — anything whose wrongness would
  mislead a human about training state — is analysis, computed by D17/engine logic
  and delivered via a read-model.
- **The test**: *if this computation were wrong, would the user be misled about the
  athlete's state or what to do?* Yes ⇒ engine-side. No ⇒ presentation. Ambiguity ⇒
  engine-side (the conservative default).

## 7.4 AI narration

AI rendering of analytical content is C2/C4 under AIGAS, unchanged: trace-/data-
grounded, honesty markers preserved, labelled as AI, degradation-honest — the
deterministic rendering always exists underneath (AIGAS §7, §9, §15). A Report is
never *made of* AI claims; AI may re-voice a Report whose every figure is already
governed by §7.2.

Validated by: the snapshot suite (§7.2); composition-time privacy tests (a
coach-addressed Report containing any owner-only class fails composition); AIGAS's
faithfulness gates for the AI-rendered slice.

---

# 8. Contracts & validation

## 8.1 The analytical artefact contract

Every analytical product — every Insight, Squad Signal, trend point, benchmark
comparison, Report — ships as one typed shape (the D17 `{value, confidence,
rationale}` discipline, extended):

```
ANALYTICAL ARTEFACT
  statement       the typed finding + its plain-English form
  derivation      input data references · method/member id + version
                  · engineVersion × knowledgeSetVersion · window
  quality         composed confidence · provenance summary of load-bearing inputs
                  · missingInputs[] · declared degradations
  authority       granted tier (gate | soft input | reported metric), per §4.2
                  · consumers (named decisions and/or surfaces) or `advisory`
  privacy         privacy class (max of inputs, §4.2 rule 6) · audience scope
  produced        date · producing run reference
```

A product family registers (via EDS §20.1 for its D17 member; via this document's
revision history for its materialisation class, §3.2) by declaring this contract
plus its **falsifiability record** (§8.3).

## 8.2 The validator suite — what D14-class validation means here

Construction proposes, validation disposes (Art 19) — for analysis exactly as for
plans. The suite runs on every artefact before it is served, stored as history, or
consumed by a decision; **an artefact that fails is not served — it is recorded**
(the failure, with its reason, is itself evidence; Art 15):

| Id | Validator | Checks | Action |
|---|---|---|---|
| V-A1 | Attribution completeness | Full derivation record present; every input resolvable; stamps present | veto |
| V-A2 | Confidence honesty | Confidence computed per §4.2 steps 2–3; missing inputs listed; no silent imputation in the method's declared behaviour | veto |
| V-A3 | Privacy scope | No owner-only class in any cross-person artefact; audience scope ⊆ consent grants; cohort thresholds met (§6.3) | veto — and build-failing where statically checkable |
| V-A4 | Authority compliance | Granted tier ≤ mapping(confidence); caps of §4.2 rules 5–6 respected; every consumer uses ≤ granted tier | veto |
| V-A5 | Accuracy-to-source | Served figures regenerate from the derivation at its stamps (sampled continuously, exhaustive per release) | block publication |
| V-A6 | Coverage | The family's declared consumers exist; served-but-never-consumed and computed-but-never-served rates are observability metrics with alert thresholds | flag (a governance defect, not a runtime veto) |

Validator thresholds are Validation Knowledge (KA Domain 11 discipline); the suite is
deterministic and human-authored; no AI authors, tunes, or vetoes a validator
(AIGAS §13.2, inherited).

## 8.3 Falsifiability

Every product family declares, at registration: its **error model** (known failure
modes and typical error — e.g. e1RM formula bias at low reps), its **sensitivity to
missingness**, and its **demotion condition** — the observed evidence that would
demote its authority or retire it (mirroring the AI track-record discipline, AIGAS
§16, applied to deterministic analytics: a readiness trend family that fails to
correlate with the outcomes it claims to reflect gets demoted by review, and the
demotion is a dated knowledge edit). An unfalsifiable analytical claim is not
science and is not shipped (Art 12's instinct, applied to the second product).

## 8.4 The silent list stays empty

The chain's honesty duties, gathered: no silent imputation (§2.3.2); no silent
truncation of retention (§2.1.1); no silent denominator shifts (§5.2); no silent
back-computation of history (§3.3); no silently unread products (V-A6); no silent
schema drift (§1.5). Everything degraded, deferred, truncated, or unknown is *said*
— to the log, to the record, and where it affects a human's understanding, to the
human (Art 15).

---

# 9. Staging & build order

This document is a destination reached smallest-version-first (Art 20; TAS §16.4
C3). Order is by value-per-risk, aligned to the DEVELOPMENT-PLAN's Phase 3/4 slots
(status and dates live in HANDOFF.md, never here):

1. **S1 — The Metric Dictionary v1 + provenance tagging** (§4.1, §2.1.1) over the
   already-live streams (session logs, check-ins, daily metrics, wearable readings).
   Everything else keys on it; retrofitting semantics later is the expensive path.
2. **S2 — The history substrate** (§3.1–§3.3): append-only observation persistence +
   the initial materialised set + stamps. Cures the latest-only JSONB divergence
   (§1.5); unblocks every trend.
3. **S3 — First trend products + the athlete progress surface** (§2.3.1 families 1–2,
   §7): e1RM trajectories, adherence, baseline-relative monitoring trends — served
   from read-models, validated by the §8 suite. The first visible payoff of S1+S2.
4. **S4 — Assessment batteries v1** (§2.1.2): protocol registry + Test Result
   capture + scheduled cadence surfacing; the assessment-scheduling *decision*
   registers via EDS §20.1 when reasoning (not just cadence) is ready.
5. **S5 — Squad Signal history + team trend views** (§5): materialised snapshots
   over the live `player_status` lineage; the coach's plain-English loading view.
6. **S6 — Sport & Match ingestion v1** (§2.1.5): manual logging + file import of
   availability/minutes/RPE; vendor GPS adapters as demand arrives.
7. **S7 — Norms v1** (§6.1–§6.2): authored bands for the highest-traffic
   sport/quality pairs, own-baseline-first comparisons.
8. **S8 — Internal evidence** (§6.3) and the **C5 grounding surface** activation
   (§2.3.4): last, because both feed on volume and on consent machinery matured in
   S2–S5.

## 9.2 Deferrals — explicit, with when-they-bite

| Id | Deferred | Why now | When it bites | Mitigation until then |
|---|---|---|---|---|
| D-1 | Vendor GPS/accelerometry adapters (full P2.4 depth) | No instrumented cohort yet; schema must lead hardware | First team cohort with vests — total-load accounting goes blind without at least manual entry | S6's manual/file path ships first; schema source-agnostic from day one |
| D-2 | Bar-velocity capture (P2.3 "velocity where measurable") | Requires hardware pathway | First VBT-equipped users; velocity-based dose knowledge unusable without it | Dictionary entry reserved; e1RM trends carry the load |
| D-3 | Full norm coverage across all axes | Authoring cost; thin evidence for many cells | Every unauthored cell where a comparison is requested — esp. youth (Art 21 forbids the adult-band fallback) | §6.1's decline-to-benchmark rendering; own-baseline lens always available |
| D-4 | Assessment-scheduling as a reasoning decision | Needs D17 in the applied EDS + protocol registry maturity (S4) | When batteries scale past "cadence reminder" — unscheduled testing decays into onboarding-only estimates (the GA-421 risk returning) | Protocol cadence surfaced advisorily from S4 |
| D-5 | Internal-evidence pathway operation | Cohorts too small for non-identifying aggregates; consent machinery lands with Art 22's downstream specs | When cohort sizes clear thresholds — every year unconsented/unaggregated is evidence lost | Consent flags recorded from S2 so history is includable when the gate opens |
| D-6 | Event-sourced athlete-state versioning (full R-replay) | Cost/complexity vastly exceeds current consumers (§3.3) | If a never-materialised value is demanded historically; full audit-replay of *un*committed derivations | §3.2 admission criteria (materialise anything a human saw); revisit at first bite |
| D-7 | KA amendments this document surfaced (the internal-evidence rung GA-306; the Stored-Data quality clarification GA-309) | Frozen text; amendments are queued, never applied by a designate | GA-306: at S8 (§6.3's cap is the interim); GA-309: benign under §2.1.1's treatment | Interim treatments stated in §6.3 and §2.1.1; rows stay in the amendment queue |

Every deferral above is recorded, owned, and priced — deferral is explicit, never
silent (Art 15).

---

# 10. The coverage & audit map

The commissioned capabilities (benchmark 00 §2, P2.1–P2.11 + P3.5), each with its
owning section — the table an auditor verdicts this document against:

| Capability | Owning § | What the auditor verdicts against |
|---|---|---|
| P2.1 Testing & assessment batteries | **§2.1.2** (+ §3 persistence, §9 S4) | Protocols as versioned knowledge; scheduled; results comparable across years |
| P2.2 Daily monitoring | **§2.1.3** (+ §3.4 baselines) | Defined semantics per metric; individually baselined; derivations stated (derivation math: KA D7/EDS, linked) |
| P2.3 Gym-performance capture & analysis | **§2.1.4** (capture) + **§2.3.1** (trends) | Set-granular prescribed-vs-done; trend products quantify whether training works |
| P2.4 Match/pitch data | **§2.1.5** (+ §9 S6, D-1) | Defined ingestion path on the ACL pattern; availability/minutes first-class; total-load reactivity |
| P2.5 Recovery analytics | **§2.3.1** family 3 | Descriptive recovery domain owned; Insight/Prediction boundary drawn to D16/D12 |
| P2.6 Longitudinal athlete model | **§3** | Append-only; versioned; honest reconstruction grades; career-span queries |
| P2.7 Team & squad analytics | **§5** | Coach questions answered plainly; derived-only lineage; history via snapshots |
| P2.8 Benchmarking & norms | **§6.1–§6.2** | Bands governed with provenance + axes; defensible-claim rule; Art 21 default |
| P2.9 Data quality, provenance & missingness | **§2.1.1** + **§4.2** + §2.3.2 | Per-datum source/reliability; sensor/self never conflated; explicit degradation |
| P2.10 Analytics→decision loop | **§2.4** + **§4.2** | D17 sole entry; advisory-by-default; three AI routes; nothing silently steers or rots (V-A6) |
| P2.11 Reporting & insight delivery | **§7** | One-derivation/three-audiences; accuracy governance; the presentational line |
| P3.5 Internal evidence generation | **§6.3** | Consent-gated, privacy-preserving, promotion gate into the graded pipeline |

The commissioned cross-document fixes (audit 08 §5):

| Finding | Fix | Where |
|---|---|---|
| GA-801 (quality→authority propagation unowned) | The propagation rule, stated once for the whole chain, mechanically checkable (V-A4) | **§4.2** |
| GA-803 (de-facto semantics in ungoverned tiers) | The ratify-or-supersede first act + the no-ungoverned-schema-choice rule | **§1.5** |
| GA-804 (the metric dictionary undefined) | The governed Metric Dictionary registry as the single normalisation target | **§4.1** |
| GA-802 (recompute-don't-store, PRECLUDES) | Fix owned by amendment AQ-5 (batch 04), not by this document; the granted permission is *exercised and scoped* here | **§3.2** |

Cross-cutting bindings an auditor should also check: Art 21 → §6.1 (axes +
decline-to-benchmark) and §3.5 (guardian consent); Art 22 → §3.5, §5.2, §6.3 (grants,
revocation, secondary use, export/erasure); Art 11 → §4.1 privacy classes, §4.2
rule 6, §5.1; AIGAS → §2.3.4, §2.4, §7.4; Art 20 → §2's no-orphan-outputs rule, §3.2
admission criteria, §9's smallest-first order.

---

*Ratification of this document follows DOCUMENTATION-GOVERNANCE §3: adversarial
panel review (a dated review whose job is to break it — including hunting for any
P2 capability the text fails to own operationally), disposition of every finding,
then Simon's written ratification. Until then: build against it; it yields to the
ratified set.*

*— End of the Data & Analytics Architecture Specification v0.1 (PROPOSED designate) —*
