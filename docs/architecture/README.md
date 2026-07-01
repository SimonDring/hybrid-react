# Architecture — the technical blueprint

This folder holds the **technical architecture tier**: how the platform's software is
*built* so that it faithfully implements the coaching philosophy and decision
architecture defined in the governing documents.

It sits **below** the four governing documents (it implements them) and is the
specification every engineering decision — module, service, schema, API, AI
integration — is validated against before implementation.

## The set

| Document | Role |
|---|---|
| **[TAS.md](TAS.md)** | The Technical Architecture Specification — the six-layer architecture, the pure-engine boundary and public API, the Decision Engine in depth, knowledge/data flow, configuration separation, the two learning systems, explainability, extensibility, testing, observability, the future-AI seam, security/privacy, the four-lens critical review, and a Current Realization appendix mapping the abstractions to today's stack. |

## Where this sits

```
   GOVERNANCE (what & why & how-it-reasons)
     Constitution ─ EDS ─ Decision Ontology ─ Knowledge Architecture
        │ implemented by
        ▼
   ARCHITECTURE (how the software is built)        ← this folder
     TAS.md
        │ realised as
        ▼
   CODE (packages/engine · apps/* · supabase/*)
```

## Reading order

- **Designing or reviewing a feature, service, schema, or API?** Validate it against
  the **TAS** — and against the governing docs it traces to (TAS Appendix B).
- **In a hurry?** TAS **§3 (the layered architecture)** and **§5 (the Decision
  Engine)** carry the core; everything else serves those two.
- **Mapping the blueprint to the real codebase?** TAS **Appendix A — Current
  Realization**.

## Rules

1. **Every architectural decision traces to a governing-document clause** (TAS Appendix
   B). A decision with no trace does not belong here.
2. **Implementation-agnostic body, one realization appendix.** The TAS body names no
   framework; only Appendix A maps to the current stack. When the stack changes, the
   appendix is updated — the body is not.
3. **The governing documents win.** Where the TAS conflicts with the Constitution,
   EDS, Ontology, or Knowledge Architecture, the governing document is right and the
   TAS is corrected.
4. **This is a destination, reached incrementally** (Constitution Art 20; TAS §17).
   Build the smallest thing that improves a real athlete outcome; let the architecture
   pull the work forward.
