# Platform Health Report

> **Status banner (2026-07-09):** REVIEW — point-in-time health assessment (2026-07-06). Its headline finding H1 ("two coexisting strategies, ~90% on volume-first") was CLOSED by the build flip (2026-07-07) and PR #160. Remaining findings were re-verified in the 2026-07-09 governance sprint — see `docs/reviews/2026-07-09-platform-health-reverification.md`. Do not act on this report without checking that re-verification.

**Performance OS — engineering assessment**
Audience: the founder. This is a documentation-only assessment produced from a full-repository read on 2026-07-06 — no code was modified to produce it. Every finding below is classified **Critical / High / Medium / Low** and grounded in a specific file or document; concrete recommendations are given, but none have been applied.

A note on tone before the findings: this codebase is unusually well self-documented and self-critical for its size. Several of the "findings" below are things the team already found and fixed themselves within a day, or explicitly flagged in their own comments as known, deliberate, temporary states. Where that's true, it's said plainly — this report is not trying to manufacture urgency where the team has already demonstrated good judgement.

---

## Executive summary

| Dimension | Rating | One-line reason |
|---|---|---|
| Architecture maturity | **Strong, mid-migration** | A genuinely well-designed target architecture exists and is being executed toward incrementally, with real safety nets |
| Code organisation | **Good** | Clear capability boundaries (engine / app / web / backend); a few oversized files |
| Module cohesion | **Good** | Small, single-purpose files are the norm; the exceptions are named below |
| Coupling | **Low-to-moderate, mostly deliberate** | Two coexisting reasoning strategies during migration is temporary, tracked coupling, not accidental |
| Testing | **Good, with one past near-miss** | ~141 test files, a golden-master safety net, but `npm test` was once silently broken for an unknown period before being fixed |
| Documentation | **Mixed** | Exceptional in-code documentation and governance rigor; several standalone docs (SCHEMA.md, architecture/README.md, parts of CLAUDE.md) are stale |
| Security posture | **Good, actively maintained** | A real audit trail of finding and fixing CRITICAL/HIGH issues quickly, including a genuine cross-team data leak caught by the team's own process |
| Technical debt | **Named, tracked, not hidden** | The team maintains its own debt backlog (WP-numbered) rather than letting debt go unrecorded |
| Confidence in current implementation | **High for the live paths; explicitly partial by design for the mid-migration paths** | The team is honest about exactly which cohorts get which level of sophistication today |

---

## Critical findings

### C1. Two standalone documents are significantly stale and could mislead a reader who trusts them at face value

**What.** `docs/SCHEMA.md` describes a 12-table schema with an invite-allowlist gate — both facts are roughly three weeks out of date. The actual schema has 19 tables, open signup, and the entire Team package (`teams`, `team_members`, `player_status`) is completely absent from the document. Separately, `docs/architecture/README.md` — the index for the `docs/architecture/` folder — lists only two of the folder's actual documents (`TAS.md` and `AIGAS.md`), omitting the Baseline Assessment, Migration Blueprint, both Reassessment documents, the Phase 3 Audit, and the D7 spec entirely.

**Why Critical, not just Medium.** These are exactly the documents a new engineer, a technical co-founder, or an investor's technical due-diligence reviewer would reach for first. Both are wrong in ways that actively understate how much of the Team package exists, which is the opposite of the risk you'd normally worry about (over-claiming) — but still a real trust and onboarding hazard.

**Recommendation.** Either bring both documents current, or replace them with a pointer to this Atlas suite and the living `MIGRATION-BLUEPRINT.md`/`BASELINE-ARCHITECTURE-ASSESSMENT.md`, explicitly retiring the stale ones rather than leaving two conflicting sources of truth.

### C2. CLAUDE.md — the project's own primary onboarding document — contains stale factual claims

**What.** CLAUDE.md's `src/data/` listing references `athletePillars.js` and a `sports/` subfolder that were deliberately removed months ago (confirmed via the `atlas.js` file's own header comment, which documents their retirement). CLAUDE.md also currently frames `apps/web` as "RESERVED... not built yet," when it is in fact a substantially complete, live, RLS-backed coach dashboard with 12 real feature commits.

**Why Critical.** CLAUDE.md is explicitly the document every AI coding session and every new contributor is told to treat as authoritative project context. A stale claim here doesn't just mislead a reader once — it can misdirect every future AI-assisted session that trusts it.

**Recommendation.** A dedicated pass to reconcile CLAUDE.md against current reality, focused specifically on the `apps/web` status line and the `src/data/` listing.

### C3. A genuine cross-team data leak existed in production for approximately 24 hours (now fixed)

**What.** The very first version of the `player_status` coach-read policy checked "does this caller coach *any* team the player belongs to," rather than "does this caller coach *this specific* team" — meaning a coach could, in principle, read a multi-team player's derived status for a team they had no relationship to. This was found by the team's own scheduled reassessment process and fixed within about a day.

**Why listed as Critical despite being fixed.** This class of bug — a Row-Level Security policy that's *almost* right — is exactly the failure mode the Team package's entire design exists to prevent, and it is the one place in the whole codebase where a real, if narrow, instance of it actually occurred. It is included here, fixed or not, because the *pattern* deserves permanent vigilance: any future RLS policy touching cross-user access should be reviewed with this specific incident in mind.

**Recommendation.** No code action needed (already fixed and covered by a regression test in the RLS harness). Recommend: any future cross-user RLS policy change gets a mandatory "does this scope by the specific relationship, or by the general relationship" checklist item, citing this incident.

---

## High findings

### H1. The platform currently runs two coexisting coaching-decision strategies, and roughly 90% of users are still on the older one

**What.** As detailed in the Architecture Atlas §4.0: run/cycle athletes get a live, diagnosis-driven exercise selection; swim and the invasion/team sports get a different, category-coverage-based mechanism; the majority "build" cohort (get stronger / build muscle / general fitness) still runs on the original volume-first fill, with a real diagnosis computed but discarded before it reaches the plan.

**Why High.** This is a deliberate, well-reasoned, actively-managed migration (see ADR-02) — not an accident — but it is genuine, current architectural complexity that anyone reasoning about "what does the engine actually do" needs to hold in mind, and it means the platform's stated coaching sophistication is materially uneven across user types today.

**Recommendation.** No urgent action required — this is being executed as planned. Recommend keeping the "cohort truth table" (Atlas §4.0) actively maintained as the single reference for "who gets what," since it will change with each further migration wave.

### H2. `plan/allocator.js` (~1,050 lines) is the engine's single highest-complexity, highest-regression-risk file — by the project's own assessment

**What.** The team's own architectural audit independently names the eventual decomposition of this file as the single riskiest remaining step in the entire re-seat programme.

**Why High.** A file this size, this central, and this risky to change is a natural single point of failure for both bugs and slow iteration speed.

**Recommendation.** Treat any future work in this file with proportionally higher review rigor and test coverage than elsewhere; consider whether a deliberate, test-covered decomposition (already flagged as planned work, not a new discovery) should be sequenced sooner rather than later, precisely because risk tends to compound the longer a file like this grows untouched.

### H3. The validator suite (D14) has 5 concrete validators against a 16-conceptual-validator target

**What.** Only five validators exist today (MRV ceiling, injury contraindication, duration honesty, equipment availability, purpose coherence) against the frozen design's fuller intended set.

**Why High.** Validation is explicitly the platform's last independent backstop against a badly-constructed week — described in its own architecture spec as "construction proposes, validation disposes." A thinner-than-designed validator set means more classes of problem rely on the constructor (the allocator) getting it right the first time, rather than being caught by an independent check.

**Recommendation.** No code change recommended here (out of scope for this documentation sprint), but recommend the founder treat "expand validator coverage" as a standing, tracked backlog item rather than a one-off task, given how central this layer is to the platform's own safety claims.

### H4. Several UI files have grown large enough to be genuine maintenance risk

**What (with line counts, largest first):**
- `apps/mobile/src/lib/SyncService.js` — 1,008 lines
- `apps/mobile/src/lib/Database.js` — 818 lines
- `apps/mobile/src/components/OnboardingWizard.jsx` — 585 lines (defines its own inline mini design-system rather than reusing shared UI primitives)
- `apps/mobile/src/screens/Injuries.jsx` — 711 lines, doing at least three separable jobs (a branching triage wizard, an injury-card/rehab-stepper renderer, a recovery-log mini-form)
- `apps/mobile/src/screens/SessionDetail.jsx` — 455 lines (includes a self-contained, already-extractable `SessionPhysiology` sub-component)
- `apps/mobile/src/screens/SessionRunner.jsx` — 385 lines (justified complexity — real step-sequencing logic for a live workout — but its `buildSteps` function is pure, exported, and arguably belongs in `lib/`, not a screen file)

**Why High, not Medium, for `Injuries.jsx` specifically.** At nearly 4× the average screen size in the codebase, doing three distinct jobs, it is the single clearest "split this file" candidate in the mobile app.

**Recommendation.** `SyncService.js` and `Database.js` are large but well-organised and explicitly protected by a "never rewrite" rule for good reason — no action recommended there beyond continued discipline. `Injuries.jsx` is the highest-value, lowest-risk split candidate (extract the triage wizard and the injury card as separate components). `SessionDetail.jsx`'s `SessionPhysiology` sub-component and `SessionRunner.jsx`'s `buildSteps` function are both natural, low-risk extractions whenever the team next touches those files.

### H5. A real content gap: 5 of 14 injury regions have blocking rules but no rehab-exercise content

**What.** Elbow, wrist, cervical, quad, and shin injuries correctly get exercises blocked by the contraindication system, but `rehabExercises.js` has no entries for those regions — so a user with one of these injuries gets exercises removed with nothing offered in their place, and no prevention/"prehab" content once recovered.

**Why High.** This is a real, user-facing gap in a health-adjacent feature, not a cosmetic one — someone with a wrist injury who opens the Injuries screen gets a materially worse experience than someone with a knee injury, silently.

**Recommendation.** Author rehab-exercise content for the five uncovered regions (a content task, not an engineering one — the mechanism already supports it).

### H6. `apps/mobile/src/lib/AiService.js` appears to be real, tested, but completely unreferenced code

**What.** A grep across every screen, component, and store in the mobile app found zero references to this file. It is a genuinely careful implementation (a kill switch, a raw-vital denylist, a real Edge Function call) with its own dedicated test (`ai-seam.js`), but nothing in the UI currently calls it.

**Why High rather than Medium.** Unused-but-untested code is a low-priority cleanup item; unused-but-well-tested, safety-critical code is worth flagging more prominently, because its presence could create a false sense that an AI feature is "further along" than it is, and because dead code that nonetheless passes CI can mask the fact that it has no real caller to catch integration bugs.

**Recommendation.** Confirm whether this is intentionally staged ahead of a UI (most likely, given the deliberate pattern elsewhere in this codebase) or genuinely orphaned; if staged, note the intended call site somewhere findable so it isn't mistaken for dead code by a future contributor.

### H7. `packages/engine/src/data/strengthStandards.js` has a self-flagged, still-open scientific inconsistency

**What.** The file's own comments admit that the "capability level 1.0" anchor diverges between lifts: overhead press anchors to an "elite" band while squat/bench/deadlift anchor to "advanced," and the female deadlift/overhead-press anchors are independently-seeded numbers that don't match any band in the table at all. This is pinned by a test so it can't silently drift further, but the underlying inconsistency remains unresolved.

**Why High.** This directly affects how the platform estimates a real person's current strength capability — an input to the diagnosis for every user who has logged a 1RM.

**Recommendation.** A dedicated, reviewed pass to reconcile these anchors (a science/content decision, flagged in the code itself as "left to a reviewed change" — i.e., the team already knows this needs a human decision, not an engineering fix).

---

## Medium findings

### M1. Confirmed dead code

- `apps/mobile/src/components/TrainingCalendar.jsx` (117 lines) — not imported anywhere in the codebase; fully superseded by `WeekSchedule.jsx`, which is what `Home.jsx` actually uses.
- `apps/mobile/src/lib/SessionProgress.js` (22 lines) — explicitly vestigial by its own comment; kept only to clean up a legacy localStorage key nothing writes anymore.
- `packages/engine/src/data/capabilityPriors.js`'s `priorLevel()` function appears unused within the files examined (the actual call site uses a differently-named function from a different file).
- Supabase's `wearable_readings` table appears to have been functionally superseded by the richer `workouts` table, with no Edge Function writing to it since migration `006_workouts.sql`.
- Supabase's `ai_recommendations` table exists but nothing currently writes to it — the one live AI function (`ai-render`) deliberately doesn't persist there yet.

**Recommendation.** Low-risk deletions once confirmed with the team; `wearable_readings` needs a deliberate migration (per the "no schema changes without a migration" rule) rather than an assumption-based removal.

### M2. Duplicated logic and hardcoded values that bypass an existing shared mechanism

- `Trends.jsx` hand-rolls its own canvas line-chart function, duplicating what the shared `components/ui/Sparkline.jsx` component already does elsewhere (`RecoveryDetail.jsx`, `SleepDetail.jsx`).
- The same hardcoded hex colours (`#6FD3C4` for HRV/readiness, `#E8836F` for resting heart rate) are independently duplicated across `Trends.jsx` and `RecoveryDetail.jsx` rather than defined once.
- `Injuries.jsx` uses raw hardcoded hex colours (lines 25–28, 608) that duplicate colours already available as real theme variables (`--rust`, `--ochre`, `--moss`, `--txt-muted`) elsewhere in the same file — not the specific *invented* variable names CLAUDE.md warns about, but the same underlying smell (colours that won't respond to a future theme change).
- `PhaseDetail.jsx` and `Plan.jsx` independently implement near-identical week-completion-percentage logic.

**Recommendation.** Low-risk, mechanical consolidations whenever these files are next touched; none are urgent on their own.

### M3. A small number of screens partially bypass the documented data-flow pattern

- `Settings.jsx` imports and reads `Database.js` directly (for bulk export and raw table-count diagnostics) rather than exclusively through the store — a read-only exception, not a violation of the platform's *write* rule, but worth naming since it's the one screen that would need attention if `Database.js`'s shape ever changed.
- `Teams.jsx` calls `SyncService` functions directly for team join/leave operations rather than via store actions — a reasonable choice for one-off network calls that don't belong in the offline-first local cache, but an inconsistency worth documenting rather than leaving implicit.

**Recommendation.** No change needed; recommend simply documenting these as known, deliberate exceptions in CLAUDE.md so a future contributor doesn't mistake them for bugs — or copy the pattern more broadly by accident.

### M4. Coach dashboard: two UI affordances that look persisted but aren't

**What.** The "Coach notes" text field and the "done" checkmarks on the coach's to-do list (`PlayerDetailDrawer.tsx`, `CoachActionsPanel.tsx`) are both local React state only — no database write. Refreshing the page or reopening the drawer loses the input.

**Why Medium, not Low.** A coach who types a note and trusts it's saved, only to lose it on refresh, is a real trust-eroding UX gap for exactly the audience (a non-technical coach) the product is trying to serve well.

**Recommendation.** Either wire these to real persistence, or add a visible "not saved" affordance until they are.

### M5. A marketing-copy / product-behaviour contradiction

**What.** The marketing site's footer and a "Teams" page section both reference a "live dashboard demo" / "see it live" link, but the dashboard's server-side gate (`proxy.ts`) unconditionally denies any unauthenticated visitor, redirecting to the login page. There is no seeded demo account behind this link today.

**Recommendation.** Either build a real, safely-seeded demo account/path, or remove the "live demo" language from marketing copy until one exists.

### M6. Lead capture and analytics on the marketing site are not actually wired to anything persistent

**What.** Contact-form submissions fall back to a `mailto:` link (or, if a specific environment variable is set, to an API route whose "delivery" is currently just a `console.log`). Analytics event calls are no-ops unless specific provider IDs are configured, which they currently aren't.

**Why Medium.** This isn't a bug — the code is honest about it and documents exactly how to wire a real provider — but it means every lead captured through the marketing site today is not being durably recorded anywhere the founder can see later.

**Recommendation.** Wire a real lead-delivery destination (email service or a database table) before running any real marketing traffic to these pages.

### M7. Governance-adjacent documentation has one internal inconsistency

**What.** `docs/architecture/ATHLETE-MODEL.md` states in one section (§5.7) that the diagnosis has already been wired into live plan generation for run/cycle (accurate, confirmed in code), and in a later section (§12, "Known limitations") states more absolutely that the diagnosis "does not yet steer plan generation" (no longer fully accurate for those cohorts).

**Recommendation.** A short reconciliation pass on this one document; low effort, meaningful clarity gain given how central this document is to understanding the diagnosis layer.

### M8. A handful of naming inconsistencies with real potential to confuse a new reader

- The wearable integration is named "Fitbit" throughout code, table, and function names (`fitbit-sync`, `wearable_connections.provider = 'fitbit'`, `FitnessAgeDetail` imports, etc.) but actually integrates with the Google Health API — a historical carry-over, explained in code comments but easy to misread as a literal Fitbit Web API integration.
- "Coach" means two different things in two different places: the future AI chat coach (`Coach.jsx`, a 0%-functional mockup screen, Stage 6 on the roadmap) and the human team coach's web dashboard (`apps/web`, Stage 5, substantially live). Both are called "coach" in different parts of the product with no disambiguating language.
- Two similarly-named files (`teamScheduleCache.js` and `teamStatus.js`) serve genuinely different purposes (a read-side cache vs. a write-side privacy roll-up) — no actual bug, but the naming invites confusion at a glance.

**Recommendation.** No code change required; recommend a short glossary note (in CLAUDE.md or this Atlas) disambiguating "AI coach" vs. "team coach" specifically, since that one is the most likely to cause real confusion in a product conversation.

### M9. A handful of database-level loose ends, individually low-risk but worth tracking together

- All CHECK constraints added for input validation (bodyweight ranges, text length caps, etc.) are `NOT VALID` by design — they protect new/updated rows but were never run against historical rows to confirm full compliance. Low risk today (few/no live users); becomes a real gap once meaningful production data accumulates.
- A wildcard CORS header (`*`) is present on JWT-gated Edge Functions — every affected function still requires a valid token regardless of origin, but this is unconventional hardening posture for authenticated endpoints.
- `delete_user()`, the account-deletion RPC, has needed manual updates three times as new user-owned tables were added — a recurring "someone has to remember" maintenance burden, partially (not fully) offset by cascading foreign keys already covering most tables.
- The `oauth_states` nonce table has no scheduled cleanup job, only opportunistic per-caller garbage collection — low risk given the short (10-minute) time-to-live, but rows from abandoned OAuth attempts will accumulate indefinitely.

**Recommendation.** Track these as a small, low-urgency backlog; none require immediate action, but all are the kind of thing worth revisiting once real user volume exists.

---

## Low findings

- `SetNewPassword.jsx` enforces an 8-character minimum password length while `Settings.jsx`'s in-app password-change form enforces 6 — a minor, user-facing inconsistency for the same underlying action.
- `App.jsx`'s route-metadata fallback returns a tab id (`'today'`) that doesn't match any of the four real tab ids the tab bar actually uses — currently unreachable in practice (every real route is otherwise matched), but a one-line latent inconsistency.
- `PhaseDetail.jsx` renders a bare, unstyled "Phase not found" message, inconsistent with the app's otherwise-consistent themed empty states elsewhere.
- A few `preventionExercises` entries in the injury knowledge base omit the `evidenceId` citation that most other entries carry — a minor provenance gap, not a functional one.
- `packages/engine/src/data/blockPriors.js`'s own header comment claims block-length steering "steers nothing yet" — this is now stale; the mechanism does steer, for the narrow gated cohort described in the Atlas (sport athletes with a learned recovery-rate prior, which — because the learning loop isn't live yet — is effectively no one in production today, making the comment's practical conclusion still roughly correct even though its literal claim isn't).
- `apps/mobile/src/screens/SleepDetail.jsx` references a `--accent-2` CSS variable not explicitly documented in CLAUDE.md's "real theme variables" list — very likely a legitimate, simply undocumented additional token (confirmed present in the stylesheet), not one of the three specifically-banned invented names, but worth a quick verification pass.
- The worktree-based engine-resolution gotcha (a git worktree can resolve `@performance-os/engine` to the main repo's copy rather than its own) is a known, already-documented development-environment quirk rather than a product bug.

**Recommendation.** All low-priority, low-risk, appropriate for a routine cleanup pass rather than dedicated work.

---

## Testing gaps

**Strengths.** ~141 test files, a golden-master regression suite proving byte-identical output across thousands of swept profiles, a dedicated "build parity" test ensuring un-migrated cohorts stay unchanged during the re-seat, and an adversarial RLS test harness proving team data isolation in both directions.

**Gaps.**
- `npm test` was discovered to be silently broken (pointing at a deleted file) for an unknown period before being fixed as the deliberate first step of the current rebuild programme — a reminder that a test suite is only as good as CI actually running it, and this specific failure mode (a broken test runner that fails loudly-but-gets-ignored, rather than a genuine test failure) is worth a periodic manual sanity check even with CI in place.
- No dedicated component/UI-level test suite was found for the mobile app's screens (the 141 tests are overwhelmingly engine and app-integration-layer tests) — screen-level regressions (a broken layout, a mis-wired prop) would not be caught by the current suite.
- No automated coverage was found for the marketing site or the dashboard's client-side interactive components specifically (the coach-notes/to-do local-state issue in M4 is exactly the kind of thing UI tests would have caught).

**Recommendation.** Given the team's demonstrated testing discipline elsewhere, extending it to a light UI-smoke-test layer for the highest-traffic mobile screens and the dashboard would be a high-leverage addition.

---

## Architectural risks (forward-looking)

1. **Solo-founder concentration risk.** The platform's own internal architectural review names this explicitly: "the platform's biggest single point of failure is that its constitution, engine, and operations live in one head." The governance documentation is itself a partial mitigation (it lets the reasoning be picked up by someone else), but this is a real, structural risk worth the founder naming to any future collaborator or investor conversation, not a code issue this report can fix.
2. **Assessment data poverty.** Nine of the ten physical qualities the diagnosis reasons about are still estimated from population averages or a questionnaire, not measured directly from the athlete (only max strength has a genuine measured path, from a logged 1RM). This caps how confident the diagnosis can honestly be, and is explicitly named by the team's own review as one of the things that would most determine whether the platform reaches its full ambition.
3. **No outcome loop is fully closed yet.** The first learning-loop mechanism exists and is genuinely well-designed (conservative, requires corroborating signals, human-gated promotion) but is not live — meaning the platform cannot yet demonstrate, end to end, "we diagnosed X, we prescribed for X, and X measurably improved" for any real user today.
4. **Ambition vs. team size.** Recorded explicitly, more than once, in the team's own planning documents as a "standing tension" — the frozen governance set is unusually rigorous for a project at this stage, which is a genuine strength, but also a real risk if the framework ever outpaces the team's capacity to build against it. Constitution Article 20 ("simplicity is a feature... the governor on all the others") is the team's own stated defence against this, and the evidence in this report (deliberate, staged migrations rather than rewrites; a "build the smallest useful thing" pattern repeated across almost every ADR) suggests it is being actively honoured, not just stated.

---

## Overall confidence assessment

**High confidence** in: the pure-engine boundary and its test coverage; the injury system's data-driven design; the Team package's privacy architecture (despite one caught-and-fixed early bug); the knowledge-governance/confidence-authority mechanism; the offline-first sync design; the security team's demonstrated speed at finding and closing real vulnerabilities.

**Partial, explicitly-acknowledged confidence** in: the diagnosis layer's accuracy for cohorts where it's genuinely diagnosis-driven (still built on largely-estimated, not measured, capability data); the freshly agent-authored soccer and rugby Sport Knowledge Base profiles (structurally complete, flagged by the team itself for a scientific accuracy review); the block-length/periodisation steering mechanism (built, but gated behind a learning-loop prior that isn't live yet, so effectively dormant in production).

**Lower confidence, flagged for attention** in: the currency of several standalone documents (C1, C2); the completeness of the rehab-exercise content library (H5); and the strength-standards anchor inconsistency (H7).

None of the findings in this report indicate a fundamentally unsound architecture. The pattern across nearly every finding — including the most serious one (C3) — is a team that finds its own problems quickly, through its own structured review process, and fixes them without waiting for external pressure. That pattern itself is one of the more reassuring signals in this whole assessment.
