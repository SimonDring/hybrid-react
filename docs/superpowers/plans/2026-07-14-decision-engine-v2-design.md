# Decision Engine V2 Design Sprint — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**REVISED 2026-07-14: re-scoped post-ratification per DEVELOPMENT-PLAN §5.1 — premises updated to the frozen set v1.1 (ratified 2026-07-13); supersedes the parked 2026-07-11 plan (branch `engine-v2-design-2026-07-11`).**

**Goal:** Produce the 15 Decision Engine V2 design deliverables (14 new docs in `docs/design/engine-v2/` + the atlas architecture-section update) defined by `docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md` — DEVELOPMENT-PLAN Phase 2 §5.2, feeding the §5.3 blueprint ratification.

**Architecture:** Docs-only sprint — no production code. Three anchor documents (00-ARCHITECTURE, 01-DECISION-HIERARCHY, 02-COACHING-PIPELINE) are written sequentially because they define the vocabulary; the remaining deliverables fan out in parallel; a whole-set consistency + adversarial review pass runs before HANDOFF/index updates and the PR.

**Tech Stack:** Markdown, Mermaid (for the dependency diagram), git. Branch: a fresh execution branch off main (post-ratification — main must contain the v1.1 ratification merge `dda6c5a`); the parked `engine-v2-design-2026-07-11` branch is superseded history.

## Global Constraints

Every task implicitly includes ALL of these. They come verbatim from the spec (§2–§4) and repo governance.

1. **Banner (verbatim, first lines of every new deliverable):**
   ```markdown
   # <Document Title>

   **Status: PROPOSAL — working doc (T4) · 2026-07-14 · not canonical; adopted only via DEVELOPMENT-PLAN §5.3**
   **Sprint spec: [`docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md`](../../superpowers/specs/2026-07-14-decision-engine-v2-design.md)**
   ```
2. **No production code.** Nothing under `packages/`, `apps/`, or `supabase/` is touched. Interface sketches inside docs are design artefacts, clearly non-normative.
3. **The frozen six are NEVER edited**: `docs/foundation/CONSTITUTION.md`, `docs/foundation/DECISION-ONTOLOGY.md`, `docs/foundation/KNOWLEDGE-ARCHITECTURE.md`, `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md`, `docs/architecture/TAS.md`, `docs/architecture/AIGAS.md` (ratified 2026-07-13; Appendix B living). All are cited **as amended — v1.1**. NEW divergence = Amendment Register entry (Task 2), never an edit; additive vocabulary/catalogue growth = a proposed Ontology §13 / EDS §20.1 entry, never an amendment.
4. **Citation formats:**
   - Audit findings: `(G9; audit 08)` or `(TR-01; audit 06)` — ID + deliverable number. The audit files are `docs/reviews/2026-07-11-engine-audit-01…10-*.md`.
   - Frozen set (v1.1): `(Constitution Art 6)` — 22 Articles, `(EDS §20 D11)`, `(Ontology §1.1)`, `(KA §3.1)`, `(TAS §5.2)`, `(AIGAS §6.2)`.
   - Data pillar: `(DAAS §4.2 — designate, in review)` — `docs/architecture/DATA-ANALYTICS-ARCHITECTURE.md`; always carry the designate marker until it ratifies.
   - Current code: `path/to/file.js:line` — allowed ONLY in the migration set (Tasks 12) and knowledge-ownership closure list (Task 6), always framed "as of the audit pin `main @ 02f6184` (2026-07-11)"; where Phase 0 (Wave A, PRs #173/#174) altered a pinned finding, add the fix reference alongside.
5. **No build-status claims.** The words "currently", "not built yet", "already implemented", "X% dormant" must not describe live state in any deliverable. The only permitted tense for present-day facts is the dated audit-pin frame above. Status lives in HANDOFF.md only.
6. **One owner per concept.** Where a frozen doc owns a concept, LINK to it and add operational depth. Never restate its content, never contradict it.
7. **Determinism is inviolable** (Constitution Art 18): every design element must be satisfiable with no clock reads, no randomness, no I/O in the reasoning core; AI only at the two AIGAS seams.
8. **Stage vocabulary contract:** EDS §20's ratified catalogue is D1–**D17** (v1.1 — D17 Observation & Analysis is a decision family; new members register additively under §20.1). Those numbers are the ONLY stage vocabulary. If the design surfaces a genuinely new pass that is not one of D1–D17 and not a D17 family member, it is written up as a **proposed §20.1 admission** — all four criteria (contract completeness, graph position, validation & explainability integration, knowledge separation) stated in full, queued for the amendment batch, and referenced in the set by its proposed id — never given an ad-hoc name. *(The 2026-07-11 plan's `V2-P<n>` naming workaround is deleted: §20.1 is now the extension lane.)* Task 4's stage table in `02-COACHING-PIPELINE.md` is the single naming authority — every later task MUST read that file first and use its stage IDs verbatim.
9. **Commits:** one commit per task, message pattern `docs(engine-v2): <deliverable> — <what>`, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
10. **Required background for EVERY authoring task** (read before writing): the sprint spec (`docs/superpowers/specs/2026-07-14-decision-engine-v2-design.md`) — especially §4 grounding rules and §5 design commitments — plus the task's own reading list. Tasks 5–14 must ALSO read the three anchor docs (`docs/design/engine-v2/00…02`) before writing.

---

### Task 1: Scaffold `docs/design/engine-v2/`

**Files:**
- Create: `docs/design/engine-v2/README.md`

**Interfaces:**
- Produces: the directory, the index every later task registers in, and the banner template later tasks copy.

- [ ] **Step 1: Write the README index**

Create `docs/design/engine-v2/README.md` with: the banner (Global Constraint 1, title "Decision Engine V2 — Design Proposal Set"); a paragraph stating what the set is (Sprint 3 output; proposals feeding the development plan; validated against the frozen set; divergences queued in the Amendment Register in 00-ARCHITECTURE, never applied); the reading order (00 → 01 → 02 → 03/04 → 05/06/07 → 08/09 → 10/11/12 → 13); and this document table (one row per file, "Pending" until each lands — rows are flipped to a one-line description by the task that creates each file):

```markdown
| Doc | Deliverable | Status in this set |
|---|---|---|
| [00-ARCHITECTURE.md](00-ARCHITECTURE.md) | V2 architecture, frozen-set reconciliation, Amendment Register | Pending |
| [01-DECISION-HIERARCHY.md](01-DECISION-HIERARCHY.md) | Coaching decision hierarchy | Pending |
| [02-COACHING-PIPELINE.md](02-COACHING-PIPELINE.md) | Pipeline stage specification (naming authority) | Pending |
| [03-PERFORMANCE-MODEL.md](03-PERFORMANCE-MODEL.md) | Performance & adaptation model | Pending |
| [04-KNOWLEDGE-OWNERSHIP-MAP.md](04-KNOWLEDGE-OWNERSHIP-MAP.md) | Knowledge ownership map | Pending |
| [05-SESSION-BUILDER.md](05-SESSION-BUILDER.md) | Session construction architecture | Pending |
| [06-CONSTRAINT-ENGINE.md](06-CONSTRAINT-ENGINE.md) | Constraint engine | Pending |
| [07-PROGRESSION.md](07-PROGRESSION.md) | Progression architecture | Pending |
| [08-EXPLAINABILITY.md](08-EXPLAINABILITY.md) | Explainability layer | Pending |
| [09-AI-BOUNDARIES.md](09-AI-BOUNDARIES.md) | AI integration boundaries | Pending |
| [10-MIGRATION-ARCHITECTURE.md](10-MIGRATION-ARCHITECTURE.md) | Migration architecture | Pending |
| [11-MIGRATION-PHASES.md](11-MIGRATION-PHASES.md) | Migration phases | Pending |
| [12-MODULE-DEPENDENCY-DIAGRAM.md](12-MODULE-DEPENDENCY-DIAGRAM.md) | Module dependency diagram | Pending |
| [13-VALIDATION-STRATEGY.md](13-VALIDATION-STRATEGY.md) | Validation strategy | Pending |
```

Plus a final section "Atlas update" noting deliverable 15 lives in `docs/architecture-atlas/01-ARCHITECTURE-ATLAS.md` (architecture section).

- [ ] **Step 2: Verify banner + tree**

Run: `grep -c "PROPOSAL — working doc (T4)" docs/design/engine-v2/README.md`
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add docs/design/engine-v2/README.md
git commit -m "docs(engine-v2): scaffold proposal-set directory + README index"
```

---

### Task 2: `00-ARCHITECTURE.md` — V2 architecture, reconciliation, Amendment Register

**Files:**
- Create: `docs/design/engine-v2/00-ARCHITECTURE.md`
- Modify: `docs/design/engine-v2/README.md` (flip its row from Pending)

**Interfaces:**
- Produces: the layer names, the first-principles coaching narrative, the reconciliation verdict per element (`AGREES` / `DEEPENS` / `DIVERGES`), and the Amendment Register table (`AR-1`, `AR-2`, …) that ALL later docs cite when they touch a divergence.

**Required reading (in this order):**
1. Sprint spec §1, §4, §5.
2. `docs/foundation/CONSTITUTION.md` (v1.1) — all 22 Articles (the amended Preamble names the second product; Arts 21/22 are Title III duties) + the conflict order + Amendment & Stewardship.
3. `docs/foundation/DECISION-ONTOLOGY.md` (v1.1) §1 (the FOUR structures — §1.4 Analysis Spine included) + §13 (additive extension vs structural amendment).
4. `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md` (v1.1) §20 (D1–**D17** catalogue) + §20.1 (extending the catalogue).
5. `docs/architecture/TAS.md` (v1.1) §3–§5 (layers, engine API, purity rules).
6. `docs/architecture/DATA-ANALYTICS-ARCHITECTURE.md` (DAAS — designate, in review) §1.3/§1.4 (what it owns / does not own) — the data pillar's owner for the reconciliation matrix.
7. Audit: `docs/reviews/2026-07-11-engine-audit-01-current-state.md` §1 & §7, `…-02-constitutional-alignment.md` §1 & §3, `…-03-coaching-quality.md` §5 & §7, `…-10-migration-blueprint-draft.md` §1–§2.

- [ ] **Step 1: Write Part A — the first-principles narrative (blank page)**

Section "§1 How an elite coach thinks". Write it WITHOUT referencing D-numbers, file names, or the current implementation — pure coaching reasoning, from the spec's mission. It must walk the full loop: know the athlete → understand the demand → diagnose what limits performance → choose the few things worth changing → decide the strategy and the season structure → construct the smallest sufficient sessions → check them against safety and reality → deliver with reasons → watch what happens → learn and re-diagnose. Each step gets a short paragraph stating the coaching question it answers and what a wrong answer costs the athlete.

- [ ] **Step 2: Write Part B — the V2 engine shape**

Section "§2 The engine that thinking implies": derive the architecture from §1 — a pure deterministic reasoning core; knowledge consumed, never contained; a constraint layer resolved before construction; construction that proposes and validation that disposes with the Constitution's conflict order as an explicit, testable resolution pass; an explanation read-model that renders the decision trace; learning that only ever writes priors. Include one architecture overview diagram (Mermaid) of the V2 layers. State the eight load-bearing commitments from spec §5 as V2 positions, each with its audit citation.

- [ ] **Step 3: Write Part C — the reconciliation matrix**

Section "§3 Reconciliation against the frozen set": a table, one row per V2 element from §2, columns `V2 element | Frozen owner (doc + §/Art) | Verdict (AGREES / DEEPENS / DIVERGES) | Note`. The reconciliation target is the **AMENDED v1.1 set** (ratified 2026-07-13) — the 2026-07 batch's additions (Preamble second product, Arts 21/22, Ontology §1.4 + Family VIII + §13, EDS D17 + §20.1, the derived-data doctrine) are frozen owners to reconcile AGAINST, never gaps to rediscover. Every row MUST name a frozen owner, or the DAAS (cited as designate) for data-pillar elements, or state "set silent — V2 proposes". Two element classes get named rows with their new owners: progression/LTAD elements reconcile against Constitution Art 21 (developmental stage is a first-class input; stage rules are governed knowledge); athlete-data elements against Art 22 (athlete ownership, consent-based grants, export/erasure). Expect most rows AGREES/DEEPENS; a DIVERGES verdict requires an AR entry in §4.

- [ ] **Step 4: Write Part D — the Amendment Register**

Section "§4 Amendment Register": table `AR-n | Frozen doc + § | What V2 proposes instead | Why (evidence) | Status: QUEUED — candidate for the amendment process (never applied here)`. Seed it with any DIVERGES rows from §3. **The register queues only NEW divergences**: the 2026-07 batch (AQ-1–AQ-9) is landed history and is never re-queued, and the parked plan's two pre-flagged candidates are RESOLVED by ratification — quality-vocabulary expansion (SR-05/B3) is now an **additive extension** through the Ontology §13 lane (routine, batchable — list it in a separate "§4.1 Additive-extension candidates" subsection, not as an AR amendment), and pipeline passes beyond the catalogue now enter through **EDS §20.1** (proposed admissions, also §4.1, per Global Constraint 8). Only a genuinely *structural* conflict with the amended text (redefining an entity, rewiring the D1→D14 spine, contradicting an Article) earns an AR row. If §3 produces zero divergences, say so explicitly — an empty register is a legitimate finding.

- [ ] **Step 5: Verify**

```bash
grep -c "PROPOSAL — working doc (T4)" docs/design/engine-v2/00-ARCHITECTURE.md   # expect 1
grep -nE "\b(currently|not built yet|already implemented)\b" docs/design/engine-v2/00-ARCHITECTURE.md   # expect no output
grep -n "AGREES\|DEEPENS\|DIVERGES" docs/design/engine-v2/00-ARCHITECTURE.md | head -5   # expect matrix rows
```
Also confirm §1 contains no D-numbers or file paths (blank-page rule): `grep -n "D1[0-7]\|\.js" docs/design/engine-v2/00-ARCHITECTURE.md` — matches must all be in §2 or later.

- [ ] **Step 6: Update README row + commit**

Flip the 00 row from "Pending" to a one-line description in `README.md`.
```bash
git add docs/design/engine-v2/00-ARCHITECTURE.md docs/design/engine-v2/README.md
git commit -m "docs(engine-v2): 00-ARCHITECTURE — first-principles design, frozen-set reconciliation, Amendment Register"
```

---

### Task 3: `01-DECISION-HIERARCHY.md`

**Files:**
- Create: `docs/design/engine-v2/01-DECISION-HIERARCHY.md`
- Modify: `docs/design/engine-v2/README.md` (flip row)

**Interfaces:**
- Consumes: 00-ARCHITECTURE §1–§2 vocabulary.
- Produces: the 13 hierarchy levels with exact names later docs reuse: Athlete, Goals, Performance Outcomes, Adaptation Targets, Interventions, Training Block Objectives, Weekly Objectives, Session Objectives, Exercise Selection, Programming Variables, Progression, Review, Iteration.

**Required reading:** 00-ARCHITECTURE; `docs/foundation/DECISION-ONTOLOGY.md` (v1.1) §1 (the four structures — reasoning spine vs containment hierarchy is the central distinction; §1.4 Analysis Spine is where evidence, not decisions, travels), §3–§10 (entity families I–VIII); Constitution Arts 4–7; audit 03 §1.

- [ ] **Step 1: Write the hierarchy**

One section per level, all 13, in the brief's order. Per level: **Definition** (link the owning Ontology entity — one owner per concept), **The decision made here** (a coach's sentence), **Why this level exists** (what breaks without it — the spec demands nothing exists because "that's how gyms normally work"; if a level's only justification IS gym convention, say so and justify or restructure it), **Feeds / fed by** (adjacent levels), **Maps to** (pipeline stage D-number, D1–D17 — provisional until Task 4; Task 15 re-verifies).
Then a closing section "One spine, one containment": reconcile the 13 levels against Ontology §1.1 (reasoning spine) and §1.2 (containment) explicitly — each level belongs to exactly one structure; call out that Objectives are purpose-attributes of horizons, not entities (Ontology §7); for Review and Iteration, name their Analysis Spine touchpoints (Ontology §1.4 — evidence moving toward a decision via D17, distinct from the decisions themselves).

- [ ] **Step 2: Verify**

```bash
grep -c "PROPOSAL — working doc (T4)" docs/design/engine-v2/01-DECISION-HIERARCHY.md   # 1
grep -c "^#\+ " docs/design/engine-v2/01-DECISION-HIERARCHY.md   # ≥ 15 (13 levels + intro + closing)
grep -nE "\b(currently|not built yet)\b" docs/design/engine-v2/01-DECISION-HIERARCHY.md   # no output
```

- [ ] **Step 3: Update README row + commit**

```bash
git add docs/design/engine-v2/01-DECISION-HIERARCHY.md docs/design/engine-v2/README.md
git commit -m "docs(engine-v2): 01-DECISION-HIERARCHY — 13 justified levels mapped to the ontology"
```

---

### Task 4: `02-COACHING-PIPELINE.md` — the master orchestration model

**Files:**
- Create: `docs/design/engine-v2/02-COACHING-PIPELINE.md`
- Modify: `docs/design/engine-v2/README.md` (flip row)

**Interfaces:**
- Consumes: 00-ARCHITECTURE (layers), 01-DECISION-HIERARCHY (level names).
- Produces: **the stage-naming authority** — the definitive stage list (the ratified D1–**D17**, plus any proposed §20.1 admissions per Global Constraint 8) and per-stage IDs. Tasks 5–14 use these IDs verbatim.

**Required reading:** 00 + 01; EDS (v1.1) §20 (all SEVENTEEN decisions — every stage row must link its EDS entry; D17 Observation & Analysis is a family: signal derivation, trend & anomaly detection, benchmark comparison, squad roll-up, report assembly), §20.1 (the extension lane), §21 (the graph — D17 runs in the async band, insights forward-only) and the load-bearing D15/D16/D17 boundary note; TAS §4.1 (engine API), §5.3 (decision contracts `{value, confidence, rationale}`); KA §3.1 (confidence tiers gate/soft-input/display); Constitution conflict order; DAAS §2.4 (designate — the DECIDE link: how analytical outputs reach decisions; coordinate, don't re-own); audit 01 §3 (cohort map), audit 02 §2–§3.

- [ ] **Step 1: Write the pipeline overview**

"§1 The pipeline at a glance": ordered stage list (table: `ID | Name | One-line purpose | Hierarchy level (from 01)`), a Mermaid flow of the full pipeline including the planning pass, the runtime pass (D15 re-running construction stages over pending work), the async learning loop (D16 → priors → next pass), and the async analysis band (D17 → insights → next planning pass / D15 typed inputs / D16 evidence / reporting — never backward into a committed plan, per EDS §21). Mark where the constraint layer (06's subject) and the conflict-resolution pass sit.

- [ ] **Step 2: Write the per-stage specification**

"§2 Stage specifications": one subsection per stage — all seventeen, D17 specified at family level with its five ratified members named. EVERY stage gets ALL ten fields from the sprint brief, as a definition list:
**Purpose · Inputs · Knowledge Required** (name the knowledge domain(s) per KA §4 — detail lives in 04) **· Decision Rules · Outputs** (typed, with the `{value, confidence, rationale}` contract per TAS §5.3) **· Dependencies · Validation Rules · Failure Conditions** (what the stage does when inputs are missing/contradictory — never silence, per Art 15) **· Coach Override Capability** (overridable behind the seam / not overridable and why, per TAS §5.11) **· Confidence Level** (which tier the stage's output can occupy and what gates vs informs, per Art 13).
Where the EDS already specifies a decision's behaviour, the stage spec LINKS and adds only the operational fields the EDS leaves open (Global Constraint 6).

- [ ] **Step 3: Write the conflict-resolution pass**

"§3 The conflict order as code": specify the explicit resolution pass (spec §5 commitment): input = competing proposals/violations tagged with their constitutional tier; rule = higher tier wins absolutely, confidence modulates only within a tier (Constitution §conflict order); output = resolution record in the decision trace (feeds 08). Cite audit 02 §3 (the order exists nowhere as code — the winner is whichever line runs later).

- [ ] **Step 4: Verify**

```bash
grep -c "PROPOSAL — working doc (T4)" docs/design/engine-v2/02-COACHING-PIPELINE.md   # 1
for f in Purpose Inputs "Knowledge Required" "Decision Rules" Outputs Dependencies "Validation Rules" "Failure Conditions" "Coach Override" "Confidence Level"; do echo "$f: $(grep -c "$f" docs/design/engine-v2/02-COACHING-PIPELINE.md)"; done
```
Expected: each field count ≥ 17 (one per stage, D1–D17).

- [ ] **Step 5: Update README row + commit**

```bash
git add docs/design/engine-v2/02-COACHING-PIPELINE.md docs/design/engine-v2/README.md
git commit -m "docs(engine-v2): 02-COACHING-PIPELINE — full stage specification + explicit conflict-resolution pass"
```

---

### Task 5: `03-PERFORMANCE-MODEL.md`

**Files:**
- Create: `docs/design/engine-v2/03-PERFORMANCE-MODEL.md`
- Modify: `docs/design/engine-v2/README.md` (flip row)

**Interfaces:**
- Consumes: 00/01/02 (stage IDs for D1–D5).
- Produces: the adaptation-class names (Primary / Secondary / Supporting / Maintenance / Recovery) and the quality-vocabulary position later docs cite.

**Required reading:** 00–02; Ontology (v1.1) §1.3 (diagnostic triangle) + §1.4 (Analysis Spine) + §5 (diagnostic core family) + §10 (Family VIII — Assessment, Test Result, Match Performance, External Load Observation) + §13 (the additive-extension lane); Constitution Arts 1, 5, 6, 21; KA §2 (knowledge kinds — capability estimates are Inference/Prediction, not Calculation; Test Results are Stored Data, derived signals are Derived Data per the AQ-5 clarified doctrine); DAAS §2.1.2 (designate — assessment-battery mechanics live there); audit findings SR-02, SR-05, SR-09 (audit 07), B3 (audit 04), G1/G2/G3/G20 (audit 08).

- [ ] **Step 1: Write the model**

Sections: **§1 Performance, not volume** — the objective function in coaching terms (Art 1; the demand-weighted gap from Ontology §1.3), and what "optimise performance" means operationally at each of D4/D5/D11/D12. **§2 The quality vocabulary** — the physical-quality set V2 reasons over; resolve the truncation class (11 authored SKB qualities dropped incl. the strengthEndurance identity-mapping bug — SR-05/B3): V2 position = the demand vocabulary is open (SKB-authored qualities flow through with a `droppedDemands`-style honesty ledger during migration). **This question is now governed by the Ontology §13 additive lane**: new quality vocabulary is an additive extension (a versioned, dated entry under the fixed template — routine, batchable), NOT an amendment; only redefining an existing quality would be structural. Propose the §13 entries; do not open an AR row for vocabulary growth. **§3 The five adaptation classes** — define Primary/Secondary/Supporting/Maintenance/Recovery; per class: selection rule (which D5 outputs land there), dose policy inheritance, and interference posture (develop vs maintain, Ontology/EDS D6). **§4 How adaptations combine into sporting performance** — transfer reasoning: quality gains → demand-profile deltas → projected performance outcome; explicitly the falsifiable-hypothesis frame (Art 12); Match Performance (Ontology §10) is the ratified entity the transfer check reads. **§5 Measurement** — in Family VIII's ratified vocabulary, never invented terms: **Assessments** (versioned protocols, authored as knowledge) produce **Test Results** (Stored Data, ground truth); wearable/external observations enter as **External Load Observations**; per-quality estimator classes (logged performance, Test Results, priors by training age) each with a confidence treatment (KA §3.1); estimator-facing insights arrive via D17. Capture, battery scheduling, and provenance mechanics are DAAS-owned (§2.1, designate) — cite, don't re-specify. The additive rule stands: no new data ⇒ estimates unchanged (audit 10 Wave C gate). **§6 Age & sex physiology** — where modifiers enter (estimation, landmarks, dose) as knowledge entries, never code constants (SR-09/G20); developmental-stage rules are governed knowledge with the conservative default under Constitution Art 21.

- [ ] **Step 2: Verify**

```bash
grep -c "PROPOSAL — working doc (T4)" docs/design/engine-v2/03-PERFORMANCE-MODEL.md   # 1
grep -c "Primary\|Secondary\|Supporting\|Maintenance\|Recovery" docs/design/engine-v2/03-PERFORMANCE-MODEL.md   # ≥ 10
grep -nE "\b(currently|not built yet)\b" docs/design/engine-v2/03-PERFORMANCE-MODEL.md   # no output
```

- [ ] **Step 3: Update README row + commit**

```bash
git add docs/design/engine-v2/03-PERFORMANCE-MODEL.md docs/design/engine-v2/README.md
git commit -m "docs(engine-v2): 03-PERFORMANCE-MODEL — adaptation classes, open quality vocabulary, measurement"
```

---

### Task 6: `04-KNOWLEDGE-OWNERSHIP-MAP.md`

**Files:**
- Create: `docs/design/engine-v2/04-KNOWLEDGE-OWNERSHIP-MAP.md`
- Modify: `docs/design/engine-v2/README.md` (flip row)

**Interfaces:**
- Consumes: 02's stage table (its "Knowledge Required" fields are the rows to map).
- Produces: the ownership verdict per input; 13-VALIDATION-STRATEGY cites its "knowledge validation" hooks.

**Required reading:** 00–02; KA (v1.1) in full (§2 eight kinds incl. the clarified Stored/Derived Data pair + the dated-history permission, §3 entry shape + confidence, §4 twelve domains, §5 versioning); Constitution Arts 13, 17, 22; DAAS (designate) §1.3 (its eleven owned concepts), §1.4 (its non-ownership table — the pattern this map follows), §4 (Metric Dictionary + propagation rule); audit 05 (whole deliverable — the knowledge-usage census), TR-12 (audit 06), SR-07 (audit 07), G19 (audit 08).

- [ ] **Step 1: Write the map**

Sections: **§1 The rule** — engine consumes knowledge, never contains it (Art 17; KA §2.2 hard-coding test); the brief's nine sources (Scientific / Sport / Exercise / Recovery / Constraint / Athlete knowledge / Historical athlete data / Coach configuration / Engine logic) mapped onto KA §4's twelve domains (table showing the correspondence — KA owns the domain list; this doc only maps). **§2 Ownership per pipeline input** — the master table: for EVERY "Knowledge Required" entry in 02's seventeen+ stages: `Stage | Input | Owning domain (KA §4) or DAAS domain (designate) | Entry shape (KA §3.1) | Confidence tier | Version surface (KSV / SKB / priors)`. **Data-side inputs map to the DAAS's owned domains** (cite it as the designate owner; coordinate, don't re-own): capture streams and per-datum provenance/quality → DAAS §2.1; assessment batteries → DAAS §2.1.2; the longitudinal athlete record and historical athlete data → DAAS §3 (bound to Art 22 — athlete-owned, consent-based); metric definitions → the Metric Dictionary, DAAS §4.1; analysis knowledge (signal-derivation models, baselines, trend/anomaly rules, benchmarks — D17's knowledge inputs) → DAAS §2.3; the quality→confidence→authority propagation → DAAS §4.2. This map REGISTERS those rows against the DAAS and never re-derives their rules. **§3 The HOW-MUCH closure list** — the audit's bare-coefficient census given a target home, one row each, cited as of the audit pin: ~30 allocator shape literals (TR-12), `PATTERN_CONTRIB` fractional-set weights, `exerciseSimilarity` SIM matrix, `injuryTaxonomy` high_risk flags, `femaleRepBump`, duplicated readiness weights, sport-fact sets `D11_SPORTS`/`CATEGORY_LED`/`SSC_SPORTS` → SKB `meta` (audit 05 §4; SR-07). Rule: every coefficient that steers a decision becomes a governed entry with provenance, or is explicitly labelled a seed with an authority cap (Art 13). **§4 SKB activation map** — the 21 SKB sections each assigned: consumed by which V2 stage, or explicitly deferred (with the Stage-7/Team dependency named); the 4 no-op decisionRule effects made either real or rejected (audit 05 §2). **§5 What stays engine logic** — the short list that is legitimately code (decision rules operating ON knowledge, calculations, optimisation with stopping rules — KA §2 kinds 2/4), so "engine logic" is a bounded category, not a leak.

- [ ] **Step 2: Verify**

```bash
grep -c "PROPOSAL — working doc (T4)" docs/design/engine-v2/04-KNOWLEDGE-OWNERSHIP-MAP.md   # 1
grep -c "| D1" docs/design/engine-v2/04-KNOWLEDGE-OWNERSHIP-MAP.md   # ≥ 5 (stage rows present)
grep -n "02f6184" docs/design/engine-v2/04-KNOWLEDGE-OWNERSHIP-MAP.md | head -2   # audit-pin frame present in §3
```

- [ ] **Step 3: Update README row + commit**

```bash
git add docs/design/engine-v2/04-KNOWLEDGE-OWNERSHIP-MAP.md docs/design/engine-v2/README.md
git commit -m "docs(engine-v2): 04-KNOWLEDGE-OWNERSHIP-MAP — every pipeline input owned; HOW-MUCH closure list; SKB activation"
```

---

### Task 7: `05-SESSION-BUILDER.md`

**Files:**
- Create: `docs/design/engine-v2/05-SESSION-BUILDER.md`
- Modify: `docs/design/engine-v2/README.md` (flip row)

**Interfaces:**
- Consumes: 02 (stage IDs D9–D13), 03 (adaptation classes), 06-CONSTRAINT-ENGINE's contract (written in parallel — reference it as "the constraint envelope from 06" without duplicating its content).
- Produces: the construction-flow step names 13-VALIDATION-STRATEGY tests against.

**Required reading:** 00–02, 03 if landed; EDS §20 D9–D13; Constitution Arts 6, 7; Ontology §6 (intervention family); audit 03 §3–§4, B2/B8/B10 (audit 04), SR-14 (audit 07).

- [ ] **Step 1: Write the builder**

Sections follow the brief's flow exactly: **§1 Today's coaching objective** (D9: one named purpose; where it comes from — weekly objective + constraint envelope). **§2 Primary adaptation → primary intervention** (D10 movement requirements before any exercise name; D11 value-ordered selection: transfer-per-fatigue, stopping rule, "stop and bank spare time" — Art 7). **§3 Supporting interventions and accessory work** — supporting = serves the session objective or a Maintenance/Recovery class from 03; accessory admitted ONLY with a named rationale (the anti-filler rule: nothing enters to fill time or a muscle quota). **§4 Recovery constraints** — fatigue budget per session; CNS-demand ordering; interference posture within the session. **§5 Dose** (D12: smallest sufficient dose per intervention, readiness-scaled volume AND intensity; context-aware iso/core dosing replacing fixed 3×12 — SR-14). **§6 Validation** (hand-off to D14: volume ledger as the guardrail — MRV gate + MEV floor as CHECKS after decisions, cited to Art 6; the session never starts from a volume target, cited against B2's frame inversion). **§7 The final session** — the artefact shape: ordered items each carrying `{intervention, dose, rationale, objective-link, confidence}` so 08's trace has per-item material. Include one Mermaid diagram of the §1→§7 flow.

- [ ] **Step 2: Verify**

```bash
grep -c "PROPOSAL — working doc (T4)" docs/design/engine-v2/05-SESSION-BUILDER.md   # 1
grep -n "volume" docs/design/engine-v2/05-SESSION-BUILDER.md | grep -icE "target|drive" # review hits manually: volume must only validate
```

- [ ] **Step 3: Update README row + commit**

```bash
git add docs/design/engine-v2/05-SESSION-BUILDER.md docs/design/engine-v2/README.md
git commit -m "docs(engine-v2): 05-SESSION-BUILDER — objective-first construction; volume validates, never drives"
```

---

### Task 8: `06-CONSTRAINT-ENGINE.md`

**Files:**
- Create: `docs/design/engine-v2/06-CONSTRAINT-ENGINE.md`
- Modify: `docs/design/engine-v2/README.md` (flip row)

**Interfaces:**
- Consumes: 02 (where the constraint pass sits in the pipeline).
- Produces: the "constraint envelope" contract 05 references; the constraint taxonomy 13 tests against.

**Required reading:** 00–02; Constitution Arts 2, 8, 9, 10; Ontology (v1.1) §8 (Constraint, Injury, Load/Fatigue/Recovery/Readiness) + §10 (Family VIII — the ratified observation vocabulary: Test Result, Match Performance, External Load Observation, Insight); EDS D17 (readiness/load state are D17-derived signals, consumed as typed inputs — never computed ad hoc in the constraint layer); audit TR-04 (audit 06), SR-03/SR-04 (audit 07), G12/G14/G15 (audit 08); `docs/product/TEAM-ARCHITECTURE.md` (coach constraints only — skim).

- [ ] **Step 1: Write the constraint engine**

Sections: **§1 Constraints resolve before construction** — the ordering argument (why injury-blind baseline construction + render backstop produced the empty-rehab defect class, TR-04/SR-03; the V2 inversion: the builder receives a pre-resolved envelope and can never propose into forbidden space). **§2 The taxonomy** — all 13 kinds from the brief (Sport Calendar, Competition Schedule, Training Availability, Equipment, Mobility, Injuries, Pain, Recovery, Readiness, Travel, Lifestyle, Coach Constraints, Environmental), each classified `HARD VETO` (removes options) / `SHAPING` (transforms requirements) / `SOFT PENALTY` (weighs in optimisation), with its knowledge owner (link 04) and its constitutional tier for conflicts. **§3 The envelope contract** — what the resolved output contains (allowed patterns/equipment/days, per-session fatigue ceilings, per-region loading caps, substitution directives), typed, with `{value, confidence, rationale}`. **§4 Injury handling redesign** — triage → constraint set → rehab construction as a first-class session objective (visible to every validator — never a filtered-out discipline); the unservable case (no safe session exists) surfaces as an explicit outcome per Art 15, never an empty session; return-to-play progression hook (link 07). **§5 Readiness and single-observation discipline** — the constraint layer CONSUMES, in ratified vocabulary, what measurement and analysis produce: readiness/load state arrive as D17-derived signals (typed `{value, confidence, rationale}` inputs), raw observations are Family VIII entities (External Load Observation, Test Result — Ontology §10), and no measurement term is invented here; trend over single observation, recency gates, confidence-weighted authority (SR-04/G15; the ACWR demotion generalised — SR-08). **§6 Equipment never rewrites the goal** — constraint output may narrow means, never substitute the athlete's goal (Art 3; the audit's silent-demotion finding, audit 01 §7).

- [ ] **Step 2: Verify**

```bash
grep -c "PROPOSAL — working doc (T4)" docs/design/engine-v2/06-CONSTRAINT-ENGINE.md   # 1
grep -c "HARD VETO\|SHAPING\|SOFT PENALTY" docs/design/engine-v2/06-CONSTRAINT-ENGINE.md   # ≥ 13
```

- [ ] **Step 3: Update README row + commit**

```bash
git add docs/design/engine-v2/06-CONSTRAINT-ENGINE.md docs/design/engine-v2/README.md
git commit -m "docs(engine-v2): 06-CONSTRAINT-ENGINE — pre-construction envelope, 13-kind taxonomy, injury redesign"
```

---

### Task 9: `07-PROGRESSION.md`

**Files:**
- Create: `docs/design/engine-v2/07-PROGRESSION.md`
- Modify: `docs/design/engine-v2/README.md` (flip row)

**Interfaces:**
- Consumes: 02 (D12/D15/D16 stage IDs), 03 (adaptation classes).
- Produces: the eight progression levels 13 tests against.

**Required reading:** 00–02, 03 if landed; Constitution Arts 7, 12, 16, 21 (the LTAD level is now constitutionally owned — developmental stage shapes every prescription, stage rules are governed knowledge, conservative default where evidence is thin); EDS (v1.1) §20 D7/D12/D15/D16/D17 (incl. the D15/D16/D17 boundary — an insight describes the data, a prior parameterises future decisions); audit SR-01/SR-10/SR-11/SR-12 (audit 07), G9/G13 (audit 08), audit 10 §5 (progression is Simon decision point #1).

- [ ] **Step 1: Write the progression architecture**

Sections: **§1 Progression is the product of the plan** — a plan whose week 6 equals week 5 is a failed hypothesis (Art 12); the audit's most critical scientific finding as motivation (SR-01: within-phase loads bit-identical for non-logging athletes). **§2 The eight levels** — one subsection each: Adaptation (dose-response continuation vs saturation), Exercise (load/rep/tempo/exercise-variant advancement incl. double progression and programmed ramps to near-maximal work — SR-10), Weekly (microcycle wave), Mesocycle (accumulate→intensify→realise or discipline-appropriate), Block (objective handover between blocks), Season (SKB season phases), Annual (macro review), LTAD (training-age band transitions — bounded by Constitution Art 21: maturation-stage gating and the conservative default are governed knowledge, and long-term development outranks any short-term adaptation). Per level: the driver signal (logged performance / estimated creep for non-loggers / readiness trend / block outcome — trend signals arriving as D17 insights, in Family VIII vocabulary), the decision owner (stage ID), and the fallback when the driver signal is absent (the non-logging athlete MUST still progress — estimator-driven creep with honest confidence labelling). **§3 Regression and holding** — progression is bidirectional: deload, hold, and rebuild rules; freeze-on-start never violated. **§4 Review & iteration** — block check-in → outcome record → D17 interprets the block's data (insights, incl. re-diagnosis triggers) → D16 prior update → next block reads priors (the learning loop closes the audit's fourth verb, with the D15/D16/D17 boundary honoured); what is measured at review (prescribed vs actual, per KA §2: outcomes are Stored Data, insights are attributed Derived Data, priors are Predictions). **§5 Not "add weight or sets"** — explicit anti-reduction statement: each level has its own progression currency (skill complexity, density, ROM, position, autonomy), cited to the brief.

- [ ] **Step 2: Verify**

```bash
grep -c "PROPOSAL — working doc (T4)" docs/design/engine-v2/07-PROGRESSION.md   # 1
grep -cE "^#+ .*(Adaptation|Exercise|Weekly|Mesocycle|Block|Season|Annual|LTAD|Long-term)" docs/design/engine-v2/07-PROGRESSION.md   # ≥ 8
```

- [ ] **Step 3: Update README row + commit**

```bash
git add docs/design/engine-v2/07-PROGRESSION.md docs/design/engine-v2/README.md
git commit -m "docs(engine-v2): 07-PROGRESSION — eight-level progression architecture with non-logging fallbacks"
```

---

### Task 10: `08-EXPLAINABILITY.md`

**Files:**
- Create: `docs/design/engine-v2/08-EXPLAINABILITY.md`
- Modify: `docs/design/engine-v2/README.md` (flip row)

**Interfaces:**
- Consumes: 02 (the decision-trace contract each stage emits), 05 §7 (per-item rationale shape).
- Produces: the trace/read-model design 09 (AI narration) and 13 (trace tests) build on.

**Required reading:** 00–02; Constitution Arts 14, 15; TAS §4.1 (`explain()` read-model + decision trace + provenance stamp); audit 03 §5 (the prescription/adjustment asymmetry), TR-02 (invisible D14 report), G16 (audit 08), audit 02 Art 14 scoring.

- [ ] **Step 1: Write the explainability layer**

Sections: **§1 The principle** — the explanation IS the reasoning: one source (the decision trace each stage already emits under its `{value, confidence, rationale}` contract), rendered — never a parallel story that can drift (Art 14; "the explanation system should use the same reasoning as the engine itself", sprint brief). **§2 The six questions** — table mapping each (Why? Why now? Why this exercise? Why this progression? Why this order? Why this adaptation?) to the trace node(s) that answer it (stage IDs from 02) and the surface where it renders. **§3 Explanation at prescription** — every prescribed item carries its why at delivery time, closing the audit's trust gap ("explains at the moment of adjustment, not prescription" — audit 03 §5); adjustment explanations (reflow annotations) remain and are cited as the pattern to generalise. **§4 Honesty rules** — never render reasoning that did not steer (display-honesty gate); every trim/veto/deferral surfaces (Art 15 — the silent list must be empty or rendered, audit 10 §6); confidence shown in coach-honest language (what's known vs assumed, Art 16). **§5 The read-model** — `explain()` as a pure projection of the trace (TAS §4.1); audience tiers (athlete-facing plain language / coach-facing full trace / AI-narration input per 09); the validation report as a first-class renderable (TR-02: a report nothing displays protects nobody). **§6 Trace lifecycle** — provenance stamp (`engineVersion × knowledgeSetVersion`), persistence with the plan hypothesis, reproducibility by pinning (TAS §5.12).

- [ ] **Step 2: Verify**

```bash
grep -c "PROPOSAL — working doc (T4)" docs/design/engine-v2/08-EXPLAINABILITY.md   # 1
grep -c "Why" docs/design/engine-v2/08-EXPLAINABILITY.md   # ≥ 6
```

- [ ] **Step 3: Update README row + commit**

```bash
git add docs/design/engine-v2/08-EXPLAINABILITY.md docs/design/engine-v2/README.md
git commit -m "docs(engine-v2): 08-EXPLAINABILITY — the decision trace rendered; explanation at prescription"
```

---

### Task 11: `09-AI-BOUNDARIES.md`

**Files:**
- Create: `docs/design/engine-v2/09-AI-BOUNDARIES.md`
- Modify: `docs/design/engine-v2/README.md` (flip row)

**Interfaces:**
- Consumes: 02 (substitutable stages), 08 (trace as AI input).
- Produces: the V2 AI-touchpoint list 13's coach-acceptance tests reference.

**Required reading:** 00–02, 08 if landed; `docs/architecture/AIGAS.md` (ratified 2026-07-13 — frozen; cite as canonical, not draft) §2–§6, §11 (C1–C9), §13 (prohibitions); EDS D17 (its AI-seam note — family members are substitutable behind the D17 contract); DAAS §2.3.4 + §7.4 (designate — the AI grounding surface and narration rules for analytical content); Constitution Art 18; TAS §5.13.

- [ ] **Step 1: Write the boundaries**

Sections: **§1 The stance** — AI proposes, never disposes; AI owns form, engine owns content, human owns the final call (AIGAS §4 — link, don't restate). **§2 What AI may do in V2** — the brief's seven verbs (explain, summarise, educate, report, coach conversationally, surface insights, interpret trends) each mapped to: the AIGAS capability category (C1–C9), its seam (or "outside both seams — pure rendering"), its gate, and its V2 input (e.g. narration consumes 08's trace, trace-grounded per AIGAS §7). **§3 What AI must not do** — the brief's four prohibitions (choose adaptations, override coaching logic, invent programming, replace deterministic decisions) mapped to AIGAS §13's absolute prohibitions; state that V2 adds NO new AI authority. **§4 The two seams in the V2 pipeline** — Seam 1 decision substitution: which V2 stage IDs are substitution candidates (the EDS/AIGAS-named D4/D5/D11, plus D17 family members behind the D17 contract per EDS §20), the invariant sequence (deterministic result always computed and standing; async proposal; D14 gates; AI never the last word); Seam 2 knowledge/priors: AI-drafted entries behind human scientific review; priors via the learning loop only. **§5 Confidence** — self-graded AI confidence is never trusted; authority earned via validation + track record (AIGAS §13.4/§16).

- [ ] **Step 2: Verify**

```bash
grep -c "PROPOSAL — working doc (T4)" docs/design/engine-v2/09-AI-BOUNDARIES.md   # 1
grep -c "Seam" docs/design/engine-v2/09-AI-BOUNDARIES.md   # ≥ 4
```

- [ ] **Step 3: Update README row + commit**

```bash
git add docs/design/engine-v2/09-AI-BOUNDARIES.md docs/design/engine-v2/README.md
git commit -m "docs(engine-v2): 09-AI-BOUNDARIES — verbs, prohibitions, and the two seams in the V2 pipeline"
```

---

### Task 12: The migration set — `10-MIGRATION-ARCHITECTURE.md`, `11-MIGRATION-PHASES.md`, `12-MODULE-DEPENDENCY-DIAGRAM.md`

One task, three files — they share the dependency spine and must not drift from each other.

**Files:**
- Create: `docs/design/engine-v2/10-MIGRATION-ARCHITECTURE.md`
- Create: `docs/design/engine-v2/11-MIGRATION-PHASES.md`
- Create: `docs/design/engine-v2/12-MODULE-DEPENDENCY-DIAGRAM.md`
- Modify: `docs/design/engine-v2/README.md` (flip three rows)

**Interfaces:**
- Consumes: ALL of 00–09 (each migration phase names the V2 doc it implements).
- Produces: phase IDs (`M0`, `M1`, …) that 13-VALIDATION-STRATEGY attaches gates to.

**Required reading:** 00–09; audit 10 IN FULL (the DRAFT waves A–F blueprint — this task HARDENS it, never reinvents; where these docs and the draft differ, say why); audit 08 (G-table + "reading the table"), audit 09 (ranked backlog, 🔒 markers), audit 06 TR-03/TR-07/TR-08; `docs/architecture/MIGRATION-BLUEPRINT.md` (the earlier platform blueprint — check for conflicts, reference if live); `docs/DEVELOPMENT-PLAN.md` §3 (Phase 0 — Wave A landed), §6 (Phase 3 — the adopting frame these phases feed) and §8 (gates); HANDOFF.md open queue (current Phase 0/1 landing state).

- [ ] **Step 1: Write `10-MIGRATION-ARCHITECTURE.md`**

Sections: **§1 Verdict and stance** — operational completion, not a rebuild (audit 03 §7 / 10 §1); the four verbs + one retirement as the organising frame; migration invariants verbatim-in-spirit from audit 10 §1 (pure core stays pure; every phase golden-master-gated with re-baselines audited key-by-key; validators land report-only and promote by flag; frozen docs never edited; each phase ships athlete value alone). **§2 Module boundaries** — the target V2 module set (from 00/02): named modules with one-line responsibility, the boundary rule (independently testable, independently replaceable), and the mapping `current file(s) → V2 module` for the hot zone as of the audit pin (the 1,253-line allocator splits along the D11/D12/D13 boundaries — TR-07; the parallel D9/D10 session layer becomes THE path; one selection engine — TR-08). **§3 Disposition table** — survives-unchanged / survives-modified / redesigned / removed, from audit 10 §2, updated where docs 03–09 sharpened the shape. **§4 Risks** — top risks with mitigations (behaviour-change-during-re-seat → byte-identity extractions; golden-master blind spots → archetype-matrix extension first, citing TR-05/TR-01; cohort regressions during legacy retirement → cohort-rescue acceptance tests). **§5 Rollback strategy** — per-phase: flags default-off, re-baseline reverts, module-level revertability (independently replaceable cuts blast radius). **§6 Acceptance criteria** — the audit 10 §6 measurable targets embedded verbatim as the migration's definition of done, plus the sprint brief's success criteria.

- [ ] **Step 2: Write `11-MIGRATION-PHASES.md`**

The phase sequence: adopt waves A–F as phases `M1`–`M6` (keep a table mapping wave letter → phase ID so the audit remains cross-referenceable), plus **`M0` — the test net** (archetype-matrix extension covering armed-prod paths TR-05, expected-delta notes on re-baselines closing the TR-01 class, engine-own suite seed — TR-11) which the audit's spine implies but does not number. **Wave A is landed history**: DEVELOPMENT-PLAN Phase 0 executed it (P0-1..P0-7 + follow-ups, PRs #173/#174) — `M1` records the landed state and any residuals as its starting point rather than re-planning the work, and every later phase baselines against post-Wave-A main. Data-pillar phases (history store, measurement capture) execute against the DAAS's shapes (designate — its §1.5 ratify-or-supersede dispositions and §3 record design), per governance audit 09 §5's ordering warning. Per phase: **Objective · Backlog items (P-IDs from audit 09) · Entry gate · Exit gate (measurable) · Independently shippable value · Rollback · 🔒 Simon decision points** (place all ten from audit 10 §5 in their phases; mark any Phase 0/1 already settled as SETTLED with their evidence). Close with the sequencing rules: never re-seat and change behaviour at once; one substrate unlocks three ambitions (G13/G18/G21 as one design); the gate is now DEVELOPMENT-PLAN §5.3 — no M-phase starts before Simon ratifies this set as the implementation blueprint (which supersedes the audit's DRAFT waves as the build order).

- [ ] **Step 3: Write `12-MODULE-DEPENDENCY-DIAGRAM.md`**

Two Mermaid diagrams + a legend: (1) the V2 module graph — modules from 10 §2, edges = typed dependencies (who consumes whose output), the knowledge domains drawn as a separate rank feeding stages, constraint envelope feeding construction, trace feeding explain; (2) the migration dependency spine — phases M0–M6 with their gate dependencies (from audit 10 §4: A → {B → F; C; test-net} → D → E → Team/AI/Stage-7). Every node in diagram 1 must appear in 10 §2's module table (Task 15 checks this).

- [ ] **Step 4: Verify**

```bash
for f in 10-MIGRATION-ARCHITECTURE 11-MIGRATION-PHASES 12-MODULE-DEPENDENCY-DIAGRAM; do grep -c "PROPOSAL — working doc (T4)" docs/design/engine-v2/$f.md; done   # 1 each
grep -c '```mermaid' docs/design/engine-v2/12-MODULE-DEPENDENCY-DIAGRAM.md   # ≥ 2
grep -c "M0\|M1\|M2\|M3\|M4\|M5\|M6" docs/design/engine-v2/11-MIGRATION-PHASES.md   # ≥ 7
grep -n "02f6184" docs/design/engine-v2/10-MIGRATION-ARCHITECTURE.md | head -2   # audit-pin frame present
```

- [ ] **Step 5: Update README rows + commit**

```bash
git add docs/design/engine-v2/10-MIGRATION-ARCHITECTURE.md docs/design/engine-v2/11-MIGRATION-PHASES.md docs/design/engine-v2/12-MODULE-DEPENDENCY-DIAGRAM.md docs/design/engine-v2/README.md
git commit -m "docs(engine-v2): migration set — architecture, phases M0–M6, dependency diagrams (hardens audit blueprint)"
```

---

### Task 13: `13-VALIDATION-STRATEGY.md`

**Files:**
- Create: `docs/design/engine-v2/13-VALIDATION-STRATEGY.md`
- Modify: `docs/design/engine-v2/README.md` (flip row)

**Interfaces:**
- Consumes: 10/11/12 (module set + phase IDs), 02 (per-stage validation rules), 04 (knowledge validation hooks), 06 (constraint taxonomy), 07 (progression levels).

**Required reading:** 00–12; Constitution Arts 13, 19; EDS validator material referenced from 02; audit TR-11 (audit 06), G22 (audit 08), audit 10 §6; `apps/mobile/tests/golden-master.js` header comments + `run-all.mjs` (mechanics only, as of the audit pin).

- [ ] **Step 1: Write the strategy**

Sections: **§1 Per-module validation** — a table covering EVERY module in 10 §2: `Module | Expected behaviour (one sentence) | Inputs | Outputs | Test classes that apply`. **§2 Golden athlete tests** — the archetype matrix as the migration's spine: current coverage as of the audit pin, the extension set (armed-D7 athletes with recoverability priors, injured athletes incl. the five bare rehab regions, measured-vs-prior athletes, each legacy-rescue cohort: triathlon / zero-gap run-cycle / code-less GAA), and the re-baseline discipline (UPDATE=1 only deliberate; every re-baseline carries an expected-delta note; archetype-scoped — the TR-01 recurrence guard). **§3 Knowledge validation** — validate-on-load at every registry; the `validate:knowledge` gate (G19); KSV ratchet (any science-table edit bumps KNOWLEDGE_SET_VERSION); provenance completeness checks (no fabricated evidence — KA §3). **§4 Scientific validation** — per-quality dose-response sanity ranges; confidence-tier authority tests (contested science can never hard-gate — Art 13); progression-sanity and dose-coherence validators (the Wave-B net from audit 10). **§5 Regression** — golden master + injury-classification pin + knowledge-set ratchet, plus the new property classes: reflow≡baseline when nothing changed, cross-runtime determinism, additive-measurement byte-identity ("no new data ⇒ byte-identical plan"). **§6 Performance benchmarks** — plan-generation latency budget on client hardware (the engine runs on client AND server — TAS §4.1); trace/explain projection cost bounded. **§7 Coach acceptance tests** — scenario scripts phrased as coaching judgements ("a returning athlete after 3 weeks off is NOT flagged overtraining"; "an in-season rugby player's heavy spinal work is capped the week of a match"; "a non-logging athlete's week 6 differs from week 5"; "every prescribed item can answer its six questions from 08") — each mapped to the phase (M-ID) that must make it pass. **§8 Validation of the validators** — false-positive budget measured during report-only periods before any validator promotes to gate (audit 10 Wave D).

- [ ] **Step 2: Verify**

```bash
grep -c "PROPOSAL — working doc (T4)" docs/design/engine-v2/13-VALIDATION-STRATEGY.md   # 1
grep -c "M[0-6]" docs/design/engine-v2/13-VALIDATION-STRATEGY.md   # ≥ 5 (phases wired)
```

- [ ] **Step 3: Update README row + commit**

```bash
git add docs/design/engine-v2/13-VALIDATION-STRATEGY.md docs/design/engine-v2/README.md
git commit -m "docs(engine-v2): 13-VALIDATION-STRATEGY — per-module, golden-athlete, knowledge, scientific, regression, coach acceptance"
```

---

### Task 14: Repository Atlas — architecture section update

**Files:**
- Modify: `docs/architecture-atlas/01-ARCHITECTURE-ATLAS.md` (architecture section ONLY)

**Interfaces:**
- Consumes: 00-ARCHITECTURE, 12-MODULE-DEPENDENCY-DIAGRAM.

**Required reading:** the atlas file in full first (respect its own conventions, headers, and status banner); `docs/architecture-atlas/README.md`; 00 and 12.

- [ ] **Step 1: Read, then edit the architecture section only**

Read the whole atlas. In its architecture section (locate the section describing engine/platform architecture — do not restructure the document), add a clearly-bounded subsection "Decision Engine V2 (proposal)" that: states the V2 proposal set exists at `docs/design/engine-v2/` (dated 2026-07-14, T4, not adopted — adoption is DEVELOPMENT-PLAN §5.3); gives a 5–10 line summary of the target architecture (from 00 §2) and one compact Mermaid module diagram (a reduced version of 12's diagram 1); and links the set's README. It must NOT claim any V2 element is built (Global Constraint 5) and must not alter existing atlas content beyond this insertion (plus the atlas's own index/table-of-contents if it maintains one).

- [ ] **Step 2: Verify**

```bash
git diff --stat docs/architecture-atlas/   # ONLY 01-ARCHITECTURE-ATLAS.md changed
grep -n "engine-v2" docs/architecture-atlas/01-ARCHITECTURE-ATLAS.md | head -3   # links present
grep -nE "\b(built|implemented|live)\b" docs/architecture-atlas/01-ARCHITECTURE-ATLAS.md | grep -i "v2"   # review: no build claims about V2
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture-atlas/01-ARCHITECTURE-ATLAS.md
git commit -m "docs(engine-v2): atlas architecture section — V2 proposal pointer + summary diagram"
```

---

### Task 15: Whole-set consistency + adversarial review pass

**Files:**
- Modify: any `docs/design/engine-v2/*.md` needing fixes (inline; no new docs)

**Interfaces:**
- Consumes: everything. This is the gate before HANDOFF/PR.

- [ ] **Step 1: Mechanical checks**

```bash
ls docs/design/engine-v2/ | wc -l                                    # 15 (14 docs + README)
grep -L "PROPOSAL — working doc (T4)" docs/design/engine-v2/*.md      # only README allowed to differ in title; expect empty or README.md
grep -rnE "\b(currently|not built yet|already implemented)\b" docs/design/engine-v2/ # every hit must be inside an audit-pin frame; fix the rest
grep -c "Pending" docs/design/engine-v2/README.md                     # 0
git diff main --stat -- packages/ apps/ supabase/ docs/foundation/ docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md docs/architecture/TAS.md docs/architecture/AIGAS.md   # EMPTY — no code, no frozen edits (the frozen six)
```

- [ ] **Step 2: Cross-document consistency review**

Read all 14 docs end-to-end in reading order and fix inline: (a) stage IDs everywhere match 02's table verbatim (D1–D17 only; any new pass appears solely as a proposed §20.1 admission named in 02 — zero `V2-P` strings anywhere: `grep -rn "V2-P" docs/design/engine-v2/` must be empty); (b) hierarchy level names match 01; (c) adaptation classes match 03; (d) module names in 10/12/13/atlas match each other node-for-node; (e) phase IDs M0–M6 match between 11 and 13; (f) every relative link resolves (`grep -oE '\]\([^)#]+' docs/design/engine-v2/*.md` and check each target exists); (g) every AR-n cited in 03–13 exists in 00 §4, and no AR-n re-queues anything the 2026-07 batch landed; (h) no doc restates frozen-set or DAAS content it should link (spot-check the heaviest offender candidates: 02 vs EDS §20, 09 vs AIGAS, 04 vs DAAS §1.3); (i) measurement/observation terms everywhere are Family VIII's ratified names (Assessment, Test Result, Match Performance, External Load Observation, Insight, Squad Signal, Report) — no invented synonyms; (j) every DAAS citation carries the designate marker.

- [ ] **Step 3: Adversarial review against the spec**

Dispatch a fresh reviewer (or review with fresh eyes) with ONLY the sprint spec §4 (grounding rules) + §7 (success criteria) and the 14 docs. The reviewer answers: Is every §5 commitment designed in full somewhere? Does every coaching decision have a clear owner? Could a skilled engineer start M0 tomorrow without an architectural question? Are citations real (spot-check 10 random G/TR/SR/B and Article/§ citations against their source files)? Fix every finding inline.

- [ ] **Step 4: Commit**

```bash
git add docs/design/engine-v2/
git commit -m "docs(engine-v2): whole-set consistency + adversarial review fixes"
```

---

### Task 16: HANDOFF + DOCUMENTATION-INDEX + PR

**Files:**
- Modify: `HANDOFF.md`
- Modify: `docs/DOCUMENTATION-INDEX.md`

- [ ] **Step 1: Update `docs/DOCUMENTATION-INDEX.md`**

Read the index's own conventions first. Add `docs/design/engine-v2/` (one entry for the set with class WORKING/T4 + pointer to its README, or per-file rows if the index's convention is per-file — follow whichever the file already does). Add the spec + plan under their existing superpowers sections if the index tracks those.

- [ ] **Step 2: Update `HANDOFF.md`**

Add to "Where the platform stands": Phase 2 §5.2 delivered (date, branch/PR ref): the Decision Engine V2 proposal set at `docs/design/engine-v2/` (14 docs + atlas pointer), designed first-principles and reconciled against the amended v1.1 set, Amendment Register queued (n NEW entries; additive §13/§20.1 candidates listed separately), migration hardened to phases M0–M6 from the post-Wave-A baseline. Update the open queue: next gate is DEVELOPMENT-PLAN §5.3 — Simon ratifies the V2 set as the implementation blueprint (superseding the audit's DRAFT waves as the build order), which opens Phase 3.

- [ ] **Step 3: Full-suite sanity + push + PR**

```bash
npm test          # expect 196/196 — docs-only branch, proves nothing broke by accident
npm run lint      # CI runs this too; must be clean
git add HANDOFF.md docs/DOCUMENTATION-INDEX.md && git commit -m "docs(engine-v2): HANDOFF + documentation index — Phase 2 V2 design set delivered"
git push -u origin <execution-branch>
gh pr create --title "docs(design): Phase 2 — Decision Engine V2 architecture & migration design (15 deliverables)" --body "<summary per repo convention: what the set is, the re-scoped premises (v1.1 set, D17, §20.1/§13 lanes, DAAS designate), deliverable table, Amendment Register count (NEW divergences only), next gate = DEVELOPMENT-PLAN §5.3 blueprint ratification>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 4: STOP — Simon merges**

This PR is direction-setting: it PAUSES for Simon regardless of green checks (standing charter; spec §6.4). Report the PR link and the Amendment Register contents in the handoff message.
