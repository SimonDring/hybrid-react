# 05 — TAS Structural Repair (AQ-9)

**Status: BATCH PROPOSAL — working doc (T4) · 2026-07-13 · nothing herein is applied; Simon's ratification PR applies it**
Spec: [`docs/superpowers/specs/2026-07-13-phase1-amendment-batch-design.md`](../../superpowers/specs/2026-07-13-phase1-amendment-batch-design.md)

Target document: [`docs/architecture/TAS.md`](../../architecture/TAS.md) (v1.0, frozen 2026-07-01).
Evidence: [governance audit 05, GA-509](../../reviews/2026-07-11-governance-audit-05-tas.md) · [audit 09 §3, AQ-9 entry](../../reviews/2026-07-11-governance-audit-09-verdict-and-register.md) · benchmark P5.1.

> **This is the batch's one purely structural item.** It changes **zero policy and
> zero behaviour**. Every rule the restored section states already binds today, at
> the point in the TAS where it is enforced; every cross-reference correction points
> an existing sentence at the section that already contains what it describes. If
> ratifying this amendment changed what any engineer or reviewer is required to do,
> it would be drafted wrongly — that is the acceptance test for the whole file.

---

## 1. Diagnosis — how the §-map drifted (verified against the file)

The TAS's "How to read" map promises this layout:

> - **§6–§11** — the cross-cutting architectures: knowledge flow, data lifecycle,
>   configuration, learning, explainability, extensibility.
> - **§12–§15** — testing, observability, future AI, security & privacy.

That is the **planned map**: §6 knowledge · §7 data lifecycle · §8 configuration ·
§9 learning · §10 explainability · §11 extensibility · §12 testing · §13
observability · §14 future AI · **§15 security & privacy** · §16 review · §17
migration.

During drafting, the data-flow material that would have occupied two sections was
folded into one, leaving a tombstone heading:

> `# 8. (folded into §7 — the data lifecycle is the single source for data flow)`

The tombstone kept the number **8**, so every section from configuration onward
landed one higher than planned (§9…§15), and the planned **§15 Security & Privacy
was never written** — its slot was consumed by the shift, which is also why §16
(review) and §17 (migration) re-align with the plan. The result, confirmed line by
line:

| § | Planned (per the preamble) | Actual (v1.0) |
|---|---|---|
| §6 | Knowledge flow | Knowledge flow ✓ |
| §7 | Data flow & lifecycle | Data flow & lifecycle ✓ |
| §8 | Configuration | *(tombstone — "folded into §7")* |
| §9 | Learning | Configuration |
| §10 | Explainability | Learning |
| §11 | Extensibility | Explainability |
| §12 | Testing | Extensibility |
| §13 | Observability | Testing |
| §14 | Future AI | Observability |
| §15 | **Security & Privacy** | Future AI |
| §16 | Critical review | Critical review ✓ |
| §17 | Migration | Migration ✓ |

Crucially, the document's internal references are **mixed**: some were written
against the planned map (now broken by one, or pointing at the phantom §15), and
some against the actual map (correct today). So the two obvious repairs both fail:

- **Rejected — renumber the body back to the planned map.** It would heal the
  drifted references but break the ≥25 internal references written against actual
  numbering, and break every external citation of the TAS: AIGAS cites **TAS §15
  (Future AI)** six times (`AIGAS.md` lines 65, 142, 188, 215, 400, 401),
  `docs/architecture/README.md` and `MIGRATION-BLUEPRINT.md` cite §16.5/§17, and
  the 2026-07-11 audits cite §13/§14/§15/§16.x throughout (reviews are immutable
  dated evidence — they cannot be updated to follow a renumber).
- **Rejected — insert Security & Privacy as a new §15 and bump Future AI → §16,
  review → §17, migration → §18.** Same external breakage (all six AIGAS §15
  citations, plus every §16.x/§17 citation), for no compensating gain.

**Adopted repair:** *no existing section changes number.* The restored Security &
Privacy section takes the **vacant §8 slot** — replacing the tombstone, which
exists only to explain an empty number — and every drifted or phantom reference is
corrected to the actual map. §8 sits immediately after §7, whose lifecycle diagram
marks the privacy boundary at step ⑧; the placement is natural, and a sweep
confirms **nothing anywhere references "§8"** today, so filling the slot breaks
nothing. All external citations of the TAS remain exactly correct.

The corrected "How to read" map therefore reads: cross-cutting architectures at
**§6–§12** (with security & privacy at §8), and **§13–§15** = testing,
observability, future AI.

---

## 2. AQ-9.1 — Restore the Security & Privacy section at §8

- **Target:** `docs/architecture/TAS.md`, the §8 tombstone (line 715), between §7
  (Data flow & lifecycle) and §9 (Configuration architecture).

- **Current text:**

  > `# 8. (folded into §7 — the data lifecycle is the single source for data flow)`

- **Proposed text** (the heading and note replace the tombstone in full; drafted in
  the TAS's own voice — terse rules, "closes Tn" markers, pointers to the clause
  where each rule binds):

  > # 8. Security & privacy architecture (the trust boundary)
  >
  > > **Restored section (v1.1).** The "How to read" map, §4.7, risk T19, §16.3 C1,
  > > and §17 step 6 all designate this section as the canonical home for security &
  > > privacy; a numbering fold at the original §8 left it unwritten while its rules
  > > landed at their points of enforcement. This section **restates** those rules
  > > and points to where each binds. It adds no new policy. (The data lifecycle
  > > remains solely §7's — nothing here re-describes data flow.)
  >
  > Security and privacy are enforced as **architecture, not convention** (Const.
  > Art 11). The lifecycle marks the boundary (§7 ⑧); this section states the
  > binding rules.
  >
  > ## 8.1 The raw-vitals trust boundary
  >
  > - Raw vitals (health metrics, wearable readings) are **owner-only stored data**
  >   (§7 ⑦; §4.4 Persistence & Sync). They **never have a coach policy** — not a
  >   restricted one, none (§16.3 C1).
  > - The **only** artefact that crosses a person boundary is the **derived**,
  >   server-computed roll-up — `rollUp(athleteState, knowledge) →
  >   CoachVisibleStatus` (§4.1) — materialized server-side (§4.4; §16.1 C1). No
  >   surface ever reads a raw vital across the boundary (closes T19, with §4.4).
  >
  > ## 8.2 Access control
  >
  > - Access is **default-deny**: a predicate that errors denies, never grants
  >   (§4.4 Membership & Access).
  > - Cross-user access only **extends** athlete ownership via deliberate, tested,
  >   team-scoped predicates (`is_coach_of()`-style) — additive, never a bypass
  >   (§4.4; Const. Art 11). **RLS tests are required before relying on a policy**
  >   (§16.3 C1).
  > - Identity is established entirely outside the engine (§4.4 Identity &
  >   Authentication); an auth outage honours cached sessions offline and never
  >   leaks data.
  >
  > ## 8.3 Credentials & keys
  >
  > - Privileged keys (`service_role`-class) are **never client-side** (§16.3 C1).
  > - AI provider keys are **server-side only** (§5.13, hard rule 3).
  >
  > ## 8.4 Enforcement in the build & tests
  >
  > - A **privacy validator fails the build** on any raw-vital coach exposure
  >   (§16.3 C1); knowledge entries pass a privacy sweep on load — no raw-vital KPI
  >   is ever coach-visible (§4.2).
  > - Population learning aggregates **derived signals only**; an aggregation that
  >   cannot guarantee privacy does not run (§4.5, §10).
  >
  > ## 8.5 Audit
  >
  > - Every consequential action — overrides, access to derived surfaces, knowledge
  >   edits, learning changes — is recorded in the append-only Audit Log (§4.4); an
  >   audit write failure is itself an alert, never silently dropped.
  >
  > The rules above bind at their stated points of enforcement; this section is the
  > one place they are read together — the cross-cutting concern of §4.7, given its
  > promised home.

- **Rationale:** GA-509 (AMENDMENT CANDIDATE — the document's designated canonical
  home for security & privacy does not exist; binding privacy rules live scattered
  across §4.4, §7 and a review note); audit 09 §3 AQ-9 (*"restore the dedicated
  section or correct every cross-reference in one versioned amendment"* — this
  proposal does both); benchmark **P5.1** (raw-data inviolability — enforcement),
  where audit 05 holds the TAS at ADEQUATE *solely* because of this structural
  defect, with the substance already judged "near world-class".

- **Consistency:** Every sentence is assembled from existing TAS clauses — the
  sources are §2 corollary 7, §4.1 (`rollUp`), §4.2 (privacy sweep), §4.4
  (Persistence & Sync; Membership & Access; Identity & Authentication; Audit Log),
  §4.5/§10 (population learning), §5.13 rule 3, §7 ⑦/⑧, §16.1 C1, and §16.3 C1.
  No sentence introduces a rule absent from those sources. Where wording is
  condensed, the source clause (pointed to in-line) remains the enforcement text.
  The section deliberately does **not** absorb GA-510's missing consent/export/
  erasure architecture — that is SPEC-FILLABLE, not part of this restoration.

- **Not changed:** §7 in its entirety (its transition notes, including ④, are
  Task P4/AQ-5's territory — see §5 below); the content or number of §9–§17; the
  tombstone's one piece of information ("the data lifecycle is the single source
  for data flow") is preserved inside the restoration note.

---

## 3. AQ-9.2 — Correct every drifted or phantom cross-reference (exhaustive)

- **Target:** the 22 broken §-references below — the complete set, established by
  sweeping **every** `§`-token in `TAS.md` (≈115 occurrences) against the actual
  map, not only the locations GA-509 lists. References to EDS/Knowledge
  Architecture/Ontology sections (e.g. "EDS §41", "Knowledge Architecture §2.2")
  were identified as external and excluded.

- **Current text → Proposed text** (each row: verbatim current fragment → drafted
  replacement; line numbers per frozen v1.0):

| # | Line · location | Current text | Proposed text | Provenance |
|---|---|---|---|---|
| 1 | 27–28 · "How to read" | `**§6–§11** — the cross-cutting architectures: knowledge flow, data lifecycle, configuration, learning, explainability, extensibility.` | `**§6–§12** — the cross-cutting architectures: knowledge flow, data lifecycle, security & privacy, configuration, learning, explainability, extensibility.` | sweep (adjacent to the audit's preamble find) |
| 2 | 29 · "How to read" | `**§12–§15** — testing, observability, future AI, security & privacy.` | `**§13–§15** — testing, observability, future AI.` | GA-509 |
| 3 | 49 · §1.1 row T2 | `§4.3, §7, §12` | `§4.3, §7, §16.1` | sweep — see the flag below the table |
| 4 | 50 · §1.1 row T3 | `§6.10, §9, §13` | `§6, §9, §14` | sweep ×2 — phantom `§6.10` (§6 has no numbered subsections; its "Versioning & updates"/"Reproducibility (T3)" bullets are the referent) + observability drift (§14 closes "the observability gap behind T3" in its own closing line) |
| 5 | 61 · §1.2 row T9 | `§5.13, §14` | `§5.13, §15` | sweep — T9's resolution is the Future AI section (off-critical-path invariants), not observability |
| 6 | 86 · §1.5 row T19 | `§4.4, §15` | `§4.4, §8` | GA-509 |
| 7 | 273 · §4.1 Testing | `CI-enforced determinism (§12).` | `CI-enforced determinism (§13).` | whole-set review (line 273) |
| 8 | 275 · §4.1 Observability | `the observability + explainability substrate are the same data, §11/§13).` | `…the same data, §11/§14).` | sweep |
| 9 | 300 · §4.2 Observability | `the "knowledge tracing" the brief asks for, §13).` | `…the brief asks for, §14).` | sweep — "Knowledge tracing" is a §14 table row |
| 10 | 456 · §4.6 Testing | `**coach acceptance tests** (§12);` | `**coach acceptance tests** (§13);` | sweep — "Coach acceptance" is a §13 table row |
| 11 | 465 · §4.7 | `**Observability** (§13),` | `**Observability** (§14),` | sweep |
| 12 | 466 · §4.7 | `**Versioning & Reproducibility** (§6.10/§9),` | `**Versioning & Reproducibility** (§6/§9),` | sweep — phantom `§6.10` |
| 13 | 466 · §4.7 | `**Security & Privacy** (§15).` | `**Security & Privacy** (§8).` | GA-509 |
| 14 | 542 · §5.4 | `the engine emits a **knowledge-access trace** (§13)` | `…knowledge-access trace** (§14)` | sweep |
| 15 | 631 · §5.13 | `are recorded in §14.` | `are recorded in §15.` | sweep — the AI candidate-decision table + carried-forward open question live in §15 |
| 16 | 794 · §11 | `**The same trace is the observability and audit substrate** (§13)` | `…substrate** (§14)` | sweep |
| 17 | 909 · §16.1 C2 | `**Revision:** §12 adds a cross-runtime determinism test` | `**Revision:** §13 adds a cross-runtime determinism test` | GA-509 |
| 18 | 916 · §16.1 C3 | `Noted as a retention policy in §13.` | `Noted as a retention policy in §14.` | sweep — trace persistence/replay is §14's subject |
| 19 | 938 · §16.3 C1 | `**Revision:** §15 makes the raw-vitals boundary a **trust boundary**…` | `**Revision:** §8 makes the raw-vitals boundary a **trust boundary**…` | GA-509 |
| 20 | 1012 · §17 step 6 | `**Server roll-up + materialized coach surface (§4.4, §15).**` | `**Server roll-up + materialized coach surface (§4.4, §8).**` | GA-509 |
| 21 | 1067 · Appendix B | `Raw-vitals trust boundary; server-side roll-up (§7, §15)` | `Raw-vitals trust boundary; server-side roll-up (§7, §8)` | sweep — this §15 means the privacy section, not Future AI (the row's subject is the trust boundary) |
| 22 | *n/a* | *(the phantom §15 as a section)* | *(restored as §8 — AQ-9.1)* | GA-509 |

  **Flag on row 3 (T2) — the one genuinely ambiguous reference.** T2 ("cache vs
  store-as-truth is never distinguished") lists `§12` as a resolver, but *neither*
  reading resolves it: actual §12 (extensibility) and planned §12 (testing) are
  both silent on caching. The sections that in fact claim to close T2 are §4.3
  ("closes T2, T11") and §7 note ④ ("closes T2"); the cache-vs-materialize
  distinction is drawn in §16.1 C1. The proposal therefore points the third
  reference at §16.1; the equally defensible minimal alternative is to drop it,
  leaving `§4.3, §7`. **Ratifier's choice — both are recorded here so the pick is
  deliberate.**

- **Rationale:** GA-509 ("…or correcting every cross-reference"); audit 09 §3 AQ-9
  ("numbering drifts by one after §11" — precisely: for references written against
  the planned map, from configuration onward); benchmark P5.1. GA-509 listed six
  locations and the whole-set review added line 273; **this sweep found 14
  additional drift-family defects** (rows 1, 3, 4 ×2, 5, 8, 9, 10, 11, 12, 14, 15,
  16, 18, 21) — every one individually verified against the content of both the
  planned-map and actual-map target before classification.

- **Consistency — references examined and deliberately left unchanged** (the other
  half of exhaustiveness):
  - All references to **§9 (configuration), §10 (learning), §11 (explainability),
    §12 (extensibility)** in their actual meanings — e.g. line 266 "hidden
    configuration — §9", line 429 "reviewed knowledge — §10", T17/T22 → §11,
    line 876 "(§6, §12)", line 815 "(§9)" — all correct against the actual map
    (these were written, or updated, post-drift).
  - Line 961 (§16.4 C2) `§6 and §13 make knowledge versioned, provenance-stamped,
    freshness-watched` — defensible as-written: actual §13's "Knowledge
    validation" row covers schema + invariant + **provenance** validators. No
    repair proposed; benign under either reading.
  - Lines 30, 565 (§16), 965/992 (§17), 1070 (§17), 1065 (Appendix B `(§5.13,
    §15)` — correctly the Future AI section): all correct; §16/§17 never drifted.
  - Appendix anchor links (`#appendix-a…`, `#appendix-b…`): intact.

- **Not changed:** no section is renumbered; no sentence changes meaning — every
  edit makes a sentence point at the section that already contains exactly what
  the sentence describes.

---

## 4. AQ-9.3 — Two wrong-target references found by the sweep (separable; ratifier may strike)

Outside the ±1 drift family, the exhaustive sweep found two references whose
target section exists but does not contain the referenced rule. They are offered
**separately** because they are not part of GA-509's verified defect and carry
lower confidence about authorial intent; striking this sub-item leaves AQ-9.1/9.2
whole.

- **Target:** `docs/architecture/TAS.md` lines 739 and 946.
- **Current text:**
  - Line 736–739 (§9, rule 2): `No "feature flag" in the engine may change *reasoning* — that would be hidden, unversioned knowledge (§5.1).`
  - Line 945–946 (§16.3 C2): `the engine rejects any reasoning-changing flag (§5.1).`
- **Proposed text:** in both, `(§5.1)` → `(§4.1)`.
- **Rationale:** §5.1 (the decision pipeline & execution order) contains no
  flag rule under either numbering map — §5.x never drifted. The rule referenced
  actually lives in §4.1's Configuration bullet: *"The engine has no feature flags
  that change reasoning (that would be hidden configuration — §9)"* — which itself
  points back at §9, completing the pair. (A `§5.12` reading — versioning,
  "behaviour changes are golden-master-gated" — is possible for line 739's second
  sentence but weaker; §4.1 is where the flag rule is stated.)
- **Consistency:** zero policy change — the flag prohibition binds today via §4.1
  and §9 regardless.
- **Not changed:** anything else about §9 rule 2 or §16.3 C2.

---

## 5. Batch consistency notes

- **AQ-5 / Task P4 (the derived-data doctrine) — disjoint by design.** P4 proposes
  wording at TAS §7 note ④; this repair touches **nothing in §7**. The restored §8
  cites §7 ⑦/⑧ (the boundary steps), not note ④, so both amendments can land in
  either order. One combined TAS version bump for the batch (07's per-document
  bump plan); the restoration note in §8 says "v1.1" and should carry whatever
  number 07 assigns.
- **AQ-8 / Task P6 (AIGAS ratification) — the §15 dependency, resolved in AQ-8's
  favour.** Because this repair keeps **§15 = Future AI architecture**, all six of
  AIGAS's `TAS §15` citations and the AIGAS-review note about "the TAS §15 seam
  text" remain exactly correct — no coordination edit is forced on P6 by this
  file. **Knock-on for 07/P6:** AIGAS lines 59 and 391 cite `TAS §12
  (golden-master, CI determinism)` — the same inherited drift (should be §13).
  AIGAS is not frozen (pending ratification), so that fix belongs in P6's
  reconciliation list, not here.
- **External citations preserved.** Because no section is renumbered,
  `docs/architecture/README.md` (TAS §17), `MIGRATION-BLUEPRINT.md` (TAS §16.5,
  §17), the AMENDMENT-QUEUE row, and every 2026-07-11 audit citation
  (§3.2/§4.x/§7/§13/§14/§15/§16.x/§17) remain accurate — the dated reviews stay
  true as evidence without edits, which a renumber could not have achieved.
- **GA-510 boundary restated:** consent/export/erasure architecture is *absent*,
  not scattered — restoring it would be invention, so it stays out (SPEC-FILLABLE,
  per audit 05).
- **Zero behavioural change, stated explicitly:** no rule is added, removed,
  strengthened, or weakened; no enforcement point moves; the Title III ethical
  floor is untouched (and P5.1's enforcement text is now *easier* to find, which
  can only strengthen review).

## 6. What this proposal deliberately leaves alone

- The content and numbering of §1–§7 and §9–§17 and both appendices.
- §7 note ④ and the derived-vs-stored doctrine (AQ-5's file).
- The GA-502…GA-508/GA-511…GA-513 SPEC-FILLABLE gaps and the GA-512 ND-1 question.
- AIGAS's own text (P6's file) and every review document (immutable evidence).
- Line 961's `§13` and Appendix B line 1065's `§15` — verified correct as written.
