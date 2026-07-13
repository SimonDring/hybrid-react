# Governance Audit 09 — Verdict and Amendment-Candidate Register

**Class: REVIEW (T5) · dated evidence, never current state · 2026-07-11**
**Pin: frozen set v1.0 (2026-07-01) · `main @ fc5e3f8` · KSV 1.30.0**
**Spec: [`docs/superpowers/specs/2026-07-11-governance-forensic-audit-design.md`](../superpowers/specs/2026-07-11-governance-forensic-audit-design.md) · Benchmark: [`…-00-benchmark.md`](2026-07-11-governance-audit-00-benchmark.md)**

---

This is the capstone of the 2026-07-11 governance forensic audit. It aggregates
every finding from deliverables 01–08 — **it mints no new GA IDs** — and rules
on the questions the earlier deliverables routed here. Aggregation rulings
applied throughout (settled by the per-audit reviews, not relitigated):
vocabulary-slice findings are paired with their architectural owners and never
counted twice (GA-205↔GA-502, GA-206↔GA-504, GA-208↔GA-505, GA-209↔GA-507;
GA-310 is the KA-scoped slice of P2.4 whose architectural gap GA-504 owns);
GA-604 is a seam-probe verdict, not an AIGAS verdict on P2.10; the
"THIN (seam slice)" tokens (GA-420, GA-421) and GA-512's aggregate token read
as THIN; Ontology GA-203/GA-205–GA-209 form one coherent amendment;
GA-802 is one coordinated multi-document amendment; GA-801/GA-803 fold under
the GA-512 new-document ruling; GA-701's "seven blocks" clause was a forecast
corrected by 08 (AMENDMENT CANDIDATEs exist in blocks 1, 2, 4, 5, 6, plus
GA-802 in 8); GA-113 was CONFIRMED by 08 §3.

## §1 The answer

**Is the governance world-class for the stated ambition? Half of it is — and
it is the right half to have built first.**

The ambition (benchmark 00 §1) is to replace an elite club's whole performance
department, which delivers two inseparable products: **the programme** (elite,
individualised, periodised training) and **the understanding of the athlete**
(a career-long, evidence-graded data asset). This audit compared all seven
governing documents against 43 capabilities across six pillars. The result is
92 findings.

**Where the governance is world-class — genuinely, not politely.** Thirty-one
findings are COVERED: the coaching method itself (diagnosis before
prescription, made structurally impossible to violate — GA-110, GA-201,
GA-401), the safety and honesty floor (hard caps that nothing can argue away,
explanations guaranteed from the real decision record — GA-101–GA-105, GA-405,
GA-407), the rule that scientific confidence controls how much authority any
piece of knowledge gets (GA-111, GA-301), the AI governance (the strongest
single document examined; AI can propose but never decide — GA-601–GA-602, GA-604–GA-605,
GA-607–GA-609), and the extensibility crown jewels: a new sport is data, a new
wearable is an adapter (GA-302, GA-501). If you built the first product on
this governance alone, you would be proud of it. Do not let any future
amendment weaken any of it (§4 honour-roll).

**Where it is not.** The second product — measuring, modelling, analysing, and
reporting the athlete — is governed thinly or not at all, in every document,
in the same direction. There is no entity for a test result, no home for match
data, no versioned athlete history, no analysis layer (the entire second
product hangs off a single unexpanded word, "Analytics", in the architecture —
GA-512), and no decision in the engine that reads the athlete's data and
decides what it means (GA-417). Deliverable 08 traced this to a single root:
the Constitution's Preamble frames the platform's only product as the
intervention, so every document below inherited that stance (GA-113,
confirmed). Eighteen findings are rank-1 structural blockers; sixteen of
those eighteen are this one gap seen from different altitudes. The
remaining two — the duty-of-care perimeter (youth athletes, consent, data
ownership: GA-107, GA-109) — is constitutionally silent and bites at the Team
stage the platform is already in.

**The single most important thing to do:** commission the platform's second
product — as one reconciled amendment batch, not piecemeal. Concretely: ratify
the ruling in §3 below — a **Data & Analytics Architecture Specification**
peer to the EDS (ND-1), the constitutional sentence that gives it a purpose
(GA-113), and the Ontology's measurement-and-analysis vocabulary it needs
(AQ-2). Everything else in the register either rides that batch (the
extension clauses, the derived-data fix, the duty-of-care Articles) or is a
spec written under governance that already works. One prerequisite: the
amendment pipeline itself has three cheap defects (no queue home, no
ratification path, no batch protocol — GA-702/GA-703/GA-701), all fixable by
ordinary edits to living documents, and they must be fixed first or this
register has nowhere legitimate to land.

Nothing found requires rewriting any frozen document. Every gap is additive.
The frozen set survives contact with the full ambition — it is incomplete,
not wrong.

## §2 The full register

All 92 findings from deliverables 01–08. **Rank** orders by: **1** = blocks
the ambition structurally · **2** = bites at the current/next stage (Stage 5
Team / Stage 6 AI, per the pin-frame stage map) · **3** = bites later but the
amendment/spec is cheaper now · **4** = polish. COVERED findings carry rank
"—" (positives to protect, not problems to fix). Within each rank, rows are
in GA-ID order; the thematic grouping lives in §1 and §3.

### Rank 1 — structural blockers (18)

| GA-ID | Document | Capability | Verdict | Class | Rank | One-line summary |
|---|---|---|---|---|---|---|
| GA-107 | Constitution | P5.3 | SILENT | AMENDMENT CANDIDATE | 1 | No constitutional duty of care for developmental stage (youth/masters); silence at supreme rank binds every document below. |
| GA-109 | Constitution | P5.7 | SILENT | AMENDMENT CANDIDATE | 1 | Athlete data ownership/consent has no constitutional home; team visibility and secondary use rest on nothing. |
| GA-113 | Constitution | P2 pillar framing | THIN | AMENDMENT CANDIDATE | 1 | Preamble frames the intervention as the sole product; the data pillar has no constitutional purpose — the confirmed root (08 §3). |
| GA-203 | Ontology | P2.10 | ADEQUATE | AMENDMENT CANDIDATE | 1 | Loop input vocabulary stops at training-state signals; analytic products have no entities to enter through (constituent of AQ-2). |
| GA-204 | Ontology | P6.2 | ADEQUATE | AMENDMENT CANDIDATE | 1 | Concepts-first Principle × frozen status taxes every new concept with a constitutional amendment; needs additive-vs-structural clause (pairs GA-419). |
| GA-205 | Ontology | P2.1 (vocabulary) | SILENT | AMENDMENT CANDIDATE | 1 | No Test/Assessment or Test Result entity; naming facet of GA-502; a hard gate on the assessment build (constituent of AQ-2). |
| GA-206 | Ontology | P2.4 (vocabulary) | THIN | AMENDMENT CANDIDATE | 1 | No Match Performance or External Load entities; naming facet of GA-504 (constituent of AQ-2). |
| GA-207 | Ontology | P2 pillar-wide | SILENT | AMENDMENT CANDIDATE | 1 | No structural home for the analysis lifecycle; a fourth structure is an addition to the document's load-bearing frame (constituent of AQ-2). |
| GA-208 | Ontology | P2.7 (vocabulary) | THIN | AMENDMENT CANDIDATE | 1 | Squad-level derived objects unnamed; `player_status` has no ontological home; naming facet of GA-505 (constituent of AQ-2). |
| GA-209 | Ontology | P2.11 (vocabulary) | THIN | AMENDMENT CANDIDATE | 1 | No Report/Insight entities; analytical delivery has coaching-advice vocabulary only; naming facet of GA-507 (constituent of AQ-2). |
| GA-414 | EDS | P2.6 | THIN | NEW-DOCUMENT CANDIDATE | 1 | Longitudinal athlete model unspecified in every benchmark clause; folds into ND-1. |
| GA-417 | EDS | P2.10 (co-own) | ADEQUATE | AMENDMENT CANDIDATE | 1 | No decision reads the athlete's data and decides what it means; D15/D16 smuggle analysis; re-diagnosis trigger has no producer. |
| GA-419 | EDS | P6.2 (co-own) | THIN | AMENDMENT CANDIDATE | 1 | Decision catalogue closed by doctrine; the parked V2 sprint already had to invent `V2-P<n>` workarounds. |
| GA-421 | EDS | P2.1 (seam) | THIN | NEW-DOCUMENT CANDIDATE | 1 | D1 presumes estimates ("a guess wearing a lab coat" per the EDS itself); no decision schedules assessment; folds into ND-1. |
| GA-512 | TAS | P2 cluster | THIN | NEW-DOCUMENT CANDIDATE | 1 | The entire second product rests on one unexpanded word at L5; the data & analytics pillar has no architectural owner. |
| GA-801 | Deep-dive | P2.9 × P2.10 | SILENT | NEW-DOCUMENT CANDIDATE | 1 | No document owns the quality→confidence→authority propagation rule across the chain; folds into ND-1. |
| GA-802 | Deep-dive | P2.6 (× P3.5) | PRECLUDES | AMENDMENT CANDIDATE | 1 | Recompute-don't-store doctrine stated in three frozen documents obstructs the longitudinal model; the audit's sole PRECLUDES. |
| GA-803 | Deep-dive | P2 pillar-wide | SILENT | NEW-DOCUMENT CANDIDATE | 1 | The pillar's operative semantics live only in non-governing tiers (living/stale/product docs); folds into ND-1. |

### Rank 2 — bites at the current/next stage (22)

| GA-ID | Document | Capability | Verdict | Class | Rank | One-line summary |
|---|---|---|---|---|---|---|
| GA-106 | Constitution | P5.2 | THIN | SPEC-FILLABLE | 2 | Medical hand-off is one sub-clause, not a stated duty; no lower document is obliged to carry the refuse-and-refer criteria. |
| GA-108 | Constitution | P5.4 | ADEQUATE | SPEC-FILLABLE | 2 | Ceiling side world-class; missing the affirmative duty to detect sustained load/recovery mismatch and escalate. |
| GA-310 | KA | P2.4 (KA slice) | SILENT | SPEC-FILLABLE | 2 | No knowledge domain owns match/external-load semantics (KA slice; GA-504 owns the architectural gap). |
| GA-408 | EDS | P1.2 | ADEQUATE | SPEC-FILLABLE | 2 | Position refinement is one thin line; multi-sport demand combination (triathlon, a launch sport) is an admitted open question. |
| GA-409 | EDS | P1.4 | ADEQUATE | SPEC-FILLABLE | 2 | Age and sex govern only capacity normalisation; no evidence-graded rules for how either modifies programming. |
| GA-412 | EDS | P1.9 | THIN | SPEC-FILLABLE | 2 | Return-to-play staging in scope but unspecified: no staged criteria, graduated exposure, or objective gates. |
| GA-415 | EDS | P6.3 | ADEQUATE | SPEC-FILLABLE | 2 | The fixture→constraint translation is asserted, not governed — exactly the roadmap's next step. |
| GA-418 | EDS | P6.1 (consumption) | ADEQUATE | SPEC-FILLABLE | 2 | Nothing obliges authored knowledge to be consumed or declared dormant; how a 21-section SKB ran ~95% dormant. |
| GA-502 | TAS | P2.1 | THIN | SPEC-FILLABLE | 2 | No architecture for scheduled, versioned test protocols whose results persist as comparable data points. |
| GA-503 | TAS | P2.3 | THIN | SPEC-FILLABLE | 2 | Capture is governed; trend analysis has no read-model, storage, or serving design. |
| GA-504 | TAS | P2.4 | SILENT | SPEC-FILLABLE | 2 | No ingestion, storage, or semantic home for GPS, match stats, minutes, or availability. |
| GA-505 | TAS | P2.7 | THIN | SPEC-FILLABLE | 2 | `rollUp` is one point-in-time per-player signal; cross-athlete aggregation has no stated home. |
| GA-507 | TAS | P2.11 | THIN | SPEC-FILLABLE | 2 | Data-insight reporting has no compliant home: surfaces may compute nothing and no read-model serves trends. |
| GA-508 | TAS | P2.6 (storage) | THIN | SPEC-FILLABLE | 2 | No append-only, versioned athlete history — the substrate GA-503/GA-505/GA-507 all depend on. |
| GA-510 | TAS | P5.7 (enforcement) | SILENT | SPEC-FILLABLE | 2 | No consent records, scoped sharing grants, export, or erasure architecture; population learning has no consent gate. |
| GA-511 | TAS | P6.3 (coach surface) | THIN | SPEC-FILLABLE | 2 | The coach workflow is designed only in lower-precedence TEAM-ARCHITECTURE.md, never elevated. |
| GA-606 | AIGAS | P4.5 | ADEQUATE | SPEC-FILLABLE | 2 | Every eval instrument named, no floor set: harness minimums, promotion criteria, and drift monitoring unwritten. |
| GA-610 | AIGAS | P6.5 (slice) | THIN | AMENDMENT CANDIDATE | 2 | AIGAS treated as binding while formally unratified; ratification already recommended and scoped 2026-07-06. |
| GA-701 | Doc-gov | P6.5 | THIN | SPEC-FILLABLE | 2 | The amendment process is built for rarity — no batching, panel, or cadence — and this register lands on it. |
| GA-702 | Doc-gov | P6.5 | SILENT | SPEC-FILLABLE | 2 | The amendment queue's designated home is a REVIEW file the rules forbid editing; the queue has no legitimate living home. |
| GA-703 | Doc-gov | P6.5 | SILENT | SPEC-FILLABLE | 2 | No ratification/T2-entry path exists; every NEW-DOCUMENT CANDIDATE inherits AIGAS's limbo. |
| GA-704 | Doc-gov | P6.5 | SILENT | SPEC-FILLABLE | 2 | No owner-assignment procedure for new concept families; new domains land ownerless or multiply claimed. |

### Rank 3 — bites later; cheaper to fix now (19)

| GA-ID | Document | Capability | Verdict | Class | Rank | One-line summary |
|---|---|---|---|---|---|---|
| GA-303 | KA | P3.2 | ADEQUATE | SPEC-FILLABLE | 3 | Review cadence asserted without machinery: no per-entry owner, schedule, or lapse consequence. |
| GA-304 | KA | P3.3 | ADEQUATE | SPEC-FILLABLE | 3 | The entry shape cannot represent genuine scientific disagreement — one value, one confidence. |
| GA-305 | KA | P3.4 | THIN | SPEC-FILLABLE | 3 | Retirement/supersession is one sentence: no lifecycle states, supersession record, or propagation checklist. |
| GA-306 | KA | P3.5 | THIN | SPEC-FILLABLE | 3 | Internal-evidence pathway gestured at: no evidence-scale rung for platform data, no promotion gate. |
| GA-307 | KA | P2.8 | THIN | SPEC-FILLABLE | 3 | No domain owns normative bands for comparison; differentiation axes and consumers unspecified. |
| GA-309 | KA | P2.9 (semantics) | ADEQUATE | SPEC-FILLABLE | 3 | "Stored Data = ground truth, confidence n/a" leaves recorded-data error with no home in the taxonomy. |
| GA-410 | EDS | P1.5 | ADEQUATE | SPEC-FILLABLE | 3 | No block-advance/repeat criteria and no multi-year developmental arc; nothing owns the career horizon. |
| GA-411 | EDS | P1.8 | THIN | SPEC-FILLABLE | 3 | "Endurance is just another intervention" is unproven at vocabulary level; Dose/Volume definitions are resistance-shaped. |
| GA-413 | EDS | P2.5 | ADEQUATE | SPEC-FILLABLE | 3 | Recovery governed as prior-updating only, not as an analytical domain of its own. |
| GA-416 | EDS | P2.3 (decision side) | ADEQUATE | SPEC-FILLABLE | 3 | Trend products (e1RM trajectories, tonnage, adherence) exist only as learning inputs and research ambition. |
| GA-420 | EDS | P2.4 (seam) | THIN | SPEC-FILLABLE | 3 | Match/pitch data enters the decision graph as one aggregate load number, else nowhere. |
| GA-506 | TAS | P2.9 | THIN | SPEC-FILLABLE | 3 | Per-datum provenance, sensor-vs-self-report separation, and retention are one clause and two asides. |
| GA-509 | TAS | P5.1 (enforcement) | ADEQUATE | AMENDMENT CANDIDATE | 3 | The document's designated Security & Privacy §15 does not exist; binding privacy rules scattered across revision notes. |
| GA-513 | TAS | P3.5 (infrastructure) | ADEQUATE | SPEC-FILLABLE | 3 | Aggregation infrastructure sound; research-grade standards and the consent precondition missing. |
| GA-603 | AIGAS | P4.3 | ADEQUATE | SPEC-FILLABLE | 3 | C5's grounding surface and hypothesis quality bar unspecified; match data absent from AIGAS's vocabulary. |
| GA-705 | Doc-gov | P6.5 | SILENT | SPEC-FILLABLE | 3 | Nothing re-validates the frozen set against the ambition on any schedule; this audit had to be commissioned, not triggered. |
| GA-706 | Doc-gov | P6.5 | THIN | SPEC-FILLABLE | 3 | Index completeness rests on manual discipline; no mechanical docs-vs-INDEX check. |
| GA-709 | Doc-gov | P3.2 (process) | ADEQUATE | SPEC-FILLABLE | 3 | Sweep cadence is a recommendation; no per-document review dates or owners. |
| GA-804 | Deep-dive | P6.4 × P2.9 | THIN | SPEC-FILLABLE | 3 | The metric model every ingestion adapter normalises into is defined nowhere but code. |

### Rank 4 — polish (2)

| GA-ID | Document | Capability | Verdict | Class | Rank | One-line summary |
|---|---|---|---|---|---|---|
| GA-210 | Ontology | P6.3 (vocabulary) | ADEQUATE | SPEC-FILLABLE | 4 | Schedule items are attribute blobs; Constraint's open typing absorbs them inside the already-planned spec. |
| GA-308 | KA | P4.4 (co-own) | ADEQUATE | SPEC-FILLABLE | 4 | The entry shape records no authorship provenance (AI-drafted vs expert-authored). |

### COVERED — world-class, recorded as positives (31)

| GA-ID | Document | Capability | Verdict | Class | Rank | One-line summary |
|---|---|---|---|---|---|---|
| GA-101 | Constitution | P1.6 | WORLD-CLASS | COVERED | — | Safety/recoverability at full constitutional strength: absolute tiers, unamendable floor. |
| GA-102 | Constitution | P1.7 | WORLD-CLASS | COVERED | — | Minimum-effective dose with both failure directions forbidden at once. |
| GA-103 | Constitution | P5.1 | WORLD-CLASS | COVERED | — | Raw→derived boundary absolute and demanded as build-failing structure. |
| GA-104 | Constitution | P5.5 | WORLD-CLASS | COVERED | — | Human final authority, universal overridability, freeze-on-commit. |
| GA-105 | Constitution | P5.6 | WORLD-CLASS | COVERED | — | Explainability as a decision-emitted right, omissions included. |
| GA-110 | Constitution | P1.1 (co-own) | WORLD-CLASS | COVERED | — | Diagnosis-before-prescription at Article rank, early diagnoses honestly low-confidence. |
| GA-111 | Constitution | P3.1 (co-own) | WORLD-CLASS | COVERED | — | Confidence governs authority; the mapping itself is governed knowledge. |
| GA-112 | Constitution | P4.1 (co-own) | WORLD-CLASS | COVERED | — | Propose-never-dispose; deterministic validators always have the last word. |
| GA-201 | Ontology | P1.1 (co-own) | WORLD-CLASS | COVERED | — | The Diagnostic Triangle + PIVOT make prescription-before-diagnosis inexpressible. |
| GA-202 | Ontology | P1.10 (co-own) | WORLD-CLASS | COVERED | — | Day-scale autoregulation typed with a stable contract (freeze-on-commit). |
| GA-211 | Ontology | P6.1/P6.2 | WORLD-CLASS | COVERED | — | The quality taxonomy grows as knowledge data, no amendment needed. |
| GA-212 | Ontology | P2.2/P2.5 | WORLD-CLASS | COVERED | — | Load/Fatigue/Recovery/Readiness/Recoverability precisely disambiguated. |
| GA-301 | KA | P3.1 | WORLD-CLASS | COVERED | — | Evidence grading and confidence→authority governed at the benchmark standard. |
| GA-302 | KA | P6.1 | WORLD-CLASS | COVERED | — | Sports-as-governed-data: the exemplar of Constitution Art 17. |
| GA-401 | EDS | P1.1 | WORLD-CLASS | COVERED | — | Diagnosis-first made architecturally inescapable and traceable exercise-by-exercise. |
| GA-402 | EDS | P1.3 | WORLD-CLASS | COVERED | — | Calendar-governed periodisation as decisions with contracts, taper law included. |
| GA-403 | EDS | P1.10 | WORLD-CLASS | COVERED | — | Session autoregulation clause-for-clause: volume+intensity scaling, symmetric, frozen on commit. |
| GA-404 | EDS | P2.2 | WORLD-CLASS | COVERED | — | Monitoring with stated derivations, individual baselines, safe degradation. |
| GA-405 | EDS | P1.6 (co-own) | WORLD-CLASS | COVERED | — | Safety as gate validators plus an absolute conflict order; compromises surfaced. |
| GA-406 | EDS | P1.7 (co-own) | WORLD-CLASS | COVERED | — | MED as a value-ordered stopping rule; the under-dosing loophole closed. |
| GA-407 | EDS | P5.6 (co-own) | WORLD-CLASS | COVERED | — | Explanations assembled from the decision record, never reconstructed. |
| GA-501 | TAS | P6.4 | WORLD-CLASS | COVERED | — | Wearable/native absorption: an adapter, not an architecture event; CI-proven determinism. |
| GA-601 | AIGAS | P4.1 | WORLD-CLASS | COVERED | — | Deterministic-core protection beyond the benchmark (two-seam closure, deletion test). |
| GA-602 | AIGAS | P4.2 | WORLD-CLASS | COVERED | — | AI rephrases the truth, never improvises it — enforced by mechanism. |
| GA-604 | AIGAS | P4.3 / P2.10 (seam probe) | WORLD-CLASS | COVERED | — | The two-seam model holds for analytics AI: exactly three compliant routes into decisions. |
| GA-605 | AIGAS | P4.4 | WORLD-CLASS | COVERED | — | AI knowledge curation fully gated: human review, real citations only. |
| GA-607 | AIGAS | P2.11 (slice) | WORLD-CLASS | COVERED | — | AI-rendered delivery: faithfulness gates, labelling, no dark degradation. |
| GA-608 | AIGAS | P5.5 (slice) | WORLD-CLASS | COVERED | — | Human authority unchanged by AI; kill-switch, rollback, audit without a deploy. |
| GA-609 | AIGAS | P5.6 (slice) | WORLD-CLASS | COVERED | — | The athlete's right to a truthful "why" survives the AI layer intact. |
| GA-707 | Doc-gov | P6.5 (sub-slice) | WORLD-CLASS | COVERED | — | Precedence ladder, editability-bearing status classes, lifecycle rules: evidence-derived process core. |
| GA-708 | Doc-gov | P3.4 (process) | WORLD-CLASS | COVERED | — | Document supersession governed end-to-end: banner vs archive by reference topology, never delete. |

**Completeness:** 92 findings — 18 rank 1, 22 rank 2, 19 rank 3, 2 rank 4,
31 COVERED. By class: 31 COVERED · 41 SPEC-FILLABLE · 15 AMENDMENT CANDIDATE ·
5 NEW-DOCUMENT CANDIDATE (the 15 + 5 consolidate into the ten queue items of
§3 under the aggregation rulings). Every GA-ID minted in deliverables 01–08
appears above exactly once.

## §3 Amendment candidates — the queue-ready register

Formatted to feed the amendment queue per the pattern of
`docs/reviews/2026-07-09-documentation-audit.md` §2 (whose C1–C5 remain queued
and should ride the same batch). Entries give **direction only — never drafted
text** (spec §5). Labels AQ-*/ND-* are register entry labels, not finding IDs.

**Process prerequisites (not queue items — living-doc edits under existing
rules, per audit 07):** before this queue can be processed, land GA-702 (a
WORKING-class amendment register so the queue has a legitimate home), GA-703
(a defined ratification/T2-entry path — AIGAS first, then ND-1 needs it), and
GA-701 (a batch protocol so one reconciled pass can carry many amendments).
All three are SPEC-FILLABLE edits to the living DOCUMENTATION-GOVERNANCE.md.

### The new-document ruling

- **ND-1 — Data & Analytics Architecture Specification (rules on benchmark
  00 §3's hypothesis: CONFIRMED — commission it).** *Constituent findings:*
  GA-512 (TAS: the pillar has no architectural owner), with GA-414 (EDS:
  longitudinal athlete model), GA-421 (EDS: assessment/testing), GA-801
  (quality→authority propagation rule), and GA-803 (ratify-or-supersede the
  de facto material) folded under it per 08 §4. *Target:* a new governing
  document, peer to the EDS, entering T2 via the GA-703 path. *Benchmark:*
  P2.1, P2.3–P2.11, P3.5 (00 §3's candidate cluster, plus P2.3 per 08 §4's
  ANALYSE scope). *Rationale:* the hypothesis was confirmed
  independently from the architecture side (GA-512: no T3 spec pile
  substitutes for a coherent peer architecture; the TAS's own seam test
  licenses an analytics subsystem, audit 05 §5.3) and the decision/model side
  (GA-414, GA-421: territory the EDS cannot own); 08 §4 already states the
  scope per chain link. *Direction:* author the specification to 08 §4's
  scope statement — capture (assessment batteries, second ingestion boundary,
  per-datum quality, metric dictionary), model (append-only longitudinal
  athlete model), analyse (the L5 expansion: trends, squad signals, norms,
  promotion gate, AI grounding surface), decide (under existing §28.3/GA-604
  discipline), present (analytics read-model) — and its first act is GA-803's
  inventory of ATHLETE-MODEL.md, SCHEMA.md's successor, and player_status. It
  must not re-own what is world-class (08 §4's "must NOT" list).
- **Ruling on the second hypothesis (athlete-safeguarding specification,
  00 §3; endorsed for ruling by audit 01 §7): NOT YET.** The Title III
  amendments (AQ-6, AQ-7) plus the T3 specs already directed (GA-106, GA-108,
  GA-510) carry the duty-of-care perimeter for the stages in view; a dedicated
  safeguarding specification should be revisited when a youth/team cohort is
  actually onboarding — the trigger is a stage gate, not this register.

### The amendment queue

- **AQ-1 — Name the second product (GA-113).** *Target:*
  `docs/foundation/CONSTITUTION.md`, Preamble/Title I. *Benchmark:* 00 §1
  (two inseparable products); P2 pillar framing. *Rationale:* 08 §3 confirmed
  the Preamble's single-question existence test as the root from which every
  downstream data-pillar gap propagated; the P2.x-owning documents cannot
  repair a purpose-level gap from below. *Direction:* a clarification naming
  the evidence-graded understanding of the athlete as a co-equal product in
  service of the same objective — so ND-1 has a principle to trace to and
  Art 20's defer-until-consumer discipline stops being a chicken-and-egg trap
  for analytics (audit 01 §5.3).
- **AQ-2 — The Measurement & Analysis entity family + fourth structure
  (merged: GA-203, GA-205, GA-206, GA-207, GA-208, GA-209).** *Target:*
  `docs/foundation/DECISION-ONTOLOGY.md` §1 (fourth structure — the Analysis
  Spine) and a new entity family (Family VIII). *Benchmark:* P2.1, P2.4,
  P2.7, P2.10, P2.11. *Rationale:* one coherent gap — the
  athlete-understanding vocabulary stops at training-state signals: no
  Assessment/Test Result, no Match Performance/External Load Observation, no
  Squad Signal, no Report/Insight, no structural home for the analysis
  lifecycle, and no entry entities for the analytics→decision loop; by the
  Ontology's own concepts-first Principle nothing can be built until these
  are defined there (audit 02 §7: "a hard gate, not a backlog item"). Paired
  architectural owners (GA-502/504/505/507) are governed by ND-1/T3 specs —
  the names land here, the mechanics there, counted once. *Direction:* add
  the family and the fourth structure under the existing template discipline
  (consumers, confidence, authority tier per entity), reconciled with ND-1's
  vocabulary in the same pass.
- **AQ-3 — The analysis decision family (GA-417).** *Target:*
  `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md` §20 catalogue (via AQ-4's
  extension clause). *Benchmark:* P2.10. *Rationale:* the loop has world-class
  authority discipline but no producer — no decision reads the athlete's data
  and decides what it means; D15/D16 smuggle it and the re-diagnosis trigger
  has no producing decision. *Direction:* admit an explicit observe/analyse
  decision (or family) emitting attributed, confidence-tiered insights
  consumed by D4/D15 and the AI seam — jointly with AQ-2 and AQ-4.
- **AQ-4 — Extension clauses for the catalogue and the ontology (paired:
  GA-419 + GA-204).** *Targets:* EDS §20/§42 (decision-catalogue extension
  clause) and Ontology header Principle/§11 (additive-vs-structural clause).
  *Benchmark:* P6.2. *Rationale:* both documents close their catalogues by
  doctrine, so every genuinely new decision type or entity requires a
  constitutional-grade amendment — a growth tax the end-state cadence
  (endurance, RTP, taper, analysis) pays repeatedly; the parked V2 design
  sprint already invented `V2-P<n>` names as a workaround (evidence: V2 plan
  decision 8 + Task-0 §4). *Direction:* one coordinated amendment defining
  admission criteria (contract completeness, graph position,
  validation/explainability integration) for new decisions and distinguishing
  additive registration (versioned, routine) from structural change
  (amendment) — the same doctrine stated once in each document.
- **AQ-5 — The derived-data doctrine clarification (GA-802).** *Targets:* KA
  §2.1/§2.3 + EDS §27 rule 1 + TAS §7 (④/T2), one coordinated multi-document
  amendment reconciled in a single pass — do not split. *Benchmark:* P2.6
  (× P3.5). *Rationale:* the audit's only PRECLUDES: the triply-stated
  recompute-don't-store doctrine obstructs retaining derived values as
  computed that day under that knowledge version — the longitudinal model's
  core requirement — and no single-document fix resolves it. *Direction:*
  clarify to "recomputable given the same inputs and knowledge version;
  point-in-time derived values may be materialised as dated historical
  evidence" (per 08's GA-802 row, quoted as evidence), scoped by ND-1's history-store design.
- **AQ-6 — Title III: developmental-stage duty of care (GA-107).** *Target:*
  `docs/foundation/CONSTITUTION.md`, Title III (new Article). *Benchmark:*
  P5.3. *Rationale:* no Article recognises developmental stage or age-band
  duty of care; a duty-of-care protection belongs in the unamendable floor
  and cannot be derived from what is there; bites hard when youth squads
  arrive with the Team package. *Direction:* an Article establishing
  developmental-stage duty of care (what may never be prescribed at each
  stage), with age-band rules entering as knowledge under Art 17; coordinate
  with GA-409's age/sex modifier spec.
- **AQ-7 — Title III: athlete data ownership & consent (GA-109).** *Target:*
  `docs/foundation/CONSTITUTION.md`, Title III (new Article). *Benchmark:*
  P5.7. *Rationale:* Art 11 governs who may see; the athlete's affirmative
  rights — consent as the basis of team visibility, export, deletion,
  informed consent for secondary use — have no constitutional home; the
  gap compounds when minors and internal research (P3.5) enter. *Direction:*
  an Article granting scoped/revocable sharing consent, export/erasure, and
  informed consent for secondary use, which the KA and TAS then inherit as
  mechanics (GA-510's enforcement spec is the companion).
- **AQ-8 — Ratify AIGAS (GA-610).** *Target:* `docs/architecture/AIGAS.md`
  status + frozen-set cross-references (Constitution Appendix A, TAS).
  *Benchmark:* P6.5. *Rationale:* the document all Stage 6 work hangs on is
  simultaneously treated as binding and formally unfrozen; the 2026-07-06
  review recommended ratification with named mechanics, open at the pin.
  *Direction:* execute the already-scoped ratification — one versioned
  amendment admitting AIGAS to the frozen set after the adversarial panel
  pass, Appendix B designated living, §6.2's seam-rhetoric looseness
  clarified in the same pass (audit 06 §5.1) — as the proving case for the
  GA-703 ratification path.
- **AQ-9 — Restore the TAS Security & Privacy section (GA-509).** *Target:*
  `docs/architecture/TAS.md` §15 / cross-references. *Benchmark:* P5.1.
  *Rationale:* the document's own designated canonical home for security &
  privacy does not exist (§15 is "Future AI architecture"; numbering drifts
  by one after §11), leaving binding privacy rules scattered across revision
  notes. *Direction:* restore the dedicated section or correct every
  cross-reference in one versioned amendment; rides the batch as
  housekeeping alongside the 2026-07-09 queue's C1–C5.

## §4 Per-document verdicts and the COVERED honour-roll

The seven §7 verdicts from deliverables 01–07, tightened:

1. **Constitution (01):** world-class for the platform it described in July
   2026 — eight of twelve capabilities WORLD-CLASS, the conflict order a
   compiled decision procedure — needing three targeted, queueable additions
   (AQ-1, AQ-6, AQ-7), not restructuring, to be world-class for the
   end-state. Its weakness is precisely located: the duty-of-care perimeter
   stops at the adult, self-owning, single-sport athlete.
2. **Decision Ontology (02):** world-class at its core (the Diagnostic
   Triangle, the state-signal disambiguation, template discipline), but it
   claims the whole platform's vocabulary and governs only one of the two
   products; by its own concepts-first Principle the missing measurement
   family is a hard gate, and amendment (AQ-2) is the only path its rules
   allow.
3. **Knowledge Architecture (03):** the strongest instrument in the frozen
   set within its home territory — evidence-in and sports-in meet the
   benchmark outright — but it governs the front door far better than the
   back of house (cadence, retirement, internal evidence); every gap is
   absorbable through its own extension points: the only frozen document with zero
   amendment candidates.
4. **EDS (04):** the deepest and most self-critical document — world-class as
   the engine specification for pillar 1 — but it governs the athlete as
   someone to be coached, not yet someone to be measured and understood, and
   its extension story is flawless for knowledge, closed for decisions. The
   remedy is two queued amendments (AQ-3, AQ-4) plus the data-pillar work,
   never a rewrite.
5. **TAS (05):** the best-crafted document in the set at its chosen game, and
   world-class outright on absorption (P6.4) and privacy substance (P5.1) —
   but as the assigned primary home of the data pillar it is a world-class
   *half*: seven THIN and two SILENT of twelve, the second product resting on
   one unexpanded word. Its own seams point to the completion (ND-1).
6. **AIGAS (06):** on the P4 pillar the strongest single document examined —
   strongest exactly where the danger is greatest — with both ADEQUATE rows
   SPEC-FILLABLE under its own §10 mechanism. Its one genuine defect is
   around the text, not in it: it remains a draft the platform already treats
   as binding (AQ-8).
7. **Documentation Governance + Index (07):** arguably the best-executed
   governance in the repository for today's surface, but the pipeline is
   thin at all three ends — intake, throughput, detection — and this
   register lands on it. Every gap is closable by ordinary edits to these
   living documents; close them first.

**The COVERED honour-roll — what no future amendment may weaken.** The 31
COVERED findings in §2 are binding positives; any amendment (including
everything in §3) must preserve them. Grouped:

- **The coaching core:** diagnosis-first at every altitude (GA-110, GA-201,
  GA-401); periodisation as decisions (GA-402); autoregulation with a stable
  contract (GA-202, GA-403); monitoring semantics (GA-212, GA-404).
- **The safety & honesty floor:** absolute safety tiers and MED (GA-101,
  GA-102, GA-405, GA-406); raw-data inviolability (GA-103); human final
  authority (GA-104); explainability from the real record (GA-105, GA-407).
- **The epistemic discipline:** confidence governs authority, the mapping
  itself governed (GA-111, GA-301).
- **The AI gates:** core protection, truth-preservation, curation gate, the
  two-seam closure and its three-route analytics answer (GA-112, GA-601,
  GA-602, GA-604, GA-605, GA-607, GA-608, GA-609).
- **The extensibility instruments:** sports as governed data (GA-302), the
  quality taxonomy as knowledge (GA-211), the ingestion ACL + isomorphic
  engine (GA-501), and the process core — precedence, classes, supersession
  (GA-707, GA-708).

ND-1's charter says it explicitly (08 §4): the missing document is a
completion of the governing set, not a rival to it.

## §5 Inputs to THE DEVELOPMENT PLAN

The development plan composes four inputs. This register is one; the other
three, and how they fit:

1. **The governance-sprint reviews (`docs/reviews/2026-07-09-*`).** The
   documentation audit's §2 already queues constitutional-tier candidates
   C1–C5 (freeze stamps, taxonomy drift, sport counts, EDS rank, the mojibake
   glyph). **Composition:** C1–C5 and this register's AQ-1–AQ-9 are one
   amendment workload and should ride the same reconciled batch(es) under the
   GA-701 protocol; the strategic roadmap and technical-debt register supply
   the delivery sequencing this register does not attempt. The 2026-07-09 §2
   file itself stays immutable REVIEW evidence — the living register GA-702
   creates is where both queues now live.
2. **The engine forensic audit (`docs/reviews/2026-07-11-engine-audit-01…10`).**
   The implementation evidence beneath this audit: where governance was
   silent, the code shows what grew in the vacuum (G1 assessments, G13/G21
   latest-only history, TR-03, dormant SKB). **Composition:** this register
   is upstream of that one — engine-audit fixes that touch data capture,
   history, analysis, or new decisions should be executed against the
   governance rulings here (ND-1's shapes, AQ-2's entities, AQ-4's extension
   clause), not before them, or the fixes harden today's ungoverned shapes
   (GA-803's warning). Sequencing of the held fixes lives in HANDOFF.md, not
   here.
3. **The parked V2 design set** (spec
   `docs/superpowers/specs/2026-07-11-decision-engine-v2-design.md`, plan
   `docs/superpowers/plans/2026-07-11-decision-engine-v2-design.md`, branch
   `engine-v2-design-2026-07-11`, unexecuted). **Composition — and three V2
   premises this audit's findings alter, flagged explicitly:**
   - *The knowledge-ownership map premise.* V2's knowledge-ownership
     deliverable (04-KNOWLEDGE-OWNERSHIP-MAP) would map concepts onto the
     governing set as it stood. ND-1 changes the target: measurement,
     longitudinal-model, analysis, and reporting concepts now map to the
     candidate Data & Analytics specification, not to EDS/KA stretch
     readings. The map should be (re)drawn against the post-ND-1 set.
   - *The closed-catalogue premise.* V2's `V2-P<n>` naming convention and its
     pre-queued pass amendments assume the EDS catalogue stays closed
     (V2 plan decision 8, Task-0 §4). If AQ-4's extension clause lands first,
     V2's new passes register through the clause as routine additions instead
     of one-off frozen-doc amendments — cheaper, and the register recommends
     that ordering: process AQ-4 before executing V2.
   - *The measurement-vocabulary and history premises.* V2 work adjacent to
     assessments gains the entities it currently lacks from AQ-2 (the G1
     evidence chain), and any V2 outcome/history design must be built against
     AQ-5's clarified derived-data doctrine, not the uncorrected
     triply-stated rule it would otherwise inherit (GA-802).
4. **This register.** The governance yardstick and queue: the ND-1 ruling,
   nine queue-ready amendment candidates, 41 SPEC-FILLABLE directions, and
   the 31-item honour-roll as the constraint set every other input must
   respect.

**Suggested composition order for the plan** (direction, not schedule): the
GA-702/703/701 process fixes → the amendment batch (AQ-1–AQ-9 + C1–C5, with
AQ-8's AIGAS ratification proving the GA-703 path) → ND-1 authored and
ratified through that path → then the engine-audit backlog and the V2 set
executed against the completed governance. That order exists so that the
platform's second product is built once, under governance — not built twice,
the first time by accident.

---

*— End of Governance Audit 09 — End of the 2026-07-11 governance forensic audit —*
