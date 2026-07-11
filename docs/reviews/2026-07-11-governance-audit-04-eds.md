# Governance Audit 04 — The EDS vs the Benchmark

**Class: REVIEW (T5) · dated evidence, never current state · 2026-07-11**
**Pin: frozen set v1.0 (2026-07-01) · `main @ fc5e3f8` · KSV 1.30.0**
**Spec: [`docs/superpowers/specs/2026-07-11-governance-forensic-audit-design.md`](../superpowers/specs/2026-07-11-governance-forensic-audit-design.md) · Benchmark: [`…-00-benchmark.md`](2026-07-11-governance-audit-00-benchmark.md)**

---

## §1 Role and owned slices

`docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md` (Draft v1.0, frozen) is **the
governing design specification for the decision engine** — how the platform
*reasons*, not how it is coded. It sits beneath the Constitution, beside the
Ontology and Knowledge Architecture, and is canonical for the decision
architecture: the D1–D16 catalogue (§20), the decision graph (§21), the three
loops (§§23–25), the knowledge/data architecture (§§26–27), the confidence
model (§28), the domain models (§§29–34), validation and conflict resolution
(§§35–37), and the software-architecture principles SA1–SA10 (§38).

Per the benchmark's ownership map (00 §3), the EDS:

- **Owns:** P1.1 (diagnosis-first) · P1.2 (sport-demand modelling) · P1.3
  (periodisation to the calendar) · P1.4 (individualisation) · P1.5
  (progression & long-term development) · P1.8 (endurance + concurrent) ·
  P1.9 (RTP/rehab integration) · P1.10 (session-level autoregulation) · P2.2
  (daily monitoring) · P2.5 (recovery analytics) · P2.6 (longitudinal athlete
  model) · P6.3 (fixtures as decision constraints)
- **Co-owns:** P1.6 · P1.7 (safety/MED as mechanism) · P2.3 (gym-performance
  analysis, decision side) · P2.10 (analytics→decision loop) · P6.1 (sports
  as data, consumption side) · P6.2 (new decision types) · P5.6
  (decision-record mechanics)

All nineteen are verdicted in §2 (co-owned rows judge only the EDS's slice).
Two EDS-specific probes from the audit plan target capabilities owned by the
TAS (P2.1 assessment batteries; P2.4 match/pitch data) but whose *decision-graph
seams* are EDS territory; they are recorded as cross-boundary findings
(GA-420, GA-421) for deliverables 05 and 08, not as §2 rows.

**Reading budget declaration.** The EDS was read **in full** (all 46 sections,
1,834 lines). Read closely: Parts I–II (§§1–8), Part V (§§19–22), Part VI
(§§23–25), Part VII (§§26–28), Part VIII (§§29–34), Part IX (§§35–37), §38,
§§41–45, §7/§46. Read once without re-study: Parts III–IV (the dated as-built
snapshot, §§9–18) and §§39–40 — consulted as context, since the audit judges
the *target specification*, not the point-in-time critique.

## §2 Coverage table

### Owned capabilities

| Capability | Verdict | Cited Article/§ | Reasoning |
|---|---|---|---|
| **P1.1** Diagnosis-first coaching decisions | WORLD-CLASS | EDS §5, §8, §20 D4–D5, §21, §22, §4 L6 | The pivot ("everything above is understanding; everything below is response", §8) is the document's organising act; D4/D5 are full contracts with inputs, gap math, confidence, and failure modes; L6 makes every exercise traceable to objective → priority quality → sport demand; the worked trees (§22) demonstrate the traceability end-to-end. No dose or structure is derivable before diagnosis anywhere in the graph (§21). |
| **P1.2** Sport-demand modelling (incl. position/event) | ADEQUATE | EDS §20 D2–D3, §30, §44 Q6 | D2 resolves demand from the SKB with contract-grade rigour and §30 maps all 21 SKB sections to consuming decisions. Short of world-class on two counts: D3's reasoning is one line ("apply position modifiers… fold in individual demand signals") — thin against the depth given to D4 — and multi-sport demand *combination* (a launch sport: triathlon) is explicitly unsolved (Q6, §45 C1.3): "demand profiles must combine, not just be selected". |
| **P1.3** Periodisation to the sporting calendar | WORLD-CLASS | EDS §20 D7–D8, §34, §37 tier 2 | D7 assigns one dominant adaptation objective per block from the season/competition calendar with a real taper law (volume down, intensity held) and a governed no-event fallback; D8 lays microcycles around fixture density ("one match/week, congested"); the transitions are decisions with contracts, not templates (the anti-A9 stance); sport-protection outranks objective fidelity (§37). Nothing material is missing at end-state altitude. |
| **P1.4** Individualisation (age/sex/training-age/injury) | ADEQUATE | EDS §29, §4 L4, §3 P9, §25 | Training-age (L4 competency gates), injury history (constraints-first, §36), and recovery-profile individualisation (learned priors, §25) are governed to the benchmark's standard. But age and sex appear in the Athlete Model only as "identity & demographics (capacity normalisation only)" (§29) — no explicit, evidence-graded rules for how either modifies programming exist anywhere in the spec. Evidence the gap is real downstream: G20, "age = one index weight; sex = 3 constants… no para model" (engine-audit 08 — evidence only). |
| **P1.5** Progression & long-term development | ADEQUATE | EDS §34, §45.4 item 2, §23, §20 D7 | Progression models are first-class, per quality, "anchored to the athlete's demonstrated rate of progress" (§34), and the self-review hardened MED into "minimum effective ≠ minimum" (§45.4). But the benchmark's multi-year model is absent: no governed criteria for advancing vs repeating a block, and no developmental arc beyond the macrocycle — the coaching loop (§23) repeats across a season, but nothing accumulates a career-scale plan ("week 1 of next year informed by week 1 of this one" has no owning object). |
| **P1.8** Endurance + concurrent-training programming | THIN | EDS §7.2, §42 E2, §43 R10, §31.1, §20 D6; §6 "Dose"/"Volume", §34 | The concurrent half is genuinely governed: D6 encodes interference law, sequencing, and develop/maintain maps. The endurance half is a deferral plus an assertion: E2/R10 claim an endurance session is "just another intervention" needing "no new reasoning, only new content" — but the specification's own vocabulary is resistance-shaped end to end: Dose is defined as "sets, intensity (load/RPE/velocity), reps, tempo, density, frequency" (§6), Volume as "fractional (synergist-weighted) hard sets", and §34's scheme models are rep/intensity/tempo/rest. Duration, pace/power zones, interval structure, and mileage progression have no specified home, so the absorbability claim is untested at the level that matters. Bites at Stage 7; largely absorbable via a T3 spec because E2/§40.3 explicitly authorise the extension as data. |
| **P1.9** Return-to-play / rehab integration | THIN | EDS §7.1, §36, §18 G3, §20 (absence) | The constraints-first reform (§36: injuries pre-shape D10/D11, validator as backstop) meets the benchmark's "not merely a filter" clause, and §7.1 names "rehab and prevention, return-to-performance staging" in scope. But staging is never specified: no decision in D1–D16 governs rehab progression, graduated exposure, or objective RTP gates; the injury knowledge module (§26.1) holds contraindications/rehab/prevention but no staged-criteria model; RTP clearance also collides with the assessment gap (GA-421). Bites now (injuries are live) and hard at the Team stage (availability calls); partially absorbable as injury-registry knowledge consumed by existing decisions. |
| **P1.10** Session-level autoregulation | WORLD-CLASS | EDS §20 D15, §20 D12, §4 L10, §33, §44 Q7 | The benchmark's statement is met nearly clause for clause: D12 scales the day's dose by readiness across volume **and** intensity, symmetrically (ease *or* progress); D15 reshapes only pending work over the immutable plan under explicit rules; freeze-on-commit (L10) is precisely the "stable contract, not a moving target". The one open edge — the readiness→intensity mapping — is honestly parked as Q7 with a conservative default, which is what world-class governance of an unsettled question looks like. |
| **P2.2** Daily monitoring (wellness/readiness/HRV/sleep) | WORLD-CLASS | EDS §33, §25, §4 L14, §44 RG6, §27 rule 3 | Readiness is a derived signal with a stated derivation (subjective ≥ objective per Saw 2016, trend-smoothed, never gated on one night — RG6), individually baselined ("this athlete's own rolling baselines", §25), with illness/travel/life-stress as first-class state, sport-specific weighting via the SKB readinessModel, graceful degradation under missing data (L14), and privacy by construction (§33: readiness "contains none of" the raw vitals). Stream capture semantics are the TAS's slice; the EDS's slice is complete. |
| **P2.5** Recovery analytics | ADEQUATE | EDS §33, §25, §26.1 "Recovery knowledge" | The per-athlete recovery profile the benchmark demands exists and is consumed: recoverability is "learned per athlete" (§33), D16 infers "real recovery rate" from readiness rebound after known loads (§25), and D5/D12/D15 consume it. But recovery is analysed only insofar as priors are updated — dose→marker response curves, recovery-time diagnostics, and "what accelerates recovery" (interventions — deferred to E6) are not governed as an analytical domain of their own. |
| **P2.6** Longitudinal athlete model (career-long, versioned) | THIN | EDS §29, §27, §25 (absence of more) | §29 names "history & demonstrated response" and §27 rules that athlete state (incl. priors and freezes) persists durably. But every load-bearing property in the benchmark line is unspecified: no versioning, no append-only discipline, no reconstruction of past state, no career-long span, no governance of plans/decisions-as-history; and D16's model class is exclusively shrinkage-to-priors (§25) — trend detection, anomaly flags, and long-horizon queries have no decision or model (the probe's answer is "no"). Evidence of the vacuum downstream: "latest-only JSONB… no outcomes/history substrate" (G13/G21; engine-audit 08 — evidence only). Bites partially now (block outcomes), fully at Stages 5–6 (AI insight, team analytics, multi-year athletes); not absorbable by the EDS alone — the model semantics belong to the data-pillar territory 00 §3 flags. |
| **P6.3** Team/coach workflows (fixtures→constraints) | ADEQUATE | EDS §7.4, §27.1, §36, §20 D8, §42 E1, §37 tier 2 | The seam the EDS owns is defined crisply: the coach's fixed schedule enters as a Constraint feeding D8/D13 (§27.1, §36 table), sport wins conflicts (§37), one engine serves both packages (§7.4, R9). Short of world-class: the *translation* is asserted, not governed — what a fixture list becomes (typed constraint payloads, shared team sessions, congestion classes, availability states) is unspecified, so "governed, not ad hoc" is not yet true at the point of translation. |

### Co-owned capabilities (EDS slice only)

| Capability | Verdict | Cited Article/§ | Reasoning |
|---|---|---|---|
| **P1.6** Safety & recoverability (as mechanism) | WORLD-CLASS | EDS §3 P13, §4 L3, §35.1, §37, §4 L15 | The mechanism is complete: recoverability is a Gate validator that trims or vetoes any construction; the conflict order places safety/law absolutely first and forbids cross-tier override ("no amount of optimisation confidence overrides a safety gate", §37); every trim is recorded (L15). "Violations structurally impossible" is exactly the design. |
| **P1.7** Minimum-effective-dose (as mechanism) | WORLD-CLASS | EDS §3 P3, §4 L2/L5, §34, §45.4 item 2 | The value hierarchy with a stopping rule ("beyond the recoverable dose, time is banked, not spent") operationalises MED as an ordering, and the self-review closed the under-dosing loophole (primary dose must meet the adaptation threshold and be progressively overloaded before banking). Benchmark met in full at mechanism level. |
| **P2.3** Gym-performance capture & analysis (decision side) | ADEQUATE | EDS §20 D16, §25, §14 S6 (target), §44 FR3/FR5 | Prescribed-vs-actual at set granularity is D16's typed input, and strength standards are targeted to become "learning anchors… updated by the athlete's real trajectory" (S6 target). But the benchmark's analysis products — e1RM trajectories, tonnage trends, adherence rates *as governed outputs that quantify whether training works* — appear only as learning inputs and as research ambitions (FR3/FR5), not as a governed analysis capability with consumers. |
| **P2.10** Analytics→decision loop (co-own) | ADEQUATE | EDS §28.3, §27 rule 3, §20 D15/D16, §23 | Half the benchmark line is world-class here: §28.3's authority tiers (gate / soft input / reported metric) are precisely "wired to a named decision with stated authority, or explicitly advisory", mechanically. The other half is missing: there is no decision that *reads the athlete's data and decides what it means* — the probe's answer is that D15 and D16 smuggle it. Signal derivation is folded into "D15's inputs" (§27 rule 3), insight production has no node, and the coaching loop's re-diagnosis trigger ("a learning signal that a prior has shifted", §23) has no producing decision. |
| **P5.6** Explainability (decision-record mechanics) | WORLD-CLASS | EDS §19, §4 L11, §38 SA10, §35.2, §28.4 | The mechanics the Constitution's principle needs are all here: every decision emits rationale + confidence as typed data (§19); the athlete-facing explanation is "assembled from these, not reconstructed after the fact" (SA10) — the benchmark's "derived from the actual decision record" verbatim in spirit; the validation report doubles as explanation substrate (§35.2) and execution trace (§45 C2.5). |
| **P6.1** New sports as data (consumption side) | ADEQUATE | EDS §26.3, §30, §40.3, §3 P11, §15 W6 | The consumption contract is strong: D2 reads the sport registry, "adding tennis = author tennis.json + one registry line, zero core edits" (§26.3, §40.3). What keeps the EDS's slice short of world-class is that consumption *fidelity* is unenforced: no rule obliges every authored knowledge section to have a consuming decision or a declared-dormant status. The spec itself records the consequence (W6: knowledge "authored and inert" as "the dominant form of technical debt"), and the silent drop of 11 authored demand qualities (G2; engine-audit 08 — evidence only) shows L15's no-silent-truncation spirit is not yet a testable rule at the knowledge boundary. |
| **P6.2** New decision types without core rewrites (co-own) | THIN | EDS §20, §42 (closing), §43 R10 | The catalogue is enumerated as "the decisions the engine makes" with no extension mechanism, and Part XII's unifying theme is explicit: "the decision graph is stable; expansions are new knowledge, new interventions, new state, or substituted decisions" — new decision *types* are deliberately not on the list, and the escape hatch routes gaps to Open Questions (§44) rather than to a governed extension path. Live evidence this bites: the parked V2 design sprint had to invent a `V2-P<n>` naming convention for "any pass V2 adds that is not one of D1–D16" and pre-queue such passes as amendment candidates "if the EDS catalogue is read as exhaustive" (`docs/superpowers/plans/2026-07-11-decision-engine-v2-design.md`, decisions 8 and Task-0 §4, branch `engine-v2-design-2026-07-11` — evidence only). Bites at every new decision category the benchmark names (endurance construction, taper design as its own decision, RTP gating, analysis); absorbable only by amending the frozen catalogue. |

## §3 What is world-class here

Recorded honestly; each becomes a COVERED finding in §4.

1. **Diagnosis-first made executable (§8, §20–§22).** Not exhortation but
   architecture: the pivot, two full decision contracts (D4/D5), a graph in
   which prescription-before-diagnosis cannot be expressed, and worked trees
   showing two athletes in the same sport receiving *categorically different
   reasoning*. This is the deepest realisation of P1.1 in the governing set
   (GA-401).
2. **Periodisation as decisions, not templates (D7/D8, §34).** Block
   objectives derived from priorities + season + recoverability, fixture-aware
   microcycles, a taper that is law-distinct from a deload, and a governed
   no-event fallback (GA-402).
3. **Day-scale autoregulation with a stable contract (D12/D15, L10).** Volume
   *and* intensity scaling, symmetric easing/progressing, freeze-on-commit —
   the benchmark's P1.10 sentence could have been written from this spec
   (GA-403).
4. **The recovery/monitoring model (§33, §25).** Subjective-weighted,
   trend-smoothed, individually baselined, privacy-clean, degrading safely
   under missing data — with the evidence citations inline (GA-404).
5. **Safety as compiled values (§35–§37).** Gate validators that trim or veto,
   an absolute conflict-priority order, no cross-tier override, every
   compromise recorded and surfaced. "Construction proposes; validation
   disposes" is also the platform's future AI safety harness (SA8) (GA-405).
6. **Minimum effective dose as an ordering with a stopping rule (§34).** The
   value hierarchy plus "bank the time" plus the §45.4 refinement that
   minimum-effective still requires progressive overload (GA-406).
7. **Explainability as decision-record mechanics (§19, SA10, §35.2).**
   Rationale and confidence as typed outputs of every decision; explanations
   assembled from the record, never reconstructed (GA-407).
8. **Honesty discipline throughout.** §44's open questions and research gaps,
   §45's three adversarial lenses with revisions folded back and a standing
   tension recorded unresolved, and the no-fabricated-evidence rule (§26.2).
   Few specifications audit themselves this way; it is why so many of this
   audit's gaps were *already named* inside the document (C1.1, Q1–Q8, W6).

## §4 Findings (GA-4xx)

| ID | Capability | Verdict | Citation | Narrative | Class | Proposed direction |
|---|---|---|---|---|---|---|
| **GA-401** | P1.1 | WORLD-CLASS | EDS §8, §20 D4–D5, §21–§22, §4 L6 | Diagnosis-first is made architecturally inescapable and traceable exercise-by-exercise. | COVERED | None — record as a positive in 09. |
| **GA-402** | P1.3 | WORLD-CLASS | EDS §20 D7–D8, §34, §37 | Calendar-governed periodisation as decisions with contracts, taper law included. | COVERED | None — record as a positive in 09. |
| **GA-403** | P1.10 | WORLD-CLASS | EDS §20 D12/D15, §4 L10, §44 Q7 | Session-level autoregulation with volume+intensity scaling, symmetry, and freeze-on-commit; the unsettled mapping honestly parked as Q7. | COVERED | None — record as a positive in 09. |
| **GA-404** | P2.2 | WORLD-CLASS | EDS §33, §25, §4 L14 | Monitoring modelled with stated derivations, individual baselines, first-class state flags, and safe degradation. | COVERED | None — record as a positive in 09. |
| **GA-405** | P1.6 (co-own) | WORLD-CLASS | EDS §35–§37, §3 P13, §4 L3/L15 | Safety/recoverability as gate validators plus an absolute conflict order; violations structurally impossible and compromises surfaced. | COVERED | None — record as a positive in 09. |
| **GA-406** | P1.7 (co-own) | WORLD-CLASS | EDS §34, §3 P3, §4 L2/L5, §45.4 | MED as a value-ordered stopping rule with the under-dosing loophole closed. | COVERED | None — record as a positive in 09. |
| **GA-407** | P5.6 (co-own) | WORLD-CLASS | EDS §19, §38 SA10, §35.2 | Decision-record mechanics guarantee explanations derive from actual reasoning, per decision, with confidence. | COVERED | None — record as a positive in 09. |
| **GA-408** | P1.2 | ADEQUATE | EDS §20 D3, §44 Q6, §45 C1.3 | Position/event refinement is one thin line beside the depth of D4, and multi-sport demand combination — needed for triathlon, a launch sport — is an admitted open question. | SPEC-FILLABLE | A T3 demand-refinement spec under D2/D3's existing contracts: position-modifier semantics and a demand-combination rule for multi-sport goals, with Q6 as its problem statement. |
| **GA-409** | P1.4 | ADEQUATE | EDS §29; evidence G20 (engine-audit 08) | Age and sex are governed only as "capacity normalisation"; no explicit, evidence-graded rules for how either modifies programming (youth/masters/female-specific dosing, landmarks, recovery). | SPEC-FILLABLE | Author age/sex modifier families as governed knowledge entries (per §26.2) consumed by D1/D4/D12 — the EDS's own knowledge pattern absorbs this without amendment; coordinate with the Constitution audit on P5.3 (LTAD duty of care). |
| **GA-410** | P1.5 | ADEQUATE | EDS §34, §23, §20 D7 | Progression within a block is governed; block-advance/repeat criteria and any multi-year developmental arc are not — the coaching loop repeats but nothing owns the career horizon. | SPEC-FILLABLE | A long-term-development spec defining block-exit criteria (per quality, per training age) and a multi-macrocycle development record consumed by D1/D7 as priors/context. |
| **GA-411** | P1.8 | THIN | EDS §7.2, §42 E2, §6 ("Dose", "Volume"), §34 | The "endurance is just another intervention" claim is architecturally plausible but unproven at vocabulary level: dose, volume, scheme, and session models are resistance-shaped; interval/tempo/long-work construction, pacing zones, and endurance load accounting have no specified form. | SPEC-FILLABLE | The Stage-7 endurance design spec must define endurance dose/session/load vocabulary as quality-knowledge + intervention data under E2's authorisation — and explicitly test whether §6's Dose/Volume definitions stretch or need a queued amendment; treat that check as a deliverable of the spec. |
| **GA-412** | P1.9 | THIN | EDS §7.1, §36, §20 (absence) | "Return-to-performance staging" is in scope but never specified: no staged rehab criteria, graduated-exposure rules, or objective RTP gates anywhere in the catalogue or knowledge modules. | SPEC-FILLABLE | A rehab/RTP staging spec authored into the injury knowledge registry (stages, exposure progressions, gate criteria) consumed by D10/D11/D15; flag that objective RTP *gates* depend on the assessment capability (GA-421) and may pressure the catalogue (GA-419). |
| **GA-413** | P2.5 | ADEQUATE | EDS §33, §25 | Recovery is governed as prior-updating (recovery rate, tolerance) but not as an analytical domain: no dose→marker response modelling, recovery-time diagnostics, or recovery-accelerator governance. | SPEC-FILLABLE | Extend the Recovery knowledge module with a recovery-analytics spec (response curves, time-to-recover models per load type) whose outputs feed D12/D15 under §28.3 authority tiers; deliverable 08 should place it against the data-pillar hypothesis. |
| **GA-414** | P2.6 | THIN | EDS §29, §27, §25 | The longitudinal athlete model is unspecified in every benchmark clause: versioning, append-only history, past-state reconstruction, career span, decisions-as-history; D16 governs no model class beyond priors, so long-horizon trends and anomalies have no home. Evidence: G13/G21 (engine-audit 08 — evidence only). | NEW-DOCUMENT CANDIDATE | The career-long athlete data model belongs to the Data & Analytics Architecture territory 00 §3 hypothesises (deliverable 08/09 to rule); the EDS-side seam — D1/D16 consuming longitudinal products as typed inputs — is then a small companion spec. |
| **GA-415** | P6.3 | ADEQUATE | EDS §27.1, §36, §20 D8 | The fixture→constraint pathway is defined, but the translation itself (fixture/shared-session/congestion/availability → typed constraint payloads) is asserted rather than governed. | SPEC-FILLABLE | The coach-schedule→constraints design spec (already the roadmap's next step) defines the translation schema against §36's constraint table; aligns with Ontology finding GA-210. |
| **GA-416** | P2.3 (co-own) | ADEQUATE | EDS §20 D16, §25, §14 S6, §44 FR3/FR5 | Prescribed-vs-done feeds learning, but trend analysis (e1RM trajectories, tonnage, adherence rates) as governed, consumer-facing outputs exists only as research ambition. | SPEC-FILLABLE | A gym-performance analytics spec defining trend products, their derivations, and their consumers (athlete surface, coach surface, D4 re-diagnosis triggers) under §28.3 authority; TAS audit (05) owns the capture side. |
| **GA-417** | P2.10 (co-own) | ADEQUATE | EDS §28.3, §27 rule 3, §20 D15/D16, §23 | Authority-tier wiring is world-class, but there is no decision for *analysis* — reading the athlete's data and deciding what it means. D15 (signals folded into inputs) and D16 (priors only) smuggle it; the re-diagnosis trigger has no producing decision. | AMENDMENT CANDIDATE | Queue a catalogue extension adding an explicit observe/analyse decision (or family) emitting attributed, confidence-tiered insights consumed by D4/D15 and the AI seam — jointly with Ontology GA-203/GA-207 and the GA-419 extension clause. |
| **GA-418** | P6.1 (co-own) | ADEQUATE | EDS §26.3, §15 W6, §4 L15; evidence G2 (engine-audit 08) | Consumption contracts are strong but consumption *fidelity* is unenforceable: nothing obliges authored knowledge to be consumed or declared dormant, which is how a 21-section SKB ran ~95% dormant and 11 authored demand qualities dropped silently. | SPEC-FILLABLE | A knowledge-consumption coverage rule under SA7/SA9: every authored section maps to a consuming decision or carries an explicit dormant flag, enforced by a CI validator — the same mechanism class as the SKB privacy sweep. |
| **GA-419** | P6.2 (co-own) | THIN | EDS §20, §42 closing, §43 R10; evidence: V2 plan decision 8 + Task-0 §4 (branch `engine-v2-design-2026-07-11`) | The catalogue is closed by doctrine ("the decision graph is stable") with gaps routed to Open Questions, not to a governed extension path; the first redesign sprint already had to invent `V2-P<n>` names and pre-queue them as amendments. | AMENDMENT CANDIDATE | Queue an amendment adding a decision-catalogue extension clause: criteria for admitting a new decision (contract completeness, graph position, validation/explainability integration), versioned like knowledge — mirror of Ontology GA-204. |
| **GA-420** | P2.4 (TAS-owned; EDS seam) | THIN (seam slice) | EDS §6 "Load", §20 D3/D4/D15/D16, §7.2 | Match/pitch data enter the decision graph only as aggregate "sport load" (a constraint/dose input); D4/D16 name "performance data" as inputs but no decision defines how match output (GPS, minutes, match stats, availability) refines demand (D3), diagnosis (D4), or readiness — the probe's answer is "as one number, else nowhere". | SPEC-FILLABLE | Recorded for deliverables 05/08: once the TAS defines ingestion, an EDS-side seam spec types match-derived signals into D3/D4/D15 inputs under §28.3 authority; no EDS rule blocks this. |
| **GA-421** | P2.1 (TAS-owned; D1 seam) | THIN (seam slice) | EDS §20 D1, §30 (assessments row), §44 Q1/Q3, §45 C1.1, §6 "Intervention" | D1 presumes estimates ("estimate current quality levels… from population priors where unmeasured") — the spec itself calls this its central scientific risk (C1.1). No decision schedules assessments or governs retest cadence; and §6's Intervention definition ("prescribes to *drive an adaptation*") leaves a prescribed test week with no home in the plan. | NEW-DOCUMENT CANDIDATE | An assessment/testing specification (protocols, scheduling, data shapes — the data-pillar cluster of 00 §3) with an EDS-side seam: assessment scheduling admitted as prescribable plan content, which may require widening §6's Intervention definition (queue with GA-419's extension clause). Deliverable 08 to consolidate. |

## §5 Over-specification risks

1. **The closed-catalogue doctrine (§20 + §42).** "The decision graph is
   stable; expansions are new knowledge, new interventions, new state, or
   substituted decisions" is the EDS's proudest extensibility claim — and its
   sharpest constraint. Every end-state capability that is a genuinely new
   *kind* of decision (analysis, RTP gating, assessment scheduling, possibly
   endurance session construction) must either be shoehorned into an existing
   node's inputs or wait on a frozen-document amendment. The V2 sprint's
   `V2-P<n>` workaround is the first paid instalment of that tax (GA-419).
2. **Resistance-shaped definitions in frozen text (§6, §46, §34).** Dose
   ("sets, intensity, reps, tempo, density, frequency") and Volume
   ("fractional hard sets") are *definitions*, not examples. A future
   endurance spec that speaks in duration, pace zones, and session-RPE load
   will sit in tension with the frozen vocabulary even though E2 invites it
   (GA-411).
3. **"Learning = prior-updating" as the only analysis channel (§25).** By
   making D16's output exclusively "updated priors," the spec channels every
   future analytical ambition through a shrinkage-estimator shape. Trend
   detection, anomaly surfacing, and benchmarking either get force-fitted into
   "priors" or built outside the governed graph — both bad (GA-414, GA-417).
4. **"The plan is derived, never stored as truth" (§27 rule 1).** Correct for
   purity, but P2.6's "any past state can be reconstructed" then depends on
   replaying pinned versions of knowledge *and* athlete state. SA7 versions
   knowledge; athlete-state versioning is ungoverned — so the reconstruction
   guarantee silently rests on an unbuilt discipline. Absorbable, but only if
   the data-pillar work (GA-414) treats decision/plan history as first-class.
5. **Intervention defined as adaptation-driving (§6).** Elegant, and it
   excludes prescribable non-training content: tests, and eventually
   recovery/nutrition directives are squeezed through "rest/recovery
   directive" or left homeless (GA-421; E6 will feel the same pinch).
6. **P15 "smallest version of everything" (§3, §45.4).** Right for a solo
   builder, but combined with "athlete value first" it systematically
   deprioritises exactly the pillar the platform is thinnest on — data
   products, whose value compounds invisibly. A cultural risk, not a textual
   one; noted for deliverable 09's weighing.

## §6 Load-bearing assumptions the end-state falsifies

| # | Implicit assumption | Where it lives | Test against the ambition |
|---|---|---|---|
| A1 | Athlete understanding can start from estimates: onboarding + lifts + priors suffice for diagnosis. | §20 D1, §44 Q1/Q3 | Falsified at the data-platform stage: P2.1 requires scheduled, versioned test batteries as first-class data. The EDS concedes this itself (C1.1: "a guess wearing a lab coat") but governs no alternative (GA-421). |
| A2 | All analysis of athlete data is prior-updating. | §25, §20 D16 | Falsified partially now (coach dashboard signals) and fully at Stages 5–6: trends, anomalies, benchmarks, and squad roll-ups are not priors and have no decision (GA-414, GA-417). |
| A3 | The athlete's sport life reaches the engine as one aggregate load number. | §6 "Load", §7.2, §20 D15 | Falsified when P2.4 arrives: match output should refine demand and diagnosis (D3/D4), not merely constrain dose. The typed input slots exist in outline; the semantics do not (GA-420). |
| A4 | D1–D16 spans coaching. | §20, §42 | Already falsified in practice: the first engine-redesign sprint needed `V2-P<n>` passes beyond the catalogue, and the benchmark names decision categories (analysis, RTP gating) with no node (GA-417, GA-419). |
| A5 | A dose is sets × reps × load-intensity. | §6, §34, §46 | Falsified by Stage 7 endurance prescription (duration, pace/power, interval structure) (GA-411). |
| A6 | The macrocycle is the outermost planning object; the coaching loop simply repeats. | §23–§24 | Falsified by P1.5's multi-year arc and P5.3's LTAD stages: nothing accumulates a career plan across loop turns (GA-410). |
| A7 | One athlete has one goal resolving to one demand profile. | §6 "Goal", §20 D2 | Falsified by multi-sport athletes — honestly recorded as Q6, which is credit, but recording is not governing (GA-408). |
| A8 | Purity plus versioned knowledge makes any past decision replayable. | §24, §38 SA7/SA9, §45 C2.5 | Only if athlete state is versioned too — which nothing governs. Holds today (state is small); falsifies quietly as state grows richer (§5 risk 4, GA-414). |

## §7 Document verdict

The EDS is the deepest, most self-critical, and most benchmark-ready document
in the governing set — for the pillar it was written for. On science-based
programming its governance is genuinely world-class: diagnosis-first is made
architecturally inescapable, safety and minimum-effective-dose are compiled
into an absolute priority order, day-scale autoregulation and monitoring are
specified nearly clause-for-clause against the benchmark, and its honesty
discipline (open questions, three adversarial lenses, no-fabricated-evidence)
is the rarest property in documents of this kind — many of this audit's
findings were first written down by the EDS itself. But judged at full
end-state ambition it governs **the athlete as someone to be coached, not yet
someone to be measured and understood**: assessment is presumed rather than
specified, analysis is folded into prior-updating, the career-long athlete
model is unversioned and unowned, and match data arrives as a single number.
Its extension story — flawless for knowledge — is closed for decisions, a
doctrine the first redesign sprint has already had to work around. The
verdict: world-class as the engine specification for pillar 1; ADEQUATE-to-THIN
as co-owner of the platform's second product, the athlete data asset. The
remedy is not to rewrite it — it is two queued amendments (a decision-catalogue
extension clause; an analysis decision family) plus the data-pillar
specification work that deliverables 08 and 09 must rule on, with the EDS
consuming those products through the typed seams it already, presciently,
reserved.
