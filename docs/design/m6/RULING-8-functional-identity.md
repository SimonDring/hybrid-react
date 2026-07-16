# 🔒 8 — RULED: Functional-discipline identity + equipment-demotion honesty

**Status: RULING (Simon, 2026-07-16 — delegated: "rule 🔒 8 with your recommendation").**
**Authority: closes 🔒 8 in `docs/design/m6/M6-PLAN.md` §4. Governs M6 sub-phase (a) — P2-8.
Grounded in Constitution Art 14 (explainable), Art 15 (no silent truncation/debt), Art 20
(simplicity earns its place), Art 7 (minimum effective intervention), and the CLAUDE.md scope
note (the engine is GYM-ONLY today; endurance/conditioning is Stage 7).**

---

## The two decisions

### 1. Functional-fitness identity — RULED: honest label now; real GPP module deferred to Stage 7

**Current reality.** A `general_fitness` / `general_health` goal → `strength_style:'functional'` →
`resolveBuildDisciplineId` maps `functional → hypertrophy` (the WP-49 flip, KNOWLEDGE 1.17.0). So
"functional fitness" runs the **hypertrophy discipline** for its core programming, differentiated
only by (a) the `functional` priority-intent accessories (carries, anti-rotation, unilateral —
`strength/priorityIntents.js`) and (b) an auto-carried conditioning secondary-goal accessory tag
(KNOWLEDGE 1.18.0). There is no bespoke GPP path.

**Ruling.** Do NOT build a bespoke "functional/GPP discipline" module in M6. Instead:
- **Name it honestly** (the label, not a new engine path). A functional-fitness plan is a
  hypertrophy-based strength foundation + functional-carry/anti-rotation accessories + conditioning
  accessory work — the copy must say that plainly, and say that **full mixed-modal conditioning /
  work-capacity programming arrives with endurance (Stage 7).**
- **Keep** the existing functional accessory + conditioning differentiation (functional ≠ plain
  hypertrophy at the accessory/secondary-goal layer — `PlanGenerator.js` ~156–162).
- **Defer the real GPP module to Stage 7**, where it rides with endurance programming (🔒 10).

**Why (the decisive reason).** A *real* GPP/functional module's defining quality is **work capacity
/ conditioning** — and the engine generates **no aerobic/conditioning sessions today** (gym-only;
Stage 7). A bespoke "functional discipline" built now could only be (a) hypertrophy under a new name
(a cosmetic identity — dishonest), or (b) a module *claiming* conditioning it cannot deliver
(dishonest). Art 14/15/20 point the same way: name what it is truthfully, and give it a genuine
module when the capability to make it genuine exists — not a hollow one now. Art 7: the current
hypertrophy-base + functional accessories + conditioning is a reasonable GPP approximation; a whole
new discipline path has not earned its place until endurance makes it real.

### 2. Equipment-demotion honesty — RULED: no silent demotion (hard requirement, affirmed)

**Current reality.** `resolveBuildDisciplineId` (`data/disciplines/index.js:26`) silently rewrites a
barbell discipline to hypertrophy when the athlete has no barbell:
`if (BARBELL_DISCIPLINES.has(id) && !availableEquip(...).has('barbell')) id = 'hypertrophy';`
Nothing surfaces this. A user who chose "get stronger" (powerlifting) or "olympic" without a barbell
is silently given a hypertrophy plan and never told why.

**Ruling.** This is not a philosophy fork — it is the honesty principle applied, and it is
**mandatory**: when equipment forces a discipline down, the app must **surface it explicitly** and
name the unlock. Copy of the form: *"Maximal strength is best trained with a barbell. With your
available equipment we've built a dumbbell hypertrophy-based strength plan instead — add a barbell to
unlock powerlifting programming."* Art 14 (every recommendation explainable) + Art 15 (no silent
truncation/debt). The demotion itself is preserved (correct behaviour with limited kit); only the
**silence** is the defect.

---

## Scope + what this unblocks

- This ruling **decides** 🔒 8. It does **not** start any build. Implementation rides in **M6
  sub-phase (a)** (P2-8), which begins only when the M6 plan is greenlit and its entry gate holds.
  M6 sub-phase (b) — the allocator re-seat — remains blocked on **🔒 9** (unaffected by this).
- **Additive-first when built:** the honest-label copy and the demotion notice are *surfacing*
  changes (meta/UI honesty), not programming changes — no existing plan's sessions move. The
  functional→hypertrophy mapping and the barbell gate are UNCHANGED; we only stop hiding them.
- The demotion notice is the same honesty shape the equipment-gate already needs; it should be
  emitted as plan `meta` (an explainability field), consumed by the UI — never a silent fallback.

## Open (still Simon's, not touched here)

🔒 9 (the allocator re-seat) · 🔒 10 (endurance scope trigger — the real GPP module rides here) ·
the ballistic/olympic `clearedIds` contraindication science review (M4a; travels with M6 (a)).
