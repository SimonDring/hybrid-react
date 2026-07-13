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
| AQ-1 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-113) | Constitution Preamble / Title I | BATCHED ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Name the second product |
| AQ-2 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-203/205/206/207/208/209) | Decision Ontology §1 + new Family VIII | BATCHED ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Measurement & Analysis entity family + fourth structure; reconcile with ND-1 in the same pass |
| AQ-3 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-417) | EDS §20 catalogue (via AQ-4) | BATCHED ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Analysis decision family; jointly with AQ-2 + AQ-4 |
| AQ-4 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-419 + GA-204) | EDS §20/§42 + Ontology header Principle/§11 | BATCHED ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Extension clauses, paired — one doctrine stated once in each doc |
| AQ-5 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-802) | KA §2.1/§2.3 + EDS §27 + TAS §7 | BATCHED ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Derived-data doctrine clarification; one coordinated pass — do not split |
| AQ-6 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-107) | Constitution Title III (new Article) | BATCHED ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Developmental-stage duty of care |
| AQ-7 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-109) | Constitution Title III (new Article) | BATCHED ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Athlete data ownership & consent |
| AQ-8 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-610) | AIGAS status + Constitution Appendix A + TAS cross-refs | BATCHED ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Ratify AIGAS — the proving case for the governance doc §3 ratification path |
| AQ-9 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-509) | TAS §15 / cross-references | BATCHED ([batch 2026-07](design/amendment-batch-2026-07/README.md)) | Restore the Security & Privacy section |
| ND-1 | [Governance audit 09 §3](reviews/2026-07-11-governance-audit-09-verdict-and-register.md) (GA-512; folds GA-414, GA-421, GA-801, GA-803) | NEW T2 document — Data & Analytics Architecture Specification | QUEUED | Peer to the EDS; enters T2 via the ratification path after AQ-8 proves it |
