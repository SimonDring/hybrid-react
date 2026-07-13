# Batch Proposal 01 — The Constitution (AQ-1, AQ-6, AQ-7)

**Status: BATCH PROPOSAL — working doc (T4) · 2026-07-13 · nothing herein is applied; Simon's ratification PR applies it**

Spec: [`docs/superpowers/specs/2026-07-13-phase1-amendment-batch-design.md`](../../superpowers/specs/2026-07-13-phase1-amendment-batch-design.md)
Target document: [`docs/foundation/CONSTITUTION.md`](../../foundation/CONSTITUTION.md) (frozen v1.0 — READ ONLY; quoted here, never edited here)
Evidence: governance audit 09 §3 (AQ-1, AQ-6, AQ-7) · governance audit 01 (GA-113, GA-107, GA-109; §2 P5.3/P5.7 rows; §5.1, §5.3, §6.1, §6.2) · benchmark 00 §1 and P2 pillar framing, P5.3, P5.7.

---

## What this file proposes

Three amendments to the Constitution, drafted ready for ratification:

| Item | Substance | Entries below |
|---|---|---|
| **AQ-1** | The Preamble names the second product — the evidence-graded understanding of the athlete — in service of the same single objective | AQ-1.1, AQ-1.2 |
| **AQ-6** | A new Title III Article: developmental-stage duty of care | AQ-6.1 |
| **AQ-7** | A new Title III Article: athlete data ownership & consent | AQ-7.1 |
| **AQ-6/7 shared** | Title III integration: Article-numbering convention, the unamendable floor, conflict-order tier 1 | AQ-6/7.2 |

**The Article-numbering decision (applies to AQ-6/AQ-7).** The Constitution
numbers its Articles continuously 1–20 across five Titles. Inserting new
Articles *in sequence* inside Title III (after Article 11) would renumber
Articles 12–20 and silently break every existing citation of them — the
conflict order, Appendix A, the EDS/TAS/AIGAS cross-references, and working
docs across the repo. The plan's own candidate is therefore adopted: **new
Articles take the next unused numbers (21 and 22) and sit physically within
Title III, after Article 11.** Page order within Title III becomes 8, 9, 10,
11, 21, 22; no existing Article's number ever changes. Entry AQ-6/7.2(a)
writes this convention into "How to read this document" so the out-of-sequence
numbers are self-explaining, permanently.

**Version bump.** One bump for the whole batch per document (task 07 owns the
coordinated plan): on ratification the header Status row `v1.0 — foundational,
governing` and the closing line `*— End of the Engine Constitution v1.0 —*`
become **v1.1**, dated, with these three items in the amendment record. Not
drafted as a separate entry here to avoid colliding with 07's per-document
plan.

---

## AQ-1.1 — Preamble: the second product, named

**Target:** `docs/foundation/CONSTITUTION.md`, Preamble — a new paragraph
inserted after the coach-reasoning paragraph ("An elite coach does not think
in muscles…") and before "Every recommendation the platform makes answers a
single question:".

**Current text (the insertion anchor — unchanged; the new paragraph follows it):**

> An elite coach does not think in muscles, sets, or templates. A coach reasons:
> *understand the athlete; understand the sport; understand the desired outcome;
> diagnose the limiting factors; […] observe the response; learn; repeat.* This
> Constitution exists to make that reasoning the permanent shape of the platform,
> so that — across a decade, dozens of contributors, and technologies not yet
> invented — everyone who builds here shares one mental model of how the platform
> thinks.

**Proposed text (new paragraph, inserted after the anchor):**

> That reasoning consumes and produces a second thing of permanent value. An
> elite performance department delivers two inseparable products: the
> **programme**, and the **understanding of the athlete** that makes the
> programme right — a longitudinal, evidence-graded model of who this athlete
> is: tested capacities, training and injury history, competition output,
> recovery patterns. The platform builds both. The understanding is not a rival
> objective and never becomes one; it exists so that every coaching decision —
> this week's, and one made five years from now — is made about the real
> athlete, from evidence, and can say so. A platform that produced only the
> programme would be a plan generator with a coach's vocabulary.

**Rationale:** GA-113 (the purpose-level gap: "nothing precludes the data
pillar, but nothing gives it constitutional purpose either — a purpose-level
gap the P2.x-owning documents cannot repair from below"); benchmark 00 §1
(the elite performance department "produces two inseparable products"; "a
platform that automates only the first is a plan generator with good
manners") and the P2 pillar framing; audit 09 §3 AQ-1 direction ("a
clarification naming the evidence-graded understanding of the athlete as a
co-equal product in service of the same objective — so ND-1 has a principle
to trace to"); audit 01 §6.2 ("absorbable in spirit, not in letter — hence
GA-113 (clarification, not reconstruction)").

**Consistency:**
- *AQ-1 × Art 1 ("primary objective") — no dual-mandate drift.* Art 1's
  principle stands untouched and remains true: the understanding is a
  **product** of the platform but stays **instrumental to the one
  objective** — the drafted paragraph says so twice ("not a rival objective
  and never becomes one"; it exists so decisions are right). Two products,
  one objective. Nothing here creates a second optimisation target, so
  Art 1's proxy-drift protection ("optimises the proxy instead of the
  athlete") is fully preserved.
- *Placement is purpose-level, not mechanism* (the audit's direction):
  the Preamble, not a new Article — the understanding earns its Article-rank
  governance downstream (ND-1, entering T2 via the GA-703 path), which this
  paragraph gives a principle to trace to.
- *Art 20 (defer-until-consumer) unblocked, not weakened:* the
  chicken-and-egg trap audit 01 §5.3 records (analytics has no consumer until
  decisions consume it) is resolved at the purpose level; Art 20 still
  governs the *pace* at which the second product is built.
- *Batch interactions:* AQ-2 (the Measurement & Analysis entity family) and
  AQ-3 (the analysis decision family) are this product's vocabulary and
  producer; AQ-5 (dated historical evidence) is its storage doctrine; AQ-7
  (ownership & consent) is its rights regime. This paragraph is the root all
  four trace to.

**Not changed:** Article 1 (title, principle, all five bullets); Article 2's
"sole outcome" phrasing (sport performance as the outcome that matters — a
different axis, untouched); the header Scope row; the Preamble's first two
paragraphs and the single-question blockquote itself (AQ-1.2 touches only the
sentence *after* the blockquote).

---

## AQ-1.2 — Preamble: the existence test learns the second trace

**Target:** `docs/foundation/CONSTITUTION.md`, Preamble — the sentence
immediately following the single-question blockquote.

**Current text:**

> If a feature, a number, a module, or a decision cannot trace its existence back to
> that question, it does not belong in the platform.

**Proposed text (replacement — the sentence retained verbatim, then extended):**

> If a feature, a number, a module, or a decision cannot trace its existence back to
> that question, it does not belong in the platform. The trace may be direct — an
> intervention for this athlete now — or it may run through the understanding of
> the athlete: capturing, keeping, and analysing the evidence without which the
> question cannot be answered well, for this athlete or the next. Work that
> serves the understanding serves the question; work that serves neither still
> does not belong.

**Rationale:** GA-113 names the existence test itself as the root: "the
Preamble's existence test […] frames the platform's sole product as the
intervention", so squad analytics, benchmarking, and internal evidence
generation "trace to that question awkwardly or not at all". Audit 01 §5.1
records the over-specification risk verbatim: read strictly, the gate "could
be used in good faith to veto the second half of the end-state ambition."
Benchmark P2.7, P2.8, P3.5 are the capabilities the strict reading vetoes.

**Consistency:**
- The gate keeps its teeth: the closing clause ("work that serves neither
  still does not belong") preserves the test as a *veto*, now with two valid
  trace paths instead of one. This is the minimal alteration the plan asks
  for — the question itself is not reworded, and the blockquote is untouched.
- "For this athlete or the next" is deliberate: it admits aggregate and
  future-athlete value (squad signals, norms, evidence generation — audit 01
  §6.2's exact gap) without opening a trace path to engagement metrics or
  any non-athlete end (still barred by Art 1).
- Reads as one movement with AQ-1.1: the paragraph names the product; this
  sentence wires it into the gate.

**Not changed:** the single-question blockquote (verbatim, untouched); the
first sentence of the existence test (retained word-for-word); Art 1's
"Governs" bullet (the prohibition on engagement-as-objective).

---

## AQ-6.1 — New Article 21 (Title III): developmental-stage duty of care

**Target:** `docs/foundation/CONSTITUTION.md`, Title III — new Article
inserted after Article 11's final bullet and before the `---` separator that
precedes Title IV. Numbered 21 per the numbering decision above.

**Current text (the insertion anchor — Article 11's closing bullet, unchanged):**

> - **Failure mode if violated.** A privacy breach that is simultaneously an ethical
>   failure, a legal liability, and the end of athlete trust — unrecoverable
>   reputational damage.

**Proposed text (new Article, inserted after the anchor):**

> ## Article 21 — The platform prescribes for the athlete's developmental stage, never for a default adult
>
> > **Every prescription honours the athlete's developmental stage. What may and
> > may not be prescribed to a developing or an ageing athlete is explicit,
> > governed knowledge — never an assumption that the athlete is a mature adult —
> > and where age-modulated evidence is thin, the platform defaults to the
> > conservative choice. The athlete's long-term development outranks any
> > short-term adaptation, at every age.**
>
> - **Why it exists.** The platform's target customer — clubs and teams without
>   an S&C budget — prominently includes youth squads, and masters athletes are
>   already in the individual package. The gravest way to harm the people the
>   platform exists to serve is to reason about a fifteen-year-old or a
>   sixty-year-old from the physiology of a twenty-five-year-old. No other
>   Article supplies this duty: competency gating (Article 8) and
>   caution-under-uncertainty (Articles 13, 16) are age-blind, and a duty of
>   care belongs in the unamendable floor, not in a lower document's
>   discretion.
> - **In practice.** *Holds:* a youth athlete's programming is bounded by
>   maturation stage — movement competency, skill acquisition, and appropriate
>   loading before maximal expressions — however well heavier work would "fit
>   the plan"; a masters athlete gets recovery-weighted dosing and
>   tissue-appropriate progressions by default, not by exception. *Violated:* a
>   minor onboards and receives programming reasoned entirely from adult
>   assumptions because nothing forbade it; an age-band rule lives only in a
>   code comment no scientist can review.
> - **Implications.** Developmental stage is a first-class input that *shapes*
>   diagnosis and construction, never a filter applied afterward. The stage
>   rules themselves — what is gated, moderated, or emphasised at each stage of
>   an athlete's development — enter as governed, evidence-tagged knowledge
>   under Article 17, reviewable by specialists and versioned, never hard-coded.
>   Thin evidence for an age band lowers confidence, and lower confidence
>   narrows what may be prescribed (Article 13): for a developing athlete the
>   margin always widens toward safety, never toward stimulus.
> - **Governs.** Age and developmental stage as inputs to every training
>   decision; maturation-aware competency gating; the knowledge home for
>   age-band and long-term-development rules; the conservative default wherever
>   stage-specific evidence is thin; the onboarding of youth squads under the
>   team package.
> - **Failure mode if violated.** The platform harms a developing athlete it
>   was built to serve — an ethical failure before it is anything else, and the
>   single fastest way to lose the trust of the clubs the mission depends on.

**Rationale:** GA-107 (SILENT: "no constitutional recognition of developmental
stage or age-band duty of care; bites hard when youth squads arrive with the
Team package, and no downstream document is obligated to fill it"); benchmark
P5.3 ("explicit governance — what may and may not be prescribed at each
stage — not an assumption that every user is a 25-year-old adult"); audit 01
§2 P5.3 row ("**Absorbable without amendment? No** — age-band *rules* can
enter as knowledge (Art 17), but a duty-of-care protection belongs in the
unamendable Title III floor […] it must be added") and §6.1 (the "self-owning
adult" assumption falsified by youth squads); audit 09 §3 AQ-6 direction.

**Consistency:**
- *Conflict order:* Article 21 is a safety protection and slots into
  **tier 1 (SAFETY & LAW)** — entry AQ-6/7.2(c) adds it to the tier's
  citation. A stage-inappropriate prescription is contraindicated in exactly
  Article 8's sense; the tiers themselves do not change.
- *Division of labour intact (Art 17):* the Article states the duty; the
  age-band rules are knowledge. GA-409's age/sex modifier spec (audit 04) is
  the downstream companion that carries the mechanics — deliberately **not**
  part of this amendment.
- *Article 8 boundary:* Art 8 gates on demonstrated competency and readiness;
  Art 21 adds the axis Art 8 is blind to — stage-appropriateness even where
  competency is demonstrated (a technically excellent fifteen-year-old is
  still fifteen).
- *Articles 13/16 reinforced, not duplicated:* thin age-modulated evidence is
  a confidence problem those Articles already govern; Art 21 fixes the
  *direction* of the resulting margin (conservative) for developing athletes.
- *Batch interactions:* Art 22's guardian-consent clause (AQ-7.1) leans on
  this Article for the minor's duty-of-care basis; the safeguarding-spec
  hypothesis stays NOT YET per audit 09 §3's ruling — this Article plus the
  directed T3 specs carry the perimeter for the stages in view.
- *Title III floor:* strengthened, never weakened (Global Constraint 5) —
  this Article only adds protection; entry AQ-6/7.2(b) admits it to the
  "never amended" floor.

**Not changed:** Article 8 (competency gating stays exactly as written);
Article 16 (learning posture untouched); the Preamble's "competitive amateur
athletes and teams" audience line; the conflict-order tier structure; the
boundary that the platform is not a medical/diagnostic tool (Art 8, Governs).

---

## AQ-7.1 — New Article 22 (Title III): athlete data ownership & consent

**Target:** `docs/foundation/CONSTITUTION.md`, Title III — new Article
inserted immediately after Article 21 (AQ-6.1) and before the `---` separator
that precedes Title IV. Numbered 22 per the numbering decision above.

**Current text (insertion anchor):** the closing bullet of proposed
Article 21 (AQ-6.1 above); in the frozen document as it stands today, the
anchor is Article 11's closing bullet — the two new Articles land as one
contiguous insertion.

**Proposed text (new Article):**

> ## Article 22 — The athlete owns their data; consent is the basis of every grant
>
> > **An athlete's data belongs to the athlete. Any visibility another party
> > holds — a coach, a team, the platform itself — exists only by the athlete's
> > informed consent: specific in scope, freely given, and revocable. The athlete
> > may take their data with them or have it erased, and secondary use — research,
> > evidence generation, benchmarking — happens only under explicit,
> > privacy-preserving consent.**
>
> - **Why it exists.** Article 11 protects what others may *see*; it does not
>   say why they may see anything at all. Without a consent basis of
>   constitutional rank, team membership silently becomes a visibility grant,
>   internal research over athlete data has no principle to be validated
>   against, and export and deletion arrive as ad-hoc product choices rather
>   than rights. As the platform's second product — the longitudinal
>   understanding of the athlete — grows in value, the athlete's ownership of
>   it must be settled *before* anyone is tempted to treat it as the
>   platform's asset rather than the athlete's.
> - **In practice.** *Holds:* joining a team grants the coach a scoped,
>   derived-only view because the athlete consented to exactly that grant, and
>   revoking it — or leaving the team — closes the view; an athlete leaving the
>   platform exports their full history; athlete data enters an internal
>   evidence study only under explicit, informed, privacy-preserving consent.
>   *Violated:* team membership implies coach visibility with no recorded
>   consent behind the grant; athlete histories are aggregated into research
>   nobody agreed to; a deletion request becomes an unanswered support ticket.
> - **Implications.** Consent is durable, inspectable athlete state — scoped
>   (what, to whom, for what purpose), revocable without penalty to the
>   coaching the athlete receives, and never a formality buried in onboarding.
>   Consent widens *who* may see; it never deepens *what* crosses — a grant can
>   expose no more than Article 11 permits, so no consent can authorise a raw
>   vital across a person boundary. Export and erasure are governed rights with
>   defined behaviour, not favours. Where the athlete is a minor, consent
>   involves the guardian as applicable law requires, and Article 21's duty of
>   care extends to the consent itself.
> - **Governs.** The consent model beneath every team and cross-user
>   visibility surface; the recording of grants and revocations as durable
>   athlete state; data portability and erasure; the gate on all secondary use
>   of athlete data; the rule that cross-user access extends athlete ownership
>   deliberately — now with its consent basis named — and is tested.
> - **Failure mode if violated.** The platform quietly comes to own what it
>   merely stewards: a legal exposure that compounds the moment minors or
>   research enter, and an ethical breach of the trust that persuades athletes
>   to share data at all.

**Rationale:** GA-109 (SILENT: "privacy is governed as who-may-see; the
athlete's affirmative rights […] have no constitutional home; bites at the
Team stage and again when internal evidence generation (P3.5) arrives");
benchmark P5.7 ("the athlete affirmatively controls what is shared with whom
(joining a team grants scoped, revocable visibility), can export and delete
their data, and any secondary use […] happens under explicit, informed
consent"); audit 01 §2 P5.7 row ("**Absorbable without amendment? No** —
[…] consent/ownership rights of Title III rank cannot be derived from a
visibility rule […] new right-granting substance, not clarification") and
§6.1; audit 09 §3 AQ-7 direction.

**Consistency:**
- *Art 11 × Art 22 — the boundary, stated precisely:* Article 11 is the
  **protection ceiling** (what may never cross a person boundary, whatever
  anyone agrees); Article 22 is the **consent basis and the athlete's
  affirmative rights** (why any visibility exists, and what the athlete may
  do with their data). The drafted Implications bullet hard-wires the
  interaction: consent widens *who*, never deepens *what* — so Art 22 can
  never be read as a consent-shaped hole in Art 11. No text of Art 11
  changes.
- *Conflict order:* Article 22 slots into **tier 1 (SAFETY & LAW)** — data
  rights are the "LAW" half of the tier's name; entry AQ-6/7.2(c) adds it to
  the citation. Athlete-intent tier 4 is not the right home: consent here is
  a *right* that bounds what the platform and third parties may do, not a
  training preference to be traded below recoverability.
- *Art 10 boundary:* Art 10 governs authority over *decisions* (overrides,
  committed sessions); Art 22 governs rights over *data*. No overlap, no
  edit to Art 10.
- *Batch interactions:* AQ-1's second product is what this Article gives the
  athlete ownership of; AQ-5's materialised historical evidence is athlete
  data under this Article (dated evidence is owned, exportable, erasable, and
  derived-only across person boundaries); AQ-2's Report/Insight entities are
  what a consented grant exposes; AQ-9's restored TAS Security & Privacy
  section is where the mechanics get their architectural home. GA-510's
  enforcement spec is the named downstream companion — mechanics inherit,
  the Constitution grants.
- *Team architecture as built:* the live RLS posture (players see only their
  own rows; coach access additive, team-scoped, derived-only) already
  *behaves* as this Article requires; the amendment supplies the missing
  constitutional basis, it does not demand a rebuild. Consent-grant
  *recording* is the new obligation, arriving via the downstream specs.
- *Title III floor:* pure strengthening — a new right for the athlete, no
  existing protection touched.

**Not changed:** Article 11 in its entirety (the raw/derived boundary, the
build-failing validator, every bullet); Article 10 (decision authority); the
existing team data-isolation rules in lower documents (they gain a basis,
not an edit — reconciliation is downstream work under Amendment &
Stewardship's normal rule that lower documents are corrected to Articles).

---

## AQ-6/7.2 — Title III integration: numbering convention, the floor, tier 1

Three small coordinated edits that admit the new Articles into the document's
machinery. All three are strengthening or purely editorial; none alters an
existing protection.

### (a) "How to read this document" — the numbering convention

**Target:** `docs/foundation/CONSTITUTION.md`, § "How to read this document",
first paragraph.

**Current text:**

> The Articles are grouped into five Titles. Each Article states one principle, then
> explains it under a fixed template:

**Proposed text:**

> The Articles are grouped into five Titles. Articles are numbered in order of
> adoption, not position: an amendment that adds an Article gives it the next
> unused number and places it within its Title, so no existing Article's number
> ever changes (thus Title III runs 8–11, then 21–22). Each Article states one
> principle, then explains it under a fixed template:

### (b) Amendment & Stewardship — the unamendable floor

**Target:** `docs/foundation/CONSTITUTION.md`, § "Amendment & Stewardship",
first bullet.

**Current text:**

> - **What may never be amended.** The protections of Title III (safety, the human as
>   final authority, raw-data privacy) and the honesty commitments of Title IV are the
>   platform's ethical floor. They may be *clarified* but never weakened.

**Proposed text:**

> - **What may never be amended.** The protections of Title III (safety, the human as
>   final authority, raw-data privacy, the developmental-stage duty of care, and the
>   athlete's ownership of their data) and the honesty commitments of Title IV are the
>   platform's ethical floor. They may be *clarified* but never weakened.

### (c) The conflict order — tier 1 citation

**Target:** `docs/foundation/CONSTITUTION.md`, § "When principles conflict",
the fixed-priority code block, tier 1 line.

**Current text:**

> ```
>    1. SAFETY & LAW        never violate an Article; never an unsafe or
>                           contraindicated prescription            (Art 8, 11, 18, 19)
> ```

**Proposed text (tier 1 only; tiers 2–6 unchanged, column alignment preserved):**

> ```
>    1. SAFETY & LAW        never violate an Article; never an unsafe or
>                           contraindicated prescription      (Art 8, 11, 18, 19, 21, 22)
> ```

**Rationale:** consequential edits of AQ-6/AQ-7 (GA-107, GA-109): a Title III
Article outside the floor sentence would be amendable — defeating the reason
audit 01 ruled both findings unabsorbable ("a duty-of-care protection belongs
in the unamendable Title III floor"); a protection Article absent from tier 1
would be a protection the decision procedure never consults. (a) is the
editorial companion of the numbering decision, without which the document's
own page order (…10, 11, 21, 22) would read as an error.

**Consistency:**
- All three edits are additive: (a) explains, (b) extends the floor, (c)
  extends a citation list. The tier structure, tier order, and every other
  Article citation are untouched.
- (b)'s new floor items are named in the same compressed style as the
  existing three ("safety, the human as final authority, raw-data privacy").
- (c) keeps the parenthetical's right alignment within the code block by
  absorbing the extra width from the padding, per the block's existing
  layout convention; task 07's review should eyeball the rendered block.
- Appendix A is deliberately **not** extended (see below).

**Not changed:** the five-Title structure and the fixed template list in "How
to read"; tiers 2–6 of the conflict order and the explanatory paragraph
beneath it; the remaining four bullets of Amendment & Stewardship; **Appendix
A** — it maps *the EDS's* former principle systems onto Articles ("Nothing is
orphaned" runs EDS→Constitution), and Articles 21/22 subsume no EDS material,
so adding rows would misstate the table's purpose. AIGAS/Appendix A
cross-reference reconciliation belongs to AQ-8 (file 06), not here.

---

## Whole-file consistency summary (for task 07's matrix)

- **One objective throughout:** AQ-1 names a second *product*, never a second
  *objective* — Art 1 unamended, no dual-mandate drift (stated in AQ-1.1's
  drafted text itself).
- **Tier-1 placements:** both new Articles are tier-1 protections (Art 21 =
  SAFETY; Art 22 = LAW); neither reorders the tiers.
- **Art 11 × AQ-7:** protection ceiling vs. consent basis + rights; consent
  widens who, never deepens what.
- **Title III floor:** strictly strengthened — two duties added, nothing
  clarified downward, nothing removed (Global Constraint 5 satisfied).
- **Cross-file:** AQ-1 ← is the trace root for → AQ-2/AQ-3/AQ-5 and ND-1;
  AQ-7 supplies the rights regime AQ-5's historical evidence and AQ-2's
  Report/Insight entities operate under; Appendix A reconciliation is AQ-8's
  (file 06); TAS mechanics homes are AQ-9's (file 05).
- **Renumbering implications:** none — the adoption-order convention (entry
  AQ-6/7.2(a)) guarantees every existing "Art N" citation in the repo stays
  correct.
