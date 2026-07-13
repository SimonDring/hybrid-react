# 06 — AQ-8: Ratify AIGAS (the T2-entry proving case)

**Status: BATCH PROPOSAL — working doc (T4) · 2026-07-13 · nothing herein is applied; Simon's ratification PR applies it**
Spec: [`docs/superpowers/specs/2026-07-13-phase1-amendment-batch-design.md`](../../superpowers/specs/2026-07-13-phase1-amendment-batch-design.md)

---

**A note on form.** The other batch files propose *text amendments* and follow the
entry format exactly (Target / Current / Proposed / Rationale / Consistency / Not
changed). AQ-8 is different in kind: it is a **ratification proposal** under the
T2-entry path of `docs/DOCUMENTATION-GOVERNANCE.md` §3 (*Ratification — how a
document enters T2*, landed 2026-07-13 in v1.1). The entry format is therefore
adapted: one AQ-8 entry whose "Proposed text" is the structured ratification
package — the proposal (§1), the panel-review step with both options prepared
(§2), the findings dispositions (§3), the complete reconciliation list with
current→proposed text per touch-point (§4), and what changes for Stage 6 (§5).
Consistency and Not-changed close the entry as usual (§6, §7).

---

### AQ-8 — Ratify AIGAS

- **Target:** `docs/architecture/AIGAS.md` status + frozen-set cross-references
  (Constitution Appendix A, TAS §15 "Future AI architecture") + every live
  document that calls AIGAS draft/designate (itemised in §4).
- **Current text:** AIGAS header Status row, verbatim:
  > | **Status** | v1.0 — governing AI architecture specification (draft for ratification into the frozen set, per the Constitution's Amendment & Stewardship process) |
- **Proposed text:** the ratification package, §§1–5 below.
- **Rationale:** GA-610 (governance audit 06 — THIN, AMENDMENT CANDIDATE;
  benchmark P6.5): AIGAS is simultaneously treated as binding ("every AI
  capability is validated against this document before it is built") and
  formally unfrozen — it can drift, be edited without amendment discipline, and
  lacks the frozen set's forward-references. The 2026-07-06 review recommended
  ratification with named mechanics; those steps remain open. Bites **now**:
  Stage 6 (AI go-live) is the next AI stage and `docs/DEVELOPMENT-PLAN.md` lists
  "AIGAS ratified (AQ-8)" as an AI-go-live precondition. GA-703 (audit 07) makes
  AQ-8 the **proving case** for the governance doc's new ratification path;
  ND-1 (the Data & Analytics Architecture Specification) enters T2 by the same
  path only after AQ-8 proves it.
- **Consistency / Not changed:** §6 / §7 below.

---

## §1 · The proposal (GOV §3 ratification path, step 1)

Ratification asserts, in writing, exactly what the path requires — tier, ownership,
and every governing document touched:

**What ratification asserts.** That `docs/architecture/AIGAS.md` v1.0 is admitted
as the **sixth governing document**: a full member of T2 (peer to the TAS) *and*
of the frozen set, per GA-610's direction ("one versioned amendment admitting
AIGAS to the frozen set") and GOV §3 step 4 ("a ratified document may then be
frozen under the same amendment discipline as the original set" — this proposal
takes ratify-and-freeze as one step; Simon may instead ratify now and freeze
later, in which case only the frozen-set-membership edits in §4 are deferred).
Concretely:

1. **Tier:** T2, peer to the TAS. The existing division of labour is unchanged
   and becomes mutually governing: *the TAS defines where AI attaches to the
   software; AIGAS defines what AI is allowed to be* (AIGAS header, Authority
   row). AIGAS stays subordinate to the Constitution, Ontology, Knowledge
   Architecture, and EDS — its own Authority row already says so and nothing in
   the flip changes it.
2. **What it owns (one concept-owner each, GOV §5):** the AI/engine boundary —
   per benchmark 00 §3 as adjudicated by governance audit 06 §1: owns **P4.1**
   deterministic-core protection, **P4.2** AI communication/education, **P4.3**
   AI insight surfacing, **P4.4** AI-assisted knowledge curation, **P4.5** AI
   evaluation/monitoring/track-record governance; co-owns the AI-facing slices
   of P2.11 (reporting delivery — TAS owns the capability), P5.5 and P5.6
   (human authority, explainability — Constitution owns the principles). This
   matches the INDEX's existing ownership cell ("The AI/engine boundary") — no
   ownership moves.
3. **Every governing document it touches:** all five. Constitution (Arts 4, 5,
   8–11, 13–20 + Amendment & Stewardship — traced clause-by-clause in AIGAS
   Appendix A), Decision Ontology (§24 interlingua), Knowledge Architecture
   (§23, Domain 11), EDS (Q8, E3, SA8, L10–L13), TAS (§3.3, §5.13, §6, §7, §9,
   §10, §15). The only *edits* to frozen documents the flip requires are the
   two forward-references (§4 items 4–5); everything else AIGAS touches, it
   already traces to without needing reciprocal text.
4. **Post-ratification stewardship:** Parts I–VI and Appendix A freeze under
   the amendment discipline; **Appendix B (Current realization) is designated
   living** — it already declares itself "updated as the stack evolves (same
   convention as TAS Appendix A)", and the 2026-07-06 review (Finding 6) asked
   for exactly this designation to be made explicit at ratification.

## §2 · The panel-review step (GOV §3 step 2) — both options prepared

The path requires "a dedicated dated review (in `docs/reviews/`) whose job is to
break the document — internal consistency, consistency with the frozen set,
fitness against the platform's ambition", with every finding dispositioned before
ratification. Two ways to satisfy it; **Simon chooses**.

### Option A — accept the existing review pair as the qualifying panel record

Two dated reviews of AIGAS already exist:

- `docs/architecture/AIGAS-REVIEW-2026-07-06.md` — the alignment review.
  Verdict: **ALIGNED — recommend ratification.** Clause-level alignment map
  against VISION and all five frozen documents; six findings, none blocking.
- `docs/reviews/2026-07-11-governance-audit-06-aigas.md` — the governance
  forensic audit of AIGAS against the world-class benchmark. Verdict: "on the
  P4 pillar the strongest single document examined"; ten classed findings
  (GA-601…GA-610), plus over-specification probes (§5) and load-bearing-
  assumption tests (§6).

**Scope map against the path's requirements:**

| GOV §3 step-2 requirement | 2026-07-06 review alone | + governance audit 06 (2026-07-11) |
|---|---|---|
| Dedicated, dated, in `docs/reviews/` | **Gap** — dated and dedicated, but lives in `docs/architecture/` (immutable in place per the INDEX; it never moves — GOV §4 rule 1) | **Met** — audit 06 is in `docs/reviews/`, dated, AIGAS-dedicated |
| Job is to *break* the document (adversarial) | **Gap** — its charter was alignment ("does the AIGAS draft align…"), not destruction; its own Finding 5 says "an independent adversarial pass (the PANEL-REVIEW.md pattern) is still worth running before freezing" | **Met** — benchmark probes, §5 over-specification attacks, §6 falsifiable-assumption tests; independent of the 07-06 reviewer's charter |
| Internal consistency | Partial (Findings 1–4 touch internal mechanics) | **Met** — found the one real internal looseness (§5.1: §6.2's seam rhetoric broader than its rule) |
| Consistency with the frozen set | **Met** — the clause-level alignment map is the strongest such artefact in the repo | Corroborated (Appendix A traceability spot-checked; "every clause traces to the frozen set") |
| Fitness against the platform's ambition | Partial (VISION row only) | **Met** — every capability row judged against the end-state benchmark; §6 tests the ambition explicitly |
| Every finding dispositioned before ratification | Open | Open → **closed by §3 of this file**, confirmed by the batch consistency review (07) |

**Verdict on Option A: the 2026-07-06 review alone does NOT qualify** (three
requirements unmet, one by its own admission). **The pair qualifies.** Audit 06
is precisely the independent adversarial pass Finding 5 asked for — dated, in
`docs/reviews/`, benchmark-driven, and run by a different charter. Under Option
A, the ratification PR cites both documents as the panel record and §3 below as
the disposition record; no new review is written. This is the fast path — AQ-8
ratifies with the batch.

### Option B — commission a fresh adversarial panel

If Simon wants a single-purpose panel artefact (the `PANEL-REVIEW.md` pattern
the foundation set used), the charter is:

- **Output:** `docs/reviews/2026-07-XX-aigas-ratification-panel.md` — REVIEW
  class (T5), immutable once written; the ratification PR cites it.
- **Mandate:** break AIGAS v1.0. Three axes, per GOV §3 step 2: internal
  consistency; consistency with frozen set v1.0 (2026-07-01); fitness against
  the end-state ambition (benchmark: `docs/reviews/2026-07-11-governance-audit-00-benchmark.md`).
- **Method:** six lenses, AI-weighted (mirroring `docs/foundation/PANEL-REVIEW.md`):
  Staff AI Engineer (erosion paths through the two seams; prompt/grounding
  attacks); Principal Software Architect (are the boundary contracts
  enforceable in code?); World-class S&C Coach (does the augmentation role
  serve coaching?); Professor of Sports Science (confidence/evidence rules,
  §16/§23); Security & Privacy Engineer (§19 threat model, inferential
  leakage); Product Architect (decade view: provider churn, cost governance,
  drift). Each lens critiques the *document*, not the roadmap.
- **Inputs:** AIGAS in full; the frozen five; the 2026-07-06 review and
  governance audit 06 as prior evidence — each prior finding is inherited into
  the panel's findings table or explicitly superseded, so nothing is silently
  dropped.
- **Output form:** per-lens critiques → one findings table with a disposition
  column (fixed / accepted-with-rationale) → verdict: RATIFY / RATIFY WITH THE
  LISTED EDITS / REWORK. The panel edits nothing; proposed edits queue into the
  ratification PR.
- **Sequencing consequence:** the rest of the batch (AQ-1…AQ-7, AQ-9) can
  ratify on Simon's merge as planned; AQ-8's flip (§4) moves to a follow-up
  ratification PR after the panel lands and its findings are dispositioned.
  The AQ-8 register row then flips BATCHED → RATIFIED only at that second PR.

## §3 · Findings dispositions (required before ratification, either option)

Every open finding from both reviews, dispositioned per GOV §3 step 2 (fixed, or
explicitly accepted with rationale). The batch consistency review (07) confirms
these; under Option B the fresh panel inherits and re-adjudicates them.

| # | Finding | Disposition |
|---|---|---|
| 07-06 F1 | Decision contracts don't exist as code artefacts yet (§6.2's substitutable contracts live in EDS prose) | **Accepted** — an engineering prerequisite of Seam 1 (the WP-60 seam build), not a document defect. AIGAS correctly specifies the contract requirement; the artefacts are build-time. No text change. |
| 07-06 F2 | Measured-path recency confidence must not apply unmodified to AI-derived (C9) assessments | **Accepted** — recorded as a C9 build-time constraint; AIGAS §16 already states the governing rule (confidence from field-test reliability, never self-report). Binds the C9 capability declaration when written. |
| 07-06 F3 | No design-system class yet for AI-generated prose vs engine verdicts (§15) | **Accepted** — living operational material per AIGAS §10/§15; must be specified once (both surfaces) before the first athlete-facing capability ships. A Stage 6 precondition, not a ratification blocker. |
| 07-06 F4 | "The coaching path is never on the meter" (§18) is testable | **Accepted** — the seam build pins it: AI wholly unavailable ⇒ plan/reflow/validate outputs byte-identical to AI-absent runs. A WP-60 harness obligation. |
| 07-06 F5 | Ratification mechanics: sixth governing document; Constitution Appendix A + TAS §15 forward-references; adversarial pass before freezing | **Fixed by this proposal** — §1 (the admission), §2 (the pass), §4 items 4–5 (the exact forward-references it named). |
| 07-06 F6 | Appendix B will drift; mark it living | **Fixed by this proposal** — §4 item 2 designates Appendix B living at the flip. |
| GA-603 | P4.3 ADEQUATE: C5's analytic grounding surface, hypothesis quality bar, and match-data vocabulary unspecified | **Accepted** — classed SPEC-FILLABLE by the audit itself under AIGAS §10 (per-capability declarations are living material; no amendment needed). Owed to the data-pillar work (ND-1 adjacency), before any C5 build. Not a ratification blocker: ratification freezes the principles, and the audit found the principles complete. |
| GA-606 | P4.5 ADEQUATE: no operational floor for eval harnesses, authority promotion, drift monitoring | **Accepted** — SPEC-FILLABLE: a single T3 "AI evaluation standard" spec under AIGAS §10/§20, authored before the first capability ships (joins F3/F4 as Stage 6 preconditions — see §5). |
| GA-610 | AIGAS treated as binding while formally unratified | **Fixed** — this proposal is the queued execution. |
| Audit 06 §5.1 | §6.2's rhetoric ("ALL AI capability enters through exactly two seams") is broader than its rule (C1/C9 inputs and C2–C4 rendering sit outside both seams; C9 "enters as a new assessment" is neither seam) — a future capability could be wrongly blocked or wrongly waved through | **Fixed in the same pass** — the audit's AQ-8 direction folds one clarifying line into GA-610's amendment. Drafted at §4 item 3. |

No other findings are open against AIGAS in either review (GA-601/602/604/605/
607/608/609 are COVERED positives; audit 06 §5 items 2–5 and §6 items 1–5 were
probed and ruled absorbable/no-change by the audit itself).

## §4 · The flip — complete reconciliation list (GOV §3 step 4)

"One change: the document's status line flips to governing, its index entry
updates, and every cross-reference that called it draft/designate is
reconciled." The inventory below is grep-verified across every live document
(reviews, archive, and superpowers records are immutable evidence and are
deliberately NOT touched — GOV §2). `<DATE>` = the date of Simon's ratification
merge. Items 4–5 edit frozen documents and are therefore formal batch-amendment
items; items 1–3 are the ratified document's own flip; items 6–13 are ordinary
edits to living/working documents riding the same ratification PR.

**1 — AIGAS status row** (`docs/architecture/AIGAS.md`, header table).
*Current:* `| **Status** | v1.0 — governing AI architecture specification (draft for ratification into the frozen set, per the Constitution's Amendment & Stewardship process) |`
*Proposed:* `| **Status** | v1.1 — governing AI architecture specification · RATIFIED <DATE> into the frozen set as the sixth governing document (Amendment & Stewardship; ratification record: the 2026-07 amendment batch) · Parts I–VI and Appendix A frozen; Appendix B is living |`
(Version bump v1.0 → v1.1 per "one bump per affected document"; the revision
note names the batch. 07-consistency-review owns the final bump plan.)

**2 — AIGAS Appendix B designated living** (`docs/architecture/AIGAS.md`, Appendix B intro).
*Current:* `The body of this document is implementation-agnostic; this appendix maps it to today's stack and is updated as the stack evolves (same convention as TAS Appendix A).`
*Proposed:* `The body of this document is implementation-agnostic; this appendix maps it to today's stack and is updated as the stack evolves (same convention as TAS Appendix A). Designated LIVING at ratification (<DATE>): unlike Parts I–VI and Appendix A, this appendix is updated by ordinary edits, not amendment.`

**3 — AIGAS §6.2 clarifying line** (the audit 06 §5.1 fold-in; inserted as a
closing paragraph of §6.2, after "Everything user-visible that AI does…").
*Current (the sentence being clarified, §6.2 opening):* `All AI capability, present and future, enters the architecture through exactly two seams (TAS §15). No third path may be created without amending this document and the TAS together.`
*Proposed insertion (new final paragraph of §6.2):*
> Precisely: the two seams bound every path by which AI may *influence a coaching decision*. Capabilities that produce inputs upstream of the engine (C1 extraction as user-confirmed structured state; C9 perception as assessments with field-tested reliability, §11) and capabilities that render engine outputs downstream (C2–C4) sit outside both seams and are governed by their category gates (§11), not by seam contracts. A capability becomes seam-bound the moment its output would alter a decision without passing through validated substitution (Seam 1) or versioned knowledge and priors (Seam 2). There is no fourth route.

**4 — Constitution Appendix A forward-reference** (`docs/foundation/CONSTITUTION.md`,
Appendix A — FROZEN; batch-amendment item; the 2026-07-06 review's Finding 5
names this exact reconciliation). Placement: after Appendix A's closing
blockquote ("Every Engine Law L1–L15…"), before the end-mark.
*Current:* Appendix A ends with the blockquote; AIGAS appears nowhere in the Constitution.
*Proposed insertion (Constitution voice — a note, not a new mapping table):*
> **The AI layer.** The AI Governance & Architecture Specification (AIGAS, ratified <DATE>) extends these Articles to artificial intelligence — most directly Articles 10, 13, 14, 15, 18 and 19 — under the same rule as the EDS: the Articles state the immutable *what* and *why*; AIGAS states the *how* for the AI layer, and its Appendix A traces every clause back to this document. Where AIGAS and any foundational document conflict, the foundational document wins and AIGAS is corrected.

**5 — TAS §15 forward-reference** (`docs/architecture/TAS.md`, §15 "Future AI
architecture" — FROZEN; batch-amendment item; **coordinate with AQ-9**, see §6).
Placement: after §15's opening paragraph ("AI capability will expand
dramatically…two existing seams…").
*Current:* §15 describes the seams and capability table; AIGAS appears nowhere in the TAS.
*Proposed insertion (TAS voice):*
> This section defines **where** AI attaches to the architecture. **What AI is allowed to be** — its constitutional role, the capability taxonomy, the prohibitions, and the standards every AI capability must satisfy before it is built — is governed by the [AIGAS](AIGAS.md) (ratified <DATE>, this document's peer). The two seams below are the same two seams AIGAS §6.2 closes; the pair is amended together or not at all.

**6 — DOCUMENTATION-GOVERNANCE.md** (living; three spots).
*Current → proposed:*
- §1 ladder: `T2  EDS (engine)  ·  TAS (technical)  ·  AIGAS (AI, pending ratification)` → `T2  EDS (engine)  ·  TAS (technical)  ·  AIGAS (AI)`
- §3 opening: `The frozen set is: **Constitution, Decision Ontology, Knowledge Architecture, EDS, TAS** (v1.0, 2026-07-01). AIGAS is governing-designate pending ratification (the path below).` → `The frozen set is: **Constitution, Decision Ontology, Knowledge Architecture, EDS, TAS** (v1.0, 2026-07-01) **and AIGAS** (ratified <DATE> via the path below — the path's proving case).`
- §3 ratification path closing: `This path applies to AIGAS now (queued as AQ-8 — the proving case) and to every future T2 candidate, starting with the Data & Analytics Architecture Specification (queued as ND-1).` → `This path was proven by AIGAS's ratification (AQ-8, <DATE>) and applies to every future T2 candidate, starting with the Data & Analytics Architecture Specification (queued as ND-1).`

**7 — DOCUMENTATION-INDEX.md** (living; three spots).
- Mermaid node: `AIGAS["AIGAS — AI governance<br/>draft, pending ratification"]` → `AIGAS["AIGAS — AI governance (FROZEN)<br/>two seams · C1–C9 · 8 prohibitions"]`
- Section heading: `## T0–T2 · Canonical (the frozen set + AIGAS)` → `## T0–T2 · Canonical (the frozen set)`
- AIGAS row, Related cell: `AIGAS-REVIEW (ratification evidence) · **pending panel + ratification**` → `AIGAS-REVIEW + governance audit 06 (panel record) · **ratified <DATE>**` (Option B: cite the fresh panel review instead).

**8 — CLAUDE.md** (living; three spots in "Documentation governance").
- The frozen-set sentence gains AIGAS: `**The FROZEN set (v1.0, 2026-07-01)** — never edit as routine work: …TAS.md.` → append `docs/architecture/AIGAS.md (ratified <DATE>; Appendix B living).`
- `docs/architecture/AIGAS.md governs all AI work (draft pending ratification).` → `docs/architecture/AIGAS.md governs all AI work (ratified — frozen; Appendix B living).`
- Hard rules: `The frozen five are never edited inline` → `The frozen six are never edited inline` (and the same phrase in the "Hard rules" bullet if repeated).

**9 — docs/foundation/README.md** (living): `(v1.0 draft, pending ratification — peer of the TAS)` → `(ratified <DATE> — the sixth governing document, peer of the TAS)`.

**10 — docs/architecture/README.md** (living): `*(v1.0 draft — pending ratification into the frozen set.)*` → `*(Ratified <DATE> — member of the frozen set; Appendix B living.)*`

**11 — docs/architecture-atlas/02-ARCHITECTURE-DECISION-REGISTER.md** (supporting): the "Future considerations" line `The one document not yet formally folded into the frozen set is AIGAS (see ADR-11) — currently a "v1.0 draft, pending ratification."` → `AIGAS was ratified into the frozen set on <DATE> (see ADR-11).`

**12 — HANDOFF.md** (working): open-queue item 3's `AIGAS itself still needs its ratification panel pass` and the invariant line `AIGAS (docs/architecture/AIGAS.md) is governing for AI work, pending formal ratification` updated to record ratification and point remaining Stage 6 preconditions at §5's list.

**13 — docs/AMENDMENT-QUEUE.md** (working): AQ-8 row BATCHED → RATIFIED on
Simon's ratification merge (Option B: RATIFIED at the follow-up flip PR), notes
cell citing this file + the panel record.

**Conditional item — AIGAS's own "TAS §15" citations.** AIGAS cites TAS §15 in
§6.2, §10, and five Appendix A rows. **If** AQ-9's structural repair renumbers
the "Future AI architecture" section (05-tas-structural-repair.md decides), those
AIGAS citations are updated to the new number in this same ratification PR —
the batch reconciles cross-document effects internally, never deferred (GOV §3,
batch protocol). If AQ-9 keeps the section at §15, no edit.

**Not reconciled, deliberately:** `docs/reviews/*` (including governance audits
06–09), `docs/archive/*`, `docs/superpowers/*`, and
`docs/architecture/AIGAS-REVIEW-2026-07-06.md` — dated evidence / immutable
records; their "pending ratification" statements are true as of their dates
(GOV §2). No banner is needed: none of them claims to be current state.

## §5 · What ratification changes for Stage 6 AI work

1. **Ends the designate limbo (GA-610).** Today a designate document "binds new
   work but loses precedence conflicts against the ratified set" (GOV §3).
   After the flip, AIGAS wins conflicts as a full T2/frozen member — the
   "validated against this document" claim rests on governance, not convention.
2. **Freezes the AI constitution before the AI arrives.** AIGAS Parts I–VI and
   Appendix A join the amendment discipline: defects go to the amendment queue,
   never inline; §13's prohibitions formally inherit Title III/IV
   may-be-clarified-never-weakened status (AIGAS Amendment & stewardship
   already claims this; ratification makes the claim enforceable). Appendix B
   stays living, so stack drift never again pressures the frozen body.
3. **Satisfies the first AI-go-live precondition.** DEVELOPMENT-PLAN's go-live
   gate reads "AIGAS ratified (AQ-8), per-capability eval harness built…".
   Ratification clears the first clause. The remaining Stage 6 preconditions —
   unchanged by this proposal, now clearly the *only* outstanding ones — are:
   the T3 AI-evaluation-standard spec (GA-606), the per-capability declarations
   per AIGAS §10 (first: C2 explanation, C1 extraction — Appendix B), the
   AI-prose design-system class (07-06 F3), the AI-off byte-identity test
   (07-06 F4), and Simon's go-live decision (HANDOFF queue #3).
4. **Proves the T2-entry path (GA-703).** AQ-8 is the path's first execution
   end-to-end (proposal → panel → Simon → flip). ND-1, the Data & Analytics
   Architecture Specification, enters T2 by the identical route — this file is
   its template.
5. **Changes nothing about what AI may do.** The four verbs, two seams, C1–C9
   taxonomy, and eight prohibitions are already binding on all new work.
   Ratification changes the document's *protection and precedence*, not its
   content (the §4 item-3 clarification is the single substantive line, and it
   narrows ambiguity rather than altering any rule).

## §6 · Consistency (interactions with the batch and unchanged neighbours)

- **AQ-9 (05-tas-structural-repair.md) — the coordinated reference.** Both
  items touch TAS §15's neighbourhood: AQ-9 repairs the § map (the preamble and
  T19/§16/§17 cross-refs claim §15 is "Security & Privacy" while the actual §15
  is "Future AI architecture"); AQ-8 inserts a forward-reference into the
  "Future AI architecture" section *wherever AQ-9's corrected map places it*.
  This file deliberately targets the section **by title, not number**; the
  final § number (and the conditional AIGAS-citation updates in §4) are pinned
  by 07-consistency-review once 05's repair shape is fixed. One TAS version
  bump covers AQ-5 + AQ-8 + AQ-9 together.
- **01-constitution.md (AQ-1/6/7).** Disjoint sections: those items touch the
  Preamble and Title III; this one appends a note to Appendix A. One
  Constitution version bump covers all four. The new Appendix A note must not
  imply AIGAS ranks with the foundational documents — its "foundational
  document wins" closing sentence restates AIGAS's own Authority row, so the
  conflict order (Constitution → Ontology/KA → EDS/TAS/AIGAS) is unchanged.
- **AQ-2/AQ-3 (ontology + EDS analysis families).** No text overlap. Forward
  note: if AQ-3's analysis decisions (D17+) are ever declared substitutable,
  they enter AI reach only through AIGAS §6.2 Seam 1 — the §4 item-3
  clarification already covers this case; no wording in either file needs the
  other.
- **ND-1.** Not authored in this batch (spec rule 5). AQ-8's ratified path is
  its prerequisite; GA-603's accepted gap (C5 grounding surface) is owed to
  ND-1's territory and is recorded in §3, not silently dropped.
- **Precedence model.** After the flip the T2 row reads EDS · TAS · AIGAS with
  no qualifier; GOV §1's "frozen wins over non-frozen within a tier" clause
  becomes vacuous for T2 (all three frozen) — no GOV text change needed beyond
  §4 item 6.
- **Title III floor.** Strengthened, not weakened: AIGAS §13's prohibitions
  formally join the never-weakened floor (batch rule 2 satisfied; 07 confirms).

## §7 · Not changed — deliberately

- **AIGAS's content.** No Part, no capability category, no prohibition, no
  seam is redrafted. The only body edits are the §6.2 clarifying paragraph
  (narrowing, dispositioned at §3) and the Appendix B living designation.
- **AIGAS's subordination.** It remains below Constitution/Ontology/KA/EDS;
  ratification makes it a *peer of the TAS*, not a sixth tie-breaker.
- **Ownership boundaries.** TAS keeps "where AI attaches"; the Constitution
  keeps human-authority and explainability principles; KA keeps knowledge
  governance. No concept moves owners (GOV §5).
- **The 2026-07-06 review file.** It stays in `docs/architecture/` untouched
  (reference stability, GOV §4 rule 1) — under Option A it is cited, never
  edited.
- **Stage 6 build scope.** WP-60, the eval-standard spec, and capability
  declarations are named as preconditions but not designed here.
- **The SPEC-FILLABLE gaps (GA-603, GA-606).** Accepted with rationale, not
  patched into the frozen body — AIGAS §10 exists precisely so these enter as
  living specs, not amendments.
