# Governance Audit 01 — CONSTITUTION.md vs the Benchmark

**Class: REVIEW (T5) · dated evidence, never current state · 2026-07-11**
**Pin: frozen set v1.0 (2026-07-01) · `main @ fc5e3f8` · KSV 1.30.0**
**Spec: [`docs/superpowers/specs/2026-07-11-governance-forensic-audit-design.md`](../superpowers/specs/2026-07-11-governance-forensic-audit-design.md) · Benchmark: [`…-00-benchmark.md`](2026-07-11-governance-audit-00-benchmark.md)**

---

This deliverable audits `docs/foundation/CONSTITUTION.md` (v1.0, frozen
2026-07-01) against the world-class benchmark (deliverable 00). Every verdict
cites the exact Article/§ judged and the benchmark capability ID judged
against. Sprint 2 engine-audit citations are evidence of governance
gaps, never findings themselves (spec §5.7). Findings block: **GA-1xx**.

## §1 Role and owned slices

The Constitution is the supreme document of the platform: twenty Articles of
immutable principle, the tie-breaker for every conflict, outranking the EDS
and all other specifications (Constitution header table, "Authority";
Amendment & Stewardship, "Precedence"). Its role is to carry the *what must
never change* — the ethical floor, the coaching method's order of operations,
and the architectural commitments — while the mechanics live in the
documents beneath it. It is judged here on whether its principles could
govern the complete end-state ambition (benchmark §1) the moment each stage
arrives, at principle altitude — never on whether it contains mechanics,
which its own header ("Amendment": *"this document holds only what must not
change"*) correctly excludes.

Per benchmark 00 §3, the Constitution **owns**:

- **P1.6** Safety & recoverability governance
- **P1.7** Minimum-effective-dose discipline
- **P5.1** Raw-data inviolability & derived-signal boundaries
- **P5.2** Injury & medical-boundary governance
- **P5.3** LTAD & youth/masters duty of care
- **P5.4** Overtraining/under-recovery safeguarding
- **P5.5** Human final authority & override
- **P5.6** Explainability as an athlete right
- **P5.7** Athlete data ownership & consent

and **co-owns, as principle** (mechanics owned elsewhere):

- **P1.1** Diagnosis-first coaching decisions
- **P3.1** Evidence grading & confidence-to-authority mapping
- **P4.1** Deterministic-core protection

Benchmark 00 §3 additionally directs this audit to judge whether
principle-level coverage of **P5.3 + P5.7** suffices, or whether that pair
has outgrown constitutional principle (candidate new-document territory).
That ruling is given in §4 (GA-107, GA-109) and §7.

## §2 Coverage table

Co-owned rows are judged at principle altitude only.

| Capability | Verdict | Cited Article/§ | Reasoning |
|---|---|---|---|
| P1.6 Safety & recoverability governance | WORLD-CLASS | Constitution Art 8, Art 9, Art 19; conflict order tiers 1 & 3; Amendment & Stewardship ("What may never be amended") | Safety and availability are first-order objectives, not side constraints (Art 8); recoverability is a ceiling that "can trim or veto any prescription and can never be overridden" (Art 9); the conflict order makes both absolute over optimisation ("Higher tiers win absolutely"); Title III is an unamendable ethical floor; Art 19 demands the independent validator layer that makes violations structurally impossible, exactly as P1.6 requires. |
| P1.7 Minimum-effective-dose discipline | WORLD-CLASS | Constitution Art 7; Art 9 ("no fatigue is prescribed without a reason"); Art 1 ("bank, don't pad") | Art 7 states minimum-effective with both words load-bearing — over-dosing and under-dosing forbidden at once, progression first-class, padding prohibited — and Art 9 requires every unit of fatigue to trace to an intended adaptation. This is the P1.7 standard verbatim, including treating athlete time and recovery as the scarce resources. |
| P5.1 Raw-data inviolability | WORLD-CLASS | Constitution Art 11; Amendment & Stewardship (Title III floor) | Art 11 states the exact raw→derived boundary P5.1 demands — raw vitals never cross a person boundary, derived signals only — and demands structural enforcement ("a validator *fails the build*"; "enforced in code, not a policy enforced by reviewer vigilance"), unamendable except to strengthen. |
| P5.2 Injury & medical-boundary governance | THIN | Constitution Art 8 ("Governs": "the platform is not a medical/diagnostic tool and defers high-risk presentations to professionals") | The competence boundary exists only as one sub-clause inside Art 8's Governs list — not in any Article's quotable principle. P5.2 requires the hand-off line to be *governed*: an explicit duty to refuse and refer, with the criteria classes owned somewhere downstream. No Article states that duty, so nothing obligates a lower document to carry the criteria. |
| P5.3 LTAD & youth/masters duty of care | SILENT | Constitution — no Article; Preamble ("competitive amateur athletes and teams"); Art 8 (competency gating only) | No Article recognises developmental stage, age-band constraint, maturation, or masters-specific duty of care; the closest hooks (Art 8 competency, Art 16 learn-don't-assume) are age-blind. **What breaks:** a minor onboards and receives programming reasoned entirely from adult assumptions — nothing of constitutional rank forbids prescriptions inappropriate to a developmental stage, and no lower document is obligated to carry age-band rules. **When it bites:** hard at the Team stage (Stage 5) — the target customer, clubs without S&C budget, prominently includes youth squads; masters-athlete duty bites in the Individual package already, at lower severity because Arts 8/9/16 partially absorb it via caution-under-uncertainty. **Absorbable without amendment? No** — age-band *rules* can enter as knowledge (Art 17), but a duty-of-care protection belongs in the unamendable Title III floor, and nothing there can be "clarified" into existence; it must be added. |
| P5.4 Overtraining/under-recovery safeguarding | ADEQUATE | Constitution Art 9; conflict order (tier 3 RECOVERABILITY above tier 4 ATHLETE INTENT); Art 8 ("Governs": deferral to professionals) | The prescription-side half is world-class: the ceiling is absolute and — decisively — outranks athlete intent in the conflict order, so athlete enthusiasm cannot override it. What is missing for P5.4 is the affirmative *detection-and-escalation duty*: no Article obligates the platform to detect sustained load/recovery mismatch over time and escalate through defined steps (deload → halt → human referral). Art 9 forbids over-prescription; it does not command intervention when observed reality drifts. |
| P5.5 Human final authority & override | WORLD-CLASS | Constitution Art 10; conflict order tier 4; Art 18 (validators have the last word); Amendment & Stewardship (Title III floor) | Art 10 is precisely P5.5: a human is always the final decision-maker, every recommendation overridable at a decision boundary, overrides recorded and learned from, committed intent never silently overwritten; Art 18 guarantees no autonomous (AI) pathway escapes deterministic validation. Unamendable except to strengthen. |
| P5.6 Explainability as an athlete right | WORLD-CLASS | Constitution Art 14; Art 15; Art 19 ("Implications": the validation report feeds explanation) | Art 14 grants exactly the P5.6 right — plain-language what/why/evidence/confidence for any recommendation, with the guarantee structural: explanations are "emitted by the decision that made it", never "reconstructed after the fact", and "a recommendation that cannot be explained must not be made". Art 15 extends the right to what was *not* delivered. Title IV may never be weakened. |
| P5.7 Athlete data ownership & consent | SILENT | Constitution Art 11 (protection only); Art 10 (decision overrides, not data rights) | Art 11 governs who may *see* athlete data; no Article gives the athlete affirmative *rights over* it — consent as the basis for team visibility (scoped, revocable), export, deletion, or informed consent for secondary use such as internal evidence generation. **What breaks:** team membership grants coach visibility with no constitutional consent basis behind the grant; internal research over athlete data (P3.5) has no informed-consent principle to be validated against; export/deletion arrive as ad-hoc product choices rather than governed rights — a legal and ethical exposure that compounds when minors (P5.3) enter. **When it bites:** at the Team stage (Stage 5) for the consent-to-join basis, per the pin-frame stage map; at the evidence-pipeline stage for P3.5 secondary use. **Absorbable without amendment? No** — Art 11 is framed as a protection boundary, and consent/ownership rights of Title III rank cannot be derived from a visibility rule; the Amendment clause permits clarifying Title III, but this is new right-granting substance, not clarification. |
| P1.1 Diagnosis-first (co-owned, principle) | WORLD-CLASS | Constitution Art 5; Art 4 | "Diagnosis precedes prescription" is an Article-rank invariant with the honesty refinement world-class practice demands: an early diagnosis is an explicit low-confidence hypothesis, "not an assessment" (Art 5, Implications), and Art 4 makes each diagnosis an inspectable decision. The mechanics belong to the EDS (audit 04). |
| P3.1 Confidence→authority (co-owned, principle) | WORLD-CLASS | Constitution Art 13 | The full P3.1 principle is present: three authority tiers (gate / inform / display), contested science never gates, uncertainty widens margins without halting reasoning, demotion "executed in code", and — the world-class touch — the evidence→authority mapping is itself a reviewed knowledge entry, not a hard-coded constant. Grading mechanics belong to the Knowledge Architecture (audit 03). |
| P4.1 Deterministic-core protection (co-owned, principle) | WORLD-CLASS | Constitution Art 18; Art 19 | AI may enter only behind a decision contract, may propose but never dispose, and the deterministic validators "always have the last word" (Art 18); Art 19 makes validation one harness "whatever produced" the plan, including a future AI proposer. Because AI is substitution-only at seams, the core stands fully functional without it — the P4.1 boundary at principle altitude. Gate mechanics belong to AIGAS (audit 06). |

## §3 What is world-class here

Recorded honestly as positives (these become COVERED findings in §4):

1. **The conflict order as a compiled decision procedure** (Constitution,
   "When principles conflict"). Six fixed tiers, absolute across tiers,
   confidence-modulated only within a tier, with an explicit escape valve
   ("a genuine open problem… not an ad-hoc code branch") and a duty to
   record every forced compromise (Art 15). Most governance documents state
   values; this one states the *algorithm for when values collide*. It is
   the single strongest governance artefact in the document.
2. **The unamendable ethical floor** (Amendment & Stewardship): Title III
   (safety, human authority, raw-data privacy) and Title IV (honesty) "may
   be *clarified* but never weakened". The platform's duty of care cannot
   be traded away by a future contributor under delivery pressure.
3. **Safety and dose discipline stated at full strength** (Arts 7, 8, 9 —
   P1.6, P1.7): the two opposite dosing errors forbidden simultaneously,
   recoverability as a vetoing ceiling that outranks even athlete intent,
   and fatigue-without-rationale prohibited outright.
4. **Confidence governs authority** (Art 13 — P3.1): a genuinely rare
   principle, born of a named in-house failure (the ACWR lesson), with the
   mapping itself governed as reviewed knowledge.
5. **Honesty as architecture** (Arts 14, 15 — P5.6): explainability as a
   precondition for acting at all, and no-silent-truncation extending the
   athlete's right to know into what the platform *didn't* do. Sprint 2
   evidence shows these Articles doing real corrective work as a yardstick
   (engine-audit 02 §1, Art 14/15 rows scored against them) — which is what
   a constitution is for.
6. **Structural discipline of the document itself**: technology-independence
   declared in the header; a fixed six-part template per Article including
   "Failure mode if violated"; Appendix A proving nothing from the prior
   principle systems was orphaned. The document is auditable by
   construction.

## §4 Findings

| ID | Capability | Verdict | Citation | Narrative | Class | Proposed direction |
|---|---|---|---|---|---|---|
| GA-101 | P1.6 | WORLD-CLASS | Constitution Art 8, Art 9, Art 19; conflict order | Safety/recoverability governance at full constitutional strength: absolute tiers, unamendable floor, validator layer demanded in principle. | COVERED | None — protect it; downstream audits (04) judge the mechanics. |
| GA-102 | P1.7 | WORLD-CLASS | Constitution Art 7; Art 9; Art 1 | Minimum-effective dosing with both failure directions forbidden, progression first-class, padding prohibited, banking mandated. | COVERED | None. |
| GA-103 | P5.1 | WORLD-CLASS | Constitution Art 11 | Raw→derived boundary stated absolutely and demanded as build-failing structure, not policy. | COVERED | None — enforcement mechanics judged in audit 05 (TAS). |
| GA-104 | P5.5 | WORLD-CLASS | Constitution Art 10; Art 18; conflict order tier 4 | Human final authority, universal overridability, freeze-on-commit, overrides as learned signal, no unvalidated autonomous pathway. | COVERED | None. |
| GA-105 | P5.6 | WORLD-CLASS | Constitution Art 14; Art 15 | Explainability as a guaranteed, decision-emitted property — with honesty about omissions included in the right. | COVERED | None. |
| GA-106 | P5.2 | THIN | Constitution Art 8 (Governs sub-clause) | The medical competence boundary is one sub-clause, not a stated duty; no Article obligates a governed refuse-and-refer line, so no lower document is required to carry the criteria. | SPEC-FILLABLE | A safeguarding/medical-boundary spec under Art 8's existing clause defining the red-flag classes and hand-off duty; escalate to a clarifying Title III amendment only if the spec proves the hook too weak. |
| GA-107 | P5.3 | SILENT | Constitution — no Article (Preamble; Art 8) | No constitutional recognition of developmental stage or age-band duty of care; bites hard when youth squads arrive with the Team package, and no downstream document is obligated to fill it. | AMENDMENT CANDIDATE | Queue a Title III Article establishing developmental-stage duty of care (what may never be prescribed at each stage), with age-band rules entering as knowledge under Art 17; benchmark 00 §3's safeguarding-spec hypothesis is endorsed as the companion (see §7). |
| GA-108 | P5.4 | ADEQUATE | Constitution Art 9; conflict order tiers 3–4 | Ceiling-side world-class (recoverability outranks athlete intent); missing is the affirmative duty to *detect* sustained load/recovery mismatch and escalate through defined steps to human referral. | SPEC-FILLABLE | Specify the detection-and-escalation ladder as a derivation of Arts 8/9 (thresholds and steps as knowledge entries), keeping the duty's teeth in the existing tier order. |
| GA-109 | P5.7 | SILENT | Constitution Art 11 (protection framing) | Privacy is governed as who-may-see; the athlete's affirmative rights — consent as the basis of team visibility, export, deletion, informed consent for secondary use — have no constitutional home; bites at the Team stage and again when internal evidence generation (P3.5) arrives. | AMENDMENT CANDIDATE | Queue a Title III Article on athlete data ownership and consent (scoped/revocable sharing grants, export/erasure, informed consent for secondary use), which audits 03/05 then inherit as mechanics. |
| GA-110 | P1.1 (co-owned) | WORLD-CLASS | Constitution Art 5; Art 4 | Diagnosis-before-prescription as an Article-rank invariant, with early diagnoses honestly framed as low-confidence hypotheses. | COVERED | None at this altitude — EDS mechanics judged in audit 04. |
| GA-111 | P3.1 (co-owned) | WORLD-CLASS | Constitution Art 13 | Confidence-to-authority stated operatively, contested science barred from gating, the mapping itself governed knowledge. | COVERED | None at this altitude — grading machinery judged in audit 03. |
| GA-112 | P4.1 (co-owned) | WORLD-CLASS | Constitution Art 18; Art 19 | Propose-never-dispose, contract-bounded substitution, validators with the last word — the deterministic core protected in principle. | COVERED | None at this altitude — gates judged in audit 06. |
| GA-113 | P2 pillar framing (cross-cutting; not an owned capability — recorded for deliverables 08/09) | THIN | Constitution Preamble ("the single question"); Art 1; header "Scope" | The Preamble's existence test — every feature must trace to "the highest-value intervention for this athlete now" — frames the platform's sole product as the intervention. The benchmark's second product (§1: the longitudinal understanding of the athlete) is only ever *instrumental* under Art 1, and coach-facing squad analytics or internal evidence generation trace to that question awkwardly or not at all. Nothing precludes the data pillar, but nothing gives it constitutional purpose either — a purpose-level gap the P2.x-owning documents cannot repair from below. | AMENDMENT CANDIDATE | If deliverables 08/09 confirm the data-platform ambition, queue a Preamble/Title I clarification naming the evidence-graded understanding of the athlete as a co-equal product in service of the same objective. |

## §5 Over-specification risks

Judged honestly, the Constitution is *lightly* specified for a supreme
document — most Articles state principles and delegate mechanics — so the
strangulation risks are few, but two are real and one deserves a watch:

1. **The single-question existence gate vs. the data pillar** (Preamble;
   Art 1). "If a feature… cannot trace its existence back to that question,
   it does not belong in the platform" is written per-athlete and
   per-intervention. Read strictly, a benchmarking service, a squad-level
   analytics view, or platform-wide internal evidence generation (P2.7,
   P2.8, P3.5) serve *other* or *future* athletes' performance, not "this
   athlete now" — the gate could be used in good faith to veto the second
   half of the end-state ambition. This is the substance of GA-113.
2. **Freeze-on-commit vs. session-level autoregulation** (Art 10 — P1.10).
   "Once an athlete commits to a session, what they were shown is what they
   get" could be read to forbid world-class *in-session* autoregulation
   (adjusting remaining sets to velocity or presented state mid-session).
   The Article's own qualifier — the engine "never *silently* overwrites
   committed intent" — leaves room for visible, athlete-accepted in-session
   adjustment, but a future implementer could over-read the freeze. Worth a
   clarifying sentence whenever Art 10 is next amended; not itself
   amendment-worthy.
3. **Watch item — Art 20 as a deferral weapon.** "Deferral of capability
   until a consumer exists" is correct discipline, but applied to the data
   pillar it creates a chicken-and-egg: analytics has no consumer until
   decisions consume it (P2.10), and decisions cannot consume what is never
   built. Sprint 2 evidence shows the pattern in miniature — learning
   staged but never promoted, verdicts computed but unread (engine-audit 02
   §1, Art 12/16 rows, as evidence). No text change needed; the audit
   simply notes Art 20 must not be the reason P2.x stays unowned.

No Article was found whose rules would *preclude* an owned capability at
end-state; the two PRECLUDES-adjacent readings above are resolvable by
clarification, which is why neither §2 row carries that verdict.

## §6 Load-bearing assumptions the end-state falsifies

1. **"The athlete is a self-owning adult."** Art 10 makes the athlete
   "their own coach in the individual case" — the final authority over
   themselves — and the Preamble addresses "competitive amateur athletes".
   Falsified by the end-state's youth squads (a minor cannot be their own
   final authority, and a coach's authority over a minor needs a consent
   and safeguarding basis). This is the constitutional root of GA-107 and
   GA-109; **not absorbable** without the Title III additions those
   findings queue.
2. **"The product is the intervention."** Art 1 declares everything but
   athlete performance instrumental; the benchmark (§1) declares two
   inseparable products. Partially falsified: per-athlete analytics remain
   traceable to Art 1, but squad analytics, norms, and internal evidence
   serve the athlete only in aggregate and in the future. Absorbable in
   spirit, not in letter — hence GA-113 (clarification, not
   reconstruction).
3. **"Athlete response is measurable."** Art 12 makes every plan a
   falsifiable hypothesis with "the athlete's lived response" as referee —
   which presumes a measurement architecture (testing batteries, outcome
   capture: P2.1, P2.10) that no Article obligates any document to own.
   The Constitution demands falsification without commissioning the
   instruments. Sprint 2 evidence illustrates the consequence pattern
   (engine-audit 02 §1, Art 12 row: "the hypothesis is never actually
   scored" — evidence of what unowned measurement looks like, not a
   governance finding itself). Absorbable **without amendment**: the duty
   can be seated in the P2-owning documents or the candidate data-platform
   document (deliverable 08's question); Art 12 already supplies the
   principle.
4. **"One athlete, one sport."** Art 2 and conflict-order tier 2 assume a
   single sport to protect ("the sport wins"). Falsified by multi-discipline
   end-state athletes (triathlon: three demand streams competing with each
   other, P1.8) where "the sport" is not a single referent. Absorbable —
   Art 3 already treats goals as demand-profile data, and a composite
   demand profile satisfies tier 2 — but downstream documents must do that
   composition work (EDS audit, 04).
5. **"The privacy threat is exposure."** Art 11 defends against the wrong
   party *seeing* raw data. The end-state adds a second threat class —
   *use* without consent (secondary analysis, internal research, model
   training on athlete histories) — which a visibility boundary cannot
   express. Falsified at the P3.5 stage; **not absorbable** by Art 11's
   framing (GA-109's amendment carries it).
6. **"Knowledge is authored."** Art 17 assumes domain knowledge enters as
   reviewed, evidence-tagged authored data. At end-state, sport demand and
   athlete norms are increasingly *learned from observed data* (P2.4, P2.8,
   P3.5), blurring authored-knowledge and derived-inference. Absorbable —
   Art 16's prior channel plus Art 13's confidence tiers already give
   learned knowledge a governed entry path, and Art 17's provenance rule
   extends naturally to "derived from platform data" as a provenance class.
   No amendment needed; the Knowledge Architecture audit (03) should
   confirm the machinery exists.

## §7 Document verdict

For the slice a constitution should own, this is genuinely world-class
governance — and this audit records that without hedging. The coaching
method (Arts 4–7), the safety-and-honesty floor (Arts 8–11, 14, 15), the
epistemics (Arts 12, 13, 16), and the architectural commitments (Arts
17–20) are stated at Article rank with a conflict order that turns values
into a decision procedure, an unamendable ethical floor, and a document
structure that makes drift auditable. Eight of twelve judged capabilities
are WORLD-CLASS, and Sprint 2 used these Articles as an effective scoring
yardstick — evidence the document *works* as a constitution. Its weakness
is precisely located: the duty-of-care perimeter stops at the adult,
self-owning, single-sport athlete whose data needs protecting but not
governing. Youth/masters development (P5.3) and athlete data ownership &
consent (P5.7) are SILENT at a rank where silence is binding on every
document below; the medical hand-off (P5.2) is a sub-clause where it should
be a duty; and the Preamble's single question under-writes the
data-analytics half of the ambition (GA-113). On benchmark 00 §3's explicit
question: principle-level coverage does **not** suffice for P5.3 + P5.7 —
both need Title III amendments (GA-107, GA-109), with the companion
athlete-safeguarding specification hypothesis endorsed for deliverables
08/09 to rule on. The verdict: a world-class constitution for the platform
it described in July 2026, needing three targeted, queueable additions —
not restructuring — to be a world-class constitution for the end-state.

---

*— End of Governance Audit 01 —*
