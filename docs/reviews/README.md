# docs/reviews — dated, point-in-time reviews and audits

Documents here (and the in-place documents indexed below) are **REVIEW-classified**:
dated snapshots kept as *evidence* — the record of what was found, when, and why
decisions were taken. A review is accurate **as of its date** and is never updated
afterwards; if reality has moved on, the review stays as written and the living
docs carry the current state.

**Reading rule:** never treat a review's present-tense claims as current. Check the
date, then check `HANDOFF.md` for what has changed since.

New reviews are authored directly into this folder, named `YYYY-MM-DD-<topic>.md`.

## In this folder

| File | Date | What it is |
|---|---|---|
| `STATE-OF-THE-APP-2026-07-07.md` | 2026-07-07 | Plain-English status brief after the 30-PR programme. Written hours before the build flip deployed — its "#1 remaining gap: the build flip" is resolved. |
| `2026-07-09-documentation-audit.md` | 2026-07-09 | Governance sprint Phase 0: full documentation inventory, classification, and conflict report (incl. the C1–C5 amendment queue). |
| `2026-07-09-architecture-review.md` | 2026-07-09 | Phase 1: executive architecture assessment, dependency review, architecture (AR1–8) + scalability (SR1–7) risk registers. |
| `2026-07-09-technical-debt-register.md` | 2026-07-09 | Phase 1: TD-01…TD-29 consolidated debt register with owner-decision flags. |
| `2026-07-09-platform-health-reverification.md` | 2026-07-09 | Phase 1: every 2026-07-06 Health Report finding re-verified against code with evidence. |
| `2026-07-09-decision-engine-review.md` | 2026-07-09 | Phase 2: Olympic-institute-standard engine review (W1–W10, risks, 4-wave migration strategy). |
| `2026-07-09-knowledge-architecture-review.md` | 2026-07-09 | Phase 3: knowledge base graded against the frozen KA/Ontology standards (K1–K3). |
| `2026-07-09-ai-architecture-review.md` | 2026-07-09 | Phase 4: AI seam vs AIGAS compliance; pre-go-live checklist; Stage 6 readiness. |
| `2026-07-09-data-architecture-review.md` | 2026-07-09 | Phase 5: data ownership/RLS verification, learning readiness, scaling walls (F1–F9). |
| `2026-07-09-testing-strategy.md` | 2026-07-09 | Phase 6: the eight-layer testing strategy (proposal — graduates into living docs if adopted). |
| `2026-07-09-strategic-roadmap.md` | 2026-07-09 | Phase 7: prioritised roadmap — Immediate → Short → Medium → Long → Research → Never. |

## Reviews that live elsewhere (kept in place — referenced by frozen docs or code)

| Document | Date | Why it stays put |
|---|---|---|
| `docs/decision-engine-evaluation.md` | 2026-06-21 | Linked from the frozen EDS; the founding engine evaluation (F1–F10) and golden-master seed. |
| `docs/engine/01-PANEL-REVIEW.md` | 2026-06-23 | Linked from the frozen EDS; the evidence base its laws cite. |
| `docs/engine/06-SEED-EVIDENCE-REVIEW.md` | 2026-07-04 (status 2026-07-05) | Provenance record for the C1–C14 seed-data corrections; part of the numbered engine set. |
| `docs/engine/07-SKB-PROFILE-REVIEW.md` | 2026-07-04 | SKB schema-conformance audit; part of the numbered engine set. |
| `docs/engine/08-SKB-CONSUMPTION-AND-SEASON-AUDIT.md` | 2026-07-08 | The audit that triggered PRs #160/#161; its headline findings are resolved — kept as the record of why. |
| `docs/architecture/REASSESSMENT-2026-07-05.md` | 2026-07-05 | Referenced by test files and the D7 spec; the WP-38…WP-61 ledger other docs cite by number. |
| `docs/architecture/AIGAS-REVIEW-2026-07-06.md` | 2026-07-06 | The AIGAS ratification evidence; kept beside `AIGAS.md`. |
| `docs/foundation/PANEL-REVIEW.md` | 2026-07-01 | Provenance for the frozen foundation set; referenced by frozen docs. |
| `docs/SECURITY-AUDIT.md` | 2026-06-21 + living addendum | The June body is a dated audit; its S1–S15 addendum is a live tracker paired with `supabase/SECURITY-DEPLOY.md`. |
