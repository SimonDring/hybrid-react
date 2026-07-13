# ND-1 — The Data & Analytics Architecture Specification: Design Spec

**Status: DESIGN SPEC (immutable sprint record once merged) · 2026-07-13**
**Authority: DEVELOPMENT-PLAN §4 ND-1; unlocked by Simon's acceptance of the
AQ-1/AQ-2 direction (batch PR #175 merged 2026-07-13). The commissioned document
is to the data product what the EDS is to the engine.**

## 1. The deliverable

ONE new governing document: `docs/architecture/DATA-ANALYTICS-ARCHITECTURE.md`
("the DAAS"), authored as a **DESIGNATE** (T2-entry candidate) — banner
`PROPOSED — designate pending ratification via DOCUMENTATION-GOVERNANCE §Ratification`.
It becomes canonical only through the GOV ratification path (panel review +
Simon), exactly as AIGAS did.

**Scope charter** (fixed by evidence, not invented): benchmark P2.1–P2.11 +
P3.5 (governance audit 00 §2) + the consolidated per-link requirements of
governance audit 08 §4 (CAPTURE → MODEL → ANALYSE → DECIDE → PRESENT). The
DAAS OWNS the capability cluster 00 §3 flagged as new-document territory,
including the systemic findings folded under the GA-512 ruling (GA-801
quality→authority propagation; GA-803 de-facto semantics in ungoverned tiers;
GA-804 the metric dictionary).

**Required structure** (mirrors the EDS's discipline at Art 20-minimal depth):
1. Purpose & rank — the second product's governing document; relation to the
   frozen set + AIGAS; what it does NOT own (programming decisions, AI form).
2. The five links, each specified: data classes owned, entities consumed
   (Ontology Family VIII — the amended vocabulary), knowledge domains touched
   (KA), architecture home (TAS layers; the L5/read-model seam), decisions fed
   (EDS D17 and only D17 into the engine), privacy posture (Art 11/22).
3. The longitudinal athlete model — the career-long, versioned data asset
   (the derived-data doctrine's dated-historical-evidence permission made
   architecture; append-only; `engineVersion × knowledgeSetVersion` stamps).
4. The metric dictionary governance (GA-804) and quality→authority propagation
   rule (GA-801): every metric has one definition, a provenance class, and a
   confidence treatment that PROPAGATES end-to-end (KA §3.1 tiers).
5. Team & squad analytics (Squad Signal → CoachVisibleStatus lineage;
   privacy-preserving aggregation; never raw vitals).
6. Benchmarking & norms (population/positional; internal-evidence pathway
   P3.5, privacy-preserving).
7. Reporting & insight delivery (one trace, three audiences pattern extended
   to analytical artefacts; AI narration stays behind AIGAS C-gates).
8. Contracts & validation (what D14-class validation means for analytical
   outputs; falsifiability; the silent list stays empty).
9. Staging & build order (which parts Phase 3/4 build first; explicit
   deferrals with when-they-bite).

## 2. Rules

1. **The DAAS cites the AMENDED governing text** (Family VIII, D17, Art 21/22,
   the derived-data doctrine) as it stands in the batch proposals — and its
   final consistency pass reconciles against the applied text once the
   ratification PR merges (flag any drift as findings, not silent fixes).
2. One owner per concept: the DAAS links to Ontology/KA/EDS/TAS/AIGAS content,
   never restates it. Where it needs a concept none of them owns, IT is the
   owner — that is its job.
3. Evidence-cited throughout (benchmark P-lines, GA-IDs, audit 08 §4).
4. No production code; no frozen-doc edits; determinism and privacy
   inviolable; every analytical authority claim carries a confidence tier.
5. Sprint flow: author → independent adversarial review against this spec +
   the benchmark (the reviewer tries to find P2 capabilities the DAAS fails
   to own operationally) → fixes → PR. **Pauses for Simon**; ratification is
   a later, separate act via the GOV path.

## 3. Out of scope

Implementing anything (Phase 3/4); ratifying the DAAS; editing frozen docs;
Phase 2 V2 re-scope (separate workstream, gated on the ratification PR).
