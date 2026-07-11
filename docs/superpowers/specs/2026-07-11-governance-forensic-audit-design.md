# Forensic Audit of the Governance Documentation — Design Spec

**Status: DESIGN SPEC (immutable sprint record once merged) · 2026-07-11**
**Output class: REVIEW (T5) — dated evidence in `docs/reviews/`, never current-state claims**

---

## 1. Mission

Audit the platform's governing documentation against one question:

> Is this the governing foundation of a **best-in-class elite strength &
> conditioning platform** — one that delivers world-class, science-based
> programming in support of sporting performance, AND world-class data analysis
> of the athlete: performance on the pitch, performance in the gym, recovery,
> and everything in between?

Simon's brief (2026-07-11): the platform must be unique — something that doesn't
exist yet. The audit standard is **no stone unturned, no compromise**. Internal
consistency was proven by the Sprint 1 documentation audit; this audit judges the
set against an EXTERNAL yardstick — what world-class would actually require.

## 2. Decisions made during brainstorming (Simon, 2026-07-11)

1. **Ordering** — this audit runs FIRST; the Decision Engine V2 design plan
   (branch `engine-v2-design-2026-07-11`, spec + plan committed) is PARKED and
   nothing from it is executed until Simon says so.
2. **Scope — the governing tier + policy**: the frozen five (Constitution,
   Decision Ontology, Knowledge Architecture, EDS, TAS) + AIGAS
   (governing-designate) + `docs/DOCUMENTATION-GOVERNANCE.md` and
   `docs/DOCUMENTATION-INDEX.md`. Supporting docs (VISION, TEAM-ARCHITECTURE,
   ATHLETE-MODEL, SKB schema, physiological framework) are consulted as
   EVIDENCE of what the governing tier does or doesn't cover — not themselves
   audited.
3. **Yardstick — the full end-state ambition**, not today's product scope.
   Gym-only, wearable-light, no-match-data is today's stage; the governance is
   judged against the complete vision (elite programming + full athlete data
   analysis + team analytics + endurance + AI coaching + native/wearables).
   A gap that only bites at a future stage still counts — flagged with WHEN it
   bites and whether the current abstractions can absorb it or would crack.

## 3. Method — benchmark first, then forensics

The audit is only as good as its yardstick, so the yardstick is built before any
document is judged.

**Part 1 — The reference model** (deliverable 00). From first principles: what
must the governance of a best-in-class platform cover? Modelled on the full
performance department of an elite club — strength & conditioning, sports
science, performance analysis, and medical/recovery working as one system —
translated to an automated platform. Six pillars:

1. **Science-based programming** — the coaching decision system (where the
   current set is deepest).
2. **The athlete data & analytics platform** — measurement & testing batteries,
   monitoring, gym performance data, recovery data, on-pitch/match performance
   data, longitudinal athlete analytics, team-level analytics, benchmarking &
   norms. Data as a first-class product, not exhaust.
3. **The evidence pipeline** — how science enters, is graded, updates, is
   contested, and retires; research posture.
4. **AI leverage** — where intelligence multiplies the platform without
   replacing the deterministic core.
5. **Athlete safety, ethics, privacy, and development** — incl. long-term
   athlete development and duty-of-care obligations of an elite environment.
6. **Extensibility** — new sports, endurance programming, team workflows,
   native/wearable platforms; whether the abstractions scale to the ambition.

Each pillar is decomposed into named capabilities with a "world-class means…"
statement, so every later judgement traces to a specific benchmark line.

**Part 2 — Per-document forensic audits** (deliverables 01–07). Each governing
document audited against the benchmark slices it should own. For every slice:
`WORLD-CLASS / ADEQUATE / THIN / SILENT / PRECLUDES` — with exact §/Article
citations, and for SILENT/PRECLUDES: what breaks, when it bites (which stage),
and whether the document's existing abstractions could absorb the concept
without amendment. Also probed per document: over-specification (governance
that would strangle the ambition), and load-bearing assumptions that the
end-state falsifies.

**Part 3 — Thematic deep-dive** (deliverable 08): the data & analytics pillar
across ALL documents at once — the working hypothesis (to be tested, not
assumed): the set governs programming decisions superbly and athlete data
analysis thinly (readiness signals and learning priors exist; testing batteries
as data assets, match/pitch performance, longitudinal and team analytics are
barely first-class concepts). The deep-dive maps what world-class athlete data
analysis requires end-to-end (capture → model → analyse → decide → present)
onto where governance for each step does or doesn't exist.

**Part 4 — Verdict + register** (deliverable 09): every finding ranked, each
classed as exactly one of:
- **COVERED** — governance already world-class here (say so; the audit must be
  honest in both directions);
- **SPEC-FILLABLE** — gap closable by a new supporting/T3 spec under existing
  governance, no amendment needed;
- **AMENDMENT CANDIDATE** — requires amending a frozen document; queued with
  rationale per the amendment process, NEVER applied;
- **NEW-DOCUMENT CANDIDATE** — a missing governing document entirely (e.g. a
  Data & Analytics Architecture Specification peer to the EDS).
Plus a per-document verdict and an overall answer to §1's question.

## 4. Deliverables

Ten dated review files in `docs/reviews/` (class REVIEW/T5, Sprint-2 naming
pattern), plus index updates:

| # | File | Content |
|---|---|---|
| 00 | `2026-07-11-governance-audit-00-benchmark.md` | The world-class reference model: six pillars decomposed into named capabilities |
| 01 | `2026-07-11-governance-audit-01-constitution.md` | CONSTITUTION.md vs the benchmark |
| 02 | `2026-07-11-governance-audit-02-decision-ontology.md` | DECISION-ONTOLOGY.md vs the benchmark |
| 03 | `2026-07-11-governance-audit-03-knowledge-architecture.md` | KNOWLEDGE-ARCHITECTURE.md vs the benchmark |
| 04 | `2026-07-11-governance-audit-04-eds.md` | The EDS vs the benchmark |
| 05 | `2026-07-11-governance-audit-05-tas.md` | TAS.md vs the benchmark |
| 06 | `2026-07-11-governance-audit-06-aigas.md` | AIGAS.md vs the benchmark |
| 07 | `2026-07-11-governance-audit-07-doc-governance.md` | DOCUMENTATION-GOVERNANCE.md + INDEX vs the benchmark (does the governance PROCESS itself scale to the ambition?) |
| 08 | `2026-07-11-governance-audit-08-data-analytics-pillar.md` | The cross-document deep-dive on the athlete data & analytics pillar |
| 09 | `2026-07-11-governance-audit-09-verdict-and-register.md` | Ranked findings, classifications, amendment-candidate register, per-document + overall verdict |
| — | `docs/reviews/README.md` (if an index exists there) + `docs/DOCUMENTATION-INDEX.md` | Register the new review set |

## 5. Grounding rules (binding on every deliverable)

1. **No frozen document is edited.** Findings queue; they never fix inline.
2. **Every judgement cites** the exact Article/§ it judges and the benchmark
   line (00's capability IDs) it judges against. No unattributed verdicts.
3. **Findings get stable IDs** (`GA-nn`) so the register, the amendment queue,
   and future sprints can cross-reference them.
4. **Honest in both directions**: WORLD-CLASS verdicts are as important as
   gaps; the audit must not manufacture findings to seem rigorous — "no stone
   unturned" means every stone TURNED, not every stone declared a problem.
5. **Reviews are dated evidence** (T5): pinned to the doc versions as of
   `main` on 2026-07-11 (frozen set v1.0, 2026-07-01; KSV 1.30.0); no
   current-status claims beyond that pin; status stays in HANDOFF.md.
6. **The benchmark is first-principles, not implementation-shaped**: 00 is
   written BEFORE re-reading the governing docs in audit mode, from the vision
   docs (`docs/strategy/VISION.md`, `docs/product/TEAM-ARCHITECTURE.md`,
   CLAUDE.md north star) + elite-performance-department practice — so the
   yardstick isn't quietly bent toward what the docs already say.
7. **Sprint 2 findings are evidence, not conclusions**: the engine audit
   (`docs/reviews/2026-07-11-engine-audit-*`) may be cited where implementation
   evidence illuminates a governance gap (e.g. dormant SKB sections suggest the
   EDS under-specifies consumption), but code defects are NOT governance
   findings.
8. **No production code; no V2-plan execution** — the parked V2 branch stays
   parked.

## 6. Execution model

1. This spec is committed on branch `governance-audit-2026-07-11` (off `main`),
   then `superpowers:writing-plans` produces the implementation plan.
2. Authoring order: 00 (benchmark) FIRST and reviewed before any document
   audit begins — the yardstick must be fixed before judging. Then 01–07 fan
   out in parallel (each self-contained: one document vs the benchmark), then
   08 (needs 01–07's raw material), then 09 (needs everything).
3. An adversarial review pass runs before the set is declared done: are
   verdicts justified by the cited text? Is any finding implementation-shaped
   rather than governance-shaped? Is the register complete and correctly
   classed?
4. One PR. **Merge is Simon's** — this audit judges the constitutional
   foundation; it pauses for Simon regardless of green checks.
5. Session end: HANDOFF.md updated (audit delivered; development-plan inputs
   now four: governance reviews, engine audit, V2 design set (parked),
   governance audit); DOCUMENTATION-INDEX updated.

## 7. Success criteria

- Every governing document has been judged line-by-line against an explicit,
  first-principles, end-state benchmark — no pillar skipped, including the
  ones the documents don't currently mention.
- The data & analytics pillar has a complete end-to-end gap map.
- Every finding is classed (COVERED / SPEC-FILLABLE / AMENDMENT CANDIDATE /
  NEW-DOCUMENT CANDIDATE), ranked, and traceable to benchmark line + cited §.
- The amendment-candidate register is ready to feed the amendment process and
  THE DEVELOPMENT PLAN without further interpretation.
- Simon can read deliverable 09 alone and know: where the governance is
  genuinely world-class, where it is not, and exactly what to do about it.

## 8. Out of scope

- Editing any frozen document, applying any amendment, or ratifying AIGAS.
- Auditing supporting/T3 docs (evidence only), the codebase (Sprint 2 did), or
  doc hygiene (Sprint 1 did).
- Executing the parked Decision Engine V2 plan.
- Competitive analysis of named commercial products (the benchmark is
  first-principles elite practice, not a market survey).
