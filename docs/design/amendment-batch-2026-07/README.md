# Amendment Batch 2026-07 — AQ-1…AQ-9 (Phase 1)

**Status: BATCH PROPOSAL — working doc (T4) · 2026-07-13 · nothing herein is applied; Simon's ratification PR applies it**
Spec: [`docs/superpowers/specs/2026-07-13-phase1-amendment-batch-design.md`](../../superpowers/specs/2026-07-13-phase1-amendment-batch-design.md) · Protocol: [`docs/DOCUMENTATION-GOVERNANCE.md`](../../DOCUMENTATION-GOVERNANCE.md) §3 (*Batch amendments*, *Ratification*) · Evidence: the 2026-07-11 governance audits (00–09), register rows in [`docs/AMENDMENT-QUEUE.md`](../../AMENDMENT-QUEUE.md)

This directory is the complete, reconciled, ratification-ready **batch
proposal** for amendment-queue items AQ-1…AQ-9 — the first execution of the
governance batch protocol. Every file quotes the frozen documents and drafts
against them; **no frozen document has been edited**. The whole-batch
consistency review (07) has run: two cross-file contradictions and six lesser
findings were fixed in place; the batch is internally consistent and confirmed
to weaken nothing in Title III/IV.

## Contents

| File | Items | What it proposes |
|---|---|---|
| [`01-constitution.md`](01-constitution.md) | AQ-1, AQ-6, AQ-7 | Preamble names the second product (the evidence-graded understanding of the athlete) + two-path existence test; **Article 21** (developmental-stage duty of care) and **Article 22** (athlete data ownership & consent) in Title III; numbering convention, floor, tier-1 integration |
| [`02-ontology.md`](02-ontology.md) | AQ-2, AQ-4.1 | The Analysis Spine (fourth structure, §1.4); **Family VIII — Measurement & Analysis** (Assessment, Test Result, Match Performance, External Load Observation, Insight, Squad Signal, Report); renumbering + relationship rows; the additive-extension clause (ontology half) |
| [`03-eds.md`](03-eds.md) | AQ-3, AQ-4.2 | **D17 · Observation & Analysis** (a decision family) + four reconciliation edits (§21, §23, §27 rule 3); the catalogue extension clause (§20.1 + §42) |
| [`04-derived-data-doctrine.md`](04-derived-data-doctrine.md) | AQ-5 | One doctrine, three in-voice edits (KA §2.1/§2.3 · EDS §27 · TAS §7): derived values stay recomputable-not-truth for current state; point-in-time derived values MAY be materialised as dated, stamped, append-only historical evidence |
| [`05-tas-structural-repair.md`](05-tas-structural-repair.md) | AQ-9 | The batch's one purely structural item: Security & Privacy restored at the vacant §8 (no section renumbers); all 22 drifted/phantom cross-references corrected; two separable wrong-target fixes (AQ-9.3) |
| [`06-aigas-ratification.md`](06-aigas-ratification.md) | AQ-8 | Ratify AIGAS as the sixth governing document via the GOV T2-entry path: the proposal, the panel-review step (both options prepared), findings dispositions, the 15-item reconciliation list, Stage 6 consequences |
| [`07-consistency-review.md`](07-consistency-review.md) | — | The protocol-mandated whole-batch review: interaction matrix, precedence check, Title III confirmation, quote-accuracy results, rulings R1–R15, findings F1–F13, **the per-document version-bump plan** (one v1.0→v1.1 bump per document) |

## Reading order

1. **This cover**, then **07** §5–§6 first if you want the review's rulings and
   what was fixed before reading the proposals.
2. **01 → 02 → 03 → 04** — the doctrine arc: purpose (second product) →
   vocabulary (entities + spine) → decisions (D17 + extension clauses) →
   storage doctrine (dated history). Each file's Consistency notes assume the
   ones before it.
3. **05** (standalone, zero-policy structural repair) and **06** (the AIGAS
   ratification package — read §2's Option A/B choice carefully).
4. **07** in full — the interaction matrix and version-bump plan are the
   batch-level view.

## How ratification works (per the GOV batch protocol)

1. **Simon reviews this batch** — accepting, editing, or striking any entry.
   Deliberately separable pieces are marked in place: AQ-9.3; the row-3 T2
   reference choice in 05; the AQ-6/AQ-7 partial-ratification contingency in
   01; Option A vs B in 06.
2. **Nothing in this directory applies itself.** Simon's **ratification PR**
   applies the accepted proposals to the frozen documents — with one version
   bump per document (07 §7) and the living-doc reconciliations (06 §4) in the
   same change. **His merge is the ratification** (GOV §3: "merging the
   ratification change counts").
3. On merge, the register rows in `docs/AMENDMENT-QUEUE.md` flip
   BATCHED → RATIFIED (or REJECTED, with the reason in Notes). Under 06's
   Option B, AQ-8 alone flips at its follow-up panel + flip PR.
4. These proposal files then stand as the batch's immutable drafting record
   (this directory is cited in each document's revision note).

## The decision that unlocks ND-1 (please answer explicitly)

> **Simon — do you approve the AQ-1 and AQ-2 direction?** That is: (AQ-1) the
> Constitution names the **evidence-graded understanding of the athlete** as
> the platform's second product, in service of the same single objective; and
> (AQ-2) the Ontology gains the **Measurement & Analysis entity family + the
> Analysis Spine** as its vocabulary. A yes (even with wording edits) is the
> green light the development plan requires to start **ND-1 — the Data &
> Analytics Architecture Specification — as its own sprint**; a no re-scopes
> ND-1 before any drafting starts. This question is separate from — and can be
> answered before — full ratification of the batch.

**Status line:** drafted 2026-07-13 · consistency-reviewed 2026-07-13 (07:
F1–F8 applied) · **awaiting Simon's review and ratification** · register rows
flip QUEUED→BATCHED with this PR.
