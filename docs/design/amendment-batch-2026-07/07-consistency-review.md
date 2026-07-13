# 07 — Whole-Batch Consistency Review (the protocol-mandated pass)

**Status: BATCH PROPOSAL — working doc (T4) · 2026-07-13 · nothing herein is applied; Simon's ratification PR applies it**
Spec: [`docs/superpowers/specs/2026-07-13-phase1-amendment-batch-design.md`](../../superpowers/specs/2026-07-13-phase1-amendment-batch-design.md)

This is the whole-set consistency review the batch protocol requires
(`docs/DOCUMENTATION-GOVERNANCE.md` §3, *Batch amendments*): the six proposal
files (01–06) reviewed **together** against every affected document, by a
reviewer who authored none of them. Where a finding required a small textual
fix in 01–06, the fix was applied directly (this review is the last editor
before the PR) and is recorded in §6. Everything Simon should weigh before
ratifying is in §5 (rulings) and §6 (findings).

**Inputs read in full:** the six proposals; `docs/foundation/CONSTITUTION.md`,
`DECISION-ONTOLOGY.md`, `KNOWLEDGE-ARCHITECTURE.md`;
`docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md`; `docs/architecture/TAS.md`,
`AIGAS.md`; `docs/DOCUMENTATION-GOVERNANCE.md`; the plan + spec; audit
evidence spot-checked at the cited findings.

---

## 1. Cross-amendment interaction matrix

Every pairwise interaction with substance; pairs not listed were checked and
are disjoint (no shared target text, no shared vocabulary obligation).

| Pair | Interaction | Verdict |
|---|---|---|
| **AQ-1 × AQ-7** (01) | Purpose vs. rights: AQ-1 names the second product; AQ-7 gives the athlete ownership of it. AQ-7.1's "Why it exists" leans on AQ-1's product language; both restate one-objective discipline. | **Consistent.** No dual-mandate drift: AQ-1.1 says twice the understanding is instrumental; Art 1 untouched. |
| **AQ-1 × AQ-2** | 02's §1.4 and Family VIII intro use "the evidence-graded understanding of the athlete"; 01's Preamble names "the **understanding of the athlete**… a longitudinal, evidence-graded model". | **Compatible** (componentwise identical; see ruling R2). |
| **AQ-2 × AQ-3** | Shared vocabulary: 03's D17 consumes Test Results / Match ("competition") Performances / External Load Observations and emits **Insights** — 02's exact entities, incl. the "competition performance" synonym 02 declares. 02 says "the analysis decisions (the EDS catalogues them)"; 03 says the entities are the Ontology's. Neither defines the other's half. | **Consistent.** The noun is **Insight** in both (confirmed; plan's "Analysis/Insight" label resolved to "Insight", see R3). |
| **AQ-2 × AQ-4** | Family VIII enters as a **structural** amendment (new family + new structure — this batch); its future members are additive under the clause. 02 states this ("the proving case"); the clause's criteria exclude exactly what AQ-2 does. | **Consistent, self-describing.** |
| **AQ-3 × AQ-4** | D17 enters by full amendment; its family members register via §20.1. Both files state it identically ("ratify both or neither"). The two clauses' dividing line — "new entity inside an existing family" (Ontology) / "new member of an existing family" (EDS) — draws identically: additive = add-only, no redefinition, full template/contract, steward-ratified, dated. | **Consistent.** Criteria do not diverge. |
| **AQ-4.1 × AQ-4.2 numbering** | 02 and 03 each claimed "AQ-4.2" for themselves. | **Was CRITICAL (F1); fixed.** Convention pinned: **AQ-4.1 = ontology half (file 02), AQ-4.2 = EDS half (file 03)** — batch reading order, matching 03's existing labels. All of 02's nine references reconciled. |
| **AQ-5 × AQ-3** (EDS §27) | 03 edits rule 3; 04 edits the derived-artefacts table row + appends rule 5. Combined §27 read end-to-end: table row (04) → rules 1–2 untouched → rule 3 (03: D17 named as producer) → rule 4 untouched → rule 5 (04: materialisation of engine-computed signals). Rule 5's "engine-computed signals" is exactly what amended rule 3 mandates; rule 5 defers to rule 4 for crossings and rule 1 for the plan. | **Composes cleanly.** (03's mis-description of 04's target as "rule 1" was F4; fixed.) |
| **AQ-5 × AQ-2** | 04's materialised history = Stored Data *about* a derivation; 02's Test Result etc. = Stored Data ground truth; 02's Insights = Derived Data promoted to named entities. 04 initially called Insights "Inferences, not Derived Data" — a direct contradiction of 02. | **Was CRITICAL (F2); fixed** — 04 now matches 02. (Ruling R4 justifies 02's classification against KA §2.1.) |
| **AQ-5 × AQ-9** (TAS) | 04 amends §7 note ④/⑧; 05 replaces the §8 tombstone and repairs references. 05's restored §8 cites §7 steps ⑦/⑧ and **never quotes note ④** — verified against 05's drafted text. 04 claimed the restored section "must quote this amended note text" — false vs. 05's actual shape. | **Was IMPORTANT (F3); fixed** — 04 now records textual independence; order-free landing. 05 renumbers nothing, so 04's §4.1/§7 references stand. |
| **AQ-8 × AQ-9** (TAS §15) | 05 keeps §15 = Future AI architecture (restoration at vacant §8). So: 06's item-5 forward-reference lands in §15 as drafted; AIGAS's six `TAS §15` citations (lines 65, 142, 188, 215, 400, 401 — verified) stay correct; 06's conditional item resolves to a no-op. 05 additionally found AIGAS's two inherited `TAS §12` drifts (lines 59, 391) and routed them to 06. | **Resolved and pinned** (F5; fixed — 06 §4 items 14–15). |
| **AQ-8 × AQ-1/6/7** (Constitution) | Disjoint sections: 01 touches Preamble + Title III + How-to-read + Amendment & Stewardship + conflict order; 06 appends a note after Appendix A's closing blockquote. 01 explicitly leaves Appendix A reconciliation to 06; 06's note keeps AIGAS subordinate (restates its Authority row). One Constitution bump covers all four items. | **Consistent.** |
| **AQ-6 × AQ-7** | Art 22's guardian-consent sentence leans on Art 21. Independent ratification contingency was unstated. | **Was IMPORTANT (F6); fixed** — 01 now carries the partial-ratification contingency (surviving Article takes 21; (a)/(b)/(c) contract; the Art-21 lean is dropped if AQ-6 falls). |
| **AQ-2 × AQ-7** | Every Family VIII entity is athlete-owned; Report's composition-time scope and Squad Signal's derived-only bound restate Art 11 and hook Art 22's consent grants. Nothing in 02 widens visibility. | **Consistent.** |
| **AQ-5 × AQ-7** | Append-only history vs. the athlete's erasure right: 04 states append-only binds the *platform* (no silent rewrite of evidence) and "never limits the athlete's export or erasure rights under the proposed Article". Checked against 01's final Art 22 text ("may take their data with them or have it erased") — the readings agree; erasure is the athlete's right exercised *against* the platform's append-only store, not an exception to it. | **Consistent** (ruling R7). |
| **AQ-3 × AQ-8** | D17 members as future Seam-1 substitution candidates: 03 defers wholly to AIGAS §6.2/E3; 06's §6.2 clarifying paragraph covers the case. Neither file needs the other's wording. | **Consistent.** |
| **AQ-4 × GOV** | Both clauses lean on the (living) GOV batch protocol for ceremony while stating their own criteria in full. Frozen→living dependency is bounded: if GOV's mechanics change, the criteria (the binding substance) still live in the frozen text. Ontology clause states the non-circularity explicitly. | **Acceptable; noted for Simon** (§5 R8 — this is the batch's most consequential governance change). |

**External sweep results** (obligations the batch files asked 07 to enumerate):

- Living documents citing "Ontology §10/§11" by number: **none found**
  (repo-wide grep excluding reviews/archive/this batch). 02's renumber has
  zero external sweep burden; the 2026-07-11 audits' citations stay correct as
  dated evidence.
- Living documents citing "TAS §15": AIGAS only (handled above). README /
  MIGRATION-BLUEPRINT cite §16.5/§17 — unaffected (no renumber).
- 02's ND-1 phrasing ("the data-pillar specification the TAS governs", no
  document name) survives regardless of ND-1's eventual title. Confirmed fine.

## 2. Whole-set precedence check

- **Tier flow is downward everywhere.** AQ-1/6/7 amend T0; AQ-2/AQ-4.1 amend
  T1; AQ-3/AQ-4.2/AQ-5 amend T1+T2; AQ-9 is T2-internal; AQ-8 promotes a
  designate into T2. No lower document acquires authority over a higher one;
  no proposal restates a higher document's owned concept (checked against the
  one-owner rule, GOV §5): 02 names entities and points mechanics at the
  TAS/ND-1; 03 seats the decision and points storage at ND-1; 04 grants
  permission and points design at ND-1.
- **AIGAS's position after AQ-8:** T2 peer of the TAS, still subordinate to
  Constitution/Ontology/KA/EDS per its own Authority row; 06's Appendix A note
  ends "the foundational document wins and AIGAS is corrected" — the conflict
  order is unchanged. GOV §1's within-tier "frozen beats non-frozen" clause
  becomes vacuous for T2; no GOV edit needed beyond 06 §4 item 6. Correct.
- **Reviews stay immutable.** Every proposal deliberately leaves
  `docs/reviews/*`, archive, and superpowers records untouched; statements
  like the EDS §45 "sixteen decisions" are correctly preserved as dated truth.
- **Status stays out of specs.** No proposed frozen-doc text carries a status
  claim; 03 states it explicitly ("status lives in HANDOFF.md only"). One
  out-of-universe citation inside proposed frozen text was found and removed
  (F7: "(P2.6 territory)" in EDS rule 5 — benchmark P-lines are review
  vocabulary, not EDS vocabulary; the citation stays in the Rationale where it
  belongs).

## 3. Title III — no-weakening confirmation

Confirmed for the whole batch, item by item:

| Item | Effect on the ethical floor |
|---|---|
| AQ-1 | None (Preamble purpose language; the existence test keeps its veto). |
| AQ-2 | Strengthens in practice: every coach-facing entity (Squad Signal, Report, External Load Observation) restates the Art 11 derived-only rule at entity level. |
| AQ-3 | Strengthens: D17's failure modes name the build-failing privacy validator (L13); squad roll-ups derived-only. |
| AQ-4 | Neutral: additive-only lane; "structural amendment" tier explicitly retains everything touching an Engine Law; steward ratifies every entry. |
| AQ-5 | Neutral on the boundary: materialisation adds *retention*, never a crossing path; raw-vitals rule restated in all three edits; athlete rights explicitly preserved. |
| AQ-6 | **Strengthens the floor**: new tier-1 protection (Art 21); admitted to the never-amended sentence. |
| AQ-7 | **Strengthens the floor**: new tier-1 protection (Art 22); consent widens *who*, never deepens *what* — Art 11 remains the ceiling; admitted to the never-amended sentence. |
| AQ-8 | Strengthens: AIGAS §13's prohibitions formally join the may-be-clarified-never-weakened regime. |
| AQ-9 | Zero policy change (verified — every restored sentence traced to an existing TAS clause; see §4). P5.1 enforcement text becomes findable. |

**No item weakens any Title III/IV protection. Global Constraint 5 and spec
rule 2 are satisfied.**

## 4. Quote-accuracy spot-check (≥3 per file; all verified against the frozen files on this branch)

| File | Quotes checked | Result |
|---|---|---|
| 01 | Preamble coach-reasoning paragraph (elision correct); existence-test sentence; Art 11 closing bullet; "How to read" first paragraph; Amendment & Stewardship floor bullet; conflict-order tier-1 block; header status row + closing line | **7/7 exact.** Constitution structure claims verified: Articles 1–20 across five Titles; Title III = Arts 8–11; `---` separator before Title IV; Appendix A closing blockquote is the anchor 06 also uses. |
| 02 | "How to read" movements 1 and 3; §1 heading + opening-paragraph final sentence; §10/§11 headings + closing line; header Principle row; `Training Outcome —updates→ Prior` row; Capability/Competition/Load/Athlete-State fragment quotes; Readiness "canonical derived signal"; Team "§9.3" dangling ref (pre-existing, confirmed); "no §10/§11 self-references" claim (confirmed: zero occurrences); template = seven fields (confirmed); Family VII at §9 → Family VIII/§10 numbering correct | **All exact.** The appended relationship rows land after the table's true final row. |
| 03 | D16 entry closing line; §21 first paragraph + LEARNING band line; §23 diagram caption `(D-in)` + re-entry trigger bullet; §27 rule 3; §42 closing paragraph; §19 contract fields vs. §20.1's criterion 1 (identical ten fields); TOC lists sections only (confirmed — §20.1 needs no TOC change); L8/L9/L11/L13/L14, P12, SA7, E3, §26.1/§27.1/§28.3 all exist as cited; "sixteen decisions" in §45.2 C2.1 confirmed | **All exact.** One width nit fixed (F8). |
| 04 | KA §2.1 row 6; KA sharpened pair; KA §2.3 readiness row; EDS §27 table row 3 + rule 1; TAS §7 transition-notes paragraph (full, verbatim); TAS §4.1 provenance stamp (`engineVersion × knowledgeSetVersion`, lines 257–258) — the §4.1 citation is right; EDS §27 has exactly rules 1–4 (rule 5 appends cleanly) | **All exact.** |
| 05 | All 22 table rows checked at their cited line numbers — **22/22 verbatim**, including both AQ-9.3 lines (739, 946). Structural claims verified: tombstone at line 715; actual map §13 testing/§14 observability/§15 Future AI/§16/§17; **zero "§8" references anywhere in the TAS**; §4.1 flag rule at line 265 (AQ-9.3's rationale correct); AIGAS's six `TAS §15` cites at exactly the six claimed lines; restored-§8 source clauses all found (rollUp §4.1, materialized surface §16.1 C1, RLS tests §4.4, service_role §16.3 C1, hard rule 3 §5.13, privacy sweep §4.2, default-deny + Audit Log §4.4, population-learning privacy §4.5/§10, §2 corollary 7, auth-outage §4.4) — **restoration, not invention, confirmed** | **All exact.** The strongest-verified file in the batch. |
| 06 | AIGAS status row; Appendix B intro sentence; §6.2 opening sentence + the "Everything user-visible" insertion anchor; AIGAS `TAS §12` at lines 59/391; GOV §1 ladder line, §3 opening, §3 path closing; INDEX Mermaid node/heading/Related cell; CLAUDE.md three phrases; foundation + architecture READMEs; atlas ADR line; HANDOFF queue item 3 + invariant line | **All exact.** |

## 5. Rulings on the author-flagged items

- **R1 · 01 — tier-1 code block with "21, 22" added: ACCEPT as drafted.** The
  existing block has no strict right-alignment (line lengths 85/74/74/75/80/87);
  the proposed line ends at column 87 — exactly the block's current maximum
  width — so it renders cleanly. 01's "right alignment preserved" claim is
  slightly overstated; harmless (M2).
- **R2 · 01/02 — the AQ-1 noun phrase: COMPATIBLE, no edit.** The canonical
  short form is **"the evidence-graded understanding of the athlete"** (the
  audit's own phrase, used verbatim by 02). 01's Preamble names the product
  "the understanding of the athlete" and glosses it "a longitudinal,
  evidence-graded model of who this athlete is" — the phrase's two components,
  adjacent, in Constitution voice. Downstream documents citing the short form
  trace cleanly. Simon may harmonise 01's "model" → "picture"/"understanding"
  if he wants literal identity; not required (M3).
- **R3 · 02 — Squad Signal beyond the plan's six entities: CONFIRM, keep.**
  GA-208 is a constituent finding of AQ-2 (the queue row cites
  GA-203/205/206/207/208/209 explicitly; verified), and `player_status` — live
  on prod — would otherwise remain ontologically homeless, leaving AQ-2
  partially unresolved. The plan's entity list carried the findings' minimum,
  not a ceiling. The definition adds no policy: it restates Art 11 and
  TEAM-ARCHITECTURE's existing rules. Flagged to Simon as the batch's one
  entity beyond the plan's named list.
- **R4 · 02/04 — what kind is an Insight: Derived Data (02 stands; 04
  corrected).** Justification against KA §2.1: D17 is pure and deterministic
  (03, P12), so an Insight is *computed from stored data + knowledge and
  recomputable* — kind 6's definition — and kind 6 explicitly may carry
  confidence ("Sometimes (e.g. readiness confidence)"). KA's Inference kind
  (row 3) remains the home of *judgements* like D4's diagnosis ("your top
  limiter is reactive strength" — KA's own worked example). KA's worked table
  already classes readiness — a D17 output after AQ-3 — as Derived Data, which
  settles it. 02's "promoted to a named entity" idiom composes with 04's
  doctrine: a point-in-time Insight may be materialised as dated history like
  any derived value.
- **R5 · 03 — D17 feeds D7/D12 only indirectly: CONFIRM the deviation.** The
  plan task said "feeds D1/D4/D7/D12"; the drafted contract wires
  D1/D4/D15/D16 + trigger + reporting + AI seam. The audit's own remedy line
  (GA-417, verified verbatim) is "consumed by **D4/D15** and the AI seam" —
  the narrower wiring. A direct D17→D7 (block objective) or D17→D12 (dose)
  edge would let an interpretation steer prescription without passing
  diagnosis or D14's validators — exactly the "no insight silently steers"
  failure P2.10 forbids, and a breach of diagnosis-precedes-prescription
  (Art 5). The plan's wider list echoes D16's `→ D1, D4, D7, D12` pattern,
  which is right for *priors* but wrong for *interpretations*. The deviation
  is principled; recorded here for Simon's eyes.
- **R6 · 03/04 — the combined §27 reading: COMPOSES** (see matrix row; F4
  fixed the one mis-description).
- **R7 · 01×04 — append-only vs. erasure: CONFIRMED consistent** (matrix row
  AQ-5 × AQ-7). No text change needed in either file.
- **R8 · 04 — TAS §16.1 C3 as a fourth touch-point: NO fourth edit; leave to
  ND-1, as drafted.** C3 governs *decision traces for committed plans* —
  evidence of what was decided — not derived observations; its minimal
  retention posture does not contradict rule 5's *permission* (nothing in C3
  forbids materialising signals; it just wasn't asked). Retention policy is
  ND-1's design scope per AQ-5's own boundary. Adding a C3 edit would be
  policy invention inside a clarification amendment.
- **R9 · 05 — the T2 "§12" reference (row 3): ACCEPT the proposed §16.1 as
  the default.** §16.1 C1 is where cache-vs-materialize is actually drawn, and
  keeping three resolvers preserves the row's shape. The drop-to-`§4.3, §7`
  alternative remains recorded in 05 and is equally defensible — **Simon's
  pick at ratification**; either way the row stops pointing at a section
  silent on caching.
- **R10 · 05 — AIGAS's inherited "TAS §12" drift: ROUTED to 06, done.** Now
  §4 item 15 of 06 (F5). Correctly *not* part of AQ-9 (AIGAS is not frozen
  until the flip; the fix rides the ratification PR as an ordinary edit).
- **R11 · 05 — AQ-9.3 (the two §5.1→§4.1 wrong-targets): KEEP in the batch,
  separable as drafted.** Both current texts verified at lines 739/946; the
  claimed correct target verified (§4.1's no-reasoning-flags bullet, line
  265, which itself points at §9 — completing the pair). Zero policy change.
  The separability framing ("ratifier may strike") is the right posture for
  sub-GA-509 confidence; striking it leaves 9.1/9.2 whole.
- **R12 · 06 — the TAS § pin: PINNED at §15.** 05's adopted repair renumbers
  nothing; 06 edited accordingly (§4 items 14–15; §6 bullet updated). The
  batch now contains no unresolved cross-file conditional.
- **R13 · 06 — Option A (the review pair as the panel record): ENDORSED as
  sufficient; the choice is Simon's.** The scope map is honest — the
  2026-07-06 review alone fails three of the six path requirements (one by
  its own Finding 5); the pair meets all six, with audit 06 supplying the
  adversarial, `docs/reviews/`-resident, benchmark-driven pass, and 06 §3
  supplying the disposition record the path demands. Option B is fully
  prepared and costs only AQ-8's deferral to a follow-up flip PR. **Crisply:
  choose A to ratify AIGAS with this batch on the strength of two existing
  reviews; choose B to buy one more adversarial pass at the price of a second
  PR.** This review finds nothing in AIGAS's open findings (all dispositioned
  in 06 §3) that requires B.
- **R14 · 01 — "Family VIII" name-check: CORRECT.** The Ontology's catalogue
  runs Family I–VII (§3–§9, verified); the new family is VIII at §10; 01/02/04
  all say "Family VIII" consistently; the batch's cross-file uses match.
- **R15 · 01 — AQ-7's anchor if AQ-6 is rejected: RESOLVED** by the
  partial-ratification contingency added to 01 (F6): the surviving Article
  takes 21; AQ-6/7.2(a)/(b)/(c) contract; Art 22's single textual lean on
  Art 21 is dropped.

## 6. Findings and fixes applied

Applied fixes were written into files 01–06 by this review (last editor
before the PR). CRITICAL = contradiction, had to be fixed · IMPORTANT = fix
before PR · MINOR = note for Simon, no fix required.

| # | Sev | Finding | Disposition |
|---|---|---|---|
| F1 | CRITICAL | **AQ-4 sub-numbering collision**: 02 and 03 each labelled their own half "AQ-4.2" and the other's "AQ-4.1" — the same clause carried two numbers depending on the file read. | **Fixed in 02** (nine references): AQ-4.1 = ontology half (02), AQ-4.2 = EDS half (03), per batch reading order. 03 already used this convention; unchanged. |
| F2 | CRITICAL | **Insight kind contradiction**: 04 twice asserted "insights are Inferences with confidence, not Derived Data" *and attributed that to 02*, while 02 classifies Insight/Squad Signal/Report as Derived Data promoted to named entities. Ratifying both as written would have written a contradiction into the frozen set. | **Fixed in 04** (both sentences) to match 02; classification justified against KA §2.1 in ruling R4. |
| F3 | IMPORTANT | 04 claimed 05's restored Security & Privacy section "must quote the amended §7 note ④" — false against 05's actual draft, which cites steps ⑦/⑧ and never quotes the note (05 states this explicitly). A phantom coordination requirement. | **Fixed in 04** (two spots): textual independence recorded; order-free landing; §7/§4.1 references confirmed stable under 05's no-renumber repair. |
| F4 | IMPORTANT | 03 described AQ-5's EDS edit as "§27 **rule 1**" (twice); 04 actually amends the table row and appends rule 5 — rule 1 is quoted only as an unchanged anchor. | **Fixed in 03** (consistency bullet + version-bump note). |
| F5 | IMPORTANT | 06's reconciliation list was missing the AIGAS `TAS §12`→`§13` fix that 05 §5 explicitly routes to it, and its §15 conditional item was left unresolved after 05 fixed the repair shape. | **Fixed in 06**: §4 gains items 14 (§15 pin — no-op, recorded) and 15 (the two §12→§13 corrections, lines 59/391); §6's coordination bullet updated. |
| F6 | IMPORTANT | 01 had no stated contingency for Simon ratifying only one of AQ-6/AQ-7: the adoption-order rule would give the survivor number 21, and the AQ-6/7.2 edits + Art 22's lean on Art 21 would need to contract. | **Fixed in 01**: partial-ratification contingency paragraph added to the numbering decision. |
| F7 | IMPORTANT | Proposed **frozen-document text** in 04's EDS rule 5 contained "(P2.6 territory)" — a 2026-07-11 benchmark P-line. Benchmark/review vocabulary must not be cited inside frozen spec text (reviews are dated evidence; the EDS predates them). All other proposed frozen text checked clean — internal codes only (L*, P*, SA*, §, Art). | **Fixed in 04**: phrase removed from the proposed rule text; the P2.6 citation remains in the Rationale, where it belongs. |
| F8 | MINOR | 03's §23 caption edit `(D-in)`→`(D17)` is one character narrower, which would misalign the ASCII box border by one column despite "nothing else moves". | **Fixed in 03**: padding note added for the ratification edit. |
| F9 | MINOR | 01's claim that edit (c) "keeps the parenthetical's right alignment" is overstated — the code block has no strict alignment (line lengths 85/74/74/75/80/87). The proposed line ends at column 87, the block's existing maximum; renders fine. | No fix; recorded (R1). |
| F10 | MINOR | The EDS header status row still reads "**Draft** v1.0 — foundational" — stale against the 2026-07-01 freeze (a pre-existing defect, not this batch's). Since the EDS receives a version bump anyway, the ratification PR may normalise it to "v1.1 — foundational, governing" in the same stroke. | Simon's call; folded into the §7 bump plan. |
| F11 | MINOR | 04's rule 5 cites "(SA7)" for the provenance stamp; SA7 is "Knowledge is versioned and reviewable" — the nearest existing EDS hook (the stamp's full `engineVersion × knowledgeSetVersion` form is TAS §4.1's). Defensible; a fastidious ratifier could drop the parenthetical. | No fix; noted. |
| F12 | MINOR | The AMENDMENT-QUEUE rows AQ-1…AQ-9 are still QUEUED; the flip to BATCHED (linking this directory) is the controller's remaining Task-P7 step, outside this review's two-file remit. | For the controller, before the PR. |
| F13 | MINOR | 06 §4's intro sentence ("items 6–13 are ordinary edits…") predates the added items 14–15; item 15 is an AIGAS body edit riding the same PR. Cosmetic. | No fix; harmless. |

**Bottom line: with F1–F8 applied, the batch is internally consistent, quotes
its targets accurately, weakens nothing in Title III/IV, and is ready for
Simon's review.**

## 7. The per-document version-bump plan (one bump per document, whole batch)

Applied only in Simon's ratification PR; `<DATE>` = his merge date. Each
revision note names the batch: *"2026-07 amendment batch (AQ-1…AQ-9); proposals
in docs/design/amendment-batch-2026-07/"*.

| Document | Bump | Batch items carried in the one bump | Where the version appears (all updated together) |
|---|---|---|---|
| `docs/foundation/CONSTITUTION.md` | **v1.0 → v1.1** | AQ-1.1, AQ-1.2, AQ-6.1 (Art 21), AQ-7.1 (Art 22), AQ-6/7.2(a–c), AQ-8 §4 item 4 (Appendix A note) | Header Status row (`v1.1 — foundational, governing · amended <DATE>`); closing line → `*— End of the Engine Constitution v1.1 —*` |
| `docs/foundation/DECISION-ONTOLOGY.md` | **v1.0 → v1.1** | AQ-2.1, AQ-2.2, AQ-2.3, AQ-4.1 | Header Status row; closing line → `*— End of the Decision Ontology v1.1 —*` (02 defers the stamp here — confirmed) |
| `docs/foundation/KNOWLEDGE-ARCHITECTURE.md` | **v1.0 → v1.1** | AQ-5.1 (the batch's only KA touch) | Header Status row; closing line → `*— End of the Knowledge Architecture v1.1 —*` |
| `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md` | **v1.0 → v1.1** | AQ-3 (D17 + four reconciliation edits), AQ-4.2 (§20.1 + §42), AQ-5.2 (§27 row + rule 5) | Header Status row — recommend normalising the stale "Draft" label to `v1.1 — foundational, governing` (F10, Simon's call); no closing version line exists |
| `docs/architecture/TAS.md` | **v1.0 → v1.1** | AQ-5.3 (§7 notes), AQ-8 §4 item 5 (§15 forward-reference), AQ-9.1 (restored §8 — its restoration note already says v1.1: confirmed correct), AQ-9.2 (22 reference repairs), AQ-9.3 (if not struck) | Header Status row; closing line → `*— End of the Technical Architecture Specification v1.1 —*` |
| `docs/architecture/AIGAS.md` | **v1.0 → v1.1** | AQ-8: status flip (§4 item 1 — its drafted v1.1 is hereby confirmed as the final number), Appendix B living designation (item 2), §6.2 clarifying paragraph (item 3), the two `TAS §12`→`§13` corrections (item 15) | Header Status row per 06 §4 item 1 (no closing version line exists) |

Living/working documents riding the same PR unversioned (GOV, INDEX,
CLAUDE.md, HANDOFF, foundation/architecture READMEs, atlas ADR register,
AMENDMENT-QUEUE) are itemised in 06 §4 items 6–13. Under **Option B** the
AIGAS bump and 06 §4 items 1–15 move to the follow-up flip PR; the other five
bumps proceed with the batch unchanged.

---

*— End of the whole-batch consistency review · findings F1–F8 applied in files 01–06 · applied to frozen documents only by Simon's ratification PR —*
