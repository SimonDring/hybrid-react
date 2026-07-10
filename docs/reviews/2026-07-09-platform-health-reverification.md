# Platform Health Re-verification — 2026-07-09

**Status: REVIEW (dated). Re-verifies docs/architecture-atlas/05-PLATFORM-HEALTH-REPORT.md (2026-07-06) finding-by-finding against main @ 2026-07-09 (KSV 1.30.0).**

Verified on branch `governance-sprint-2026-07-09` (main + the 2026-07-09 governance-sprint commits `1f001d4`, `e946e3e`, plus uncommitted working-tree doc patches to `docs/SCHEMA.md` and `docs/architecture/ATHLETE-MODEL.md`). Every check below is a concrete command run today — line counts, greps, file listings — not a re-read of the original report. H1 was known-closed before this review (build flip 2026-07-07 + PR #160) and is included in the table for completeness only.

## Summary table

| Finding | 2026-07-06 claim (short) | Verdict | Evidence (short) |
|---|---|---|---|
| C1 | SCHEMA.md + architecture/README.md significantly stale | **PARTIALLY CLOSED** | SCHEMA.md stale-banner added 2026-07-09 (reconcile still queued); architecture/README "The set" still lists 2 of the folder's 8 docs |
| C2 | CLAUDE.md contains stale factual claims | **CLOSED** | Rewritten in `e946e3e` (2026-07-09); grep finds no athletePillars/sports refs; apps/web + src/data listings match reality |
| C3 | Cross-team player_status leak (fixed) | **CLOSED** | Fix confirmed in `20260711_team_scoping.sql` (WP-50); regression cases live in `rls-harness.mjs`; checklist recommendation not formalised |
| H1 | Two engines, ~90% volume-first | **CLOSED** (known) | Build flip 2026-07-07 + PR #160; ATHLETE-MODEL.md §11 now: all cohorts diagnosis-steered |
| H2 | allocator.js ~1,050 lines, highest-risk file | **STILL OPEN (grew)** | Now **1,243** lines (+~200 since report) |
| H3 | 5 validators vs 16-validator design | **STILL OPEN** | Exactly 5 validator ids in `packages/engine/src/lib/validation/` |
| H4 | Six oversized UI/lib files | **STILL OPEN** | All six re-measured; five unchanged, OnboardingWizard grew 585→624 |
| H5 | 5 of 14 injury regions lack rehab content | **STILL OPEN** | rehab covers 9 regions; missing exactly elbow, wrist, cervical, quad, shin |
| H6 | AiService.js tested but unreferenced | **STILL OPEN** | Zero source references outside the file + `tests/ai-seam.js`; header now documents staged intent |
| H7 | strengthStandards anchor inconsistency | **STILL OPEN** | Self-flag comment still present (lines 19–24); pinned by wp58 test |
| M1 | Five dead-code items | **PARTIALLY CLOSED** | 4 of 5 still open; `priorLevel()` claim INVALID — used by `lib/priors.js` since 2026-07-05 |
| M2 | Duplicated chart logic + hardcoded hex | **STILL OPEN** | All four sub-items re-confirmed at the named lines |
| M3 | Settings/Teams bypass the data-flow pattern | **STILL OPEN** | Both imports re-confirmed; not yet documented as exceptions in CLAUDE.md |
| M4 | Coach notes / to-do checkmarks not persisted | **STILL OPEN** | Both still plain `useState`, no DB write |
| M5 | "Live demo" links vs auth-gated dashboard | **STILL OPEN** | Marketing links to /dashboard persist; proxy.ts still denies all unauthenticated |
| M6 | Leads/analytics not wired to persistence | **STILL OPEN** | leads route still `console.log`; analytics still provider-gated no-op |
| M7 | ATHLETE-MODEL.md §5.7 vs §12 contradiction | **CLOSED** (uncommitted) | §12 marked resolved "updated 2026-07-09"; change is in the working tree, not yet committed |
| M8 | Naming: fitbit≠Google Health; two "coach"es | **STILL OPEN** | fitbit-* naming, Coach.jsx, teamScheduleCache/teamStatus all persist; no glossary note added |
| M9 | Four DB loose ends (NOT VALID, CORS, delete_user, oauth_states) | **STILL OPEN** | All four re-confirmed |
| L1 | Password min 8 vs 6 inconsistency | **STILL OPEN** | SetNewPassword `>= 8`; Settings `< 6` check |
| L2 | App.jsx fallback tab id 'today' invalid | **STILL OPEN** | App.jsx:71 `tab: 'today'`; real ids home/plan/health/atlas |
| L3 | Bare "Phase not found" empty state | **STILL OPEN** | PhaseDetail.jsx:12 unchanged |
| L4 | Some preventionExercises lack evidenceId | **STILL OPEN** | 5 of 23 entries missing evidenceId (scripted count) |
| L5 | blockPriors.js "steers nothing yet" comment stale | **STILL OPEN** | Comment unchanged at line 11 |
| L6 | --accent-2 undocumented in CLAUDE.md | **STILL OPEN** | Used in SleepDetail, defined in main.css:592, absent from rewritten CLAUDE.md |
| L7 | Worktree engine-resolution gotcha | **STILL OPEN** (accepted) | Not documented in repo docs; a dev-environment quirk, not a product bug |
| T1 | npm test once silently broken | **CLOSED / HEALTHY** | `npm test` run today: 195/195 test files pass in 14.1s; CI `test.yml` exists |
| T2 | No mobile component/UI test suite | **STILL OPEN** | No vitest/jest/testing-library in apps/mobile |
| T3 | No web/marketing/dashboard tests | **STILL OPEN** | No `*.test.*` files in apps/web |
| R1 | Solo-founder concentration risk | **STILL OPEN** | Structural; unchanged |
| R2 | Assessment data poverty (1 of 10 qualities measured) | **STILL OPEN** | estimation.js: only maxStrength has a measured path |
| R3 | No outcome loop fully closed | **STILL OPEN** | learning seam still gated; no live writer |
| R4 | Ambition vs team size | **STILL OPEN** | Structural standing tension; unchanged |

---

## Critical findings

### C1 — "Two standalone documents are significantly stale and could mislead a reader who trusts them at face value" — PARTIALLY CLOSED

**Part 1, docs/SCHEMA.md.** A status banner was added 2026-07-09 (working-tree change, `git status` shows `M docs/SCHEMA.md`, not yet committed):

> "**Status banner (2026-07-09 governance sprint):** SUPPORTING — FLAGGED STALE (last reconciled pre-team-spine). Documents 12 tables and invite-gated signup; reality is 19 tables … open signup (migration 004), and the team spine (teams/team_members/player_status). A full reconcile is queued in HANDOFF.md's open queue."

The body below the banner is still the stale 12-table / invite-gated text ("## Tables (12)", "signup is gated by the `allowed_emails` invite list"). The new `docs/DOCUMENTATION-INDEX.md` (committed `e946e3e`) also flags it: line 88 — "⚠ STALE — 12 of 19 tables; reconcile queued (open queue #8); Data Dictionary currently more accurate". So the *misleading-a-trusting-reader* hazard is defused (the first thing a reader sees is the warning + a pointer to the accurate Data Dictionary), but the reconcile itself is still queued work.

**Part 2, docs/architecture/README.md.** The folder now contains 8 files (`ls docs/architecture/`): AIGAS-REVIEW-2026-07-06.md, AIGAS.md, ATHLETE-MODEL.md, D7-BLOCK-OBJECTIVE-SPEC.md, MIGRATION-BLUEPRINT.md, README.md, REASSESSMENT-2026-07-05.md, TAS.md. The README's "The set" table still lists only **TAS.md and AIGAS.md** — a grep for `ATHLETE-MODEL|MIGRATION-BLUEPRINT|REASSESSMENT|D7|AIGAS-REVIEW` in the 56-line README returns nothing. Two mitigations since the report: (a) the Baseline Assessment and Phase 3 Audit were moved out to `docs/archive/` (commit `1f001d4`), so two of the omissions no longer live in this folder; (b) DOCUMENTATION-INDEX.md now catalogues the whole set (it names MIGRATION-BLUEPRINT, ATHLETE-MODEL, D7, etc.). But the folder's own index remains incomplete.

**Verdict: PARTIALLY CLOSED** — the trust hazard is mitigated by the banner + the new Documentation Index; the SCHEMA.md reconcile and the architecture/README completeness fix remain open.

### C2 — "CLAUDE.md contains stale factual claims" — CLOSED

CLAUDE.md was rewritten in commit `e946e3e` ("docs(governance): HANDOFF split + Documentation Governance/Index + CLAUDE.md rewrite", 2026-07-09). Checks against the rewritten file:

- `grep -n "athletePillars|sports/" CLAUDE.md` → **no matches** (the two stale `src/data/` entries are gone).
- The new `src/data/` listing (CLAUDE.md ~lines 110–113): "activityTypes.js, strengthStandards.js (display bands), exerciseLibrary.js …, metricGlossary.js, providers.js" — `ls apps/mobile/src/data/` returns exactly: `activityTypes.js  exerciseLibrary.js  metricGlossary.js  providers.js  strengthStandards.js`. **Match.**
- The apps/web claim: line 91 — "apps/web/ — Next.js: config-driven marketing site + the coach dashboard"; line 25 notes the dashboard "is gated". No "RESERVED… not built yet" language remains for apps/web. **Matches reality** (live marketing site + RLS-gated coach dashboard confirmed elsewhere in this review — see M4/M5).

**Verdict: CLOSED** by the 2026-07-09 CLAUDE.md rewrite (`e946e3e`).

### C3 — "A genuine cross-team data leak existed in production for ~24 hours (now fixed)" — CLOSED

Already fixed at report time; the fix and its regression coverage are both confirmed present today:

- `supabase/migrations/20260711_team_scoping.sql` documents and closes the exact bug: "GAP 1 — player_status coach reads were PLAYER-scoped, not TEAM-scoped… Fix: scope the policy to the ROW'S team via the existing is_coach_of_team()", recreating the policy as `using (auth.uid() = user_id or is_coach_of_team(team_id))` and **dropping** the over-broad `is_coach_of(uuid)` helper "so the over-broad path can't be reintroduced by accident".
- `supabase/tests/rls-harness.mjs` has a dedicated block (line 323: "WP-50 (20260711) — team-scoped coach reads + join_code column lockdown") plus line 217: "another team's coach reads NOTHING of this team".
- The report's recommendation (a mandatory "specific vs general relationship" checklist item for future cross-user RLS changes) has **not** been formalised as a checklist anywhere findable, though the incident is documented in the migration's own comments.

**Verdict: CLOSED** (fix + regression tests confirmed; the process-checklist recommendation remains unadopted).

---

## High findings

### H1 — "Two coexisting coaching-decision strategies, ~90% on the older one" — CLOSED (known before this review)

Closed by the build flip (WP-49, deployed 2026-07-07) plus PR #160's deletion of the legacy sport layer. Corroborated in code/docs today: `docs/architecture/ATHLETE-MODEL.md` §11 — "All cohorts are diagnosis-steered — run, cycle, swim, all team sports, and build goals (the build flip deployed…)"; `apps/mobile/tests/` contains wp49-discipline-selection/steers/reflow tests, all passing in today's run. Not re-verified in depth per this review's scope.

### H2 — "plan/allocator.js (~1,050 lines) is the single highest-complexity, highest-regression-risk file" — STILL OPEN, and it grew

```
wc -l packages/engine/src/lib/plan/allocator.js  →  1243
```

The file is now **1,243 lines** — roughly 200 lines larger than at the 2026-07-06 report. No decomposition has happened; the report's warning that "risk tends to compound the longer a file like this grows" is empirically playing out.

**Verdict: STILL OPEN (worse — 1,050 → 1,243 lines).**

### H3 — "The validator suite (D14) has 5 concrete validators against a 16-conceptual-validator target" — STILL OPEN

The suite lives in `packages/engine/src/lib/validation/`. Enumerating validator ids today:

- `mrvValidator.js:24` — `id: 'volume.mrv-ceiling'`
- `validators.js:35` — `id: 'injury.contraindication'`
- `validators.js:68` — `id: 'session.duration-honesty'`
- `validators.js:92` — `id: 'session.equipment-available'`
- `validators.js:117` — `id: 'session.purpose-coherence'`

`contract.js:30` imports exactly those four from validators.js (plus the MRV validator). Still **5 concrete validators** — the same five the report named.

**Verdict: STILL OPEN** (unchanged).

### H4 — "Several UI files have grown large enough to be genuine maintenance risk" — STILL OPEN

Re-measured today (`wc -l`):

| File | Report | Today | Delta |
|---|---|---|---|
| apps/mobile/src/lib/SyncService.js | 1,008 | **1,008** | 0 |
| apps/mobile/src/lib/Database.js | 818 | **818** | 0 |
| apps/mobile/src/components/OnboardingWizard.jsx | 585 | **624** | +39 |
| apps/mobile/src/screens/Injuries.jsx | 711 | **711** | 0 |
| apps/mobile/src/screens/SessionDetail.jsx | 455 | **455** | 0 |
| apps/mobile/src/screens/SessionRunner.jsx | 385 | **385** | 0 |

Sub-claims spot-checked: `SessionDetail.jsx:20` still defines the inline `SessionPhysiology` component (used at line 333); `SessionRunner.jsx:33` still has `export function buildSteps(session)` inside the screen file; OnboardingWizard still carries inline `style={{…}}` mini-design-system blocks (e.g. lines 102–115). None of the suggested extractions (Injuries triage wizard, SessionPhysiology, buildSteps→lib/) has happened.

**Verdict: STILL OPEN** (OnboardingWizard slightly worse; the rest unchanged).

### H5 — "5 of 14 injury regions have blocking rules but no rehab-exercise content" — STILL OPEN

`packages/engine/src/data/injuryTaxonomy.js` REGIONS defines 14 real body parts (+ 'other'): knee, ankle, hamstring, hip, calf, **shin**, **quad**, shoulder, **elbow**, **wrist**, lumbar, thoracic, **cervical**, core. Counting `body_part_keys` across `packages/engine/src/data/rehabExercises.js`:

```
8 'knee'  7 'lumbar'  6 'shoulder'  6 'hamstring'  5 'ankle'
3 'core'  2 'hip'     2 'calf'      1 'thoracic'
```

Coverage = 9 of 14 regions. The uncovered five are exactly the report's five: **elbow, wrist, cervical, quad, shin** — zero rehab entries each.

**Verdict: STILL OPEN** (unchanged; still a content-authoring task).

### H6 — "AiService.js appears to be real, tested, but completely unreferenced code" — STILL OPEN

Repo-wide grep (apps + packages, all js/jsx/ts/tsx, node_modules excluded) for `AiService`: the **only** reference outside the file itself is `apps/mobile/tests/ai-seam.js:82` (the dedicated test). No screen, component, store, or web file imports it. Partial mitigation of the report's "could be mistaken for dead code" concern: the file's header (WP-60) now documents its staged status explicitly — "OFF BY DEFAULT: every capability is gated on the profile flag `ai_features === true` — Simon decides go-live (AIGAS ratification pending)" — i.e. it is deliberately staged, not orphaned. But the report's core fact (well-tested, safety-critical code with no real caller) is unchanged, and no intended UI call site is named.

**Verdict: STILL OPEN** (confirmed intentionally staged; still no caller).

### H7 — "strengthStandards.js has a self-flagged, still-open scientific inconsistency" — STILL OPEN

`packages/engine/src/data/strengthStandards.js` lines 19–24 still carry the self-flag: the estimation anchor "currently ALIGNS with the `advanced` band here for squat/bench/deadlift (both sexes), but DIVERGES for overhead press (anchored at `elite`) and for female deadlift/ohp (independently seeded: 1.9 / 0.7, matching no band here)… left to a reviewed change. tests/wp58-strength-standards.js pins the alignment". The pinning test passed in today's full run (`✓ wp58-strength-standards.js`). The reconciliation itself has not been done.

**Verdict: STILL OPEN** (pinned against drift; the science decision remains outstanding).

---

## Medium findings

### M1 — "Confirmed dead code" (five items) — PARTIALLY CLOSED (one sub-claim was wrong)

- **TrainingCalendar.jsx** — still 117 lines (`wc -l`); grep for `TrainingCalendar` across apps/mobile/src finds **zero** references outside the file itself. **Still dead.**
- **SessionProgress.js** — still 22 lines; still self-described vestigial ("nothing writes this key any more. We keep `clearChecked` as defensive cleanup"). It *is* imported (SessionDetail.jsx:7 uses `clearChecked`) — deliberate legacy-cleanup code, exactly as the report characterised it. **Still open (deliberate).**
- **`priorLevel()` "appears unused"** — **INVALID / CLOSED.** `packages/engine/src/lib/priors.js:23` imports it (`import { priorLevel } from '../data/capabilityPriors.js'`) and calls it at line 32; that file landed in commit `37c733f` (WP-37, **2026-07-05** — the day *before* the report). It also has a dedicated test (`apps/mobile/tests/athlete-priors.js`). The original claim was already wrong when written.
- **wearable_readings** — grep for `wearable_readings` under `supabase/functions/` finds **nothing**; only `apps/mobile/src/lib/{Database,Storage,SyncService}.js` reference it. No Edge Function writes it. **Still functionally superseded.**
- **ai_recommendations** — referenced only in `supabase/schema.sql` and the mobile Database/Storage mirrors; no Edge Function (including `ai-render`) writes it. **Still open.**

**Verdict: PARTIALLY CLOSED** — four of five sub-items still open; the priorLevel sub-item is invalid (in use since 2026-07-05).

### M2 — "Duplicated logic and hardcoded values that bypass an existing shared mechanism" — STILL OPEN

- `Trends.jsx:10` still defines its own `drawChart(canvas, data, color)` canvas function while `components/ui/Sparkline.jsx` exists and is used by RecoveryDetail/SleepDetail. **Confirmed.**
- Hex duplication confirmed: `#6FD3C4` at Trends.jsx:51,53 and RecoveryDetail.jsx:68; `#E8836F` at Trends.jsx:55 and RecoveryDetail.jsx:72.
- `Injuries.jsx` lines 25–28 still hardcode `#b04a2e / #c89a3a / #4a5d3a / #6a665d` (the raw values of --rust/--ochre/--moss/--txt-muted-ish); line 608 hardcodes `'#fff'` amid otherwise-correct `var(--moss)`/`var(--ochre)` usage. **Confirmed.**
- Week-completion duplication confirmed: `PhaseDetail.jsx:45` (`if (sessions[k] && sessions[k].completed) weekCompleted++`) vs `Plan.jsx:37` (`if (sessions[k] && sessions[k].completed) done++`).

**Verdict: STILL OPEN** (all four sub-items unchanged).

### M3 — "A small number of screens partially bypass the documented data-flow pattern" — STILL OPEN

- `Settings.jsx:5` — `import Database from '../lib/Database.js'`; used at line 76 (`Database.services.exportAll()`) and lines 111–114 (raw table counts). **Confirmed.**
- `Teams.jsx:4` — `import { joinTeamWithCode, listMyTeams, leaveTeam } from '../lib/SyncService.js'` (direct SyncService calls, not store actions). **Confirmed.**
- The report's recommendation (document these as known exceptions in CLAUDE.md) was **not** adopted in the 2026-07-09 rewrite — grep for Settings.jsx/Teams.jsx/"deliberate exception" in CLAUDE.md returns nothing.

**Verdict: STILL OPEN** (both bypasses present, still undocumented as exceptions).

### M4 — "Coach dashboard: two UI affordances that look persisted but aren't" — STILL OPEN

- `apps/web/components/dashboard/CoachActionsPanel.tsx:30` — `const [done, setDone] = useState<Set<string>>(new Set());`
- `apps/web/components/dashboard/PlayerDetailDrawer.tsx:62` — `const [note, setNote] = useState("");`

Neither file contains any supabase/localStorage/API write, and no "not saved" affordance was found. Refresh still loses both.

**Verdict: STILL OPEN** (unchanged).

### M5 — "Marketing 'live demo' link vs a dashboard that denies unauthenticated visitors" — STILL OPEN

- Marketing copy still links: `apps/web/content/marketing/site.ts:104` — `{ label: "Live dashboard demo", href: "/dashboard" }`; `landing.ts:234` — `cta: { label: "Open the live demo", href: "/dashboard" }`; TeamsHero.tsx:39 links /dashboard as `teams_hero_demo`.
- `apps/web/proxy.ts` (matcher covers `/dashboard`, `/dashboard/:path*`) still unconditionally denies: no session → `deny("signed_out")` → redirect to /login; even a signed-in non-coach is redirected to /get-started. Grep for "demo" in proxy.ts: **no matches** — there is no demo bypass. (`AccountMenu.tsx` contains a "Demo visitor" UI state, but nothing in the gate ever lets an unauthenticated visitor reach it.)

**Verdict: STILL OPEN** (contradiction intact; no seeded demo path exists).

### M6 — "Lead capture and analytics on the marketing site are not wired to anything persistent" — STILL OPEN

- `apps/web/app/api/leads/route.ts:55` — delivery is still `console.log("[lead]", {…})`.
- `LeadCaptureForm.tsx` still documents/implements the mailto fallback ("submitLead() (mailto today, real POST later)").
- `apps/web/lib/analytics.ts:5` — "nothing is sent anywhere. To go live, wire ONE provider here (Plausible, GA4, …)"; calls are "no-ops if not configured" (line 38).

**Verdict: STILL OPEN** (unchanged; still honest-but-unwired).

### M7 — "ATHLETE-MODEL.md internal contradiction (§5.7 vs §12)" — CLOSED (patch uncommitted)

`docs/architecture/ATHLETE-MODEL.md` §12 ("Known limitations", line 516) now reads at the relevant bullet (line 527): "…yet steer plan generation.** *(resolved — see HANDOFF.md; updated 2026-07-09: all cohorts — run, cycle, swim, team sports, and build goals — are diagnosis-steered; the build flip deployed…)*". §11 (line 310) states: "**This diagnosis now steers the live plan (updated 2026-07-09).**" The contradiction is reconciled. Caveat: `git status` shows `M docs/architecture/ATHLETE-MODEL.md` — the patch is a **working-tree change on this branch, not yet committed** (last commit touching the file is `499d7e1`, 2026-07-03).

**Verdict: CLOSED** by the 2026-07-09 patch — pending commit.

### M8 — "Naming inconsistencies (fitbit≠Google Health; two 'coach'es; teamScheduleCache vs teamStatus)" — STILL OPEN

- "Fitbit" naming persists: `supabase/functions/fitbit-sync/`, `fitbit-auth-callback/`; `SyncService.js` lines 776–826 (`fitbit-auth-callback` URL, `oauthState('fitbit', …)`, `provider = 'fitbit'`, `fitbitReconnectState`).
- Both "coach"es persist: `apps/mobile/src/screens/Coach.jsx` (AI-coach mockup) and the live `apps/web` coach dashboard. No glossary note disambiguating "AI coach" vs "team coach" was added — the only greppable "AI coach/team coach" discussion in docs is the health report itself; CLAUDE.md's rewrite contains none.
- `apps/mobile/src/lib/teamScheduleCache.js` and `apps/mobile/src/lib/teamStatus.js` both still exist with those names.

**Verdict: STILL OPEN** (all three sub-items unchanged; glossary recommendation unadopted).

### M9 — "Database-level loose ends" — STILL OPEN (all four)

- **NOT VALID constraints**: `supabase/migrations/010_validation_constraints.sql:5` — "Constraints are NOT VALID so they apply to new/updated rows without failing" — no later migration validates them.
- **Wildcard CORS on JWT-gated functions**: `'Access-Control-Allow-Origin': '*'` confirmed in `fitbit-sync/index.ts:44`, `ai-render/index.ts:27`, `enrich-sessions/index.ts:18`, `strava-sync/index.ts:19`.
- **delete_user() manual-maintenance burden**: `create or replace function public.delete_user()` appears in `003_delete_user.sql:12` and again in `20260706_security_hardening.sql:86` — the redefinition-as-tables-change pattern is confirmed in the migration chain (exact "three times" not independently countable from migrations alone: NOT VERIFIABLE at that precision, pattern verified).
- **oauth_states cleanup**: `20260707_oauth_state.sql:44` still only does per-caller GC (`delete from public.oauth_states where user_id = uid and expires_at < now()`); grep for `pg_cron|cron.schedule` across supabase/ → **no matches** — no scheduled job.

**Verdict: STILL OPEN** (all four; unchanged low-urgency backlog).

---

## Low findings

### L1 — password min-length 8 vs 6 — STILL OPEN
`apps/mobile/src/screens/SetNewPassword.jsx:32` — `const valid = password.length >= 8;` (placeholder "min 8 characters"). `Settings.jsx:49` — `if (newPw.length < 6) { setPwMsg('Use at least 6 characters.'); …}` (placeholder line 252 "min 6 characters"). Same inconsistency, unchanged.

### L2 — App.jsx fallback tab id 'today' — STILL OPEN
`apps/mobile/src/App.jsx:71` — `return { title: 'Hybrid', topLevel: true, tab: 'today' };`. Real tab ids in `components/TabBar.jsx:4–10`: `home`, `plan`, `health`, `atlas`. 'today' still matches none; still unreachable in practice.

### L3 — bare "Phase not found" — STILL OPEN
`apps/mobile/src/screens/PhaseDetail.jsx:12` — `if (!phase) return <div>Phase not found</div>;` — still unstyled.

### L4 — preventionExercises entries missing evidenceId — STILL OPEN
Prevention entries live in `packages/engine/src/lib/injury/profiles.js` (not rehabExercises.js). Scripted count across all `preventionExercises` arrays: **23 entries, 5 missing `evidenceId`**. Gap unchanged.

### L5 — blockPriors.js stale "steers nothing yet" comment — STILL OPEN
`packages/engine/src/data/blockPriors.js:11` still reads "…which is why D7 v0 is ADVISORY and steers nothing yet". The report's own nuance stands: the literal claim is stale, but with no live learned prior the practical conclusion remains roughly true.

### L6 — `--accent-2` undocumented — STILL OPEN
Used at `SleepDetail.jsx:63` (`color="var(--accent-2)"`); legitimately defined at `main.css:592` (`--accent-2: #97A6FF; /* periwinkle — secondary data */`, also feeding `--c-info` at 609). The rewritten CLAUDE.md still does not list it (grep "accent-2" in CLAUDE.md: no match). Legit token, still undocumented.

### L7 — worktree engine-resolution gotcha — STILL OPEN (accepted dev-environment quirk)
No repo doc documents it (grep "worktree" across docs/ hits only the health report, the ADR register, and an archive file — none is a how-to note); it is captured in the maintainer's session memory. Not a product bug; unchanged.

---

## Testing gaps

### T1 — "`npm test` was once silently broken" — CLOSED / HEALTHY today
Wiring verified: root `package.json` → `npm run test -w hybrid-react` → `apps/mobile/package.json` → `node tests/run-all.mjs`; `packages/engine/package.json` points at the same runner. Full suite executed for this review: **"195/195 test files passed in 14.1s."** A CI test workflow exists (`.github/workflows/test.yml`, alongside deploy.yml and web-ci.yml). Test-file count has grown from the report's ~141 to **197 files** in `apps/mobile/tests/`. The report's residual advice (periodic manual sanity check) is exactly what this run constitutes.

### T2 — no mobile component/UI test suite — STILL OPEN
No vitest/jest/testing-library dependency in `apps/mobile/package.json`; the 197 tests are node-run engine/app-integration tests. Screen-level regressions remain uncovered.

### T3 — no web/marketing/dashboard tests — STILL OPEN
`find apps/web -name "*.test.*"` (node_modules excluded) → nothing. The M4 local-state issue remains exactly the class of thing this gap would catch.

---

## Architectural risks (forward-looking)

### R1 — Solo-founder concentration risk — STILL OPEN
Structural, not code-fixable; nothing observed this sprint changes it. The 2026-07-09 governance sprint (Documentation Index/Governance, HANDOFF split) marginally strengthens the stated mitigation (transferable reasoning), but the risk stands as written.

### R2 — Assessment data poverty — STILL OPEN
`packages/engine/src/lib/performance/estimation.js`: the only measured path is `measuredMaxStrength()` (line 42, consumed at lines 106–107 with `source: 'measured'`); all other qualities fall through to population/questionnaire-derived priors (`lib/priors.js` → `capabilityPriors.js`, `source: 'population', confidence 'low'`). Still 1 of 10 qualities genuinely measured.

### R3 — No outcome loop fully closed — STILL OPEN
`packages/engine/src/lib/learning/` contains only `blockOutcome.js`, whose header states the write path is gated: "…(twice-gated pattern as the AI seam) — Simon decides when the first writer goes live." No live writer exists; the platform still cannot demonstrate an end-to-end diagnose→prescribe→measured-improvement loop for a real user.

### R4 — Ambition vs team size — STILL OPEN
A structural standing tension recorded in the project's own planning docs; not verifiable as open/closed by code inspection (NOT VERIFIABLE in the code sense, STILL OPEN as a named risk). The evidence pattern the report cited in mitigation (small staged changes, e.g. this sprint's banner-first approach to SCHEMA.md rather than a rushed rewrite) continues.

---

## Findings still open, by severity

Feeds the Technical Debt Register. "Open" = actionable work remains; deliberate/accepted items are marked.

**Critical-derived (remnants of C1):**
- SCHEMA.md full reconcile (banner in place; body still documents 12 of 19 tables) — already queued (HANDOFF open queue #8).
- docs/architecture/README.md still indexes only 2 of the folder's 8 documents.

**High:**
- H2 — allocator.js decomposition: now 1,243 lines and growing (+~200 since 2026-07-06); the report's "sequence it sooner" advice is aging in the wrong direction.
- H3 — validator suite still at 5 of ~16 conceptual validators (standing backlog item).
- H4 — oversized files unchanged; Injuries.jsx (711) remains the top split candidate; OnboardingWizard grew to 624; SessionPhysiology and buildSteps extractions still pending.
- H5 — rehab content still missing for elbow, wrist, cervical, quad, shin (content task).
- H6 — AiService.js still has no caller (confirmed staged/gated; name its intended call site or wire it).
- H7 — strengthStandards anchor reconciliation still awaiting a reviewed science decision (drift-pinned by wp58 test).

**Medium:**
- M1 — dead code: TrainingCalendar.jsx (fully dead), wearable_readings + ai_recommendations tables (need deliberate migrations). SessionProgress.js is deliberate cleanup code. (priorLevel item: drop — in use.)
- M2 — chart/colour/week-completion duplication (mechanical consolidation when files are next touched).
- M3 — Settings/Teams data-flow exceptions still undocumented in CLAUDE.md.
- M4 — coach notes + to-do checkmarks still lose data on refresh (wire persistence or mark unsaved).
- M5 — "live demo" marketing links still dead-end at the login gate (build a seeded demo or drop the copy).
- M6 — leads still land in console.log; analytics unwired (must precede real marketing traffic).
- M8 — fitbit/Google-Health naming, AI-coach vs team-coach ambiguity, teamScheduleCache/teamStatus naming (glossary note still the cheap fix).
- M9 — NOT VALID constraint validation pass, CORS posture, delete_user maintenance pattern, oauth_states scheduled cleanup (low-urgency batch).

**Low:** L1 (password 8 vs 6), L2 ('today' tab fallback), L3 (bare empty state), L4 (5/23 prevention entries missing evidenceId), L5 (stale blockPriors comment), L6 (--accent-2 undocumented), L7 (worktree quirk — accepted).

**Testing:** T2 (no mobile UI-level tests), T3 (no web tests). T1 is healthy (195/195 passing today).

**Forward risks:** R1–R4 all stand as written; R2 (measured assessment data) and R3 (closing the first outcome loop) remain the two with a buildable path.

**Closed since 2026-07-06:** H1 (build flip + PR #160), C2 (CLAUDE.md rewrite `e946e3e`), M7 (ATHLETE-MODEL §12 patch — uncommitted), C3 (confirmed fixed + regression-tested), M1's priorLevel sub-claim (invalid — in use since 2026-07-05), T1 (suite green, 195/195).
