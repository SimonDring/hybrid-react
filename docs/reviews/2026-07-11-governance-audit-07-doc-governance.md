# Governance Audit 07 — Documentation Governance + Index vs the Benchmark

**Class: REVIEW (T5) · dated evidence, never current state · 2026-07-11**
**Pin: frozen set v1.0 (2026-07-01) · `main @ fc5e3f8` · KSV 1.30.0**
**Spec: [`docs/superpowers/specs/2026-07-11-governance-forensic-audit-design.md`](../superpowers/specs/2026-07-11-governance-forensic-audit-design.md) · Benchmark: [`…-00-benchmark.md`](2026-07-11-governance-audit-00-benchmark.md)**

---

This is the PROCESS audit of the set: it judges
`docs/DOCUMENTATION-GOVERNANCE.md` (v1.0, 2026-07-09 — cited below as **GOV**)
and `docs/DOCUMENTATION-INDEX.md` (cited as **INDEX**, by section heading — it
carries no § numbers) against the benchmark slices their role owns. The
question is not whether the documents are tidy — Sprint 1 proved that — but
whether the governance *machinery itself* (precedence, amendment, ratification,
ownership assignment, review cadence) scales to the end-state ambition.

One property shapes every finding below: **GOV is a living document**
("Status: governing (living)", GOV header) and INDEX is class WORKING (INDEX
header). Neither is frozen. Gaps in the process layer are therefore closable
by deliberate edits to these documents under their own rules — almost nothing
found here requires amending the frozen set.

## §1 Role and owned slices

**Role** (00 §3): *"DOC-GOVERNANCE + INDEX — the process: precedence,
lifecycle, amendment, ownership."* GOV is the documentation constitution — how
documents are classified, placed, changed, and ranked (GOV header, §1–§8).
INDEX is the master map — what every governed document is, owns, and depends
on, with the governedness criterion "If a document isn't listed here, it isn't
governed" (INDEX header).

**Owned slices** per 00 §3:

- **Owns: P6.5** — the governance process itself scaling (amendment pipeline,
  document ownership map, staleness controls load-tested for a 10×
  documentation surface; amendments at a usable cadence; exactly one owner per
  concept; drift detected by process rather than heroics).
- **Co-owns: P3.2** (knowledge versioning & review cadence — the *process*
  side: document-level versioning, dating, and review scheduling; the
  entry-level side is the Knowledge Architecture's).
- **Co-owns: P3.4** (knowledge retirement/supersession — the *process* side:
  how documents are superseded, banner-stamped, archived, and kept from
  silently influencing readers; the decision-influence side is KA/EDS
  territory).

## §2 Coverage table

| Capability | Verdict | Cited Article/§ | Reasoning |
|---|---|---|---|
| **P6.5** — governance process scaling | `THIN` | GOV §1 (precedence), §3 (amendments — delegates to Constitution *Amendment & Stewardship*), §5 (one owner per concept), §6 (ownership), §8 (staleness sweep); INDEX header + "T0–T2 · Canonical" table | Real machinery exists at every station — precedence ladder, status classes, one-owner rule, archive discipline, a sweep template — but the pipeline is built for a ~150-file surface with a trickle of amendments. Its intake end (no ratification/adoption path into T2 — AIGAS "pending its ratification panel", GOV §3, with no panel defined anywhere), its throughput end (no batching, cadence, or SLA; the C1–C5 queue's designated home is a REVIEW file GOV §2 forbids editing), and its detection end (GOV §8's sweep checks SUPPORTING docs' present-tense claims only; frozen docs are re-validated against the ambition by no scheduled process) would not survive the 10× surface and audit-driven amendment volume the end-state generates. Individual sub-slices are `SILENT` — itemised with what-breaks/when-bites/absorbable in GA-702, GA-703, GA-704, GA-705 (§4). |
| **P3.2** (co-own, process side) — versioning & review cadence | `ADEQUATE` | GOV §2 (classes + editability), §3 (version-bump on amendment), §6 ("Documents making time-sensitive claims must carry their date"), §8 (staleness sweep, "recommended cadence: after each major milestone"); INDEX header ("last full audit 2026-07-09") | Document-level versioning and dating are governed (status line + class + date on every new doc, GOV §6; version bumps ride amendments, GOV §3), and a repeatable sweep exists with a named template (GOV §8). But the cadence is advisory ("recommended"), milestone-triggered rather than scheduled, and there are no per-document review dates or next-review owners — the whole surface is swept at once or not at all. Sound today; short of world-class scheduling discipline at end-state scale. |
| **P3.4** (co-own, process side) — retirement/supersession | `WORLD-CLASS` | GOV §4 rules 1, 4, 5; §5 (lifecycle diagram, "Banners, not rewrites", REVIEW never refreshed); §2 (ARCHIVE class); §8 (reclassification = index update + move/banner in one commit with reasoning) | The document-supersession machinery is precise, complete, and mechanical: never delete; git-mv to archive only when nothing frozen/executable references the path, banner-in-place otherwise (reference stability beats tidiness, GOV §4.1); reviews stay true as-of-date forever and are superseded by *new* reviews, not rewrites (GOV §5); reclassification is a single auditable commit (GOV §8). Nothing material is missing at end-state ambition for the process side of this capability. |

## §3 What is world-class here

Recorded honestly as positives (aggregated as COVERED findings GA-707, GA-708):

1. **The precedence model is crisp and complete for the documents it names.**
   GOV §1 gives a seven-tier ladder, a within-tier tie-breaker (frozen beats
   non-frozen; recency wins between non-frozen *and* obliges fixing the staler
   doc), and two corollaries that do real work: "Implementation never outranks
   specification" and "Status lives in working docs, never in specs." The
   second is derived from a named, dated, observed failure mode ("found
   2026-07-09 in ~20 documents", GOV §1) — governance built from evidence, not
   taste.
2. **Status classes carry editability semantics.** GOV §2's five classes each
   answer "may it be edited?" — including the subtle REVIEW rule (banner
   additions only; a review is true as of its date, forever). This single
   table is why this audit set can exist as stable evidence.
3. **The supersession/archive machinery** (see the P3.4 row) — including the
   reference-stability rule (GOV §4.1), which correctly prices link integrity
   to frozen docs above filesystem tidiness.
4. **The index's governedness criterion.** "If a document isn't listed here,
   it isn't governed — add it or archive it" (INDEX header) makes ungoverned
   documents *definitionally visible*, and GOV §7's every-README-lists-every-
   document rule closes the same hole one level down, again citing the
   observed defect that motivated it (three indexes silently omitting
   documents).
5. **The process layer is deliberately living.** GOV governs the frozen set
   without being frozen itself (GOV header), so the process can improve at
   working-doc speed while the constitution it administers stays stable. That
   one design choice is why nearly every finding below is absorbable without
   amendment.

## §4 Findings

Format: ID · capability · verdict · citation · narrative · class · proposed
direction.

- **GA-701** · P6.5 (amendment throughput) · `THIN` · GOV §3; Constitution
  *Amendment & Stewardship*; evidence: `docs/reviews/2026-07-09-documentation-audit.md`
  §2 (C1–C5 queued 2026-07-09), HANDOFF.md open queue #8 (still queued as of
  the pin) · The amendment process is defined for *rarity*: one written
  proposal, whole-set consistency review, version bump, reconciliation of
  every affected document "in the same change" (Constitution, *Amendment &
  Stewardship*; GOV §3). There is no batching mechanism, no review panel, no
  cadence, and no register format. Load evidence at the pin: C1–C5 have sat
  unprocessed since 2026-07-09, and this audit alone mints AMENDMENT
  CANDIDATE findings across seven blocks (GA-1xx–8xx), with the parked V2
  design set behind it. A queue that only ever grows converts the freeze
  discipline from integrity into preservation of known error (C3's stale
  sport counts already sit *inside* frozen docs). Bites: immediately —
  deliverable 09's register lands on this pipeline. Absorbable: yes — a
  batching/panel protocol is compatible with the Constitution's text (nothing
  there forbids one reconciled pass carrying many amendments) and can be
  specified in the living GOV · **SPEC-FILLABLE** · Define an amendment-batch
  protocol (register format, panel/review step, per-milestone cadence) in GOV
  §3 or a T3 process spec.
- **GA-702** · P6.5 (amendment queue home) · `SILENT` · GOV §3 vs GOV §2 ·
  GOV §3 directs: "Add newly-found frozen-doc defects to that queue" — but
  the queue's designated home is `2026-07-09-documentation-audit.md` §2, a
  REVIEW-class document that GOV §2 forbids editing beyond banner additions.
  The amendment queue therefore has no legitimate living home: following §3
  violates §2. **What breaks:** either the queue fossilises at C1–C5 (new
  candidates scatter into HANDOFF, review files, and session memory) or
  REVIEW immutability is quietly breached — both are drift-by-process.
  **When it bites:** now — this audit's AMENDMENT CANDIDATE findings need a
  place to queue the moment deliverable 09 aggregates them. **Absorbable
  without amendment: yes** — GOV is living; designate a WORKING-class
  amendment register (a new T4 doc) and repoint §3 in one normal edit ·
  **SPEC-FILLABLE** · Create a WORKING amendment register and amend GOV §3's
  pointer; the 2026-07-09 audit §2 stays as the dated evidence it is.
- **GA-703** · P6.5 (ratification / T2 entry path) · `SILENT` · GOV §1 (tier
  ladder enumerates T2 by name), §3 ("AIGAS is governing-designate pending its
  ratification panel"); INDEX "T0–T2 · Canonical" ("pending panel +
  ratification"); evidence: `docs/architecture/AIGAS-REVIEW-2026-07-06.md`
  (recommends ratification), 2026-07-09 audit §2 C14, HANDOFF open queue #3 ·
  There is no defined path by which a document *becomes* governing: no
  definition of the ratification panel (composition, checks, quorum, output),
  no procedure for admitting a new peer into T2 or the frozen set — both are
  defined by enumeration only. Live evidence: AIGAS has waited in
  "governing-designate" limbo since 2026-07-06 with its recommending review
  in hand, because no process exists to execute the recommendation. **What
  breaks:** every NEW-DOCUMENT CANDIDATE this audit produces (00 §3 names a
  Data & Analytics Architecture Specification peer to the EDS, and a possible
  athlete-safeguarding spec) would inherit AIGAS's limbo — authored, cited,
  load-bearing, but never formally binding, which corrodes the precedence
  model itself (what wins: a frozen doc or an unratified peer that
  contradicts it?). **When it bites:** the moment deliverable 09 rules on the
  new-document hypothesis; structurally already biting via AIGAS at Stage 6's
  gate. **Absorbable without amendment: yes** — a ratification protocol
  (panel definition, entry criteria for T2, freeze criteria) is process, and
  GOV is living · **SPEC-FILLABLE** · Add a "how a document enters T2 / the
  frozen set" section to GOV: panel composition, checks, and the
  designate→ratified→frozen state machine; run AIGAS through it first as the
  proving case.
- **GA-704** · P6.5 (owner assignment for new concept families) · `SILENT` ·
  GOV §5 ("One owner per concept… see the index"), §6; INDEX "Owns (canonical
  for)" column · The one-owner rule is stated for concepts that already have
  owners, and the index records ownership as coarse per-document prose
  clusters — there is no concept→owner lookup and no assignment procedure for
  a genuinely NEW concept family. Live evidence: benchmark 00 §3 had to
  *construct* ownership of the athlete data & analytics cluster (P2.1–P2.11,
  P3.5) by altitude reasoning, because no governed mechanism answers "which
  document owns testing batteries?" — and its answer was "plausibly none;
  candidate new document." **What breaks:** each new domain the ambition adds
  (analytics, endurance, safeguarding, native platforms) either lands
  ownerless (ungoverned by GOV's own definition) or gets claimed by multiple
  documents — recreating the duplicate-ownership defect GOV §5 exists to
  prevent. **When it bites:** Stage 5–6, as team analytics and AI docs are
  authored; already visible in this audit's new-document territory.
  **Absorbable without amendment: yes** — an assignment step ("before
  authoring, register the concept family and its owning document in the
  index") is an INDEX/GOV process edit · **SPEC-FILLABLE** · Add an
  owner-assignment rule to GOV §5/§6 and give INDEX a concept-family→owner
  table alongside the per-document table.
- **GA-705** · P6.5 (scheduled re-validation of frozen docs against the
  ambition) · `SILENT` · GOV §3 (defects queue reactively), §8 (sweep scope:
  "checks SUPPORTING docs' present-tense claims against HANDOFF") ·
  Frozen documents are re-examined only when someone finds a defect; the one
  scheduled control (the staleness sweep) explicitly scopes to SUPPORTING
  docs' status claims. Nothing re-validates the frozen set against the
  *ambition* on any schedule — this very audit exists only because Simon
  commissioned it ad hoc, which is precisely the "heroics" P6.5 rules out.
  The failure mode GOV was built from (present-tense rot, GOV §1) is
  detected; the failure mode this audit exists for (end-state inadequacy of
  frozen content) has no detector. **What breaks:** benchmark drift — the
  frozen set silently falls behind the vision between heroic audits, and
  amendment candidates arrive in indigestible bursts (compounding GA-701)
  rather than a steady trickle. **When it bites:** each stage transition
  (Stage 5 team workflows, Stage 6 AI, Stage 7 endurance/native) — the
  moments the frozen abstractions are next stress-tested. **Absorbable
  without amendment: yes** — extend GOV §8's sweep with a per-stage-gate
  "frozen-set vs ambition" review obligation; no frozen text changes ·
  **SPEC-FILLABLE** · Add a scheduled governance review (per stage
  transition or per N months) to GOV §8, with this audit set as its
  template.
- **GA-706** · P6.5 (drift detection by process at 10× surface) · `THIN` ·
  INDEX header + whole-file structure; GOV §6 (end-of-session index update),
  §7 (READMEs list every document) · The governedness invariant ("if it
  isn't listed, it isn't governed") is enforced entirely by manual
  discipline: one hand-maintained flat file plus a hand-drawn dependency map,
  updated at session end by whoever remembers (GOV §6). At today's ~150
  files this works — the 2026-07-09 audit proved it can be made true in one
  pass. At the 10× surface P6.5 specifies, an unlisted document is invisible
  precisely *because* nothing mechanical compares `docs/` against INDEX; the
  2026-07-09 audit itself found three directory indexes silently omitting
  documents (GOV §7), demonstrating the failure mode at even the current
  scale. Bites: progressively through Stage 5–7 as the surface grows.
  Absorbable: yes — a CI check (every tracked doc has an index entry / every
  directory README is complete) is tooling under existing governance ·
  **SPEC-FILLABLE** · Specify a mechanical index-completeness check in GOV §7
  and wire it into CI as a docs gate.
- **GA-707** · P6.5 (precedence, classes, lifecycle — the covered core) ·
  `WORLD-CLASS` (sub-slice) · GOV §1, §2, §5; INDEX header · The
  precedence ladder with tie-breakers and evidence-derived corollaries, the
  editability-bearing status classes, and the lifecycle rules are world-class
  process governance for the documents that exist — see §3 items 1, 2, 4, 5 ·
  **COVERED** · None — record and keep.
- **GA-708** · P3.4 (process side) · `WORLD-CLASS` · GOV §4 rules 1/4/5, §5,
  §8 · Document supersession is governed end-to-end: banner vs archive
  decided by reference topology, never delete, reviews superseded only by new
  reviews, reclassification as one auditable commit — nothing material
  missing at end-state ambition for the process half of this capability ·
  **COVERED** · None — the decision-influence half of P3.4 belongs to KA/EDS
  and is judged in deliverables 03/04.
- **GA-709** · P3.2 (process side) · `ADEQUATE` · GOV §6, §8; INDEX header ·
  Dating and versioning are mandatory and governed, but review cadence is a
  recommendation triggered by milestones, with no per-document review dates
  or owners — at end-state scale, "sweep everything after big events" leaves
  long-lived T3 references (the benchmark's five-year-stale claim, P3.2)
  undetected between milestones · **SPEC-FILLABLE** · Add per-document
  next-review dates to INDEX entries (or a review-due column) and make the
  sweep cadence a rule rather than a recommendation.

## §5 Over-specification risks

Places where GOV/INDEX rules could strangle the end-state ambition:

1. **The single-tracker rule at multi-stream scale.** GOV §5: HANDOFF is "the
   *only* living status tracker — no other document may claim that role",
   target ≈150 lines. With the end-state's parallel streams (engine, team
   package, AI layer, native platforms, research), one small file becomes a
   contention point and forces either rule-breaking shadow trackers or an
   unreadable HANDOFF. The rule's *intent* (one authoritative status root) is
   right; the *cardinality* (one file, one sitting) is a today-shaped
   constraint. Absorbable by evolving §5 toward "one status root, delegating
   to per-stream trackers it indexes" — a living-doc edit.
2. **Reference stability compounding into permanent clutter.** GOV §4.1's
   never-move rule is correct per-document, but at 10× surface, decades of
   archived-in-place, banner-stamped files interleaved with live ones make
   directories progressively harder to read — the rule optimises for frozen
   citations at the growing expense of navigability, with no counter-pressure
   defined. Mild; the INDEX mitigates it if INDEX scales (GA-706).
3. **Freeze discipline without throughput.** GOV §3's absolutism ("including
   'harmless' fixes") is the right integrity posture *only* in combination
   with a working amendment pipeline. As long as GA-701/GA-702 stand, the
   rule guarantees frozen documents accumulate known errors indefinitely
   (C1–C5 as standing evidence) — the risk is not the rule but the rule
   unaccompanied. Fix the pipeline, keep the rule.

## §6 Load-bearing assumptions the end-state falsifies

1. **One maintainer plus AI sessions.** GOV §6 states it outright: "There is
   one maintainer (Simon) and AI sessions acting under CLAUDE.md" — so
   "owner" was deliberately redefined to mean *documents*, not people. The
   end-state (clubs, coaches, plausibly collaborators and science reviewers)
   reintroduces human owners: who may propose amendments, who sits on
   ratification panels, who signs off knowledge intake. The section will need
   a human-roles layer; today it has none. Falsified at team/organisational
   scale (Stage 5+).
2. **The governing set is closed.** GOV §1 and §3 define T2 and the frozen
   set by naming their members; INDEX hard-codes them in its table and
   diagram. The ambition adds governing documents (00 §3's new-document
   territory), which this enumeration cannot admit without the missing entry
   path (GA-703). Falsified the first time deliverable 09 recommends a new
   governing document.
3. **The surface is hand-indexable and hand-sweepable.** Every control (index
   completeness, staleness sweep, end-of-session updates) is manual, sized to
   ~150 files and one contributor. Falsified at the 10× surface P6.5
   specifies (GA-705, GA-706).
4. **Amendments are rare single events.** The Constitution's process and GOV
   §3 assume a trickle; audit-driven development (Sprint 2's registers, this
   audit's register, the parked V2 set) produces batches. Falsified now
   (GA-701).
5. **Drift means status rot.** GOV was forged from the 2026-07-09 failure
   mode — present-tense claims going stale — and its controls all point at
   that. The second drift axis, *frozen content falling behind the ambition*,
   is undetected by design (GA-705). This audit is the falsifying instance:
   it had to be commissioned, not triggered.

## §7 Document verdict

For the surface it governs today, this pair is arguably the best-executed
governance in the repository: an evidence-derived precedence model, status
classes that carry editability semantics, world-class supersession machinery,
and a definitional test for governedness — all authored as a *living* layer
above the frozen set, which is exactly the right structural choice. But judged
against P6.5's actual demand — a process load-tested for a 10× surface — the
pipeline is thin at all three ends: intake (no ratification or T2-entry path;
AIGAS's five-day-and-counting limbo at the pin is the live proof), throughput
(no batching or cadence, and an amendment queue whose designated home is a
document the rules forbid editing), and detection (staleness controls that
watch status rot but are structurally blind to ambition drift, and an index
whose completeness rests on manual heroics). The saving grace is the design
itself: because GOV is living and INDEX is working, every one of GA-701–706
and GA-709 is absorbable by deliberate edits to these two documents under
their own rules — no frozen-set amendment required. This is the one document
audit in the set where the gaps are cheap to close; they should be closed
before deliverable 09's register lands on the pipeline they describe.
