# Phase 1 Amendment Batch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the ratification-ready AQ-1…AQ-9 batch proposal set per `docs/superpowers/specs/2026-07-13-phase1-amendment-batch-design.md`.

**Architecture:** Six drafting tasks (one per proposal file, parallel-safe — disjoint files, controller commits) → the whole-batch consistency review (07) → register flip + PR. Branch `phase1-amendment-batch-2026-07-13`.

**Tech Stack:** Markdown. Evidence: governance audit 09 §3 (the queue entries — each task's charter), the per-document audits 01–08 (finding detail), the target frozen documents (read in full for voice + exact current text).

## Global Constraints

1. **NO frozen file is edited** — `git diff --name-only` per task must show only `docs/design/amendment-batch-2026-07/*`. The frozen five + AIGAS are READ ONLY.
2. Proposal-entry format (every amendment in every file):
   `### AQ-n(.m) — <title>` · **Target:** doc + exact § · **Current text:** verbatim quote (elided with […] where long) · **Proposed text:** complete drafted replacement/insertion in the target's voice · **Rationale:** GA-IDs + benchmark P-lines · **Consistency:** interactions with other batch items + unchanged neighbours · **Not changed:** what this deliberately leaves alone.
3. Banner on every file: `**Status: BATCH PROPOSAL — working doc (T4) · 2026-07-13 · nothing herein is applied; Simon's ratification PR applies it**` + link to the spec.
4. Drafted text must be METICULOUS about the target document's conventions (numbering style, Article/§ structure, definition-list voice, cross-reference format). Read the whole target document first.
5. Title III items may strengthen, never weaken, the ethical floor.
6. Commits by the controller, one per task, `docs(amendments): <file> — <items>` + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
7. Authoring tasks do NOT run git.

---

### Task P1: `01-constitution.md` (AQ-1, AQ-6, AQ-7)
Read: audit 09 §3 entries AQ-1/6/7 + audit 01 findings GA-113/107/109 (+ §2 rows) + benchmark P2 pillar intro, P5.3, P5.7 + `docs/foundation/CONSTITUTION.md` IN FULL.
- [ ] Draft: (AQ-1) Preamble/Art-1-adjacent language naming the athlete data asset as the second product serving the same single objective — placement chosen to alter the "single question" gate minimally (the audit's direction: purpose-level, not mechanism); (AQ-6) a Title III Article: developmental-stage duty of care (youth/masters; LTAD posture; conservative defaults where age-modulated evidence is thin); (AQ-7) a Title III Article: athlete data ownership & consent (athlete owns their data; consent is informed, granular, revocable; visibility boundaries constitutional, incl. team contexts; secondary/research use only under privacy-preserving consent). Number new Articles per the document's scheme (candidates: Art 21/22 in Title III order — follow the doc's own structure, note renumbering implications if any).
- [ ] Consistency notes must cover: conflict-order tiers (do the new Articles slot into tier 1?), Art 11 (visibility) vs AQ-7 (rights) boundary, AQ-1 vs Art 1's "sole objective" phrasing (second product serves the same objective — no dual-mandate drift).

### Task P2: `02-ontology.md` (AQ-2, AQ-4-ontology)
Read: audit 09 §3 AQ-2/AQ-4 + audit 02 findings GA-203/204/205–209 + audit 08 §4 + `docs/foundation/DECISION-ONTOLOGY.md` IN FULL.
- [ ] Draft the Measurement & Analysis entity family (a new §/Family: Test/Assessment, Test Result, Match/Competition Performance, External Load, Analysis/Insight, Report — definitions in the ontology's entity-template voice, each with relationships to existing entities) + the analysis structure (the ontology's §1 gains the data→model→insight→decision spine as a peer structure, per GA-207's direction) + the additive-extension clause (new entities within an existing family = dated additive edit under the batch protocol, not a full amendment — GA-204's direction, honouring the concepts-first Principle).
- [ ] Consistency: no redefinition of Family VI (Load/Fatigue/etc.) — External Load EXTENDS it; Derived Data (KA §2) vs Analysis/Insight boundary stated; vocabulary pairs with TAS/EDS architectural owners (the audit's pairing rulings).

### Task P3: `03-eds.md` (AQ-3, AQ-4-eds)
Read: audit 09 §3 AQ-3/AQ-4 + audit 04 findings GA-417/419 (+§2 P2.10 row) + `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md` §20 in full + enough of §§21–29 to draft in-voice.
- [ ] Draft the analysis decision family (the catalogue's direction per GA-417: a decision (or family D17+) that reads athlete data and decides what it means — inputs, knowledge, outputs `{value, confidence, rationale}`, deps (feeds D1/D4/D7/D12 and the reporting surface), validation, override, confidence tiers; drafted as a catalogue entry in §20's exact row/entry format) + the catalogue extension clause (GA-419: additive decisions enter by amendment-lite under the batch protocol with stated deps/contracts, the graph remains a DAG, D1–D16 semantics never silently altered).
- [ ] Consistency: the new decision must NOT overlap D15 (reflow) or D16 (learning) — state the boundary precisely (analysis produces interpretations/insights; D16 produces priors; D15 re-runs construction).

### Task P4: `04-derived-data-doctrine.md` (AQ-5)
Read: audit 09 §3 AQ-5 + audit 08 GA-802 (the PRECLUDES finding + its three cited locations) + the exact current text at KA §2.1/§2.3, EDS §27, TAS §7④.
- [ ] Draft the coordinated three-document clarification: derived values remain recomputable-not-truth for CURRENT state; point-in-time derived values MAY be materialised as dated historical evidence (stamped `engineVersion × knowledgeSetVersion`, append-only, never re-served as current) — one doctrine, three in-voice edits.
- [ ] Consistency: privacy boundary unchanged (derived-only crossing rule intact); no contradiction with plan-is-hypothesis (Ontology §7 — the PLAN stays recomputed; it is the derived OBSERVATIONS that gain a historical form).

### Task P5: `05-tas-structural-repair.md` (AQ-9)
Read: audit 05 GA-509 (the verified defect list: preamble line 29, T19 §15 refs, §4.7, §16.1 C2, §16.3 C1, §17 step 6, §273) + `docs/architecture/TAS.md` IN FULL.
- [ ] Draft the repair: corrected § map; a restored "Security & Privacy" section ASSEMBLED from the TAS's existing scattered privacy/security rules (§4.4 wearable ACL, §7④, raw-vitals boundary, credential rules — restoration with pointers, no new policy); every broken cross-ref's old→new text listed exhaustively (grep-verified complete).
- [ ] Consistency: zero behavioural/policy change — this is the batch's one purely structural item; state that explicitly.

### Task P6: `06-aigas-ratification.md` (AQ-8)
Read: audit 06 GA-610 + `docs/DOCUMENTATION-GOVERNANCE.md` §Ratification (the path B1 landed) + `docs/architecture/AIGAS-REVIEW-2026-07-06.md` (verdict + findings 5–6) + AIGAS §status lines.
- [ ] Draft the ratification proposal per the GOV path: what ratification asserts; the panel-review step with BOTH options prepared (accept the 2026-07-06 review as qualifying — its scope map included; or commission a fresh panel — charter included); the reconciliation list (AIGAS status line, Constitution Appendix A + TAS §15 forward-references — coordinated with P5's repair, INDEX/T2 flip); what changes for Stage 6 on ratification (AIGAS becomes gating for AI work, ends designate limbo).

### Task P7: `07-consistency-review.md` + `README.md` + register flip + PR
Runs AFTER P1–P6 land. Fresh reviewer (not an author) reads the six proposal files + the five frozen docs + AIGAS.
- [ ] `07-consistency-review.md`: cross-amendment interaction matrix (AQ-1×AQ-7 purpose/rights, AQ-2×AQ-3 vocabulary/decision alignment, AQ-4×AQ-2/3 clause coverage, AQ-5×AQ-9 TAS touch-points, AQ-8×AQ-9 §15 reference), whole-set precedence check, Title III no-weakening confirmation, per-document version-bump plan (one bump per doc for the whole batch), and a findings list — authors fix CRITICAL/IMPORTANT findings before the PR.
- [ ] `README.md`: batch cover per spec §1.
- [ ] Flip AQ-1…AQ-9 rows QUEUED→BATCHED in `docs/AMENDMENT-QUEUE.md` (link the batch dir).
- [ ] `npm test` + `npm run lint` sanity; push; PR `docs(amendments): Phase 1 — the AQ-1..9 ratification batch`; **STOP — Simon's review/ratification is the outcome. Explicitly ask his AQ-1/AQ-2 direction verdict, which unlocks the ND-1 sprint.**
