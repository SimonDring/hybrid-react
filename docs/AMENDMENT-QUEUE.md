# The Amendment Queue — frozen-set & T2 amendment candidates

**Class: WORKING (T4) · the amendment queue's single home · created 2026-07-13**
**Process rules live in [`DOCUMENTATION-GOVERNANCE.md`](DOCUMENTATION-GOVERNANCE.md)
§3. This file owns each candidate's lifecycle; the linked evidence owns its
content. Never restate a finding here — link to it.**

---

## How this register works

- Every frozen-doc defect or amendment candidate gets **one row** the moment it
  is found. This is the only place candidates queue (governance doc §3) —
  never HANDOFF, review files, or session notes.
- **Status** is the lifecycle: `QUEUED` (recorded, awaiting a batch) →
  `BATCHED` (selected into a written amendment batch under governance doc §3)
  → `RATIFIED` (landed by Simon's ratified batch) or `REJECTED` (declined,
  reason in Notes). Rows are never deleted — a processed row is history.
- **Source** links the dated evidence (a REVIEW-class document) that defines
  the candidate: its rationale, benchmark, and direction. That evidence is
  immutable; this register only tracks what happens to the candidate.
- New-document candidates (`ND-*`) enter T2 via the ratification path
  (governance doc §3), not by amendment of an existing document; they queue
  here so the batch protocol sequences them.

## The register

| Item | Source (evidence link) | Target doc | Status | Notes |
|---|---|---|---|---|
| C1 | [2026-07-09 documentation audit §2](reviews/2026-07-09-documentation-audit.md) | All five frozen docs (status blocks) | QUEUED | Stamp freeze status in-band |
| C2 | [2026-07-09 documentation audit §2](reviews/2026-07-09-documentation-audit.md) | TAS §5.2 ↔ KA §2 | QUEUED | "Seven kinds" vs the canonical eight |
| C3 | [2026-07-09 documentation audit §2](reviews/2026-07-09-documentation-audit.md) | EDS §26/§30 + KA | QUEUED | Hard-coded sport counts |
| C4 | [2026-07-09 documentation audit §2](reviews/2026-07-09-documentation-audit.md) | EDS header + foundation README | QUEUED | EDS rank stated once, identically |
| C5 | [2026-07-09 documentation audit §2](reviews/2026-07-09-documentation-audit.md) | EDS §20 notation legend | QUEUED | Mojibake glyph |
| AQ-1 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-113) | Constitution Preamble / Title I | RATIFIED 2026-07-13 ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Name the second product |
| AQ-2 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-203/205/206/207/208/209) | Decision Ontology §1 + new Family VIII | RATIFIED 2026-07-13 ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Measurement & Analysis entity family + fourth structure; reconcile with ND-1 in the same pass |
| AQ-3 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-417) | EDS §20 catalogue (via AQ-4) | RATIFIED 2026-07-13 ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Analysis decision family; jointly with AQ-2 + AQ-4 |
| AQ-4 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-419 + GA-204) | EDS §20/§42 + Ontology header Principle/§11 | RATIFIED 2026-07-13 ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Extension clauses, paired — one doctrine stated once in each doc |
| AQ-5 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-802) | KA §2.1/§2.3 + EDS §27 + TAS §7 | RATIFIED 2026-07-13 ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Derived-data doctrine clarification; one coordinated pass — do not split |
| AQ-6 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-107) | Constitution Title III (new Article) | RATIFIED 2026-07-13 ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Developmental-stage duty of care |
| AQ-7 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-109) | Constitution Title III (new Article) | RATIFIED 2026-07-13 ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Athlete data ownership & consent |
| AQ-8 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-610) | AIGAS status + Constitution Appendix A + TAS cross-refs | RATIFIED 2026-07-13 ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Ratify AIGAS — the proving case for the governance doc §3 ratification path; ratified under Option A of [06-aigas-ratification](design/amendment-batch-2026-07/06-aigas-ratification.md) (panel record: AIGAS-REVIEW-2026-07-06 + governance audit 06) |
| AQ-9 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-509) | TAS §15 / cross-references | RATIFIED 2026-07-13 ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Restore the Security & Privacy section |
| ND-1 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-512; folds GA-414, GA-421, GA-801, GA-803, GA-804) | NEW T2 document — Data & Analytics Architecture Specification | RATIFIED (2026-07-15) | Peer to the EDS; entered T2 via the ratification path AQ-8 proved. Adversarial panel: RATIFY WITH FIXES — fixes applied (this row's GA-804 fold; AQ-10/AQ-11/AQ-12 queued below; the DAAS's own §2/§2.3/§2.1.2/§9/§1.5/§5.1 text corrections). See [DATA-ANALYTICS-ARCHITECTURE.md](architecture/DATA-ANALYTICS-ARCHITECTURE.md), status line |
| AQ-10 | [DATA-ANALYTICS-ARCHITECTURE §1.2](architecture/DATA-ANALYTICS-ARCHITECTURE.md) (recorded consistency-pass finding, DAAS ratification panel 2026-07-15) | TAS §4.5 (L5 priors-channel wording) + §4.1 L1 decision-graph D-list | QUEUED | TAS §4.5 states priors are "the only channel into the engine" and TAS's L1 sections enumerate "D1–D16"; the ratified EDS §20 D17 (Observation & Analysis) also feeds the engine via D1/D4/D15/D16 consumers — a frozen-set inconsistency the AQ-3 batch introduced (adding D17 to the EDS) and did not reconcile into the TAS |
| AQ-11 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-306) | Knowledge Architecture §3.1 (the evidence scale, L1–L5) | QUEUED | No rung exists for platform-internal observational evidence; the DAAS §6.3 internal-evidence promotion gate interim-treats such findings as L5 ("expert opinion / anatomical logic") carrying an `internal-observational` marker, capped at soft-input authority regardless of effect size, pending this amendment |
| AQ-12 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-309) | Knowledge Architecture §2.1 (Stored Data kind) | QUEUED | "Stored Data: confidence n/a" leaves recorded-data error with no home in the eight-kinds taxonomy; the DAAS §2.1.1 rule 3 states the interim reading (provenance classes carry quality descriptors, not confidence, on Stored Data; confidence is born at derivation) as benign under current treatment pending this amendment |
