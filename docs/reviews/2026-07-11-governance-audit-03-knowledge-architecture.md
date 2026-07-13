# Governance Audit 03 — Knowledge Architecture vs the Benchmark

**Class: REVIEW (T5) · dated evidence, never current state · 2026-07-11**
**Pin: frozen set v1.0 (2026-07-01) · `main @ fc5e3f8` · KSV 1.30.0**
**Spec: [`docs/superpowers/specs/2026-07-11-governance-forensic-audit-design.md`](../superpowers/specs/2026-07-11-governance-forensic-audit-design.md) · Benchmark: [`…-00-benchmark.md`](2026-07-11-governance-audit-00-benchmark.md)**

---

Document audited: `docs/foundation/KNOWLEDGE-ARCHITECTURE.md` (v1.0, frozen),
read in full. Judged at full end-state ambition against benchmark 00 §1–§2,
capability slices per 00 §3. Implementation evidence is drawn from
`docs/reviews/2026-07-11-engine-audit-05-knowledge-usage.md` (evidence of
governance gaps only, never findings in itself — spec §5.7).

## §1 Role and owned slices

The Knowledge Architecture (KA) is the canonical home for *how knowledge and
data are structured, owned, versioned, and classified* (KA header table). It is
the governance layer that keeps Constitution Article 17 true — knowledge as
data, separate from reasoning — via three instruments: the eight-kind taxonomy
of every datum (KA §2), the universal knowledge-entry shape and registry model
(KA §3), and the twelve knowledge domains each governed under a fixed template
(KA §4), with versioning/governance rules (KA §5), a placement framework
(KA §6), and the knowledge-side privacy boundary (KA §7).

Per benchmark 00 §3, the KA **owns**:

- **P3.1** Evidence grading & confidence-to-authority mapping
- **P3.2** Knowledge versioning & review cadence
- **P3.3** Contested-science handling
- **P3.4** Knowledge retirement/supersession
- **P3.5** Internal evidence generation
- **P2.8** Benchmarking & normative comparison
- **P6.1** New sports as data (sports as governed data)

and **co-owns**:

- **P4.4** AI-assisted knowledge curation (primary owner: AIGAS)
- **P2.9** Data quality, provenance & missingness — the provenance/confidence
  semantics slice (primary owner: TAS)

## §2 Coverage table

One row per owned/co-owned capability. Verdicts per 00 §4; no §2 row here is
SILENT or PRECLUDES, so the extended fields appear only in the one KA-scoped
SILENT probe finding (§4, GA-310).

| Capability | Verdict | Cited Article/§ | Reasoning |
|---|---|---|---|
| P3.1 Evidence grading & confidence→authority | **WORLD-CLASS** | KA §3.1; KA §4 (Domain 10); Constitution Art 13 | Every entry carries `evidenceLevel` L1–L5 + `confidence` + `source` + `lastReviewed`; confidence is declared *operative, not decorative*, mapping mechanically to gate / soft input / reported metric; the mapping itself is a dated, reviewed knowledge entry, not a constant (KA §4 D10, §5); even the open problem (confidence composition across chained decisions) is honestly recorded with a conservative weakest-link rule. Nothing material is missing at end-state. |
| P3.2 Knowledge versioning & review cadence | **ADEQUATE** | KA §3.1; KA §5; KA §4 (per-domain Versioning rows) | Per-entry `lastReviewed`, "change is data review with its own change log", golden-master gating of behaviour-changing edits, and per-domain versioning rules are all governed. Short of world-class: no per-entry owner, no defined cadence (the "schedule" is asserted, never specified — e.g. by evidence level or authority tier), no whole-set version mandated in the document, and no defined consequence when `lastReviewed` lapses. Evidence the gap is real: the staleness watchdog exists as an authored entry with no review-queue consumer (engine-audit 05 §2, §6). |
| P3.3 Contested-science handling | **ADEQUATE** | KA §3.1 (rules 1–2); KA §2.1 (Knowledge vs Assumption); KA §4 (Domain 10) | The safety-critical half is fully governed: contested knowledge is labelled (low confidence, honest stubs, "a fake citation is corrupt") and mechanically constrained below gating authority — the generalised ACWR cure. The representation half is absent: the entry shape holds a single `value` + one confidence; there is no structure for genuine disagreement (competing positions with the strength of each), so the platform picks a side and labels it low-confidence rather than representing the dispute. |
| P3.4 Knowledge retirement/supersession | **THIN** | KA §5 ("Superseded science is a reviewed edit, not a silent overwrite"); KA §3.1 (entry shape) | One governing sentence. No lifecycle states (active/deprecated/retired), no `supersededBy` record of what replaced what and why, and no propagation guarantee that retired knowledge stops influencing everywhere at once. The registry model implies propagation, but the live drift evidence — a decision module holding a local copy of a governed entry, making the entry "documentation, not the operative source" (engine-audit 05 §4) — shows retirement-without-a-checklist can silently fail today, at 33 entries. |
| P3.5 Internal evidence generation | **THIN** | KA §4 (Domain 12); KA §7 (prior tiers); KA §8.3 | The category answer is given (population/sport-tier learned priors *are* Knowledge; athlete-tier priors are Predictions; aggregation only privacy-preservingly), and FR1–FR5 name the research surface. But the pathway into the *graded pipeline* is gestured at, not specified: the L1–L5 scale is literature-shaped with no rung for the platform's own outcome data; the promotion gate (what sample, what review, what grade a learned population prior receives on becoming shared Knowledge) is unspecified; trained analytics models as knowledge artifacts are unclassified (see §6.3). |
| P2.8 Benchmarking & normative comparison | **THIN** | KA §4 (Domain 1 — "population priors when unmeasured", Strength-standard priors; Domain 12 — population tier) | Norms exist in the architecture only as *estimation* inputs (imputing unmeasured capabilities). The benchmarking use — positioning a tested athlete against governed normative bands by sport, position, sex, age, and training age, with provenance per norm, as a defensible athlete/coach-facing claim — is never named: no domain owns normative bands, no consumer reads them for comparison, and the differentiation axes are nowhere specified. Any authored norm *would* inherit the universal entry shape's provenance/confidence, which is why this is THIN, not SILENT. |
| P6.1 New sports as data | **WORLD-CLASS** | KA §1; KA §3.2–§3.3; KA §4 (Domain 2); Constitution Art 17 | Adding a sport = author a 21-section profile + one registry line, zero core edits; the registry validates structure, provenance-where-authored, invariants, and privacy *on load*, failing fast; `completeness()` makes authoring depth visible; the schema spans sprint running to rugby to triathlon without special-casing. This is the exemplar of Article 17 and the document's crown jewel. (That the engine consumes only ~6 of 21 sections — engine-audit 05 §2 — is consumption-side evidence for the EDS audit (00 §3 assigns P6.1's consumption side there), not a KA authoring-governance defect.) |
| P4.4 AI-assisted knowledge curation *(co-own)* | **ADEQUATE** | KA §3.1 (rule 1); KA §3.3; KA §4 (Domain 2 "Future AI", Domain 10, Domain 11 AI-confidence caveat) | The principle is firmly and repeatedly governed from the KA's altitude: AI-drafted knowledge is "always authored as reviewable data, never executed unreviewed"; no fabricated evidence, ever; an AI's self-reported confidence is never trusted — confidence is earned via validation + track record. Short of world-class: the entry shape carries no authorship provenance (nothing marks an entry as AI-drafted vs expert-authored), and the curation gate itself (who approves, against what checklist) is left implicit for AIGAS. |
| P2.9 Data quality, provenance & missingness — semantics slice *(co-own)* | **ADEQUATE** | KA §4 (Domain 7 index contract); KA §2.1 (Stored Data row); KA §2.1 (Stored vs Derived) | The index contract is a world-class fragment: `missingInputs[]` surfaces the unknown, missing inputs lower confidence but never block, per-source reliability (ecg → wrist-optical → manual) scales confidence, sensor and self-report are structurally distinguished. But the taxonomy itself declares Stored Data "ground truth" with confidence "n/a" (KA §2.1), so erroneous recorded data — a misreading sensor, a duplicate sync, a typo — has no quality dimension anywhere in the classification; reliability handling exists only at derivation time, and only for indices. Evidence the semantics can go decorative without a consumer rule: computed index confidence "read by no decision", `baselineMaturity` fixed at 1 (engine-audit 05 §5). |

## §3 What is world-class here

Recorded honestly as positives (these become COVERED findings in §4):

1. **The eight-kind taxonomy with an operational classification rule (KA §2).**
   Not a philosophy statement — a decision procedure (§2.2), a worked table of
   real platform data (§2.3), and sharpened confusions (Knowledge vs
   Assumption, Inference vs Calculation) that name real failure modes ("the
   ACWR disease: dressing a contested judgement as an exact number"). The
   explicit rule that a learned per-athlete prior is a *Prediction, not
   Knowledge* (KA §2.1, §8.3) is a category boundary most platforms never
   articulate and then violate.
2. **Confidence as a mechanical governor, with the governor itself governed
   (KA §3.1, §4 D10).** The evidence→authority mapping is a dated, reviewed
   knowledge entry — "*who decided L3 is 'soft input'* is answerable" (KA §5).
   That is Constitution Art 13 made auditable. Implementation evidence shows it
   working operatively for training knowledge: authority tiers floor ACWR's
   solo effect and cap validator verdicts (engine-audit 05 §5).
3. **Registries + fail-fast validation at the knowledge boundary (KA §3.2).**
   Decisions consult registries, never members; malformed knowledge fails at
   load with a precise error; authored content must carry provenance. The
   "add knowledge, not code" checklist (KA §3.3) makes Article 17 testable.
4. **Sports as governed data (KA §4 Domain 2)** — see P6.1 above; the SKB
   contract (21 sections, invariants, privacy sweep in the validator) is the
   strongest single extensibility instrument in the frozen set.
5. **Honest open problems.** Confidence composition across chained decisions is
   flagged as "a modelling simplification and an acknowledged open problem"
   with a conservative interim rule (KA §4 D10); the AI-proposal bounding
   contract is recorded as open rather than hidden (KA §4 D11). A frozen
   document that names its own unknowns is exhibiting exactly the no-silent-debt
   posture the Constitution demands (Art 15).
6. **The knowledge-side privacy boundary (KA §7).** Knowledge/Stored/Derived/
   Prior tiers each get an explicit crossing rule, and the raw-vitals rule is
   enforced by a build-failing validator, not a habit — the KA's contribution
   to P5.1 (owned by the Constitution/TAS) is architectural, not aspirational.

## §4 Findings

### GA-301 · P3.1 · WORLD-CLASS · KA §3.1, §4 (Domain 10), §5 · COVERED
Evidence grading and confidence-to-authority mapping are governed at the
benchmark standard: universal entry shape, operative confidence, three
authority tiers, the mapping itself versioned and reviewed, composition
honestly flagged as open with a conservative rule. **Proposed direction:**
none — record as a positive in deliverable 09.

### GA-302 · P6.1 · WORLD-CLASS · KA §3.2–§3.3, §4 (Domain 2) · COVERED
Sports-as-governed-data is the exemplar of Constitution Art 17: schema-bound
authoring, load-time validation, provenance enforcement, zero core edits per
sport. **Proposed direction:** none for the KA; the consumption-side gap
(dormant SKB sections) belongs to the EDS audit (04) and the data-pillar
deep-dive (08).

### GA-303 · P3.2 · ADEQUATE · KA §3.1, §5 · SPEC-FILLABLE
Versioning and review are governed in principle but the cadence machinery is
unspecified: no per-entry owner, no schedule (e.g. review interval keyed to
evidence level or authority tier), no whole-set version requirement in the
document, no defined consequence of a lapsed `lastReviewed`. At 33 entries this
is absorbed by diligence; at the end-state's thousands of entries plus
AI-accelerated intake (P4.4) it becomes the drift the KA exists to prevent —
and the unwired staleness watchdog (engine-audit 05 §2) shows the process half
does not self-assemble. **Proposed direction:** a T3 knowledge-review-process
spec under KA §5 defining owners, cadence-by-tier, the review queue, and
whole-set versioning.

### GA-304 · P3.3 · ADEQUATE · KA §3.1 (entry shape), §4 (Domain 10) · SPEC-FILLABLE
Contested science cannot hard-gate — the authority half of the capability is
world-class. But the entry shape cannot *represent* a genuine disagreement
(competing positions with the strength of each); it holds one value and one
confidence. What is lost: athlete/coach-facing "how sure we are" explanations
collapse a live dispute into a bare "low confidence", and AI knowledge curation
(P4.4) has no target structure for "the literature disagrees". **Proposed
direction:** a spec-level extension of the entry shape (optional
`positions[]` with per-position evidence) — additive to §3.1, no amendment
required since the shape does not prohibit additional fields.

### GA-305 · P3.4 · THIN · KA §5 · SPEC-FILLABLE
Retirement/supersession is one sentence of principle with no mechanics: no
lifecycle states, no supersession record (what replaced this, why, when), no
retirement-propagation checklist guaranteeing a retired entry stops influencing
everywhere at once. Bites whenever major science is superseded and acutely from
Stage 6 onward (AI curation and internal evidence raise entry churn). The
readiness-weights local-copy drift (engine-audit 05 §4) is dated evidence that
"edit the governed entry" does not yet imply "behaviour everywhere changes" —
precisely the orphaned-influence failure P3.4 exists to prevent. **Proposed
direction:** a T3 knowledge-lifecycle spec: entry states, `supersededBy`
linkage, and a retirement checklist including a no-shadow-copies sweep.

### GA-306 · P3.5 · THIN · KA §4 (Domain 12), §7 · SPEC-FILLABLE
The internal-evidence pathway (platform outcome data → population priors →
shared knowledge) is gestured at via the three learning tiers and the
privacy-preserving aggregation rule, but not specified: no evidence-scale rung
for internal data (L1–L5 is literature-shaped), no promotion gate (sample-size
/ confounding bar, reviewer, resulting grade) for a learned prior becoming
Knowledge, and no consent precondition referenced (P5.7 territory, but the KA
never points at it). What breaks: learned population priors either enter
Knowledge ungraded (over-trusted) or cannot enter at all (the research value of
FR1–FR5 stalls). Absorbable: yes — Domain 10's own extensibility clause ("new
evidence kinds … = a mapping edit, reviewed") is the designed absorption point,
which is what keeps this SPEC-FILLABLE rather than an amendment. **Proposed
direction:** a T3 internal-evidence spec adding an internal-evidence grade to
the Domain 10 mapping plus the promotion gate for Domain 12 outputs.

### GA-307 · P2.8 · THIN · KA §4 (Domain 1, Domain 12) · SPEC-FILLABLE
No domain owns normative/benchmark data for *comparison*. Norms appear only as
estimation priors; bands by sport/position/sex/age/training age, per-norm
provenance, and the benchmarking consumers (athlete and coach reporting) are
ungoverned. Bites at the analytics end-state (defensible "you are weak here"
claims; squad benchmarking). Absorbable without shoehorning: norm registries
fit Domain 1's remit (athlete-modelling rules) plus the SKB's `assessments`
section, under the universal entry shape. **Proposed direction:** a governed
normative-knowledge spec under Domains 1/2 — and deliverable 08 should weigh
whether benchmarking ultimately belongs to the candidate Data & Analytics
specification (00 §3).

### GA-308 · P4.4 · ADEQUATE · KA §3.1, §3.3, §4 (Domains 2, 10, 11) · SPEC-FILLABLE
The KA's slice of AI-assisted curation is principled and sharp (same graded
gate for AI-drafted content; AI self-confidence never trusted), but the entry
shape records nothing about authorship (AI-drafted vs expert-authored vs
expert-reviewed-AI-draft), so at curation scale the provenance of the
*authoring process itself* is invisible. **Proposed direction:** add authorship
provenance to the entry shape at spec level; the gate mechanics stay with
AIGAS (audit 06).

### GA-309 · P2.9 · ADEQUATE · KA §2.1, §4 (Domain 7) · SPEC-FILLABLE
The Domain 7 index contract is the best provenance/confidence semantics in the
frozen set, but it governs *derived indices* only, and the taxonomy's "Stored
Data = ground truth, confidence n/a" row (KA §2.1) leaves recorded-data quality
(sensor error, duplicates, entry mistakes) with no home in the classification.
Bites when multi-vendor wearables and match feeds arrive (Stage 7 / P6.4).
**Proposed direction:** a spec attaching source/quality *metadata* (not
confidence — preserving the §2.1 distinction) to Stored Data, with the TAS
audit (05) owning the capture/storage half; note the amendment pressure point
if erroneous-data handling ever must live in the eight-kind taxonomy itself.

### GA-310 · P2.4 (KA-scoped probe: the domain map's home for match-performance knowledge) · SILENT · KA §4.1, §4 (Domains 2, 7) · SPEC-FILLABLE
P2.4 is TAS-owned (00 §3); recorded here only because the task brief probes the
twelve-domain map, which is KA territory, and scoped so deliverable 09 does not
double-count against the TAS row. The KA never assigns a home to
match-performance *knowledge* — the semantics of external sport load and match
output (what a GPS sprint-distance number means for a winger, how match minutes
convert to load). Domain 7 consumes "Load" generically and the SKB carries
`loadManagement`/`kpiFramework` sections, but no text says match/external-load
interpretation lives anywhere. **What breaks:** when match data arrives, its
interpretation rules land wherever is convenient — the exact
knowledge-encoded-as-logic anti-pattern KA §1 exists to kill. **When it bites:**
the team/match-data stage (Stage 5+ ambition; P2.4). **Absorbable without
amendment? Yes** — the SKB's existing sections plus Domain 7 are plausible
homes; a spec can assign ownership without touching the twelve-domain set.
**Proposed direction:** an assignment spec routing match/external-load
semantics into SKB sections + Domain 7, feeding deliverable 08.

## §5 Over-specification risks

1. **The closed twelve (KA §4.1).** The reconciliation deliberately canonises
   *twelve* domains, and §8.1 presents the count as a settled decision. New
   knowledge classes the end-state needs (normative bands, match-performance
   semantics, trained-model governance) must either shoehorn into existing
   domains or amend a frozen document. The domains' own Extensibility rows
   absorb *members*; nothing in the text absorbs a new *domain*. Risk: the map
   ossifies and new knowledge gets filed "wherever fits", eroding the
   one-owner-per-concept discipline the KA itself models.
2. **"Exactly one of eight kinds" (KA §2).** The exclusivity rule is the
   taxonomy's power, but the worked table already needs a hybrid ("Calculation
   *on* Inference inputs"), and end-state artifacts strain it harder: a trained
   trend model is at once learned state, prediction generator, and reviewable
   platform asset (§6.3). If "exactly one" is enforced literally, such
   artifacts get misfiled; if loosely, the rule quietly dies. The taxonomy
   needs a composition/containment idiom more than more kinds.
3. **"Derived Data … never stored as truth" (KA §2.1, §2.3).** Correct for the
   plan; in tension with longitudinal analytics (P2.6): a readiness score *as
   computed that morning under that knowledge version* is historical evidence
   a career-long model must retain, because recomputing under later knowledge
   yields a different number. Read strictly, the rule forbids materialising
   derived history; read loosely, it says nothing. It needs the qualifier
   "recomputable given the same inputs and knowledge version" to avoid
   strangling the analytics ambition.
4. **"Knowledge … crosses every boundary freely" (KA §7).** Safe while
   knowledge is literature-derived. Once Domain 12 promotes cohort-learned
   priors into Knowledge, a small-cohort entry can encode re-identifiable
   information; "crosses freely" then over-grants. The privacy-preserving
   aggregation clause gestures at this but sets no cohort-size or
   disclosure-risk bar.

## §6 Load-bearing assumptions the end-state falsifies

1. **"Stored Data is ground truth" (KA §2.1).** Falsified by the multi-vendor
   wearable and match-feed end-state (P2.9, P6.4): recorded reality arrives
   noisy, duplicated, and vendor-skewed. The taxonomy has no quality dimension
   for it; only derivation-time reliability weighting exists, and only for
   indices. (GA-309.)
2. **Knowledge is slow-changing and hand-reviewable in aggregate.** The
   governance (§5) assumes a review surface humans sweep. At 10× entries with
   AI-accelerated intake (P4.4, P6.5), cadence, ownership, and queueing must be
   process, not diligence — the KA specifies none of the three. (GA-303.)
3. **All learnable quantities are scalar priors with simple update rules
   (KA §4 Domain 12).** The schema ("learning rate, shrinkage/Bayesian update
   rule") fits recovery-rate-style scalars. A trained trend or risk model —
   multi-parameter, possibly opaque, needing artifact versioning, pre-deploy
   evaluation, and rollback — is neither Knowledge nor simple Derived Data,
   and the eight kinds cannot place it. Falsified at the analytics/AI stages
   (P2.10, P4.5 territory; knowledge-side governance is the KA's share).
   (Folded into GA-306's direction.)
4. **"Derived Data is always recomputable" (KA §2.1).** True only if inputs
   are retained forever *and* every knowledge version is replayable. The KA
   mandates neither; the longitudinal model (P2.6) depends on both. (§5.3.)
5. **The evidence scale is literature-shaped (KA §3.1).** L1 (meta-analysis)
   … L5 (expert opinion) has no rung for the platform's own aggregated outcome
   data — the very evidence P3.5 says should become the platform's moat.
   Domain 10's extensibility clause is the designed escape hatch. (GA-306.)
6. **Knowledge domains are gym-training-shaped.** External/match load appears
   only as a consumed input ("Load, Stored/Derived" — Domain 7); no domain
   owns its semantics. Falsified the day match data becomes a first-class
   input. (GA-310.)

## §7 Document verdict

Within its home territory the Knowledge Architecture is the strongest governance
instrument in the frozen set, and two of its slices meet the benchmark outright:
evidence-in (P3.1 — graded, confidence-operative, the authority mapping itself
governed and dated) and sports-in (P6.1 — the schema-bound, validator-enforced
SKB). The eight-kind taxonomy with its classification rule is genuinely rare
discipline, and the document's habit of recording its own open problems is
exactly what a frozen foundation should do. But the KA governs the *front door*
of knowledge far better than the *back of house*: review cadence is asserted
without machinery (P3.2), retirement/supersession is one sentence (P3.4), the
internal-evidence pathway — the platform's stated long-term moat — is a gesture
via learning tiers rather than a specified pipeline (P3.5), and the
athlete-data side of the knowledge estate (normative bands P2.8, stored-data
quality P2.9, match-performance semantics) is thin to silent, consistent with
the audit's data-pillar hypothesis (spec §3 Part 3). The saving grace is
structural: every gap found here is absorbable through the document's own
extension points (Domain 10's evidence-kind extensibility, the open entry
shape, registry members), so all eight non-COVERED findings class as
SPEC-FILLABLE and none as AMENDMENT CANDIDATE — the mark of a well-built
foundation whose reach, not whose architecture, falls short of the full
ambition. Verdict: world-class at its core, adequate-to-thin at its edges, and
amendable to world-class overall without unfreezing anything.

---

*— End of Governance Audit 03 —*
