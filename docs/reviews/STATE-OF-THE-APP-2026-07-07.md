# State of the App — 2026-07-07 (overnight brief)

**Status:** LIVING document (not frozen). Written for Simon in plain English. Covers: what the
iterative work achieved, where the security review stands, an honest assessment of the app versus
the frozen governing documents, and a prioritised list — the top of which I worked through
overnight (see the last section for what I actually did).

`main` at the time of writing: **30 PRs merged since the 2026-07-05 audit (#127–#156)**, knowledge
version **1.9.0**, engine test suites **167/167 green**.

> **Status banner (2026-07-09 governance sprint):** REVIEW (2026-07-07). Written hours before the build flip deployed: its "#1 remaining gap — the build flip" is resolved, and its KSV/test counts (1.9.0 / 167) are superseded (1.30.0 / 195 as of 2026-07-09). This document is preserved as written; current state lives in `HANDOFF.md`; classification in `docs/DOCUMENTATION-INDEX.md`.

---

## 1. The one-paragraph summary

The engine is in strong shape. The 2026-07-05 audit found the "assessment → diagnosis → plan"
chain broken at its first link and the diagnosis steering only a minority of athletes. That is now
largely repaired: the stored athlete model feeds the diagnosis, every sport cohort (run/cycle/swim
+ the flipped team sports: soccer/gaa/hurling/field-hockey) is diagnosis-steered, the runtime week
the athlete actually trains is validated, and knowledge is being pulled into one governed,
version-tracked place. The **one big remaining coaching gap** is that **build/strength goals — the
largest cohort — still get a style-template plan** (their diagnosis is computed in parallel but
doesn't yet drive the plan). Turning that on is the "build flip" (WP-49) and it's genuinely your
call because it changes live plans and rests on product decisions. Everything else remaining is
either a governed-knowledge tidy-up (which I did overnight), a UI surfacing task, or a
deploy/validation step that needs your database access.

---

## 2. Progress report — the iterative improvements (30 PRs)

The 2026-07-05 audit → tonight. Grouped by what each theme achieved:

**A. The assessment→diagnosis chain now connects (it was broken).**
- The stored Athlete Model reaches the live diagnosis; per-lift strength standards + sport-
  experience priors (WP-38, #127).
- Build goals compute a real diagnosis (goal demand profiles), and the app never displays reasoning
  the plan ignored (WP-42a, #131).
- The team-sport flip: soccer, gaa, hurling, field-hockey are now diagnosis-steered, not legacy fill
  (WP-48, #136) — **verified tonight: hurling emits a real diagnosis and steers.**

**B. The diagnosis can now shape the plan structure (new, gated).**
- D7 "block objective": the diagnosis produces an inspectable block plan that now drives the deload
  rhythm AND the phase split for gated cohorts — advisory → steering (WP-47, #147/#151/#154).
  Deliberately GATED on a learned recoverability prior, so it is dormant until you promote one
  (nothing moves for current athletes; golden plans are byte-identical).

**C. One source of truth for knowledge (it was drifting).**
- One governed strength-standards table; capability anchors derived from it (WP-58, #146/#150).
- One muscle model (WP-45, #141); one governed ACWR band classifier (WP-57, #138).
- The knowledge version is now mechanically enforced on every science change (WP-44, #139) — I have
  bumped it correctly on every change since (now 1.9.0).
- The engine owns the team roll-up; the coach dashboard consumes it, the duplicate deleted, the
  Next build verified (WP-53, #149/#152).

**D. Exercise identity + rename-safety (it was name-regex fragile).**
- Every plan item carries a stable id (`exId`); the engine's own joins — volume tally, the equipment
  safety gate, de-spine, lift-progression tracking, the core hold/reps scheme — key on it. A display
  rename can no longer silently break programming or safety (WP-46, #144/#145/#155; WP-41, #130).

**E. Honesty in what the athlete sees.**
- A neutral-day reflow is now baseline-identity: it no longer silently re-derived the week and
  dropped programmed power/plyo work (WP-55, #148).
- Every athlete's session carries a plain-English "why" (WP-43, #132) — **verified tonight: even a
  build session now has a rationale.**
- The week the athlete actually trains is validated at runtime, injury-aware (WP-39, #128) —
  **verified tonight: `PlanService` validates the shipped week.**
- Match days are visible to the athlete whose plan they reshape (WP-52, #140).

**F. Groundwork for learning + AI (staged, off).**
- The first honest learning loop (block-outcome + readiness validation), STAGED — the engine does
  not read it; promotion is your call (WP-59, #142).
- The AIGAS AI seam behind flags; needs a server key + eval harness before go-live (WP-60, #137).

**Method (how safety was kept):** every engine change was written test-first (red before green),
audited against the golden-master snapshot key-by-key, and gated where it changes live output. Suites
went 152 → 167 green across the programme.

---

## 3. Progress report — the security review

The multi-user security review (S1–S15) is **substantially done: 13 of 15 findings implemented and
merged.** The remaining two are low-priority dashboard/config settings.

| Done (13) | Still needs YOU (2 + deploys) |
|---|---|
| S1 OAuth nonce, S2 token-column lockdown, S3 free-text bounds, S4 no raw-vitals logging, S5 committed-secret removed, S6 complete account deletion, S7 outbox race, S8 sync-range clamp, S9 rejoin guard, S10 search_path pin, S11 server-authoritative safety fields, S12 dashboard auth gate, S13 Next 16 (XSS advisories cleared) | S14 email-confirm/CAPTCHA (dashboard setting), S15 low hygiene (CORS `*`, validate legacy constraints) |

**Raw-vitals privacy (Constitution Art 11) — PROTECTED.** The coach board shows only derived signals
(injury status, readiness, load, adherence — all server-authoritative). Raw HRV / resting-HR / sleep
are owner-only with no coach read path. The RLS harness proves "the coach reads zero raw vitals."

**Two things for you (no code left — deploy/validate):**
1. **Deploy 3 Edge Functions** (fitbit-auth-callback, strava-auth-callback, fitbit-sync) to *activate*
   S1/S4/S8 — the database half is already live; the app falls back safely until you do.
2. **Close the WP-50 validation gap.** The team-scoping + join-code-lockdown migration (`20260711`)
   is applied to prod but was never harness-proven, because **staging doesn't have it yet** (staging is
   applied through `20260710`). That is why the harness shows 80/85 — the 5 "failures" are exactly the
   WP-50 cases, failing because staging lacks the migration. I read the `20260711` SQL and it is
   **correct by inspection** (scopes coach reads to the row's team via `is_coach_of_team`, revokes the
   join-code column, adds a coach-only RPC, safely drops the old over-broad helper). To *prove* it:
   apply `20260711` to staging and re-run `node supabase/tests/rls-harness.mjs` → expect 85/85.

---

## 4. Assessment — the app vs the governing documents

Measured against the frozen set (Constitution, EDS, Decision Ontology, Knowledge Architecture, TAS).
Honest verdicts, in plain English.

**What now ALIGNS (was partial/broken before):**
- **Diagnosis reaches the plan for every sport cohort.** Run/cycle/swim and the flipped team sports
  get a diagnosis that actually shapes exercise selection.
- **Safety applies to the week that ships**, not just the template — the runtime week is validated,
  injury-aware.
- **One capability model, one strength standard, one muscle model, one ACWR band** — the parallel
  copies that could drift are unified and version-tracked.
- **Determinism holds** — same profile, same plan; the neutral-day reflow no longer diverges.
- **Every steered athlete gets a "why."**
- **Exercise identity is stable** — renames can't break the plan-path joins.

**What is still PARTIAL or MISSING (the honest gaps):**

1. **Build/strength goals still get a style-template plan, not a diagnosis-driven one.** *(Biggest
   coaching gap.)* Their diagnosis is computed in parallel but the plan is built from per-muscle
   volume targets with a style-based rationale — not from their limiters. Turning this on is the
   "build flip" (WP-49). **This is genuinely your call** — it changes live plans and rests on ~6
   product decisions (in the 2026-07-05 reassessment, Priority 11).

2. **There is no real "strategy" (D6), and block structure (D7) only steers when a recoverability
   prior exists** — which nothing promotes yet, so it's dormant. For the general athlete,
   periodisation is still a fixed style/season template (the pattern the EDS wants replaced by
   diagnosis-driven structure). Building D6 is design work; activating D7 broadly is a live-plan
   decision — both yours.

3. **Knowledge separation is ~60–65% done (Art 17).** Most numbers the engine reasons with are now
   governed, but ~15 scheduling/selection scoring weights are still hardcoded literals in
   `scheduler.js` and `allocator.js` — changing scheduling policy still needs a code edit, not a
   knowledge edit. **← I worked on this overnight (section 6).**

4. **The engine computes more than the app shows.** The diagnosis, the block plan, and the validation
   report are all emitted in `meta`, but the main athlete screens surface only some of it. Making the
   "why" fully visible is UI work.

5. **The learning loop is built but staged/off (D16).** It produces honest verdicts + a conservative
   candidate prior, but nothing reads them yet. Promoting staged → learned is your deliberate call
   (and it's what would make the D7 steering above come alive).

6. **A couple of small dead/unreachable bits** — D3 position refinement is unreachable code; some
   scheduler machinery was already removed (WP-56); minor tidy-ups remain.

**Bottom line:** this remains a *re-seating, not a rewrite*. The spine is right and mostly connected.
The critical path left is: (a) the build flip (yours), (b) D6/D7 activation (yours), (c) governed-
knowledge tidy-up (safe, autonomous — done tonight), (d) surfacing the reasoning in the UI.

---

## 5. Prioritised backlog (plain English)

Ordered by the programme's criteria (architectural correctness > coaching reasoning > scientific
validity > knowledge separation > explainability > testing). **[S]** = safe/autonomous, **[YOU]** =
needs your decision, **[DEPLOY]** = needs your database/prod access.

1. **[YOU] The build flip (WP-49)** — make build/strength goals diagnosis-driven. Biggest coaching
   upgrade left; 6 product decisions on record. *Paused for you.*
2. **[YOU] Activate D7 steering / build D6 strategy** — let the diagnosis shape periodisation for
   everyone, not just athletes with a recoverability prior. Live-plan change + design work.
3. **[S] Knowledge separation (Art 17)** — extract the scheduler + allocator scoring literals into
   governed, version-tracked knowledge. Byte-identical, safe, no decision needed. **← DID THIS.**
4. **[S] Surface the reasoning in the app UI** — render the diagnosis/block-plan/validation the engine
   already emits, on the main athlete screens (currently mostly on DevPlayground/SessionDetail).
   Needs browser verification; behavioural for the UI only.
5. **[YOU] Promote the learning loop (D16)** — turn staged priors into learned ones so D7 steering and
   volume-tolerance come alive. Needs the falsifiability read first.
6. **[DEPLOY] Security finish** — validate `20260711` on staging (→ 85/85), deploy the 3 Edge
   Functions, set email-confirm.
7. **[S] Small tidy-ups** — D3 unreachable code; validate the `010` legacy constraints; minor
   dead-code/comment sweep.

---

## 6. What I did overnight

I worked the top **safe, autonomous** item on the list — **#3, knowledge separation (Art 17)** —
and stopped there deliberately (reasoning below).

**WP-61 — govern the scheduler + allocator scoring weights** (branch `feat/wp61-govern-scoring`,
green PR ready to push). ~15 hardcoded scoring/penalty numbers that encode COACHING POLICY were
living as literals inside the reasoning code:
- The D13 scheduler's interference penalties (how hard to push same-muscle days apart = 14, keep
  hard days apart = 10, recover the spine between heavy-axial days = 9, keep gym work off sport
  days = 3/2) → `packages/engine/src/data/schedulingPolicy.js`.
- The D11 allocator's scoring economy (reward the intent's preferred lift ×1.35, damp a repeated
  pattern ×0.6, open the session on a compound ×1.2, fade a lift repeated across the week ×0.82ⁿ,
  bias each day toward its split's focus) → `packages/engine/src/data/selectionScoring.js`.
Both are now GOVERNED, version-tracked knowledge: changing scheduling or selection policy is a
knowledge edit a sports scientist can review, not a code change. It is a **pure, byte-identical
extraction** — the values reproduce the old literals exactly, so the golden-master snapshot did not
move (verified: 0 non-version lines changed), a pin test guards the numbers, and the full suite is
168/168 green. Knowledge version 1.9.0 → 1.10.0.

**Why I stopped there (and did NOT do more overnight):**
- The remaining code literals (session-length ceiling, finisher minutes, per-session item caps) are
  *implementation limits*, not coaching policy — pulling them into "knowledge" would over-extract and
  violate Art 20 (simplicity earns its place). WP-61 draws the principled line at policy weights.
- Item #4 (surface the reasoning in the UI) is app/browser work that really needs your eyes on the
  visual result — doing it unsupervised risks shipping something that looks wrong.
- Items #1, #2, #5 (the build flip, D6/D7 activation, promoting the learning loop) are **your**
  decisions — they change live plans or rest on product/science calls. I did not touch them.
- Item #6 (security) needs your database/prod access.

So: one solid, safe, tested unit landed as a ready-to-push PR; the judgment-heavy items are queued
for you with everything you need to decide.
