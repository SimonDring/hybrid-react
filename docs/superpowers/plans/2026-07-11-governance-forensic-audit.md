# Governance Forensic Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the ten-deliverable forensic audit of the governing documentation (`docs/reviews/2026-07-11-governance-audit-00…09`) judging it against a first-principles, end-state benchmark for a best-in-class elite S&C platform, per `docs/superpowers/specs/2026-07-11-governance-forensic-audit-design.md`.

**Architecture:** Benchmark-first: deliverable 00 fixes the yardstick and PAUSES for Simon's review; the seven per-document audits then fan out in parallel (each self-contained: one document vs the benchmark); the data-&-analytics deep-dive (08) synthesises their raw material; the verdict + register (09) closes; an adversarial review pass gates the PR.

**Tech Stack:** Markdown, git. Branch: `governance-audit-2026-07-11` (exists; spec at tip). Docs-only — no production code, no V2-plan execution (that branch stays parked).

## Global Constraints

Every task implicitly includes ALL of these (from the spec §5 + repo governance).

1. **Banner (verbatim, top of every deliverable, after the H1):**
   ```markdown
   **Class: REVIEW (T5) · dated evidence, never current state · 2026-07-11**
   **Pin: frozen set v1.0 (2026-07-01) · `main @ fc5e3f8` · KSV 1.30.0**
   **Spec: [`docs/superpowers/specs/2026-07-11-governance-forensic-audit-design.md`](../superpowers/specs/2026-07-11-governance-forensic-audit-design.md) · Benchmark: [`…-00-benchmark.md`](2026-07-11-governance-audit-00-benchmark.md)**
   ```
   (00 itself omits the Benchmark link.)
2. **No frozen document is edited — ever.** Findings queue; they never fix inline. Also untouched: `packages/`, `apps/`, `supabase/`, and the parked branch `engine-v2-design-2026-07-11`.
3. **Verdict scale (exact tokens):** `WORLD-CLASS` / `ADEQUATE` / `THIN` / `SILENT` / `PRECLUDES`. Every SILENT/PRECLUDES verdict states *what breaks*, *when it bites* (product stage), and *absorbable without amendment? yes/no + why*.
4. **Finding classes (exact tokens):** `COVERED` / `SPEC-FILLABLE` / `AMENDMENT CANDIDATE` / `NEW-DOCUMENT CANDIDATE`.
5. **Finding IDs:** `GA-<block><nn>`, blocks pre-allocated so parallel tasks never collide: Constitution GA-1xx · Ontology GA-2xx · Knowledge Architecture GA-3xx · EDS GA-4xx · TAS GA-5xx · AIGAS GA-6xx · Doc-governance GA-7xx · Data-pillar deep-dive GA-8xx. Deliverable 09 mints NO new IDs — it aggregates.
6. **Citations:** benchmark lines by capability ID (`P2.4`); governing docs by exact Article/§ (`Constitution Art 5`, `EDS §25`, `TAS §4.1`, `KA §4`, `AIGAS §11`, `Ontology §8`); evidence docs by path + §; Sprint 2 evidence by finding ID + deliverable (`TR-03; engine-audit 06`) — engine-audit citations are EVIDENCE of a governance gap, never findings themselves (spec §5.7).
7. **Honest in both directions** (spec §5.4): WORLD-CLASS verdicts are findings too (class COVERED, listed in 09). Do not manufacture problems.
8. **No current-status claims** beyond the pin frame; status lives in HANDOFF.md.
9. **Commits:** one per task, `docs(reviews): governance audit <nn> — <what>`, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
10. **Required reading for EVERY task:** the spec (§3 method, §5 grounding rules) + the task's own list. Tasks 3–11 must read `docs/reviews/2026-07-11-governance-audit-00-benchmark.md` in full before writing anything.
11. **Per-document audit structure (Tasks 2–8 all use EXACTLY these seven sections):**
    - **§1 Role and owned slices** — what this document is FOR, and the capability IDs it owns per 00 §3.
    - **§2 Coverage table** — one row per owned capability: `Capability | Verdict (constraint 3) | Cited Article/§ | Reasoning (1–3 sentences)`. SILENT/PRECLUDES rows additionally carry: what breaks · when it bites (stage) · absorbable without amendment? yes/no + why.
    - **§3 What is world-class here** — the honest positives, with citations (these become COVERED findings).
    - **§4 Findings** — every non-WORLD-CLASS row from §2 (and any WORLD-CLASS worth recording) as GA entries in the task's ID block: `ID · capability · verdict · citation · narrative · class (constraint 4) · proposed direction (one sentence — what a fix would look like, NOT the fix itself)`.
    - **§5 Over-specification risks** — places where the document's rules could strangle the end-state ambition.
    - **§6 Load-bearing assumptions the end-state falsifies** — enumerate the document's implicit assumptions and test each against the ambition.
    - **§7 Document verdict** — one honest paragraph: is THIS document world-class governance for its role?
12. **Standard verify block (Tasks 2–8):** with `FILE` = the deliverable path and `B` = the task's GA block digit, run:
    ```bash
    grep -c "Class: REVIEW (T5)" $FILE                          # expect 1
    grep -oE "GA-${B}[0-9][0-9]" $FILE | sort -u | wc -l        # expect ≥ 1
    grep -cE "WORLD-CLASS|ADEQUATE|THIN|SILENT|PRECLUDES" $FILE # expect ≥ rows in §2
    git diff --stat -- docs/foundation/ docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md docs/architecture/TAS.md docs/architecture/AIGAS.md docs/DOCUMENTATION-GOVERNANCE.md   # expect EMPTY
    ```

---

### Task 1: Deliverable 00 — the world-class benchmark

**Files:**
- Create: `docs/reviews/2026-07-11-governance-audit-00-benchmark.md`

**Interfaces:**
- Produces: the capability IDs (`P<pillar>.<n>`) every later deliverable cites, and the document-ownership map (§3 below) that tells each per-document audit which slices it owns.

**Required reading (first-principles rule, spec §5.6 — read the VISION/ambition sources, NOT the governing docs, before writing):** the spec; `CLAUDE.md` (App overview + North Star); `docs/strategy/VISION.md`; `docs/product/TEAM-ARCHITECTURE.md` (ambition sections only); HANDOFF.md stage map. Do NOT re-read the frozen five for this task — the yardstick must not bend toward them.

- [ ] **Step 1: Write the benchmark**

Structure: **§1 The standard** — one page: what "best-in-class, doesn't exist yet" means; the elite-club performance-department model (S&C + sports science + performance analysis + medical/recovery as ONE system) translated to an automated platform; judged at full end-state ambition (spec §2.3). **§2 The six pillars, decomposed** — every capability gets an ID, a name, and a one-sentence "world-class means…" statement. Seed set below; the author may add capabilities or split them, and may remove one ONLY with a written justification in place:

- **P1 Science-based programming**: P1.1 diagnosis-first coaching decisions · P1.2 sport-demand modelling (incl. position/event) · P1.3 periodisation to the sporting calendar · P1.4 individualisation (age/sex/training-age/injury) · P1.5 progression & long-term development · P1.6 safety & recoverability governance · P1.7 minimum-effective-dose discipline · P1.8 endurance + concurrent-training programming · P1.9 return-to-play / rehab integration.
- **P2 Athlete data & analytics platform**: P2.1 testing & assessment batteries as first-class data assets · P2.2 daily monitoring (wellness/readiness/HRV/sleep) · P2.3 gym-performance capture & analysis (loads, velocity, e1RM trends, adherence) · P2.4 on-pitch/match performance data (GPS/load, match stats, availability) · P2.5 recovery analytics · P2.6 the longitudinal athlete model (career-long, versioned) · P2.7 team-level analytics & squad readiness · P2.8 benchmarking & normative comparison · P2.9 data quality, provenance & missingness handling · P2.10 analytics→decision loop (analysis that changes the plan, traceably) · P2.11 reporting & insight delivery (athlete-facing, coach-facing).
- **P3 Evidence pipeline**: P3.1 evidence grading & confidence-to-authority mapping · P3.2 knowledge versioning & review cadence · P3.3 contested-science handling · P3.4 knowledge retirement/supersession · P3.5 internal evidence generation (the platform's own data as research-grade evidence, privacy-preservingly).
- **P4 AI leverage**: P4.1 deterministic-core protection · P4.2 AI communication/education · P4.3 AI insight surfacing over athlete data · P4.4 AI-assisted knowledge curation · P4.5 AI evaluation, monitoring & track-record governance.
- **P5 Safety, ethics, privacy, development**: P5.1 raw-data inviolability & derived-signal boundaries · P5.2 injury & medical-boundary governance (when the platform must hand off to humans) · P5.3 LTAD & youth/masters duty of care · P5.4 overtraining/under-recovery safeguarding · P5.5 human final authority & override · P5.6 explainability as an athlete right.
- **P6 Extensibility**: P6.1 new sports as data · P6.2 new decision types without core rewrites · P6.3 team/coach workflows (fixtures→constraints, squad planning) · P6.4 wearables/native platform absorption · P6.5 the governance process itself scaling (amendment throughput, doc hygiene at 10× surface area).

**§3 Document-ownership map** — a table: for each governing document (Constitution, Ontology, KA, EDS, TAS, AIGAS, DOC-GOVERNANCE+INDEX), the capability IDs it *should* own or co-own given its role — this is each per-document audit's work order. Every capability must appear in at least one document's row; capabilities no document should own (if any) are flagged as candidate NEW-DOCUMENT territory. **§4 How to read verdicts** — restate the verdict scale + classes (Global Constraints 3–4) so the set is self-contained.

- [ ] **Step 2: Verify**

```bash
grep -c "Class: REVIEW (T5)" docs/reviews/2026-07-11-governance-audit-00-benchmark.md   # 1
grep -oE "P[1-6]\.[0-9]+" docs/reviews/2026-07-11-governance-audit-00-benchmark.md | sort -u | wc -l   # ≥ 36 (the seed set; more if added)
```

- [ ] **Step 3: Commit**

```bash
git add docs/reviews/2026-07-11-governance-audit-00-benchmark.md
git commit -m "docs(reviews): governance audit 00 — the world-class benchmark (six pillars, capability IDs)"
```

- [ ] **Step 4: PAUSE — Simon reviews the benchmark**

STOP execution. Present the benchmark to Simon (pillars + capability list + ownership map). The benchmark encodes HIS ambition; every downstream verdict inherits it. Resume Tasks 2–8 only after his approval (adjust 00 first if he amends it).

---

### Task 2: Deliverable 01 — Constitution audit

**Files:**
- Create: `docs/reviews/2026-07-11-governance-audit-01-constitution.md`

**Interfaces:**
- Consumes: 00's capability IDs + its §3 row for the Constitution.
- Produces: findings GA-101, GA-102, … (block GA-1xx).

**Required reading:** 00 in full; `docs/foundation/CONSTITUTION.md` in full (all 20 Articles, Preamble, conflict order, Amendment & Stewardship); evidence as needed: `docs/strategy/VISION.md`, engine-audit 02 (constitutional alignment — evidence only).

- [ ] **Step 1: Write the audit** — the seven sections of Global Constraint 11, findings block GA-1xx.

Constitution-specific probes (work these into §2/§4 — they are hypotheses to test, not conclusions to copy): does any Article establish *data/analytics as a first-class product* (P2.x) or is data only governed as input/privacy (Art 11)? Does the conflict order anticipate analytics-vs-programming tensions? Is there an Article-level home for LTAD/youth duty of care (P5.3)? Does Art 12's "falsifiable hypothesis" have the measurement architecture it presumes (P2.1/P2.10)? Do the 20 Articles govern SPORT performance analysis or only gym prescription (P2.4)?

- [ ] **Step 2: Verify** — Global Constraint 12's block with `FILE=docs/reviews/2026-07-11-governance-audit-01-constitution.md`, `B=1`.

- [ ] **Step 3: Commit**

```bash
git add docs/reviews/2026-07-11-governance-audit-01-constitution.md
git commit -m "docs(reviews): governance audit 01 — Constitution vs the benchmark"
```

---

### Task 3: Deliverable 02 — Decision Ontology audit

**Files:**
- Create: `docs/reviews/2026-07-11-governance-audit-02-decision-ontology.md`

**Interfaces:**
- Consumes: 00 (+ its §3 ontology row). Produces: findings GA-2xx.

**Required reading:** 00; `docs/foundation/DECISION-ONTOLOGY.md` in full; evidence: engine-audit 08 (G-table, evidence only), `docs/product/TEAM-ARCHITECTURE.md` (entity needs).

- [ ] **Step 1: Write the audit** — the seven sections of Global Constraint 11, findings block GA-2xx.

Ontology-specific probes: are there entities for *Test/Assessment result*, *Match/Competition performance*, *External load (GPS)*, *Analysis/Insight*, *Report* — or does the entity catalogue stop at planning artefacts (P2.1/P2.4/P2.10/P2.11)? Can the Physical Quality vocabulary grow without amendment (the fixed-projection lesson — SR-05/B3 as evidence)? Do the three orthogonal structures (§1) accommodate an ANALYSIS spine (data → model → insight → decision) alongside the reasoning spine, or is analysis squeezed into "Derived Data"? Are team/squad-level entities (squad readiness, fixture congestion) first-class (P2.7/P6.3)? Does Family VI (Load/Fatigue/Recovery/Readiness) extend to on-pitch load or only training load?

- [ ] **Step 2: Verify** — Global Constraint 12's block with `FILE=docs/reviews/2026-07-11-governance-audit-02-decision-ontology.md`, `B=2`.

- [ ] **Step 3: Commit**

```bash
git add docs/reviews/2026-07-11-governance-audit-02-decision-ontology.md
git commit -m "docs(reviews): governance audit 02 — Decision Ontology vs the benchmark"
```

---

### Task 4: Deliverable 03 — Knowledge Architecture audit

**Files:**
- Create: `docs/reviews/2026-07-11-governance-audit-03-knowledge-architecture.md`

**Interfaces:**
- Consumes: 00. Produces: findings GA-3xx.

**Required reading:** 00; `docs/foundation/KNOWLEDGE-ARCHITECTURE.md` in full; evidence: engine-audit 05 (knowledge usage, evidence only).

- [ ] **Step 1: Write the audit** — the seven sections of Global Constraint 11, findings GA-3xx.

KA-specific probes: do the twelve domains include a home for *normative/benchmark data* (population norms, position norms — P2.8) and *match-performance knowledge* (P2.4)? Does the eight-kinds taxonomy (§2) handle *analytics models* (a trained trend model is neither Knowledge nor simple Derived Data — where does it live, with what governance)? Is the internal-evidence pathway (platform's own athlete data → population priors → published-grade knowledge, P3.5) specified or only gestured at via the three learning tiers? Does the entry shape (§3.1) scale to thousands of entries (tooling, review cadence at 10×, P6.5)? Is data quality/missingness (P2.9) governed anywhere?

- [ ] **Step 2: Verify** — Global Constraint 12's block with `FILE=docs/reviews/2026-07-11-governance-audit-03-knowledge-architecture.md`, `B=3`.

- [ ] **Step 3: Commit**

```bash
git add docs/reviews/2026-07-11-governance-audit-03-knowledge-architecture.md
git commit -m "docs(reviews): governance audit 03 — Knowledge Architecture vs the benchmark"
```

---

### Task 5: Deliverable 04 — EDS audit

**Files:**
- Create: `docs/reviews/2026-07-11-governance-audit-04-eds.md`

**Interfaces:**
- Consumes: 00. Produces: findings GA-4xx.

**Required reading:** 00; `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md` in full (it is long — budget for it; §20 catalogue, §25 learning, §28 confidence, §34–37 selection/validation at minimum); evidence: engine-audit 01/08 (evidence only).

- [ ] **Step 1: Write the audit** — the seven sections of Global Constraint 11, findings GA-4xx.

EDS-specific probes: is D1 (assessment) specified to the depth of a real testing battery (protocols, scheduling of tests, data shapes — P2.1) or does it presume estimates? Is there a decision for *analysis* (reading the athlete's data and deciding what it means — P2.10) or do D15/D16 smuggle it? Does D16's learning specification govern model classes beyond priors (trend detection, anomaly flags — P2.6/P4.3)? Where do match/pitch data enter the decision graph (P2.4) — demand refinement (D3), readiness, or nowhere? Does the D1–D16 catalogue claim exhaustiveness, and is that claim compatible with the end-state (P6.2 — cite the V2 sprint's V2-P question as a live example)? Endurance programming (P1.8): does the EDS's session/dose vocabulary extend to endurance sessions or is it gym-shaped at the specification level?

- [ ] **Step 2: Verify** — Global Constraint 12's block with `FILE=docs/reviews/2026-07-11-governance-audit-04-eds.md`, `B=4`.

- [ ] **Step 3: Commit**

```bash
git add docs/reviews/2026-07-11-governance-audit-04-eds.md
git commit -m "docs(reviews): governance audit 04 — EDS vs the benchmark"
```

---

### Task 6: Deliverable 05 — TAS audit

**Files:**
- Create: `docs/reviews/2026-07-11-governance-audit-05-tas.md`

**Interfaces:**
- Consumes: 00. Produces: findings GA-5xx.

**Required reading:** 00; `docs/architecture/TAS.md` in full; evidence: engine-audit 06 TR-03 (substrate, evidence only), `docs/product/TEAM-ARCHITECTURE.md`.

- [ ] **Step 1: Write the audit** — the seven sections of Global Constraint 11, findings GA-5xx.

TAS-specific probes: does the L0–L6 layering give analytics a home — an analytics read-model/warehouse peer to the engine (P2.6/P2.7/P2.11), or is L5 "Learning & Research" carrying the entire data-analysis ambition? Is there an ingestion architecture for high-volume external data (GPS streams, wearable time-series — P2.4/P6.4) or only the wearable ACL? Does the engine API (§4.1) anticipate analysis calls (`analyse()`? trend read-models?) or only plan/reflow/derive? Data platform concerns — retention, lineage, schema evolution, time-series storage (P2.9) — governed or absent? Does `rollUp() → CoachVisibleStatus` scale to real team analytics (P2.7) or is it a single derived signal? Where would reporting surfaces (P2.11) sit without violating "surfaces compute no coaching"?

- [ ] **Step 2: Verify** — Global Constraint 12's block with `FILE=docs/reviews/2026-07-11-governance-audit-05-tas.md`, `B=5`.

- [ ] **Step 3: Commit**

```bash
git add docs/reviews/2026-07-11-governance-audit-05-tas.md
git commit -m "docs(reviews): governance audit 05 — TAS vs the benchmark"
```

---

### Task 7: Deliverable 06 — AIGAS audit

**Files:**
- Create: `docs/reviews/2026-07-11-governance-audit-06-aigas.md`

**Interfaces:**
- Consumes: 00. Produces: findings GA-6xx.

**Required reading:** 00; `docs/architecture/AIGAS.md` in full; evidence: `docs/architecture/AIGAS-REVIEW-2026-07-06.md` (prior ratification review — evidence of known open points).

- [ ] **Step 1: Write the audit** — the seven sections of Global Constraint 11, findings GA-6xx.

AIGAS-specific probes: do the C1–C9 capability categories cover *AI insight over athlete DATA* (trend narration, anomaly surfacing over longitudinal/match data — P4.3/P2.10) with a defined seam and gate, or were they designed around plan-explanation only? Is the AI evaluation/track-record governance (P4.5) specified to an operational standard (eval harness requirements, drift monitoring, per-capability quality bars)? Does the two-seam model hold for analytics AI, or does analysis-that-informs-decisions need a governed third path (a finding either way)? Is AIGAS's pending-ratification status itself a governance risk at this ambition (P6.5)?

- [ ] **Step 2: Verify** — Global Constraint 12's block with `FILE=docs/reviews/2026-07-11-governance-audit-06-aigas.md`, `B=6`.

- [ ] **Step 3: Commit**

```bash
git add docs/reviews/2026-07-11-governance-audit-06-aigas.md
git commit -m "docs(reviews): governance audit 06 — AIGAS vs the benchmark"
```

---

### Task 8: Deliverable 07 — Documentation governance audit

**Files:**
- Create: `docs/reviews/2026-07-11-governance-audit-07-doc-governance.md`

**Interfaces:**
- Consumes: 00. Produces: findings GA-7xx.

**Required reading:** 00; `docs/DOCUMENTATION-GOVERNANCE.md` + `docs/DOCUMENTATION-INDEX.md` in full; evidence: the amendment queue (`docs/reviews/2026-07-09-documentation-audit.md` §2), HANDOFF.md governance section.

- [ ] **Step 1: Write the audit** — the seven sections of Global Constraint 11, findings GA-7xx.

Process-specific probes (P6.5 is the owned slice): can the amendment process sustain the throughput this audit + the V2 Amendment Register will feed it (is there a batching/panel mechanism, or one-at-a-time)? Does the precedence model handle a NEW peer governing document (e.g. a Data & Analytics Architecture Spec) cleanly — how does a document ENTER T2? Is there a defined ratification path (AIGAS has waited since 2026-07-06 — evidence)? Does the one-owner-per-concept rule have an owner-assignment mechanism for genuinely NEW concept families (analytics) or only for existing ones? Review cadence: are frozen docs ever re-validated against the ambition on a schedule, or only when defects queue?

- [ ] **Step 2: Verify** — Global Constraint 12's block with `FILE=docs/reviews/2026-07-11-governance-audit-07-doc-governance.md`, `B=7`.

- [ ] **Step 3: Commit**

```bash
git add docs/reviews/2026-07-11-governance-audit-07-doc-governance.md
git commit -m "docs(reviews): governance audit 07 — documentation governance vs the benchmark"
```

---

### Task 9: Deliverable 08 — the data & analytics pillar deep-dive

**Files:**
- Create: `docs/reviews/2026-07-11-governance-audit-08-data-analytics-pillar.md`

**Interfaces:**
- Consumes: 00 (P2 + P3.5 capabilities) AND deliverables 01–07 (their P2-related rows and findings — cite, don't re-derive).
- Produces: findings GA-8xx (cross-document ones only — a gap already carrying a GA-1xx…7xx ID is cited, not re-minted).

**Required reading:** 00; the P2/P3.5 rows and findings of 01–07; evidence: `docs/architecture/ATHLETE-MODEL.md`, engine-audit 06 TR-03 (the missing history substrate), `supabase/` schema docs ONLY as evidence of data reality (`docs/SCHEMA.md`).

- [ ] **Step 1: Write the deep-dive**

Structure: **§1 The end-to-end chain** — world-class athlete data analysis as five links: CAPTURE (tests, monitoring, gym logging, match/GPS, wearables) → MODEL (the longitudinal athlete model; data quality) → ANALYSE (trends, benchmarks, team roll-ups, insight generation) → DECIDE (analytics feeding the decision graph, traceably, with confidence discipline) → PRESENT (athlete/coach reporting). **§2 The governance map per link** — for each link: which document(s) govern it today (from 01–07, cited by GA-ID), verdict for the LINK as a whole, and the specific missing governance named. **§3 The hypothesis, tested** — the spec's working hypothesis ("programming governed superbly, data analysis thinly") confirmed, refuted, or refined — with the evidence either way. **§4 What world-class requires** — the consolidated statement: which capabilities need a new governing home, sketched at the level of "what a Data & Analytics Architecture Specification (or amendments) must cover" — direction only, NOT the spec itself. **§5 Cross-document findings** — GA-8xx entries for gaps that exist BETWEEN documents (e.g. an entity the Ontology lacks AND the TAS has no layer for AND no document owns — one systemic finding, not three restatements).

- [ ] **Step 2: Verify**

```bash
grep -c "Class: REVIEW (T5)" docs/reviews/2026-07-11-governance-audit-08-data-analytics-pillar.md   # 1
grep -oE "GA-[1-7][0-9][0-9]" docs/reviews/2026-07-11-governance-audit-08-data-analytics-pillar.md | sort -u | wc -l   # ≥ 5 (cites upstream findings)
grep -cE "CAPTURE|MODEL|ANALYSE|DECIDE|PRESENT" docs/reviews/2026-07-11-governance-audit-08-data-analytics-pillar.md   # ≥ 10
```

- [ ] **Step 3: Commit**

```bash
git add docs/reviews/2026-07-11-governance-audit-08-data-analytics-pillar.md
git commit -m "docs(reviews): governance audit 08 — data & analytics pillar deep-dive"
```

---

### Task 10: Deliverable 09 — verdict and register

**Files:**
- Create: `docs/reviews/2026-07-11-governance-audit-09-verdict-and-register.md`

**Interfaces:**
- Consumes: ALL of 00–08. Mints no new GA-IDs.

**Required reading:** all nine prior deliverables in full.

- [ ] **Step 1: Write the verdict**

Structure: **§1 The answer** — one page, plain language (Simon reads this alone, per spec §7): is the governance world-class for the stated ambition? Where yes, where no, and the single most important thing to do about it. **§2 The full register** — every GA finding from 01–08 in one table: `GA-ID | Document | Capability | Verdict | Class | Rank | One-line summary`, ranked by: (1) blocks the ambition structurally, (2) bites at current/next stage, (3) bites later but amendment is cheaper now, (4) polish. **§3 Amendment candidates** — the AMENDMENT CANDIDATE + NEW-DOCUMENT CANDIDATE subset, each expanded to a queue-ready entry (target doc + §, rationale, benchmark line, suggested amendment DIRECTION — never drafted text), explicitly formatted to feed the amendment queue (`docs/reviews/2026-07-09-documentation-audit.md` §2's pattern). **§4 Per-document verdicts** — the seven §7 verdicts from 01–07, quoted or tightened, plus a COVERED honour-roll (what must NOT be weakened by any future amendment). **§5 Inputs to THE DEVELOPMENT PLAN** — how this register composes with the other three inputs (governance-sprint reviews, engine audit, parked V2 design set): where findings reinforce, where they change the V2 set's assumptions (flag explicitly if any V2 doc premise is falsified — e.g. if a NEW governing document changes what 04-KNOWLEDGE-OWNERSHIP-MAP would map to).

- [ ] **Step 2: Verify**

```bash
grep -c "Class: REVIEW (T5)" docs/reviews/2026-07-11-governance-audit-09-verdict-and-register.md   # 1
# Register completeness — every GA-ID minted in 01–08 appears in 09:
for f in docs/reviews/2026-07-11-governance-audit-0[1-8]-*.md; do grep -oE "GA-[0-9]{3}" "$f"; done | sort -u > /tmp/minted.txt
grep -oE "GA-[0-9]{3}" docs/reviews/2026-07-11-governance-audit-09-verdict-and-register.md | sort -u > /tmp/registered.txt
comm -23 /tmp/minted.txt /tmp/registered.txt   # EMPTY — no orphaned findings
```

- [ ] **Step 3: Commit**

```bash
git add docs/reviews/2026-07-11-governance-audit-09-verdict-and-register.md
git commit -m "docs(reviews): governance audit 09 — verdict and amendment-candidate register"
```

---

### Task 11: Adversarial review, indexes, HANDOFF, PR

**Files:**
- Modify: any `docs/reviews/2026-07-11-governance-audit-*.md` needing fixes
- Modify: `docs/reviews/README.md` (if present — check first), `docs/DOCUMENTATION-INDEX.md`, `HANDOFF.md`

- [ ] **Step 1: Mechanical checks**

```bash
ls docs/reviews/2026-07-11-governance-audit-*.md | wc -l    # 10
grep -L "Class: REVIEW (T5)" docs/reviews/2026-07-11-governance-audit-*.md   # empty
git diff main --stat -- docs/foundation/ docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md docs/architecture/TAS.md docs/architecture/AIGAS.md docs/DOCUMENTATION-GOVERNANCE.md packages/ apps/ supabase/   # EMPTY — nothing governed or coded was touched
# Duplicate-ID check across the set:
grep -ohE "GA-[0-9]{3}" docs/reviews/2026-07-11-governance-audit-0[1-8]-*.md | sort | uniq -d | while read id; do grep -lE "^.*${id}.*·|${id}" docs/reviews/2026-07-11-governance-audit-0[1-8]-*.md | sort -u | wc -l | grep -qv '^1$' && echo "DUPLICATE MINT: $id"; done   # no DUPLICATE MINT lines (cross-file duplicates only; same-file repeats are citations)
```

- [ ] **Step 2: Adversarial review**

Fresh eyes (or a fresh reviewer subagent) with ONLY the spec §5 grounding rules + §7 success criteria + the ten deliverables. Questions: Is every verdict justified by the cited text (spot-check 10 citations against the actual Articles/§§)? Is any finding implementation-shaped rather than governance-shaped (spec §5.7 violation)? Is any capability from 00 §2 unjudged by every document audit (coverage hole)? Is the honest-positive rule satisfied (does each per-doc audit have a real §3)? Does 09 §1 actually answer the question a reader would ask? Fix all findings inline and re-run Step 1's checks.

- [ ] **Step 3: Indexes + HANDOFF**

Check `ls docs/reviews/README.md` — if it exists, add the ten files per its convention. Add the set to `docs/DOCUMENTATION-INDEX.md` (class REVIEW, one entry or per-file per that file's convention; also add this spec + plan if it tracks superpowers docs). Update `HANDOFF.md`: "Where the platform stands" gains the governance forensic audit (date, deliverable count, headline verdict in one line, register size); the open queue notes THE DEVELOPMENT PLAN's inputs are now four (governance-sprint reviews, engine audit, parked V2 design set, governance audit) — HOLD still intact, V2 branch still parked.

- [ ] **Step 4: Suite sanity + push + PR**

```bash
npm test        # expect 196/196 (docs-only; proves nothing broke)
npm run lint    # CI runs this; must be clean
git add docs/reviews/README.md docs/DOCUMENTATION-INDEX.md HANDOFF.md 2>/dev/null; git commit -m "docs(reviews): governance audit — indexes + HANDOFF"
git push -u origin governance-audit-2026-07-11
gh pr create --title "docs(reviews): forensic audit of the governance documentation (10 deliverables)" --body "<summary: the benchmark, per-doc verdicts in one line each, register size, amendment candidates count, no frozen doc touched>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 5: STOP — Simon merges**

This audit judges the constitutional foundation — it pauses for Simon regardless of green checks. Report: the PR link, the one-page §1 verdict, and the amendment-candidate count.
