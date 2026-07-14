# AI Integration Boundaries

**Status: PROPOSAL — working doc (T4) · 2026-07-14 · not canonical; adopted only via DEVELOPMENT-PLAN §5.3**
**Sprint spec: [`docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md`](../../superpowers/specs/2026-07-14-decision-engine-v2-design.md)**

---

Where AI participates in Decision Engine V2, and where it absolutely does
not. The owner of every rule in this document is the ratified
[AIGAS](../../architecture/AIGAS.md) (v1.1, frozen): this document binds the
V2 proposal set's AI touchpoints to AIGAS's categories, seams, and gates —
it adds V2-specific mappings and **no new AI authority** (00 §3
reconciliation: *"V2 changes nothing at the AI boundary"* — AGREES). Where
the data pillar is cited, the DAAS is the designate owner *(in review)*.

**A note on numbering.** Two C-series coexist in this set: `00-ARCHITECTURE`
§2.3's design commitments (written here as *commitment C1–C9*) and AIGAS
§11's capability categories (written bare: C1–C9). In this document a bare
C-number is always the AIGAS category.

Consumers of this document: `13-VALIDATION-STRATEGY.md`'s coach-acceptance
tests reference the touchpoint register in §6; `08-EXPLAINABILITY.md`
specifies the trace read-model that grounds every rendering touchpoint here.

---

## §1 The stance

The AIGAS central principle governs, verbatim and unqualified: **the
deterministic coaching engine makes coaching decisions; AI interprets,
communicates, analyses and augments those decisions** (AIGAS, central
principle). Three consequences, each owned by the frozen set and only
*applied* here:

1. **AI proposes; it never disposes** (AIGAS §2 verb 4; Constitution
   Arts 18–19). An AI output earns standing only by passing deterministic
   validation; a failing proposal leaves the deterministic result standing.
   The AI never gets the last word (AIGAS §3; TAS §5.13).
2. **AI owns form; the engine owns content; the human owns the final call**
   (AIGAS §4 — the four-acts table; link, not restated here). Decision-making
   is D1–D16 plus the async D17 family, deterministic end to end;
   explanation content is the decision trace; AI's free rein is register,
   language, tone, and conversation.
3. **The engine runs without AI; AI never runs without the engine** (AIGAS
   §3). Every V2 surface must be excellent with AI switched off (AIGAS §9):
   the deterministic rendering of the trace and the derived signals is the
   floor, and AI unavailability degrades tone, never coaching correctness.

V2's pipeline makes this stance structural rather than aspirational: every
stage output is a typed `{value, confidence, rationale}` artefact (02 §2;
TAS §5.3), every override — human or AI — substitutes behind the same
contract seam and is still disposed by D14 (02 §2, the override-seam
mechanic; TAS §5.11, §5.13), and the conflict-order resolution pass inside
D14 receives `AI proposal` as an explicitly tier-tagged input source
(02 §3.1) — an AI proposal competes under the Constitution's tier order like
any other item, never above it.

## §2 What AI may do in V2 — the seven verbs

The sprint spec (§3, deliverable 10) names seven participation verbs. Each
maps to exactly one primary AIGAS capability category, one seam position,
one gate, and the V2 artefact it consumes. Nothing in this table extends an
AIGAS ceiling; every row is an existing AIGAS authority pointed at a V2
artefact.

| # | Verb | AIGAS category (§11) | Seam position (§6.2) | Gate | V2 input |
|---|---|---|---|---|---|
| V1 | **Explain** — why this plan, this exercise, this dose, this week | C2 Explanation | Outside both seams — pure rendering | Trace-grounding (AIGAS §7); labelling (AIGAS §15) | The decision trace: the per-stage `{value, confidence, rationale}` chain of D1–D17 (02 §2), served through the explanation read-model `08-EXPLAINABILITY.md` specifies (Constitution Art 14; TAS §11) — plus read-only L2 knowledge for grounding (AIGAS §23.1) |
| V2 | **Summarise** — histories, check-ins, a season, squad status | C4 Summarisation | Outside both seams — pure rendering | Faithfulness to source data; privacy scope (AIGAS §19) | The longitudinal athlete record (DAAS §3 — designate, in review); served D17 Insights; for coaches, the derived squad surface only — Squad Signals / CoachVisibleStatus, never raw vitals (Constitution Art 11; DAAS §5 — designate, in review) |
| V3 | **Educate** — what a quality, an adaptation, a protocol *is* | C3 Conversation (grounded per C2 rules) | Outside both seams — pure rendering | Grounding in L2 knowledge — same entries, evidence levels, and confidence the engine used (AIGAS §23.1); scope rules (AIGAS §13, §19) | Versioned L2 knowledge (KA §4 domains), so AI prose and engine behaviour tell one story (AIGAS §23.1) |
| V4 | **Report** — periodic athlete/coach reports in plain language | C4 Summarisation (report narration is C2/C4 per DAAS §7.4 — designate, in review) | Outside both seams — pure rendering | A Report is never *made of* AI claims: AI may re-voice a Report whose every figure is already accuracy-governed (DAAS §7.4, §7.2 — designate, in review); labelling (AIGAS §15) | D17 report-assembly outputs (02 §2.17; EDS §20 D17) via the analytics read-model (DAAS §7.1 — designate, in review) |
| V5 | **Coach conversationally** — Q&A, check-ins, "work's mad this week" | C3 Conversation, with C1 Extraction as needed | Rendering outside both seams; C1 produces engine *inputs* upstream of the engine (AIGAS §6.2) | Grounding in the user's own artefacts; scope + escalation rules (AIGAS §13, §17, §19); consequential extractions user-confirmed and schema-validated before becoming state (AIGAS §25) | The athlete's own plan, trace, and derived signals; extracted Constraints / injury signals / session feedback land as ontology-typed structured state the deterministic engine reflows around (AIGAS §24–§25; D15, 02 §2.15). May inform and route; may not prescribe (AIGAS §11 C3 ceiling) |
| V6 | **Surface insights** — "look at this" flags a human should see | C5 Analysis | Outside both seams while hypotheses; seam-bound the moment adoption would alter a decision (AIGAS §6.2) | Presented as hypotheses with confidence, never auto-acted (AIGAS §11 C5); context assembly bounded by the C5 grounding surface (DAAS §2.3.4 — designate, in review); adopted only via the three routes of §4.3 below | The requesting scope's grounding surface: athlete-scoped — own observations, derivation history, served Insights/Reports, traces, L2 knowledge; coach-scoped — consented team-scoped derived surface only (DAAS §2.3.4 — designate, in review) |
| V7 | **Interpret trends** — voice and interrogate what the data is doing | C2/C4 narration of D17 findings; C5 for questions beyond them | Outside both seams for narration and hypotheses; **Seam 1 behind the D17 family contract** if AI ever *produces* the finding (EDS §20 D17 — E3) | The interpretation of record is D17's deterministic, attributed, confidence-tiered Insight (02 §2.17); AI narration may rephrase it, never extend, embellish, or contradict it (AIGAS §7); a substituted family member is gated per §4.1 below | D17 trend & anomaly Insights `{value, confidence, rationale}` (02 §2.17; EDS §20 D17); the honesty markers — tier, degradation, "not enough data to say" — must survive rendering (AIGAS §7.2, §16; DAAS §2.3.2 — designate, in review) |

Two boundary clarifications the table compresses:

- **V7 is two different acts and the difference is load-bearing.** *Trend
  detection* is a D17 family member — deterministic, pure, knowledge-driven
  (EDS §20 D17). *Trend narration* is C2/C4 rendering of the resulting
  Insight. An AI that detected trends directly for a surface, bypassing D17,
  would violate the sole-entry rule — no surface, job, store, or AI writes
  an analytic value into a decision input except as a typed D17 output
  (DAAS §2.4 — designate, in review; 02 §2.17). The only sanctioned way for
  AI to *be* the detector is Seam 1 substitution behind the D17 contract
  (§4.2).
- **V5's extraction half decides nothing.** C1 provides inputs (AIGAS §11);
  the deterministic engine reflows. Two phrasings of the same week resolve
  to the same `AthleteState` and therefore the same plan (AIGAS §25) — the
  front-door discipline that preserves Art 18 upstream of the engine.

## §3 What AI must not do — the four prohibitions

The sprint spec names four absolute prohibitions. Each is an instance of an
AIGAS §13 clause — owned there, applied here to the V2 pipeline's specific
loci. Per AIGAS's amendment clause, §13 derives from Constitution Titles
III–IV and may be clarified, never weakened; V2 clarifies only.

| # | Prohibition | AIGAS §13 owner | Where V2 makes it concrete |
|---|---|---|---|
| P1 | **Choose adaptations** | §13.1 — no AI may set or alter any coaching decision outside Seam 1 | Adaptation Targets are a typed field of D5's output, chosen by the engine from Quality & Adaptation Knowledge (02 §2.5, ruling R2; Ontology §5). AI touches them only as a C7 proposal behind D5's contract, disposed by D14 (§4.2) |
| P2 | **Override coaching logic** | §13.2 — no AI may author, tune, veto, or bypass a validator; plus §13.8 — never impersonate final authority | D14's validators are deterministic and human-authored (Constitution Art 19); the conflict-order resolution pass consumes AI proposals as tier-tagged *items*, below every safety gate (02 §3.1–§3.2). Injury, contraindication, and return-to-play logic are deterministic knowledge-driven paths AI may explain and flag to a human, never clear or downgrade (§13.3; KA Domain 9) |
| P3 | **Invent programming** | §13.5 — no unreviewed AI output enters knowledge, athlete Stored Data, the trace, or a committed plan; plus §13.1 | Plans are derived by the pure pass, never stored as truth (Constitution Art 18; TAS §7); a committed session is frozen absolutely against everyone, AI included (02 §2.15; EDS L10). An AI-drafted knowledge entry has zero authority until a named human promotes it (§4.3; AIGAS §23.2). An explanation the trace does not contain is a confabulation, prohibited in substance (AIGAS §7.1; Constitution Art 14) |
| P4 | **Replace deterministic decisions** | The central principle and §3's asymmetry, enforced by §13.1 | The deterministic engine always runs and is always the fallback; substitution exists only behind a per-decision contract, asynchronously, D14-gated (AIGAS §6.2 Seam 1; TAS §5.13). There is no configuration of V2 in which a model is the producer of record for an athlete-actionable decision without the deterministic path having produced, and standing ready to serve, its own result |

**V2 adds no new AI authority — the proof by enumeration.** The claim in
this document's opening paragraph is checkable: every AI touchpoint the V2
proposal set names is a pre-existing AIGAS/TAS/EDS authority pointed at a
V2 artefact.

1. The Seam 1 substitution candidates V2 names are exactly the set the
   frozen owners already name: D4, D5, D11 (AIGAS §6.2's own examples;
   TAS §5.13 names D4 and D11) and D17 family members behind the family
   contract
   (EDS §20 D17 — "the AI seam (E3 — family members are substitutable
   behind this contract)"). V2 declares **zero new substitutable decision
   contracts** — a future one is an engine-adjacent change under EDS Q8 and
   golden-master protection (AIGAS §10), not a design line in this set.
2. The D17 AI routes V2 uses are exactly the ratified three (§4.3;
   DAAS §2.4 — designate, in review). V2 creates no fourth route.
3. Every rendering verb (V1–V4, V7-narration) is C2/C3/C4 within its stated
   ceiling — form only, outside both seams (AIGAS §6.2, §11).
4. 02's override-seam mechanic *reuses* the substitution seam for coach
   overrides (02 §2; TAS §5.11) — that proves the seam a future AI uses
   (00 §3, human-override row: the coach-side substitution "prov[es] the
   seam"); it grants AI nothing.
5. The reconciliation matrix records the AI-boundary row as **AGREES**
   with zero operational delta beyond this mapping document (00 §3).

## §4 The two seams in the V2 pipeline

All AI influence on any coaching decision enters through exactly two seams;
no third path exists and this set creates none (AIGAS §6.2). Everything in
§2 that is "outside both seams" renders outputs and feeds nothing back into
the decision path at all.

### 4.1 Seam 1 — decision substitution (C7)

**Candidates in the V2 pipeline.** Substitution happens behind a specific
decision's contract, never against the graph (AIGAS §6.2; Constitution
Art 18). The declared-substitutable candidates, unchanged from the frozen
owners:

- **D4 Limiting-Factor Diagnosis** — the flagship seam: the same contract a
  coach substitutes their own diagnosis behind (02 §2.4; AIGAS §6.2;
  TAS §5.13).
- **D5 Priority-Quality Selection** — including its typed Adaptation
  Targets: a proposal must emit the full R2 output shape — priorities,
  targets, and the explicit `parked` list with reasons — or it fails the
  contract check before any validator sees it (02 §2.5; AIGAS §6.2).
- **D11 Intervention Selection** — the most common substitution class (a
  swapped exercise enters behind this same seam whether a coach or a model
  proposes it), and an override cannot ship a contraindicated lift
  (02 §2.11; AIGAS §6.2; TAS §5.13).
- **D17 family members** — signal derivation, trend & anomaly detection,
  benchmark comparison, squad roll-up, report assembly are substitutable
  behind the shared family contract (EDS §20 D17, E3). New family members
  enter only as EDS §20.1 additive entries — never as ad-hoc AI features.

**The invariant sequence** (AIGAS §6.2; TAS §5.13), which every candidate
above obeys identically:

1. The deterministic engine always runs; its result is always computed and
   always standing.
2. L3 enqueues the AI proposal **asynchronously** — never an inline `await`
   in the pure pass (TAS T9; AIGAS §6).
3. The proposal enters D14 shaped by the decision's contract and is
   disposed by the deterministic validators — including V2's tier-tagged
   conflict-resolution pass, where it is one more `AI proposal` item under
   the constitutional tier order (02 §3.1).
4. A passing proposal is cached as a validated artefact (or captured as a
   prior); a failing one leaves the deterministic result standing and is
   logged to the eval record (AIGAS §9, §20). The AI never gets the last
   word.
5. Per-decision proposal contracts and eval harnesses are specified when
   each substitution is built (EDS Q8; AIGAS §6.2), and each requires human
   sign-off before going live (AIGAS §17). None is specified in this set.

**The D17 nuance — substitution vs annotation.** These are different acts
on different objects and the set keeps them distinct. *Substitution*
replaces the **producer** of a D17 member behind its contract (Seam 1, per
EDS D17): the output is still an attributed, confidence-tiered Insight,
still validated (DAAS §8.2 — designate, in review), and — because it is
AI-derived — capped below the gate tier absolutely (AIGAS §16). *Annotation*
is the human's relation to a **served interpretation**: a coach may dispute,
annotate, or dismiss an Insight, and the annotation feeds D16 as evidence —
but interpretations are annotatable, **not substitutable** by override: no
one, coach or AI, rewrites a derived value, because the derivation is the
athlete's data speaking (02 §2.17). An AI narration disagreeing with an
Insight is a grounding violation (AIGAS §7.1), not a competing
interpretation.

### 4.2 Seam 2 — knowledge and priors (C6, C8)

- **Knowledge drafts (C6).** AI may draft L2 knowledge entries — sport
  profiles, exercise entries, evidence syntheses — in the canonical schema.
  Every draft enters the human scientific-review gate: `source` cites real
  literature, never the model; `evidenceLevel` and `confidence` are assigned
  by the reviewer; a promoted entry is human-owned knowledge that happened
  to be AI-drafted (AIGAS §23.2; KA §3.1). Draft authority before promotion:
  zero (AIGAS §11 C6).
- **Priors (C8).** AI-origin predictions and personalisation models enter
  the engine exclusively as versioned priors via the L5 learning pipeline —
  staged, validated, promoted, never written hot (AIGAS §22; TAS §10;
  02 §2.16: AI-origin priors enter only staged and validated via Seam 2).
  The engine's behaviour shift is then attributable to a versioned prior
  change and explainable to the athlete (Constitution Arts 16, 18).
- **The boundary between the async products holds for AI too.** An Insight
  is not a prior (EDS §20's D15/D16/D17 boundary): AI analysis (C5) that
  produces a candidate belief about *future decisions* routes through D16's
  prior pipeline; AI narration of *what the data means* stays on the
  rendering side. Nothing AI-shaped may launder an interpretation into a
  parameter by skipping the staging pipeline.

### 4.3 The three routes for AI-origin analysis

For analytical content specifically, the DAAS binds AI-origin work to
exactly three routes into the world (DAAS §2.4, the GA-604 framing —
designate, in review), and V2 adopts them verbatim:

1. **Advisory to humans** — labelled as AI per AIGAS §15 (V6/V7 above);
2. **Staged, validated priors via Seam 2** (§4.2);
3. **User-confirmed structured state via C1** (V5 above; AIGAS §25).

There is no fourth route, and no V2 document creates one. Any V2 feature
whose AI output would reach a decision input by another path is misdesigned
and must be rerouted or rejected (DAAS §2.4 sole-entry rule — designate,
in review; 02 §2.17).

## §5 Confidence — never self-graded

Constitution Art 13 (confidence governs authority) binds AI with the
Knowledge Architecture's sharpened rule: a language model is fluently
certain about everything, so **its self-reported confidence is worth
nothing** (AIGAS §16; KA Domain 11; AIGAS §13.4 makes trusting it an
absolute prohibition; TAS §5.13 hard rule 2 states it at the seam). In V2
terms:

- The `confidence` field of any AI-substituted stage output is **assigned
  by the platform** — from passing the deterministic validation suite and
  from the capability's observed track record over time (AIGAS §16; KA
  Domain 12) — never copied from the model's assertion. A proposal arriving
  with a self-graded confidence has that value discarded at the contract
  boundary.
- AI-derived signals slot into the same three authority tiers as everything
  else — gate / soft input / reported metric — and **no AI-derived signal
  may occupy the gate tier** (AIGAS §16; EDS §28.3). This composes with
  D17's birth rule — analytical products are born reported metric and
  promoted only by governance (02 §2.17) — so an AI-substituted D17
  member's ceiling is soft input, ever.
- Uncertainty survives rendering: where the trace says low-confidence
  hypothesis, the athlete hears a hypothesis in plain words (AIGAS §7.2,
  §16); an AI rendering that upgrades it to confident assertion violates
  Arts 13 and 15 in the athlete's ear.
- Where an AI capability cannot ground an answer: say so, ask, or route to
  a human. Guessing is not in the option set (AIGAS §16).

## §6 The V2 AI-touchpoint register

The complete list of AI touchpoints this proposal set names — the surface
`13-VALIDATION-STRATEGY.md`'s coach-acceptance tests reference. Anything
not in this register is not a V2 AI touchpoint; adding one later means
amending this document through the set's governance, with its AIGAS
category, seam, and gate declared (AIGAS §10's capability declaration).

| Id | Touchpoint | Verb(s) | AIGAS category | Seam | Gate (owner) | V2 doc |
|---|---|---|---|---|---|---|
| AI-T1 | Plan & decision narration over the explanation read-model | V1 | C2 | Outside both — rendering | Trace-grounding + labelling (AIGAS §7, §15) | `08` |
| AI-T2 | History / season / squad summarisation | V2 | C4 | Outside both — rendering | Faithfulness + privacy scope (AIGAS §19) | `02` §2.17 · DAAS §5 *(designate)* |
| AI-T3 | Knowledge-grounded education & Q&A | V3 | C3 | Outside both — rendering | L2 grounding (AIGAS §23.1); scope rules (§13, §19) | `04` |
| AI-T4 | Report re-voicing over D17 report assembly | V4 | C2/C4 | Outside both — rendering | DAAS §7.4 narration rules *(designate)*; AIGAS §15 | `02` §2.17 |
| AI-T5 | Conversational coaching interface incl. check-in extraction | V5 | C3 + C1 | Rendering; C1 = engine inputs, user-confirmed | AIGAS §25 front-door rules; §17 escalation | `02` §2.15 |
| AI-T6 | Insight surfacing over the C5 grounding surface | V6 | C5 | Outside both while hypotheses; three routes on adoption (§4.3) | DAAS §2.3.4 scope *(designate)*; never auto-acted (AIGAS §11) | `02` §2.17 |
| AI-T7 | Trend narration of D17 findings | V7 | C2/C4 (+C5) | Outside both — rendering | Honesty markers survive rendering (AIGAS §7.2, §16) | `02` §2.17 · `08` |
| AI-T8 | Decision substitution: D4 / D5 / D11 | — | C7 | **Seam 1** | D14 + conflict-order pass (02 §3); per-decision eval harness (EDS Q8) | `02` §2.4/§2.5/§2.11 |
| AI-T9 | D17 family-member substitution behind the family contract | (V7 producer case) | C7 | **Seam 1** | Family contract + DAAS §8.2 validation *(designate)*; gate tier barred (AIGAS §16) | `02` §2.17 |
| AI-T10 | Knowledge drafting for the V2 knowledge domains | — | C6 | **Seam 2** | Human scientific review; real citations only (AIGAS §23.2; KA §3.1) | `04` |
| AI-T11 | AI-origin priors into the learning loop | — | C8 | **Seam 2** | Prior staging & validation (AIGAS §22; TAS §10) | `02` §2.16 · `07` |

Register invariants, restated once: every touchpoint is server-side with no
model key in any client (AIGAS §6; TAS §5.13 hard rule 3); every AI output
is labelled and provenance-stamped (AIGAS §15, §20); every touchpoint
degrades to the deterministic rendering with the degradation stated, never
silent (AIGAS §9; Constitution Art 15); and coach-scoped touchpoints read
the derived surface only — raw vitals never cross a person boundary, and AI
may not be used to infer around that boundary (AIGAS §19; Constitution
Art 11).

---

*Validated against: AIGAS v1.1 §2–§26 (frozen owner of every rule herein);
Constitution Arts 10, 11, 13–15, 17–19; EDS §20 (D17, §20.1), §28.3, Q8;
TAS §5.11, §5.13, §10, §15; DAAS §2.3.2–§2.4, §7.4, §8.2 (designate, in
review); and this set's 00 §2.3/§3, 02 §2–§3.*
