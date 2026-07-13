# 03 — EDS: the analysis decision family + the catalogue extension clause (AQ-3, AQ-4.2)

**Status: BATCH PROPOSAL — working doc (T4) · 2026-07-13 · nothing herein is applied; Simon's ratification PR applies it**

Spec: [`docs/superpowers/specs/2026-07-13-phase1-amendment-batch-design.md`](../../superpowers/specs/2026-07-13-phase1-amendment-batch-design.md)

**Target document:** `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md` (the EDS, frozen v1.0 2026-07-01). The EDS is READ ONLY in this sprint; everything below quotes it and drafts against it. Application happens only in Simon's ratification PR.

**Reading order.** AQ-4.2 builds the door (the catalogue's governed extension path, §20.1); AQ-3 is the first decision to be seated through this batch (as a full amendment — this batch *is* one) whose future family members will use that door. They are one coordinated change: ratify both or neither.

**Companion halves elsewhere in the batch:** AQ-4.1 (the Decision Ontology's additive-vs-structural clause) and AQ-2 (the Measurement & Analysis entity family + the Analysis Spine) are drafted in [`02-ontology.md`](02-ontology.md). The names land in the Ontology; the decision mechanics land here; counted once (audit 09 §3, AQ-2 pairing rule).

---

## AQ-3 — The analysis decision family (D17 · Observation & Analysis)

**Target:** `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md` §20 (the decision catalogue) — a new catalogue entry inserted after the D16 entry, immediately before `## 21. The decision graph`; plus four small reconciliation edits (§21 prose + graph, §23 trigger list + diagram, §27 rule 3) so no existing sentence contradicts the new decision.

### Current text

Insertion, not replacement — no existing catalogue entry is altered. The insertion point is the end of §20, whose last entry closes:

> ### D16 · Learning
> […]
> - **deps** accumulated history. **→** D1, D4, D7, D12 (next loop). **✗** Noisy/sparse data ⇒ slow learning rate, wide posterior; never overfit a single session.
>
> ## 21. The decision graph

The four reconciliation targets are quoted inline in *Proposed text* parts 2–5 below.

### Proposed text

**Part 1 — the new catalogue entry** (inserted after the D16 entry, before §20.1 proposed in AQ-4.2, in §20's exact entry format):

> ### D17 · Observation & Analysis  (a family)
> - **Purpose** — Read the athlete's accumulated data and decide what it *means* — before anyone decides what to do about it.
> - **▶** Athlete-state history (sessions done, prescribed vs. actual, readiness inputs, training load); assessment/test results, competition performances, and external-load observations (athlete state); analysis knowledge (signal-derivation models, baselines, trend/anomaly rules, benchmarks); the knowledge-set version.
> - **⚙** Pure interpretation, no prescription: derive the platform's derived signals (readiness, load state); evaluate trends against this athlete's own baselines; detect anomalies; compare against population/sport benchmarks; assemble squad roll-ups from members' *derived* signals only (L13). Every finding is *attributed* — it names the data and knowledge that produced it — and is assigned an authority tier by its confidence at birth (§28.3): gate-capable findings are rare and must be operationally validated; contested metrics enter as soft input or reported metric, never higher.
> - **◀** *Insights*: attributed, confidence-tiered interpretations — each a `{value, confidence, rationale}` — spanning derived signals, trend/anomaly findings, benchmark comparisons, re-diagnosis triggers, and report content. An insight states what the data means; it prescribes nothing.
> - **~** Bounded by data sufficiency and signal validity (§28); sparse history ⇒ fewer, humbler insights, surfaced as such (L11).
> - **deps** accumulated athlete state + knowledge — asynchronous, like D16; never on the planning pass's critical path. **→** D1 and D4 (next planning loop: insights as assessment evidence and diagnosis inputs); D15 (derived signals as typed runtime inputs); D16 (insights as evidence for prior updates); the Coaching Loop's re-diagnosis trigger (§23); the reporting surface (athlete-facing insight; the coach's derived view, §27.1); the AI seam (E3 — family members are substitutable behind this contract). **✗** Missing or noisy data ⇒ degrade explicitly ("not enough data to say"), never impute silently or fabricate certainty (L14); an over-trusted metric ⇒ capped by §28.3 (it may tilt or be shown, never decide); a squad view that would need raw vitals ⇒ the privacy validator fails the build (L13, §27.1).
>
> D17 is a decision **family**: its members — signal derivation, trend & anomaly detection, benchmark comparison, squad roll-up, report assembly — share this contract and this graph position, and new members register additively under §20.1 (a dated additive entry, not an amendment). D17 is pure (P12): same (history, knowledge) ⇒ same insights; time enters only as data timestamps, never as a clock read.
>
> > **The D15/D16/D17 boundary (load-bearing).** D17 decides what the data *means*; D15 decides what the athlete *does about it* this week; D16 decides what the engine *believes differently* next time. D17 emits interpretations — it never reshapes a session and never touches a plan: every planning consequence of an insight reaches the athlete only through D15's re-run of construction (D9–D14) or the next planning pass, where D14's validators dispose as always (L8, L10). D16 emits priors — parameters the next planning loop reads; an insight is not a prior: an insight *describes the athlete's data*, a prior *parameterises future decisions*. D16 may consume D17's outputs as evidence; D17 never writes a prior and never edits a plan (L9).

**Part 2 — §21, prose.** Current first paragraph of §21:

> The decisions form a directed acyclic graph. The planning pass runs it top-to-bottom (D1→D14); the runtime re-runs the lower subgraph (D9–D14) over the immutable baseline; the learning loop runs asynchronously and feeds priors back to the top.

Proposed (one sentence appended):

> The decisions form a directed acyclic graph. The planning pass runs it top-to-bottom (D1→D14); the runtime re-runs the lower subgraph (D9–D14) over the immutable baseline; the learning loop runs asynchronously and feeds priors back to the top. Observation & analysis (D17) runs in the same asynchronous band: it reads accumulated history and feeds interpretations *forward* — into the next planning pass, the runtime, and the reporting surface — never backward into a committed plan.

**Part 3 — §21, diagram.** Current final band of the graph:

> ```
>    LEARNING (async — L9)   D16 LEARN  ──updates priors──▶ (back to D1, D4, D7, D12 next loop)
> ```

Proposed (one line added beneath, same band style):

> ```
>    LEARNING (async — L9)   D16 LEARN  ──updates priors──▶ (back to D1, D4, D7, D12 next loop)
>    ANALYSIS (async — L9)   D17 OBSERVE/ANALYSE ──insights──▶ (D1/D4 next loop · D15 · D16 · reporting)
> ```

**Part 4 — §23, the Coaching Loop.** Two token-level edits. (a) The diagram's OBSERVE label — current:

> `OBSERVE ──▶ ASSESS ──▶ …` with the caption row `(D-in)     (D1) …`

Proposed: the `(D-in)` caption becomes `(D17)` — the OBSERVE arc gains its producing decision; nothing else in the diagram moves (`(D17)` is one character narrower than `(D-in)`, so the ratification edit pads one trailing space to keep the box border aligned). (b) The re-entry trigger — current:

> - **Trigger to re-enter at DIAGNOSE**: end of block; new injury; goal/sport change; a learning signal that a prior has shifted enough to change the diagnosis (e.g., a quality the athlete has now developed past its limiting threshold).

Proposed:

> - **Trigger to re-enter at DIAGNOSE**: end of block; new injury; goal/sport change; a learning signal that a prior has shifted enough to change the diagnosis, or an analysis insight (D17) crossing a re-diagnosis threshold (e.g., a quality the athlete has now developed past its limiting threshold, or a sustained readiness shift).

**Part 5 — §27, rule 3.** Current:

> 3. **Derived signals are computed by decisions, in the engine — not in the UI store.** Readiness and load are *decisions* (parts of D15's inputs), not view-model side-effects. Moving them out of `buildView` into the engine is the fix for A5/W4.

Proposed:

> 3. **Derived signals are computed by decisions, in the engine — not in the UI store.** Readiness and load are *decisions* — produced by D17 (Observation & Analysis) and consumed by D15 as typed inputs — not view-model side-effects. Moving them out of `buildView` into the engine is the fix for A5/W4.

### Rationale

- **GA-417** (audit 04, P2.10, ADEQUATE): "Authority-tier wiring is world-class, but there is no decision for *analysis* — reading the athlete's data and deciding what it means. D15 (signals folded into inputs) and D16 (priors only) smuggle it; the re-diagnosis trigger has no producing decision." Remedy line: "an explicit observe/analyse decision (or family) emitting attributed, confidence-tiered insights consumed by D4/D15 and the AI seam."
- **Audit 09 §3, AQ-3**: same direction, "jointly with AQ-2 and AQ-4."
- **Benchmark P2.10**: "analysis changes the plan through defined, traceable pathways — each analytic signal is either wired to a named decision with stated authority, or explicitly advisory — so no insight silently steers and none silently rots unread." The EDS holds the authority half (§28.3); D17 supplies the missing producer half. **P2.11** is served incidentally (report content becomes a governed output, not an orphan).
- **Audit 04 falsifiable assumptions A2/A4**: "all analysis is prior-updating" is already falsified by the live coach-dashboard signals, and fully at Stages 5–6 (trends, anomalies, benchmarks, squad roll-ups are not priors and have no decision). D17 is the governed home that stops those being "smuggled into 'priors' or built outside the governed graph — both bad" (audit 04 §5).

### Consistency

- **No overlap with D15 or D16** — the boundary blockquote in Part 1 is the normative statement: interpretation (D17) / action-on-pending-work (D15) / belief-update (D16). D15's and D16's entries need **no text change**: D15's inputs already say "today's readiness … load" (D17 now *names their producer* — §27 rule 3, Part 5); D16's contract already reads accumulated evidence, of which insights are now a typed instance.
- **Consumer set — a deliberate drafting call.** The plan task lists "feeds D1/D4/D7/D12 and the reporting surface"; this draft wires D1/D4/D15/D16 + trigger + reporting + AI seam, and leaves **D7/D12 indirect** (they receive analysis only via D16's priors and D4's diagnosis). A direct D17→D7/D12 edge would let an interpretation steer a block objective or a dose without passing the diagnosis or the validators — exactly the "insight silently steers" failure P2.10 forbids. Flagged for the 07 review; the audit's own remedy line (D4/D15 + AI seam) supports the narrower wiring.
- **Ontology pairing (AQ-2, `02-ontology.md`)**: D17 consumes the Measurement & Analysis family's observation entities (Test Result, Match/Competition Performance, External Load) and emits its Analysis/Insight and Report entities; D17 is the decision seat of the Analysis Spine's *model→insight* arc. The 07 review reconciles the two files' vocabulary verbatim.
- **AQ-4.2 (below)**: D17's family members register additively via §20.1; D17 itself enters by this full amendment.
- **AQ-5 (`04-derived-data-doctrine.md`)** touches §27's derived-artefacts table row and appends a **new rule 5** (rule 1 is quoted there only as an anchor, unchanged); this proposal touches §27 **rule 3** — disjoint edits in the same section; 07 must read the combined §27 end-to-end.
- **GA-414 / ND-1**: D17 deliberately does *not* specify the longitudinal history store it reads (versioning, append-only mechanics, career span) — that is ND-1 territory; D17 names typed inputs only, per the audit's "names here, mechanics there" split.
- **AIGAS / E3**: D17 members are prime substitution candidates; substitution stays behind the §19 contract with D14 as the safety harness — no AIGAS change required, and nothing here pre-empts its ratification (AQ-8).
- **Privacy (Art 11, L13, §27.1)**: the squad roll-up member consumes derived signals only; the existing build-failing privacy validator is named in D17's failure modes. Nothing widens coach visibility.
- **Purity (Art 18, P12)**: D17 is pure and asynchronous; the planning pass D1→D14 is untouched, so golden masters are unaffected by ratification of the *text* (implementation is separate, later work).

### Not changed

- **Every existing contract D1–D16** — semantics, inputs, outputs, deps all untouched; D17 only *adds itself* as a consumer/producer at named seams.
- **The planning spine and §21's planning-pass diagram rows** — D1→D14 order and drawing unchanged; only the async band gains a line.
- **§22 worked examples, Parts III–IV (as-built snapshot), §45 lens records** — dated/point-in-time material stays as written ("sixteen decisions" in §45 C2.1 remains a true statement about the draft it reviewed).
- **No endurance, taper, RTP-gating, or assessment-scheduling decisions** are added here — they arrive later through §20.1 (and GA-421/GA-412 route via ND-1 first).
- **The implementation** — this is specification text only; no engine code, no status claims (status lives in HANDOFF.md only).

---

## AQ-4.2 — The decision-catalogue extension clause (EDS §20.1 + §42 closing)

*(AQ-4.1, the Decision Ontology's paired additive-vs-structural clause, is drafted in [`02-ontology.md`](02-ontology.md) — one doctrine, stated once in each document.)*

**Target:** `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md` — a new subsection `### 20.1 Extending the catalogue` at the end of §20 (after the D17 entry proposed in AQ-3, before `## 21`), plus one edit to §42's closing paragraph.

### Current text

§20.1 is an insertion (no existing text replaced; the EDS's `### N.N` subsection convention — §26.1, §27.1, §28.3 — is followed, so the table of contents, which lists `##` sections only, needs no change). The §42 closing paragraph currently reads:

> The unifying theme: **the decision graph is stable; expansions are new knowledge, new interventions, new state, or substituted decisions.** If a proposed feature would require re-architecting the decision graph, that is a signal the feature is misframed — or that the architecture has a genuine gap worth recording in Open Questions (§44).

### Proposed text

**Part 1 — new subsection at the end of §20:**

> ### 20.1 Extending the catalogue
>
> The catalogue is **closed against silent change and open to governed growth**. Both halves are load-bearing.
>
> **What never changes silently.** The contract and semantics of an existing decision are never altered, split, merged, or re-ordered except by a full amendment under the documentation governance. "The decision graph is stable" (§42) means *its members mean what this section says they mean* — not that the catalogue is finished.
>
> **How a new decision enters.** A genuinely new decision — or a new member of an existing family — is admitted as a **dated additive entry** under the governance batch protocol, versioned like knowledge rather than treated as a constitutional event, when it presents all four of:
>
> 1. **Contract completeness** — every field of §19's contract (id, purpose, inputs, reasoning, output, confidence, dependencies, consumers, failure modes, rationale), fully stated.
> 2. **Graph position** — declared parents and consumers that keep the graph a directed acyclic graph. The newcomer may register as a consumer of existing outputs; it rewires no existing edge and alters no existing decision's inputs, outputs, or semantics.
> 3. **Validation & explainability integration** — its output carries `{output, confidence, rationale}` (L11, §28); its authority is governed by the tiers of §28.3; and anything that would change a plan routes through D14's validators (L8) — a new decision never acquires the last word.
> 4. **Knowledge separation** — its domain content enters as knowledge-module entries (P11); an admission adds a *decision*, never embedded facts.
>
> Each admission is recorded in the amendment queue as a dated additive entry, and the catalogue carries a version stamp alongside the knowledge-set version, so any past plan can name the catalogue it was reasoned under.
>
> **What remains a full amendment.** Changing an existing decision's contract or semantics; removing a decision; restructuring the planning spine (the D1→D14 order); anything touching an Engine Law or First Principle. A proposal that cannot yet meet the four criteria is not ready: record it in Open Questions (§44) until it is.
>
> *(This clause is mirrored by the Decision Ontology's additive-vs-structural extension clause: a new decision and the new entities it reasons over enter through the same governed door, in the same batch.)*

**Part 2 — §42 closing paragraph**, replaced by:

> The unifying theme: **the decision graph is stable; expansions are new knowledge, new interventions, new state, substituted decisions — or, where a genuinely new decision has earned its place, a governed addition to the catalogue (§20.1).** If a proposed feature would require re-architecting the decision graph, that is a signal the feature is misframed — or that the architecture has a genuine gap: record it in Open Questions (§44), and when it matures into a decision meeting §20.1's admission criteria, admit it there — never by an ungoverned fork.

### Rationale

- **GA-419** (audit 04, P6.2, THIN): "The catalogue is closed by doctrine ('the decision graph is stable') with gaps routed to Open Questions, not to a governed extension path; the first redesign sprint already had to invent `V2-P<n>` names and pre-queue them as amendments." Remedy line: "criteria for admitting a new decision (contract completeness, graph position, validation/explainability integration), versioned like knowledge — mirror of Ontology GA-204."
- **Audit 09 §3, AQ-4**: "both documents close their catalogues by doctrine, so every genuinely new decision type or entity requires a constitutional-grade amendment — a growth tax the end-state cadence (endurance, RTP, taper, analysis) pays repeatedly" (evidence: V2 plan decision 8 + Task-0 §4, branch `engine-v2-design-2026-07-11`).
- **Benchmark P6.2**: "the decision framework can absorb genuinely new decision categories (endurance session construction, taper design, RTP gating) by extension — each new decision slotting into the existing diagnosis, validation, and explainability machinery rather than forking it." The four admission criteria are that sentence made mechanical.
- **Audit 04 assumption A4**: "D1–D16 spans coaching … already falsified in practice." The clause converts that falsification from a workaround (`V2-P<n>`) into governance.
- **Audit 09 ordering note** (audit 09, V2 interaction): "If AQ-4's extension clause lands first, those pre-queued V2 items become routine additive registrations rather than four separate amendment negotiations" — this clause is deliberately batched ahead of the Phase 2 V2 re-scope.

### Consistency

- **With AQ-3**: D17 is seated by this batch (a full amendment), demonstrating the entry format §20.1 demands; its future family members are the clause's first intended beneficiaries.
- **With AQ-4.1 (Ontology)**: same additive-vs-structural doctrine, one statement per document; the 07 review confirms the two clauses' criteria do not diverge (in particular, that "new entities within an existing family" over there and "new member of an existing family" here draw the line identically).
- **With the governance layer**: "dated additive entry under the governance batch protocol" is the mechanism DOCUMENTATION-GOVERNANCE landed in #172; the clause cites the process without restating it (no second source of truth). The amendment-queue row is the audit trail.
- **With Art 20 / P15 (simplicity)**: the clause raises the bar for admission (four criteria, recorded, versioned) while lowering its ceremony — growth stops being constitutional-grade but never becomes ungoverned.
- **With §44**: Open Questions keeps its role as the holding pen; the §42 edit routes matured gaps to §20.1 instead of leaving them stranded.
- **Version stamping**: "catalogue version alongside the knowledge-set version" parallels `KNOWLEDGE_SET_VERSION` and audit 04 A8's replayability concern without specifying storage (ND-1 territory).

### Not changed

- **The frozen-set amendment process itself** — structural change to the EDS still takes a full, Simon-ratified amendment; this clause creates a *lighter lane for additions only*.
- **§19's decision contract** — the clause enforces it; it does not alter it.
- **D1–D17 semantics** — the clause's first paragraph guarantees exactly this.
- **The Ontology's text** — its clause is proposed in `02-ontology.md`, not here.
- **No pre-admission of any pending decision** (endurance, taper, RTP, assessment scheduling, the `V2-P<n>` set) — each must present the four criteria on its own merits, later.

---

*Version-bump note: per the batch protocol, the EDS receives **one** version bump for the whole batch (this file's AQ-3 + AQ-4.2, and AQ-5's §27 edits — the derived-artefacts table row + new rule 5 — from `04-derived-data-doctrine.md`); the bump is planned in `07-consistency-review.md`, applied only in Simon's ratification PR.*
