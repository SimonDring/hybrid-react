# Foundation — the governing framework

This folder holds the **platform-level foundational documents**: the rules, vocabulary,
and knowledge model that *every* future feature, algorithm, database schema, AI model,
and engineering, coaching, or product decision is validated against **before**
implementation.

These documents sit **above** the engine-level [Engine Design Specification (EDS)](../engine/00-ENGINE-DESIGN-SPECIFICATION.md).
Where the EDS describes *how the engine reasons*, the foundation describes *the
immutable principles, the canonical vocabulary, and how knowledge must be structured*
— for the whole platform, not just the engine.

## The governance stack

```
   CONSTITUTION  ............  immutable Articles — platform-wide, technology-independent
        │ governs everything below; the tie-breaker on any conflict
        ▼
   DECISION ONTOLOGY  ......  the canonical vocabulary — every entity + relationship
   KNOWLEDGE ARCHITECTURE  .  how knowledge / data / inference are structured & owned
        │ these three are the conceptual foundation; nothing is built until its
        │ concept is defined here
        ▼
   EDS (engine/00)  ........  the engine design — HOW the platform reasons (decisions D1–D16)
        │
   engine/01–05  ...........  evidence · build plan · sport schema · physiology · index specs
        │
   CLAUDE.md · HANDOFF.md  .  RUNNING docs — current status against the targets above
```

**Where any document conflicts with one above it, the higher document wins.** The
Constitution is the ultimate tie-breaker.

## The set

| Document | Role | Canonical home for |
|---|---|---|
| **[CONSTITUTION.md](CONSTITUTION.md)** | The immutable principles (20 Articles). Supersedes and unifies the EDS's Core Philosophy, First Principles, and Engine Laws. | Principles · the conflict-resolution order · the amendment process |
| **[DECISION-ONTOLOGY.md](DECISION-ONTOLOGY.md)** | The canonical definition of every concept the engine reasons about. | Entity definitions · relationships & cardinalities · the reasoning spine · the Diagnostic Triangle |
| **[KNOWLEDGE-ARCHITECTURE.md](KNOWLEDGE-ARCHITECTURE.md)** | How knowledge exists so the engine reasons rather than hard-codes. | The eight-kind data taxonomy · the twelve knowledge domains · knowledge versioning & governance |
| **[PANEL-REVIEW.md](PANEL-REVIEW.md)** | The six-lens critique of the set and the revisions folded back. | The review provenance · the standing commitments |

## Reading order

- **In a hurry?** Read the **Constitution** (the 20 Articles) and the Ontology's **§1
  (the three structures)**. Everything else serves those.
- **Building a feature?** Check it against the **Constitution** (does it violate an
  Article?), name its pieces with the **Ontology**, and classify its data with the
  **Knowledge Architecture** §2 before writing code.
- **Adding a sport, exercise, quality, or injury?** Knowledge Architecture §3–§4 — it
  should be *data, not code*.

## Foundational vs. running documents

- **Foundational (these docs + the EDS set).** The *target* — the principles,
  vocabulary, knowledge model, and design we build toward. Stable; they change rarely
  and deliberately (the Constitution by formal amendment).
- **Running (`HANDOFF.md`, `CLAUDE.md`).** The *current state* — what is built, in
  flight, or pending. Status lives there, never here. Do not turn a foundational doc
  into a changelog.

When you want to know *what good looks like*, read a foundational doc. When you want
to know *where we are right now*, read a running doc.

## Rules for keeping the set coherent

1. **One canonical home per topic** (see the table above). A document needing a topic
   it does not own *points to the owner* rather than restating it.
2. **The Constitution is the tie-breaker.** Reconcile any conflict toward it.
3. **Define before you build.** A new concept is added to the Ontology (and, if it is
   knowledge, the Knowledge Architecture) *first*, then implemented.
4. **Evidence is never fabricated.** Every authored recommendation carries provenance
   (`confidence`, `evidenceLevel`, `source`, `lastReviewed`); thin evidence is
   labelled, not invented.
5. **Amend deliberately.** Changing an Article follows the Constitution's amendment
   process; the EDS and these docs are reconciled in the same change.
