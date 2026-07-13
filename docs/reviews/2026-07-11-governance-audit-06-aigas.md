# Governance Audit 06 — AIGAS vs the Benchmark

**Class: REVIEW (T5) · dated evidence, never current state · 2026-07-11**
**Pin: frozen set v1.0 (2026-07-01) · `main @ fc5e3f8` · KSV 1.30.0**
**Spec: [`docs/superpowers/specs/2026-07-11-governance-forensic-audit-design.md`](../superpowers/specs/2026-07-11-governance-forensic-audit-design.md) · Benchmark: [`…-00-benchmark.md`](2026-07-11-governance-audit-00-benchmark.md)**

---

Document audited: `docs/architecture/AIGAS.md` (v1.0 draft, pending
ratification), read in full. Evidence consulted:
`docs/architecture/AIGAS-REVIEW-2026-07-06.md` (the prior ratification-alignment
review — evidence of known open points, not re-adjudicated here).

## §1 Role and owned slices

AIGAS is the platform's AI governance document: it defines *what AI is allowed
to be* — the constitutional role of every AI capability, present or future,
before any of them is built (AIGAS header, Scope row). It is governing-designate
(draft for ratification into the frozen set), subordinate to the Constitution,
EDS, Ontology, and Knowledge Architecture, and peer to the TAS: the TAS says
*where* AI attaches; AIGAS says *what it may be* and the standards it must
satisfy (AIGAS header, Authority row).

Per benchmark 00 §3, AIGAS **owns**:

- **P4.1** Deterministic-core protection
- **P4.2** AI communication/education
- **P4.3** AI insight surfacing over athlete data
- **P4.4** AI-assisted knowledge curation
- **P4.5** AI evaluation, monitoring & track-record governance

and **co-owns** (the AI-facing slice only; primary statements live elsewhere):

- **P2.11** Reporting & insight delivery (the AI-rendered delivery slice; TAS
  owns the capability)
- **P5.5** Human final authority & override (AI-facing guarantees; Constitution
  owns the principle)
- **P5.6** Explainability as an athlete right (AI-facing guarantees;
  Constitution owns the principle)

One AIGAS-specific probe from the task brief sits outside the capability rows
but is ruled on in §4: whether AIGAS's pending-ratification status is itself a
governance risk at this ambition (benchmark P6.5 territory).

## §2 Coverage table

### Owned capabilities

| Capability | Verdict | Cited Article/§ | Reasoning |
|---|---|---|---|
| P4.1 Deterministic-core protection | WORLD-CLASS | AIGAS central principle; §3, §3.1, §6, §6.1, §6.2, §9, §13.1–.2 | The boundary is architecturally specified, not aspirational: AI is never an inline await in the pure pass, everything crossing the boundary is typed and schema-validated, only two seams exist into the decision path, validators dispose of every proposal, and §9 mandates the platform be "excellent with AI switched off". §6.1's shadow-implementation argument (AI never receives business logic) and §5's deletion test are protections the benchmark did not even think to demand. |
| P4.2 AI communication/education | WORLD-CLASS | AIGAS §4, §7, §11 (C2–C4), §15, §16, §21, §25 | Exactly the benchmark's "rephrase the truth, never improvise it", with mechanism: explanations must be derivable from the trace, honesty markers (confidence, truncations, vetoes) must survive translation, register may vary but substance may not, and "I don't have the reasoning for that" is defined as the compliant answer. Audience-tuning for athlete vs non-specialist coach is explicit (§21). |
| P4.3 AI insight surfacing over athlete data | ADEQUATE | AIGAS §2 (verb 3), §11 (C4, C5), §12, §21, §22, §26 | The category (C5), the gate (hypotheses with confidence, never auto-acted), the ceiling (raises questions; humans and the engine answer), and both routes into decisions (advisory to humans, or Seam 2 priors via §22) all exist and are correctly governed. Short of world-class in depth: no specification of the analytic grounding surface (which longitudinal / match-data classes a C5 call may read — §6.1's readable set is engine-artefact-shaped), no quality bar for surfaced hypotheses (false-positive / alarm-fatigue governance), and on-pitch/match data is absent from AIGAS's data vocabulary entirely. |
| P4.4 AI-assisted knowledge curation | WORLD-CLASS | AIGAS §5, §11 (C6), §12, §13.5, §23 | The gate is complete and precise: AI may draft at literature speed, every draft passes named human scientific review, `source` must cite real literature ("never the model"), evidenceLevel and confidence are assigned by the reviewer, and a promoted entry is "human-owned knowledge that happened to be AI-drafted" with drafting provenance recorded. §23.3's "model weights are not a knowledge domain; 'the model knows' is not a citation" closes the exact leak the benchmark worries about. |
| P4.5 AI evaluation, monitoring & track-record governance | ADEQUATE | AIGAS §8, §9, §16, §17, §20, §22; Amendment & stewardship | Every instrument the benchmark demands is named and mandatory: per-capability eval harness, named production quality signals (schema-failure, validation-rejection, correction/override, grounding violations), kill-switch per capability, rollback per model/prompt version, authority from track record only (§16). But it stops at naming: no minimum standard for what a harness must contain, no promotion criteria defining how expanded authority is earned, and no drift-monitoring specification (what is watched, thresholds, cadence). AIGAS itself defers these to per-capability "living operational material" — a defensible design, but the floor those specs must clear is not written down. |

### Co-owned capabilities (AI-facing slice)

| Capability | Verdict | Cited Article/§ | Reasoning |
|---|---|---|---|
| P2.11 Reporting & insight delivery (AI-rendered slice) | WORLD-CLASS | AIGAS §7, §11 (C2–C4 gates), §15, §19, §21 | For the slice AIGAS co-owns — AI-rendered delivery — governance is complete: faithfulness-to-source gates on summarisation, trace-grounding on explanation, labelling of AI prose as AI, "no dark degradation", and the coach surface hard-scoped to the derived roll-up. The non-AI delivery surfaces are TAS territory (audit 05). |
| P5.5 Human final authority & override (AI-facing) | WORLD-CLASS | AIGAS §13.8, §17; Constitution Art 10 | §17 keeps the human hierarchy unchanged by AI, makes every AI-influenced outcome overridable at the same contract boundary, routes overrides into the learning loop as data, puts humans as gatekeepers on both seams, designs in escalation for out-of-scope conversation, and gives oversight teeth (kill-switch, rollback, audit "without a deploy"). §13.8 prohibits AI from ever telling a human a decision is closed. |
| P5.6 Explainability as an athlete right (AI-facing) | WORLD-CLASS | AIGAS §7, §14, §16, §20; Constitution Art 14 | The AI-facing guarantee is airtight: explanations must derive from the actual decision record (confabulated mechanisms prohibited), uncertainty must survive rendering into plain words, and every AI output must be reconstructable (inputs, model + prompt version, grounding — §14, §20). This is Art 14 extended to the one layer most capable of quietly violating it. |

No verdict in this table is SILENT or PRECLUDES, so no what-breaks/when-bites
annotations are required. That outcome is honest, not soft: the P4 pillar is
what AIGAS was written to govern, and it governs it — the two ADEQUATE rows are
depth-of-operationalisation gaps, not missing governance.

## §3 What is world-class here

Recorded honestly as positives (each becomes a COVERED finding in §4):

1. **The core-protection argument is the best-reasoned passage in the
   governing set.** §3.1 gives five independent reasons coaching decisions stay
   deterministic (testability, replayability, real-reasons explainability,
   safe change, accountability) and then pre-answers the obvious future
   objection: "none of these arguments weaken as models improve" (P4.1).
2. **The deletion test (§5).** "If every AI output in the system were deleted
   tonight, would any coaching decision, athlete record, or knowledge entry be
   lost or changed? The answer must always be no." A one-sentence invariant any
   future design can be checked against.
3. **The two-seam closure (§6.2) plus a governed escape hatch (§10).** All AI
   enters through decision substitution or knowledge/priors; a capability that
   fits no category forces an amendment first — "the absence of a category is
   a signal to think, not a loophole." Extensibility without erosion.
4. **The four-acts table (§4)** — decision-making / reasoning / explanation /
   communication each assigned an owner, collapsing the "AI coaching"
   ambiguity into one usable rule: AI owns form; the engine owns content; the
   human owns the final call (P4.2).
5. **Anti-anthropomorphic confidence discipline (§16).** "A language model is
   fluently certain about everything, so its self-reported confidence is worth
   nothing" — confidence comes only from deterministic validation plus observed
   track record, and no AI-derived signal may ever occupy the gate tier
   (Constitution Art 13 applied without sentiment).
6. **Privacy rules that anticipate AI-specific attacks (§19).** "Prompts are
   not a security boundary" (enforcement at context assembly) and the
   inferential-leakage rule (AI must not reconstruct what the boundary hides)
   go beyond restating Art 11 — they extend it to a threat model the
   Constitution could not have foreseen.
7. **The knowledge gate (§23)** — human scientific review, real citations
   only, reviewer-assigned evidence levels; AI accelerates intake without ever
   becoming a source of truth (P4.4).
8. **Traceability as a discipline (Appendix A).** "A statement with no trace
   does not belong here" — every normative clause maps to a governing-document
   clause, making AIGAS verifiably an extension of the frozen set rather than
   a new philosophy (corroborated by
   `docs/architecture/AIGAS-REVIEW-2026-07-06.md`, Alignment map).

## §4 Findings

| ID | Capability | Verdict | Citation | Narrative | Class | Proposed direction |
|---|---|---|---|---|---|---|
| GA-601 | P4.1 | WORLD-CLASS | AIGAS central principle; §3.1; §6–§6.2; §9; §13.1–.2 | Deterministic-core protection is governed to the full benchmark standard and beyond: architectural boundary, two-seam closure, validator disposal, AI-off excellence, and the §5 deletion test. | COVERED | None — record as a positive in deliverable 09. |
| GA-602 | P4.2 | WORLD-CLASS | AIGAS §4; §7; §15; §21; §25 | Communication governance meets the benchmark exactly: trace-grounded, honesty-preserving, audience-tuned, labelled; "rephrase the truth, never improvise it" is enforced by mechanism, not exhortation. | COVERED | None — record as a positive in deliverable 09. |
| GA-603 | P4.3 | ADEQUATE | AIGAS §11 (C5), §6.1, §12, §21; benchmark P4.3 | C5 exists as one table row plus scattered references, against a benchmark capability that is half the end-state mission (elite athlete data analysis). Unspecified: the analytic grounding surface (§6.1 enumerates engine artefacts, not the longitudinal Stored-Data classes a C5 scan needs — session history at set granularity, test batteries, match/GPS data, daily-metric history); a quality bar for surfaced hypotheses (an anomaly-surfacing capability with no false-positive governance trains athletes and coaches to ignore it); and match/on-pitch data, which never appears in AIGAS's vocabulary. Bites at the full-analytics stage (post-Stage 6, when C5 is built over longitudinal + match data). Sprint 2 evidence of the adjacent pattern: rich authored knowledge lying dormant for want of a specified consumption path (SKB; engine-audit 03). | SPEC-FILLABLE | A C5 capability declaration per AIGAS §10 — grounding surface, hypothesis quality bar, surfacing cadence — authored alongside the data-pillar governance that deliverable 08 maps; no amendment needed because §10 and the Amendment & stewardship section explicitly make per-capability contracts living operational material. |
| GA-604 | P4.3 / P2.10 | WORLD-CLASS | AIGAS §6.2, §11 (C5 ceiling), §22; TAS §10 | Probe answered: the two-seam model HOLDS for analytics AI — no governed third path is needed. Analysis-that-informs-decisions has exactly three compliant routes, all governed: stay advisory (hypotheses surfaced to humans), enter as staged/validated priors through Seam 2 (§22), or become user-confirmed structured state via C1. An analytic insight can never silently steer a plan, which is precisely what benchmark P2.10 demands of the loop's AI segment. | COVERED | None — deliverable 08 should reuse this three-route framing when mapping the analytics→decision loop across documents. |
| GA-605 | P4.4 | WORLD-CLASS | AIGAS §5; §13.5; §23; Knowledge Architecture §3.1 | AI-assisted knowledge curation is fully gated: draft-only authority, named human scientific review, real citations only, reviewer-owned evidence grading, drafting provenance recorded. The benchmark's stale/contradiction-flagging use sits comfortably inside C6/C5 ceilings. | COVERED | None — record as a positive in deliverable 09. |
| GA-606 | P4.5 | ADEQUATE | AIGAS §16, §17, §20; header "What this is not"; Amendment & stewardship | Every evaluation instrument is named and mandatory, but no operational floor is set: nothing defines what an eval harness must minimally contain (held-out sets? human-rated samples? pass thresholds before first ship?), no criteria define how a track record earns expanded authority ("earned by measured performance" has no measure), and drift monitoring has no stated signals, thresholds, or cadence. Deferral to per-capability specs is the document's stated design, but the standard those specs must clear is itself unwritten — so the first capability builds will define the bar de facto. Bites at Stage 6 (first live AI capability). The prior review flagged the sibling gap: decision contracts and harnesses exist nowhere as artefacts yet (`docs/architecture/AIGAS-REVIEW-2026-07-06.md` §Findings 1, 4). | SPEC-FILLABLE | A single T3 "AI evaluation standard" spec under AIGAS §10/§20 — minimum harness content, ship/promotion/rollback thresholds, drift-monitoring signals and cadence, eval-record ownership — that every per-capability harness is then validated against. |
| GA-607 | P2.11 (co-owned slice) | WORLD-CLASS | AIGAS §7, §11 (C4 gate), §15, §19, §21 | The AI-rendered delivery slice is governed to standard: faithfulness gates, labelling, no dark degradation, coach surface scoped to derived signals only. | COVERED | None — the non-AI slice is verdicted in audit 05 (TAS). |
| GA-608 | P5.5 (co-owned slice) | WORLD-CLASS | AIGAS §13.8, §17; Constitution Art 10 | AI-facing human authority is complete: unchanged hierarchy, same-boundary overrides captured as learning data, human-gated seams, designed-in escalation, kill-switch/rollback/audit without a deploy. | COVERED | None — record as a positive in deliverable 09. |
| GA-609 | P5.6 (co-owned slice) | WORLD-CLASS | AIGAS §7, §14, §20; Constitution Art 14 | The athlete's right to a truthful "why" survives the AI layer intact: trace-derived explanations only, confabulation prohibited, uncertainty preserved in plain words, every AI output reconstructable from stored provenance. | COVERED | None — record as a positive in deliverable 09. |
| GA-610 | P6.5 (AIGAS-specific slice) | THIN | AIGAS header Status row; Amendment & stewardship; `docs/architecture/AIGAS-REVIEW-2026-07-06.md` §Verdict, §Findings 5–6; CLAUDE.md ("governs all AI work (draft pending ratification)") | Probe answered: yes, the pending-ratification status is itself a governance risk. As of the pin, AIGAS is simultaneously treated as binding (every AI capability "is validated against this document before it is built") and formally unfrozen — so the document all Stage 6 work hangs on can drift, be edited without the amendment discipline, and lacks the frozen set's forward-references (Constitution Appendix A, TAS §15). The prior review recommended ratification on 2026-07-06 with named mechanics (sixth governing document, reconciled amendment, adversarial panel pass, Appendix B marked living); at the pin those steps remain open. The longer the gap, the more the "validated against" claim rests on convention rather than governance. Bites now (Stage 6 is the current next AI stage). | AMENDMENT CANDIDATE | Execute the ratification the 2026-07-06 review already scoped: one versioned amendment admitting AIGAS to the frozen set with cross-references reconciled, Appendix B designated living, after the adversarial panel pass — queued per the amendment process, never applied by this audit. |

## §5 Over-specification risks

Places where AIGAS's rules could strangle the end-state ambition — probed
honestly; most survive the probe:

1. **"Exactly two seams… no third path may be created" (§6.2).** The strongest
   candidate for future strangulation, and it holds up: inputs (C1 extraction,
   C9 perception) enter as data upstream of the engine, rendering (C2–C4) sits
   outside the decision path, and analytics routes via §22 — so the closure
   constrains only what should be constrained. But note the internal looseness:
   §6.2 says ALL AI capability "enters the architecture through exactly two
   seams" while three sentences later placing everything user-visible "outside
   both seams entirely", and C9's "enters as: a new assessment" is neither
   seam. The rhetoric is broader than the rule. A future perception or
   real-time capability could be wrongly blocked — or wrongly waved through —
   depending on which sentence is read. Low risk, worth one clarifying line at
   ratification (fold into GA-610's amendment rather than a separate finding).
2. **"Proposals take effect on a subsequent pass" (§6 property 1).** At the
   end-state conversational-coach ambition (§26), a user expects
   say-it-and-see-it reflow. Absorbable: a "pass" is an engine invocation, not
   a scheduling epoch — C1 extraction → confirm → deterministic reflow (§25) is
   already the synchronous-feeling path, and nothing in §6 forbids running the
   next pass immediately. No change needed; worth stating in the first C7
   capability declaration so the rule isn't misread as enforced latency.
3. **"No AI-derived signal may occupy the gate tier" (§16) — permanent.** Could
   this block a future safety win, e.g. C9 movement analysis catching dangerous
   technique? Absorbable without weakening: the C9 *signal* enters as an
   assessment input with field-tested reliability (§11), and a deterministic,
   human-authored gate rule may consume it — the prohibition is on AI *being*
   the gate, not informing one. The distinction should be made explicit when C9
   is declared (the 2026-07-06 review's finding 2 is the same boundary from the
   confidence side).
4. **§13's absolute prohibitions ("not 'not yet', and not subject to model
   capability").** Deliberate rigidity, and correct: the prohibitions derive
   from Constitution Titles III–IV and share their may-be-clarified-never-
   weakened status. This is the one place governance *should* refuse to scale
   with capability, and AIGAS says so in terms. Not an over-specification risk.
5. **Server-side-only posture (§6 property 3, Appendix B).** The credential
   rule is about keys and cannot strangle anything; but see §6.2 below for the
   remote-AI assumption it rides on.

## §6 Load-bearing assumptions the end-state falsifies

Implicit assumptions enumerated and tested against the ambition:

1. **"AI is remote, slow, and non-deterministic" (§6, quoting TAS §3.3).** The
   native-iOS end-state (Stage 7) makes on-device inference plausible: local,
   fast, keyless. The *placement* assumption (AI as server-side L3 service)
   would be falsified; the *governance* — seams, gates, labelling, provenance
   stamps — transfers unchanged, and the credential rule is vacuously satisfied.
   Absorbable at the TAS/AIGAS boundary with a clarification, not a rewrite.
2. **"A model ten times more capable is still non-deterministic" (§3.1).**
   Pinned weights at temperature 0 can be bitwise-deterministic, so this single
   prop is falsifiable. The argument survives because §3.1 deliberately stands
   on five legs: a deterministic model still cannot carry per-step evidence
   levels, still produces narrative rather than causal explanations, and still
   cannot be golden-mastered across provider updates. The document has
   effectively pre-hedged this; no action needed.
3. **AI output is prose.** §15's labelling regime is text-shaped, while the
   end-state includes AI-shaped charts, video annotation (C9), and voice.
   "Visually and semantically distinct classes of content" generalises to
   non-text media, but the first non-prose capability should re-derive the
   labelling rule explicitly. Absorbable.
4. **Human review bandwidth scales with ambition.** §23's gate assumes named
   human scientific review can keep pace with "a knowledge base growing at
   literature speed" (§26) — at 10× scale the human gate becomes the throughput
   bottleneck, and AIGAS offers no triage tiers, review SLAs, or reviewer-pool
   governance. The end-state strains (not falsifies) the assumption; the fix is
   process governance in KA/doc-governance territory (audits 03 and 07), not a
   weakening of the gate.
5. **The engine's public artefacts are a sufficient grounding surface ("the
   contract is the only thing AI may know", §6.1).** The full-analytics
   end-state needs C5 to read longitudinal Stored Data far broader than the
   current typed-artefact enumeration. Absorbable by design — §6.1 binds AI to
   *public, typed* artefacts, and that set can grow as the data platform grows —
   but this is exactly the unspecified grounding surface of GA-603, and the
   data-pillar deep-dive (deliverable 08) should say who defines the widened
   set.

## §7 Document verdict

For its role, AIGAS is world-class governance — on the P4 pillar it is the
strongest single document this audit set has examined, and unusually, it is
strongest exactly where the danger is greatest: the deterministic-core
boundary (P4.1), the truth-preservation rules for AI language (P4.2, P5.6),
and the refusal to let fluent confidence buy authority (§16) are specified
with mechanisms, invariants, and tests rather than sentiment, and every clause
traces to the frozen set. Its two ADEQUATE rows share one shape — the document
governs *principles* to a world-class standard and deliberately defers
*operational floors* (C5's grounding surface and hypothesis quality bar,
GA-603; eval-harness minimums and authority-promotion criteria, GA-606) to
per-capability living material without writing down the bar that material must
clear; both are SPEC-FILLABLE under AIGAS's own §10 mechanism, which is a
credit to that mechanism. The one genuine governance defect is not in the text
but around it: AIGAS remains a draft that the whole platform already treats as
binding (GA-610), and every property praised above is only as durable as the
document's own protection — ratification, already recommended and scoped on
2026-07-06, is the single highest-value action this audit can queue for it.
