# Batch Proposal 04 — The Derived-Data Doctrine Clarification (AQ-5)

**Status: BATCH PROPOSAL — working doc (T4) · 2026-07-13 · nothing herein is applied; Simon's ratification PR applies it**
Spec: [2026-07-13-phase1-amendment-batch-design.md](../../superpowers/specs/2026-07-13-phase1-amendment-batch-design.md)

**Queue item:** AQ-5 (docs/AMENDMENT-QUEUE.md) · **Finding:** GA-802 — the audit
set's only PRECLUDES verdict ([governance audit 08 §4](../../reviews/2026-07-11-governance-audit-08-data-analytics-pillar.md),
registered in [audit 09 §3](../../reviews/2026-07-11-governance-audit-09-verdict-and-register.md)).
**Targets:** KA §2.1/§2.3 · EDS §27 · TAS §7 — one coordinated amendment,
reconciled in a single pass, per the queue's "do not split" instruction.

---

## Why this amendment exists

Three frozen documents independently state the recompute-don't-store doctrine
for Derived Data: the Knowledge Architecture ("Computed; never stored as truth",
§2.1 kind 6; "Derived Data is always recomputable", §2.1), the EDS ("Persist
*state and outcomes*, recompute *artefacts*", §27 rule 1), and the TAS ("the
plan is *cached* (recomputable), never *stored as truth*", §7 transition note ④).
Each per-document audit flagged the same strain in its own §5 (audit 03 §5.3,
audit 04 §5.4, audit 05 §5.4); GA-802 established the cross-document fact:
because the doctrine is triply stated, no single-document fix resolves it, and
collectively it obstructs the longitudinal athlete model's core requirement
(benchmark P2.6, compounding into P3.5) — retaining a derived value *as computed
that day under that knowledge version* as historical evidence. Recomputing
yesterday's readiness under today's knowledge yields a different number that is
*wrong as history*; the theoretical escape (recompute under pinned versions)
rests on two disciplines nothing governs — inputs retained forever and
athlete-state versioning (audit 03 §6.4; audit 04 §6 A8). What breaks without
this clarification: readiness trends, e1RM trajectories, squad "versus last
season" views, and internal evidence generation are either unavailable or
silently wrong.

## The doctrine (stated once; the three edits below render it in each document's voice)

Derived Data remains **recomputable-not-truth for CURRENT state**, with one
qualification that keeps history honest:

1. **"Recomputable" means recomputable *given the same inputs and knowledge
   version*.** It has never meant "recomputable under whatever knowledge is
   current" — that reading produces historically false numbers.
2. **The platform never serves a stored derived value as the current answer.**
   Current values are always recomputed. Nothing here weakens engine purity or
   the plan's regenerability (Constitution Article 18).
3. **A point-in-time derived value MAY be materialised as dated historical
   evidence**: persisted **append-only**, stamped with its computation date and
   the `engineVersion × knowledgeSetVersion` that computed it, and read only as
   *what was computed then* — never re-served as current.
4. **Materialised history is athlete-owned and private.** It is a recorded fact
   *about a past computation* — Stored Data about a derivation — living behind
   the same privacy boundary as all athlete state; it crosses a person boundary
   only via the existing derived-only roll-up. No new crossing path is created.
5. **This amendment grants the permission, not the mechanism.** Which derived
   values are materialised, their schema, retention, and the history store's
   design are scoped by ND-1 (the Data & Analytics Architecture Specification,
   a separate sprint), per AQ-5's direction.

---

## AQ-5.1 — Knowledge Architecture: §2.1 (kind 6 + the Stored-vs-Derived pair) and §2.3 (worked table)

**Target:** `docs/foundation/KNOWLEDGE-ARCHITECTURE.md` §2.1 (the eight-kinds
table, row 6; the "Stored vs. Derived Data" sharpened pair) and §2.3 (the worked
classification table).

**Current text (§2.1, row 6 of the eight-kinds table):**

> | **6** | **Derived Data** | Something *computed from* stored data + knowledge | Ephemeral / recomputable | Sometimes (e.g. readiness confidence) | Computed; never stored as truth |

**Proposed text (row 6 — Lifetime and Where-it-lives cells amended):**

> | **6** | **Derived Data** | Something *computed from* stored data + knowledge | Ephemeral / recomputable; point-in-time values may be materialised as dated history | Sometimes (e.g. readiness confidence) | Computed; never served as *current* truth from storage |

**Current text (§2.1, the fourth sharpened pair):**

> - **Stored vs. Derived Data.** Stored Data is ground truth recorded from reality (the
>   athlete did 3×4 @ RPE 7). Derived Data is computed from it (readiness = 62). *Only
>   Stored Data is persisted as truth; Derived Data is always recomputable* — which is
>   why the Plan itself is Derived, not Stored (Constitution Article 18).

**Proposed text (the pair, amended in place):**

> - **Stored vs. Derived Data.** Stored Data is ground truth recorded from reality (the
>   athlete did 3×4 @ RPE 7). Derived Data is computed from it (readiness = 62). *Only
>   Stored Data is persisted as truth; Derived Data is recomputable — given the same
>   inputs and knowledge version* — which is why the Plan itself is Derived, not Stored
>   (Constitution Article 18). One qualification keeps history honest: recomputing
>   yesterday's readiness under today's knowledge yields a different (and historically
>   false) number, so a point-in-time derived value MAY be **materialised as dated
>   historical evidence** — append-only, stamped with its computation date and the
>   engine + knowledge-set versions that computed it, and read only as *what was
>   computed then*. Materialised history is a recorded fact **about a past
>   computation** — it becomes Stored Data *about* a derivation, athlete-owned and
>   private (§7) — and is never re-served as the current value, which is always
>   recomputed.

**Current text (§2.3, the readiness row of the worked table — quoted as the insertion anchor; the row itself is unchanged):**

> | Today's readiness score = 62 (amber) | **Derived Data** (with confidence) | Computed from stored vitals + wellness |

**Proposed text (one new row inserted immediately after it):**

> | Readiness = 62 *as computed on 4 Mar*, stamped with the engine + knowledge-set versions | **Derived Data**, materialised as **dated historical evidence** | Append-only record of what was computed then (§2.1); read as history, never re-served as current |

**Rationale:** GA-802 (PRECLUDES; audit 08 §4) · AQ-5 (audit 09 §3) · benchmark
P2.6 × P3.5 · audit 03 §5.3 ("read strictly, the rule forbids materialising
derived history; read loosely, it says nothing") and §6.4 ("always recomputable"
is true only under disciplines the KA does not mandate).

**Consistency:** The eight-kinds count is untouched — materialised history is
not a ninth kind; it is the existing pair-boundary made precise (a derived value,
once recorded as evidence, is Stored Data *about* a derivation, exactly the
composition idiom §2.3's "Calculation *on* Inference inputs" row already uses).
The §2.2 classification rule needs no edit: "Is it COMPUTED from stored data +
knowledge, and recomputable?" remains the classifying question — the amendment
clarifies what "recomputable" means, in §2.1 where the term is defined. KA §7's
privacy boundary is inherited, not modified (see the batch-wide notes below).

**Not changed:** The §2.3 plan row — "The full 16-week plan | **Derived Data** |
Recomputed from state + knowledge; never stored as truth" — is deliberately left
verbatim: the Plan stays recomputed (see the plan-is-hypothesis note below). The
ACWR row, the eight kinds, the §2.2 rule, the hard-coding test, and §7's
crossing rules are all untouched. Which values get materialised, and their
retention, is ND-1's scope, not the KA's.

---

## AQ-5.2 — EDS: §27 Data Architecture (the derived-artefacts row + a fifth architectural rule)

**Target:** `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md` §27 (the three-kinds
table, "Derived artefacts" row; the numbered architectural rules, which gain a
rule 5).

**Current text (§27 table, third row):**

> | **Derived artefacts** | What the engine computes from the above | Ephemeral / recomputable | (computed) | The plan, the adapted week, readiness/load signals, the coach's derived view |

**Proposed text (Lifetime cell amended):**

> | **Derived artefacts** | What the engine computes from the above | Ephemeral / recomputable; point-in-time values may be materialised as dated history (rule 5) | (computed) | The plan, the adapted week, readiness/load signals, the coach's derived view |

**Current text (§27 rule 1 — quoted as the anchor rule 5 defers to; rule 1 itself is unchanged):**

> 1. **The plan is derived, not stored as truth.** It is recomputed from athlete state + knowledge (it is today — keep this). Persist *state and outcomes*, recompute *artefacts*. This is what keeps the engine pure and the plan honest (a hypothesis, regenerable).

**Proposed text (a new rule 5, appended after rule 4):**

> 5. **Point-in-time derived values may be materialised as dated historical evidence.** *Recomputable* means recomputable **given the same inputs and knowledge version** — recomputing last season's readiness under this season's knowledge produces a different number that is wrong *as history*. A derived signal as computed that day (readiness, load state, an estimated 1RM) may therefore be persisted **append-only**, stamped with the engine + knowledge-set versions that computed it (SA7), and read strictly as historical evidence — the longitudinal athlete record (P2.6 territory). It is never re-served as the current value (current values are always recomputed); it changes nothing in rule 1 (the plan remains derived — a hypothesis, regenerable); and it crosses the coach boundary only under rule 4's derived-only roll-up. Which signals are materialised, and their retention, is the data-architecture specification's design scope, not this section's.

**Rationale:** GA-802 (audit 08 §4) · AQ-5 (audit 09 §3) · benchmark P2.6 × P3.5
· audit 04 §5.4 ("the reconstruction guarantee silently rests on an unbuilt
discipline") and §6 A8 (replayability assumes athlete-state versioning nothing
governs). Rule 5 replaces the ungoverned replay assumption with a governed
record: instead of promising to re-derive the past, the platform is permitted to
*keep* the past, stamped.

**Consistency:** Rule 5 composes with, and never overrides, rules 1–4: rule 1
keeps the plan recomputed; rule 2's "persist athlete state durably" is what
materialised history extends (it is athlete state — a recorded fact about a past
computation); rule 3 still forbids UI-store derivation (materialisation happens
to engine-computed signals, not view-model side-effects); rule 4's privacy
invariant governs every crossing. §27.1's team surface is unchanged — the coach
still reads only the derived, privacy-bounded roll-up, whether live or
historical. Coordinates with batch item 03 (AQ-3): the analysis decision family
reads materialised history as its evidence base; analysis *outputs* (insights)
are Inferences with confidence, not Derived Data — the boundary batch item 02
(AQ-2) states.

**Not changed:** Rules 1–4 verbatim; §27.1 verbatim; the Knowledge and
Athlete-state rows of the table; §28's confidence machinery. The EDS still
mandates no history store — it *permits* one, designed under ND-1.

---

## AQ-5.3 — TAS: §7 Data flow & lifecycle (the ④/⑧ transition notes)

**Target:** `docs/architecture/TAS.md` §7, the "Transition notes" paragraph
directly under the lifecycle diagram (the ④ note is GA-802's cited location;
the ⑧ note is where derived signals live, so the historical-evidence clause
attaches there). Verified: the doctrine's TAS statement lives in this
paragraph — step ④'s diagram line itself (`[Derived Data; cached, not
stored-as-truth]`) concerns the Plan and is deliberately left untouched.

**Current text (§7, the full transition-notes paragraph):**

> Transition notes: ②→③ the engine never fetches (L3 injects); ④ the plan is *cached*
> (recomputable), never *stored as truth* (closes T2); ⑦ raw vitals enter owner-only
> storage and **never leave it**; ⑧ the only boundary crossing is the **server-side**
> roll-up (closes T19); ⑩ learning writes priors, never plans (Const. Art 18).

**Proposed text (the paragraph, amended in place):**

> Transition notes: ②→③ the engine never fetches (L3 injects); ④ the plan is *cached*
> (recomputable — always meaning: given the same inputs and knowledge version), never
> *stored as truth* (closes T2); ⑦ raw vitals enter owner-only storage and **never
> leave it**; ⑧ the only boundary crossing is the **server-side** roll-up (closes
> T19) — and a derived signal *as computed that day* may additionally be persisted
> **append-only as dated historical evidence**, carrying its provenance stamp
> (`engineVersion × knowledgeSetVersion`, §4.1), owner-private like all athlete
> state, read as history and never re-served as current, crossing the boundary only
> via the same derived-only roll-up; ⑩ learning writes priors, never plans
> (Const. Art 18).

**Rationale:** GA-802 (audit 08 §4) · AQ-5 (audit 09 §3) · benchmark P2.6 × P3.5
· audit 05 §5.4 (the doctrine is "hazardous if it leaks onto *historical facts*
… which longitudinal analytics must store immutably") and §6.3/§6.5 (the coach
surface is point-in-time; nothing answers "versus last season"; nothing versions
state over a career). The TAS already materialises derived state where scale
demands it — §16.1 C1 makes `CoachVisibleStatus` a server-side materialized
surface, §16.1 C3 persists traces for committed plans — so this edit legalises
explicitly, at the doctrine's own location, a pattern the document's adversarial
lenses had already admitted case-by-case.

**Consistency:** T2's closure is strengthened, not reopened — the *cache vs
store-as-truth* distinction T2 demanded now carries the third term (cache /
store-as-truth / **materialise-as-dated-history**) the data pillar needs. The ⑧
privacy crossing is unchanged in kind: history is owner-private athlete state;
the server-side roll-up remains the only boundary crossing (T19 intact). The
provenance stamp referenced is the one §4.1 already defines — no new mechanism.
Coordinates with batch item 05 (AQ-9): the structural repair's restored
"Security & Privacy" section assembles §7's boundary rules — it must quote this
*amended* note text; and if its corrected § map renumbers §7 or §4.1 (neither is
on GA-509's defect list, so it should not), this file's two § references follow. §16.1 C3's minimal
retention posture is left as written; ND-1's history-store design is the
document that revisits retention, per AQ-5's scoping.

**Not changed:** The lifecycle diagram itself, including step ④'s
`[Derived Data; cached, not stored-as-truth]` line (the Plan) and step ⑧'s
bracket; §9's configuration table ("Generated outputs … ephemeral / computed …
cache, never authored" — still true of *current* outputs); §4.3's cache-by-
signature; §10's learning channels.

---

## Batch-wide consistency (load-bearing)

**The privacy boundary is unchanged — the derived-only crossing rule is intact.**
All three edits state it in their own voice, and it is one rule: materialised
history is athlete-owned, owner-private Stored Data about a past computation
(KA §7's classes absorb it without edit); raw vitals still never cross a person
boundary (KA §7, EDS §27 rule 4/§27.1, TAS §7 ⑦/⑧, T19); the only crossing
remains the server-side derived-only roll-up, for historical values exactly as
for live ones. Materialisation adds *retention*, never a *new path*. Interaction
with batch item 01 (AQ-7, athlete data ownership & consent): history inherits
the athlete's rights — "append-only" binds the *platform* (no silent rewrite of
evidence, Const. Art 15's no-silent-debt instinct applied to data), and never
limits the athlete's export or erasure rights under the proposed Article; the 07
review should confirm this reading against 01's final wording.

**No contradiction with plan-is-hypothesis (Ontology §7).** The Macrocycle "*is*
the Plan … the whole hypothesis: the engine's deterministic best guess" (Ontology
§7, Family V), and it stays that way: the PLAN remains recomputed — EDS §27 rule
1 verbatim, TAS ④ diagram line verbatim, KA §2.3 plan row verbatim. What gains a
historical form is the derived OBSERVATIONS about the athlete (readiness, load
state, e1RM as computed on a date) — the evidence a hypothesis is judged
against, not the hypothesis itself. Committed-session freezes (Const. Art 10)
are already Stored Data and are untouched. The one plan-shaped record that may
be kept is already governed elsewhere: TAS §16.1 C3 persists traces for
committed plans — evidence of what was *decided*, not a served plan.

**Interactions with the rest of the batch:** 02 (AQ-2) — materialised history is
what the Measurement & Analysis family's Analysis/Insight entities consume; the
Derived Data ↔ Analysis/Insight boundary is stated there and honoured here
(insights are Inferences, not Derived Data). 03 (AQ-3) — the analysis decision
reads athlete data *including materialised history*; without AQ-5 that input
class cannot lawfully exist. 05 (AQ-9) — the restored TAS Security & Privacy
section quotes the amended §7 note (this file's AQ-5.3 text wins over the
pre-amendment wording). Version bumps: one per document for the whole batch,
planned in 07.

**What this proposal deliberately does NOT do:** design the history store
(schema, signal selection, retention, athlete-state versioning) — that is ND-1,
which this amendment unblocks; mandate materialisation anywhere (every edit says
MAY); touch the Constitution, the Ontology, or AIGAS; alter any privacy rule,
validator, or crossing mechanism.
