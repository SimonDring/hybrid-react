# Security & Data-Integrity Audit — Hybrid React PWA

**Audit date:** 2026-06-21
**Baseline commit:** `df3f50f` (sport-companion home + Atlas + avatar upload), on `main`
**Scope:** Whole app "to date" — authentication, authorisation, secrets, input
validation/data integrity, client-side security, third-party integrations,
network/transport, dependencies, privacy/governance, logging, build/deploy.
**Method:** Read-only review of the actual source — `supabaseClient.js`,
`authStore.js`, `SyncService.js`, `Database.js`, `Storage.js`,
`onboardingModel.js`, every screen with inputs, `supabase/schema.sql` +
`supabase/migrations/*` + `supabase/config.toml`, the Edge Functions,
`vite.config.js`, `.github/workflows/deploy.yml`, `index.html`, `package.json` —
plus `git log`/`git diff` and `npm audit`.

> **What this is.** A point-in-time, SOC-2/OWASP-flavoured self-assessment of a
> solo-built React 18 + Vite PWA on GitHub Pages, backed by Supabase
> (Postgres + Auth, online-first sync) with a localStorage offline cache. The app
> collects **special-category health data** (HRV, resting HR, sleep, SpO2,
> injuries, bodyweight) via manual entry and Fitbit/Strava OAuth — that data
> class is what raises the stakes on validation and privacy.
>
> **Status:** report only. Nothing in the codebase was changed to produce this
> document. The fix list is a roadmap, not a record of work done.

---

## Overall score: 71 / 100

> *"Strong security foundations; the gaps are input validation, auth-abuse
> hardening, and pre-publication governance."*

The identity / secrets / RLS core is genuinely well built — above what most
solo-built PWAs achieve. Points come off where it matters for a *health* app:
**almost all validation is client-side only**, so the backend trusts whatever
reaches it; auth-abuse defences lean entirely on Supabase's server-side limits;
and the privacy/audit layer needed before publication isn't in place yet.

| # | Category (SOC / OWASP mapping) | Score | Verdict |
|---|---|:---:|---|
| 1 | Authentication, Sessions & Auth-Abuse | **72** | Supabase-native + good reset/sign-out; no app-level throttle, no CAPTCHA config, email-confirm unverified. |
| 2 | Authorisation & Access Control (RLS) | **88** | RLS on all data tables w/ tight `auth.uid()` checks. Gap: `allowed_emails` has no RLS. |
| 3 | **Input Validation & Processing Integrity** | **42** | Client-only, partial; no DB CHECK constraints, no length limits, no server-side enum enforcement. Weakest area. |
| 4 | Secrets Management | **95** | Anon key only in browser; service-role + OAuth secrets server-side; clean git history. |
| 5 | Client-Side Security (XSS / CSP) | **78** | No dangerous HTML sinks (React escapes). No CSP / anti-clickjacking header. |
| 6 | Third-Party Integration & OAuth | **68** | Tokens server-side (good); but OAuth `state` = user_id (no CSRF nonce), no PKCE. |
| 7 | Network & Transport | **80** | All HTTPS, no mixed content, no Claude key in browser. No response headers (Pages limit). |
| 8 | Dependency & Supply Chain | **80** | Pinned lockfile, official pinned CI actions, current prod deps. Dev-only esbuild/vite vuln. |
| 9 | Privacy & Data Governance | **60** | Account deletion + data export both present; gaps are privacy policy, consent capture, and retention policy. |
| 10 | Logging, Monitoring & Auditability | **38** | Errors only `console.error`'d; no audit trail / alerting / error reporting. |
| 11 | Build & Deployment | **88** | Sourcemaps off, minimal CI permissions, secrets via GH Secrets, pinned actions. |

**Severity legend:** 🔴 High · 🟠 Medium · 🟡 Low · 🟢 Done well.

---

## Corrections to common mis-reads (so this report is accurate)

A few things that *look* alarming but are not, once the surrounding code is read:

- **`.env.local` is not a critical leak.** It holds the Supabase **anon key**
  (public by design, protected by RLS) and **public OAuth client IDs**. It is
  gitignored (`.gitignore:5-6`) and was **never committed** (`git log --all --
  '*.env*'` is empty). 🟢
- **"Stored XSS via injury/session notes" is overstated.** React auto-escapes all
  rendered text and there is **zero** `dangerouslySetInnerHTML` / `innerHTML` /
  `eval` in `src/`. Malicious text in a note **cannot execute today** — this is a
  *defence-in-depth* concern, not an active Critical. It would become real only
  if future code renders user text as raw HTML, or the planned native app renders
  it unescaped.
- **Writing `role` / `is_pro` into your own `profile` jsonb is not privilege
  escalation.** Nothing server-side reads those fields for authorisation, and RLS
  scopes every row to its owner. It is data **pollution**, not privesc.
- **Password reset links already expire and can't be reused.** Supabase enforces
  expiry server-side (~1h default) and the app strips the recovery token from the
  URL after use (`authStore.js:202-204`). The remaining work is to *verify/tighten*
  the dashboard setting, not to build expiry. 🟢
- **The dependency auto-fix is a breaking major.** `npm audit fix --force` wants
  `vite@8` (we're on `^5.4.10`). The realistic action is a patched 5.x/6.x bump;
  the vuln is dev-server-only regardless (see §8).

---

## Category detail

### 1 · Authentication, Sessions & Auth-Abuse — 72

🟢 **Done well**
- Supabase-native `signUp` / `signInWithPassword` / `signInWithOAuth` /
  `resetPasswordForEmail` (`authStore.js:100-176`) — no password is ever handled
  in app code.
- `persistSession` + `autoRefreshToken` + `detectSessionInUrl`
  (`supabaseClient.js:32-36`).
- Recovery token stripped from URL after use (`authStore.js:202-204`) → reset
  links expire (Supabase ~1h) and cannot be reused.
- Complete sign-out: Supabase revoke + per-user namespace wipe
  (`authStore.js:208-218`).
- Reset UI is enumeration-safe — *"If an account exists for … a reset link is on
  its way."* (`SignIn.jsx:57`).

**Findings**
- 🔴 **No app-level brute-force defence** — no attempt counter, lockout, backoff,
  or CAPTCHA anywhere (grep clean). Relies solely on Supabase's server-side
  ~15 req/min/IP auth limit.
- 🔴 **OTP auto-submits at 6 digits** with no client throttle
  (`SignIn.jsx:39-43`) → frictionless guessing UX; the server rate-limit is the
  only brake.
- 🟠 **Email-confirmation enforcement unverified** — it's a Supabase dashboard
  setting, not in the repo. If OFF (the default), the "check your email" screen
  is misleading and unconfirmed emails can sign in immediately.
- 🟠 **No inactivity timeout / no multi-tab sign-out sync** — a session persists
  indefinitely; signing out in one tab doesn't propagate to others. Matters on
  shared devices.
- 🟠 Sign-in errors surface `error.message` raw (`authStore.js:138`). Supabase
  keeps these vague, so enumeration risk is low, but a generic wrapper is safer.
- 🟡 **Password minimum is 6 chars** (`CreateAccount.jsx:24`, `SignIn.jsx:36`) —
  below the NIST-recommended 8.

### 2 · Authorisation & Access Control (RLS) — 88

🟢 RLS enabled on all 12 core tables (`schema.sql:311-322`), plus `workouts`
(migration 006) and `wearable_connections` (migration 001, **SELECT-only** so
clients can't forge OAuth tokens). Every policy is `auth.uid() = user_id` (or
`= id` for `users`); no `USING (true)`, no anon grants. Account-deletion is a
`security definer` RPC with an auth guard (migration 003). Storage RLS for the
new avatars bucket is correctly path-scoped (see Delta review).

**Finding**
- 🟠 **`allowed_emails` has no RLS.** It is absent from the enable-RLS list
  (`schema.sql:311-322`) and has no policy (`schema.sql:352-356`), so it's
  reachable per default role grants — an email list that could be enumerated.
  Drop it (signup is now open) or enable RLS. See also the schema/migration drift
  note in §11/Appendix.

### 3 · Input Validation & Processing Integrity — 42  *(weakest area)*

**The "never trust user input" principle is largely unmet server-side.** Every
input is validated (if at all) only in the UI. The data layer (`SyncService.js`,
`Database.js`) writes through with minimal cleaning, and `supabase/schema.sql`
has **no CHECK constraints, no length limits, and no enum enforcement** — only
column types + RLS. A crafted request (browser DevTools, or `curl` with the
user's own valid token) bypasses every UI guard and writes straight to the row.

**Representative gaps (with evidence)**

| Input(s) | Coerced? | Range? | Length? | Enum? | DB constraint? | Sev |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `age`, `bodyweight_kg`, `lifts.*` (onboarding) | ✅ `numOrNull()` `onboardingModel.js:16-20` | ❌ | n/a | n/a | ❌ | 🔴 |
| `daysPerWeek`, `sessionMinutes` | ❌ | UI only | n/a | UI only | ❌ | 🟠 |
| `quality`/`energy`/`recovery` (session logs) | ✅ | ❌ (1–5 unenforced) | n/a | n/a | ❌ | 🔴 |
| `energy`/`soreness`/`mood` (daily metrics) | ✅ `numeric()` `Database.js:565-601` | ❌ | n/a | n/a | ❌ | 🔴 |
| `resting_hr`/`hrv_ms`/`sleep_*`/`spo2_pct` | ✅ | ❌ (negatives/absurd OK) | n/a | n/a | ❌ | 🔴 |
| `injury.severity` | ✅ | ❌ (1–5 unenforced) | n/a | n/a | ❌ | 🟠 |
| `injury.status`, `body_part`, `goalType`, `sport`, `equipment[]`, `experience` | n/a | n/a | n/a | **UI only** | ❌ | 🟠 |
| `name`, `title`, `description`, `notes`, `rehab_plan`, `recovery_log[].*` | trim only | n/a | **unbounded** | n/a | ❌ | 🟠 |
| `users.profile` (whole jsonb) | ❌ | ❌ | ❌ | ❌ | ❌ | 🟠 |

- **Unbounded numerics feed the *pure* plan engine** (`PlanGenerator.js`):
  garbage-in → garbage plan, with no guard rail and no circuit-breaker.
- **Free-text is length-unbounded** → storage-abuse / payload-bloat. (Stored-XSS
  only if such text is later rendered as raw HTML — not the case today; see
  Corrections.)
- **`users.profile` is open jsonb** — `updateProfile` shallow-merges arbitrary
  keys (`SyncService.js:255-268`). This is data pollution, not privesc.
- **No validation library** in `package.json` (no zod / yup / joi).

🟢 **Done well:** `user_id` is always derived from the signed Supabase token,
never client-set (`SyncService.js uid()` + `clean()`), and RLS enforces it; OTP
is sliced to 6 digits; email passes a regex; date fields use `type="date"`; soft
deletes (`deleted_at`) protect against accidental loss.

### 4 · Secrets Management — 95

🟢 Only the anon key reaches the browser (`supabaseClient.js:25-31`). No
`service_role`, no `sk-ant`, no hardcoded JWT anywhere in `src/`. OAuth client
**secrets** live only in Edge Functions via `Deno.env.get(...)`
(`fitbit-auth-callback`, `strava-auth-callback`). CI injects values from GitHub
Secrets (`deploy.yml:27-32`), never in the workflow file. Git history is clean.

### 5 · Client-Side Security (XSS / CSP) — 78

🟢 Zero `dangerouslySetInnerHTML` / `innerHTML` / `eval` / `new Function` /
`document.write` in `src/`. The one dynamic navigation
(`Integrations.jsx:31`, `window.location.href = authUrlFor(id)`) builds a
server-controlled OAuth URL with `encodeURIComponent` — safe.

**Finding**
- 🟠 **No Content-Security-Policy and no anti-clickjacking** — `index.html` has
  no security meta tags. GitHub Pages can't set response headers, so a meta-tag
  CSP (including `frame-ancestors 'none'`) is the available lever.

### 6 · Third-Party Integration & OAuth (Fitbit / Strava) — 68

🟢 Tokens are exchanged and stored **server-side only** (Edge Functions + service
role); the client reads connection *status* only; scopes are read-only; redirect
URIs are hardcoded (no open redirect).

**Findings**
- 🟠🔴 **OAuth `state` is just the user_id** (`SyncService.js:529,621`), not a
  random nonce, and the callbacks only check it is present (not that it matches a
  server-stored value). An attacker who knows a victim's user_id could complete a
  flow that binds the *attacker's* Fitbit/Strava to the victim's account
  (CSRF / account-integrity). Use a random per-request nonce, stored and verified
  on callback.
- 🟠 **No PKCE** — the authorization `code` rides in the URL. Codes are
  short-lived, but PKCE is the SPA best practice.

### 7 · Network & Transport — 80

🟢 All endpoints are HTTPS (Supabase SDK, Google/Strava OAuth, Edge Functions);
no `http://`, no mixed content. **No Anthropic/Claude key or `api.anthropic.com`
call exists in the browser** — AI is correctly a placeholder (verified by grep).

**Finding**
- 🟡 No transport security headers — a GitHub Pages limitation; meta-CSP is the
  only available mechanism (see §5).

### 8 · Dependency & Supply Chain — 80

🟢 `package-lock.json` is committed (pinned). Production deps are current
(`@supabase/supabase-js ^2.45`, `react 18.3`, `react-router-dom ^6.28`,
`zustand 5`). CI uses official `actions/*` pinned to major tags.

**Finding**
- 🟠 `npm audit` reports **2 vulnerabilities (1 moderate, 1 high)**, both from
  **esbuild ← vite `^5.4.10`** (GHSA-67mh-4wv8-2f99 — dev server can be probed by
  any website). **Dev-server only; not present in the shipped `dist/`.** The
  auto-fix (`npm audit fix --force`) installs `vite@8` (breaking); a patched
  5.x/6.x bump is the pragmatic path.

### 9 · Privacy & Data Governance — 55

🟢 Real server-side **account deletion** — an auth-guarded `security definer` RPC
that cascades all user rows and clears the local cache (migration 003 +
`authStore.js:222-232`). This also satisfies Apple's account-deletion
requirement.

**Findings (these matter because the app holds health data)**
- 🟠 **No privacy policy / data-processing notice.**
- 🟠 **No explicit consent** for special-category health data (GDPR Art. 9).
- 🟢 **Data export is present** — Settings → "Export data" downloads all 12 tables
  as JSON via `Database.services.exportAll()` (`Settings.jsx:75`), the GDPR Art. 20
  portability complement to deletion. *(Corrected: an earlier draft wrongly listed
  this as missing.)*
- 🟡 **No documented retention policy.**

### 10 · Logging, Monitoring & Auditability — 38

Failures are only `console.error` / `logError`'d — there is no persisted audit
trail (auth events, data changes, sync failures), no error reporting
(e.g. Sentry), and no alerting. Acceptable for a solo, pre-launch PWA; it is an
explicit SOC criterion and becomes important before onboarding users at volume.

### 11 · Build & Deployment — 88

🟢 `sourcemap: false` (`vite.config.js:67`) — no code leak in `dist/`. CI
permissions are minimal (`contents: read, pages: write, id-token: write`).
Secrets come from GitHub Secrets; actions are pinned. The service worker caches
only static assets + fonts — no authenticated responses.

---

## Delta review — new since baseline (`df3f50f`: avatar upload + Atlas)

The sport-companion home + Atlas feature (and avatar upload) was re-checked
against the same criteria. **It is built to the app's existing high standard — no
change to the overall score.** One new Medium, two minor notes.

🟢 **Done well**
- The avatar flow **re-encodes every picked image through a canvas to a 256px
  JPEG** (`avatarUpload.js:21-44`) — the original file's bytes, EXIF, and any
  polyglot/embedded payload are discarded before upload. `contentType` is forced
  to `image/jpeg` (`:63`).
- Storage **write/update/delete RLS is correctly path-scoped** to
  `(storage.foldername(name))[1] = auth.uid()::text`
  (`migration 009:28-44`) — same quality as the table RLS.
- Graceful offline fallback to a data URL.
- `Atlas.jsx`, the radar SVG (`RadarChart.jsx`), and `coachNote.js` are pure
  compute/derivation with **no HTML sinks**.

**Findings**
- 🟠 **The `avatars` bucket has no server-side MIME/size limit.**
  `migration 009:18-20` creates a **public-read** bucket but sets no
  `allowed_mime_types` and no `file_size_limit`. The client re-encode is good,
  but a crafted direct Storage API call (with the user's own token, into their
  own `uid/` folder) could upload **any file type / any size**, and — because the
  bucket is public-read — host arbitrary user-controlled content on the Supabase
  storage domain. This is "enforce server-side, not just client-side" applied to
  uploads.
- 🟡 **Avatars are world-readable** (deliberate — public profile photos — and
  paths are UUID-prefixed, so not enumerable without the uid), but record that
  avatar images are not private and persist indefinitely.
- 🟡 **Old avatars accumulate** — the path is timestamped
  (`avatar_${Date.now()}.jpg`, `:60`), so each change writes a new object and the
  old one is never deleted → unbounded per-user storage growth. Use a fixed key
  (`<uid>/avatar.jpg`, overwrite) or delete the previous object.
- ℹ️ `profile.avatar.url` feeds `<img src>` (`Avatar.jsx:32`) and rides in the
  open `profile` jsonb — a concrete instance of the unvalidated-`profile` item
  (P0.1). Validate it to a `data:` or own-bucket `https:` URL.

---

## App-Store / publication readiness checklist

For the planned native iOS app and general publication.

🟢 **Already met:** in-app account deletion (Apple requires it), HTTPS-only /
ATS-compatible, no client secrets beyond public keys, read-only health scopes.

**To address before submission**
- [ ] **Privacy policy URL** + Apple **privacy "nutrition labels"** declaring all
      collected data (health, identifiers, usage). Health data may not be used for
      advertising/tracking.
- [ ] **Explicit consent** screen for health-data collection (GDPR Art. 9 / Apple).
- [ ] **Secure on-device storage in the native app** — tokens in **Keychain**,
      not `localStorage` / `UserDefaults`.
- [ ] **HealthKit** (future): entitlement + usage-description strings + privacy
      policy; no HealthKit data for advertising.
- [ ] **Universal/deep-link validation** in the native wrapper.
- [x] **Data export** ("download my data") — already implemented (Settings → Export data).
- [ ] **Scrub PII** from logs / crash reports before shipping any logging.
- [ ] Optional native hardening: certificate pinning, jailbreak detection.

---

## Prioritised fix list

> Ordered by real risk to the app and its users — not by ease. P0 protects data
> correctness (Simon's core ask); P1 hardens auth/abuse; P2 is web hardening &
> resilience; P3 is the governance needed before a real multi-user launch.

### P0 — Never-trust-input validation *(Processing Integrity)*
1. **One shared validation layer** every write passes through (in
   `SyncService.js` / `Database.js`) before persistence — adopt `zod` or a small
   hand-rolled validator: numeric **bounds** (age, bodyweight, lifts, HR, HRV,
   sleep, SpO2; ratings 1–5; RPE 1–10; severity 1–5; daysPerWeek 1–7;
   sessionMinutes whitelist); **enum whitelists** (goal, sport, status,
   body_part, equipment, experience); **trim + max-length** on all free text;
   and a **`profile` key-whitelist** (incl. validating `avatar.url`). Reject or
   clamp invalid input.
2. **Mirror it as a Supabase migration** — `CHECK` constraints + length limits
   (and jsonb shape checks where feasible) so a crafted API call can't bypass the
   client. Defence in depth at the DB.

### P1 — Auth-abuse & upload hardening
3. **Supabase dashboard:** require **email confirmation**; enable **CAPTCHA**
   (hCaptcha/Turnstile) on signup + signin; enable **leaked-password
   protection**; confirm/tighten **OTP + recovery-link expiry** and **auth rate
   limits**.
4. **Real CSRF nonce** for Fitbit/Strava OAuth — a random per-request value
   stored and **verified in the callbacks** instead of the raw user_id; add
   **PKCE**.
5. **Stop auto-submitting OTP** / add a client attempt-throttle + graceful 429
   handling.
6. **Raise password minimum to 8+** (`CreateAccount.jsx:24`, `SignIn.jsx:36`)
   and/or the Supabase password-strength setting.
7. **Lock down the `avatars` bucket** (migration): add `allowed_mime_types`
   (`image/jpeg`, `image/png`, `image/webp`) and a `file_size_limit` (~2 MB) so a
   direct API call can't bypass the client re-encode and host arbitrary content
   in a public bucket.

### P2 — Web hardening & resilience
8. **Meta-tag CSP** in `index.html` (incl. `frame-ancestors 'none'` for
   clickjacking) — defence-in-depth over React's escaping.
9. **`allowed_emails`:** enable RLS or drop it; **reconcile** schema vs migration
   drift (open vs invite-only signup).
10. **Offline write queue + retry**, and surface sync failures to the user
    (toast) instead of silent `console.error`.
11. **Bump Vite** to a patched release (dev-only esbuild SSRF).
12. **Avatar storage hygiene** — overwrite a fixed key (or delete the prior
    object) instead of accumulating timestamped avatars.
13. *Optional:* **inactivity timeout** + **multi-tab sign-out** sync.

### P3 — Publication / governance *(App Store + GDPR)*
14. **Privacy policy** + **health-data consent**; complete Apple privacy labels.
15. ~~Data export~~ — **already implemented** (Settings → Export data).
16. Documented **retention policy**.
17. **Audit logging / error reporting** (Sentry or a Supabase table) for auth +
    sync-failure + validation-rejection events; **scrub PII** from logs.
18. **Native-app prep:** tokens in **Keychain**, ATS, deep-link validation,
    HealthKit privacy requirements.

---

## Appendix — schema / migration drift

The base `supabase/schema.sql:358-380` still defines `handle_new_user()` to
enforce the invite **allowlist** (`allowed_emails`), but migration 004 removed
the allowlist check. Live behaviour therefore depends on which migrations were
applied to the project. Reconcile the base schema with the migrations so the
intended signup policy (open vs invite-only) is unambiguous — and so the
`allowed_emails` RLS gap in §2 is resolved one way or the other.

---

*Generated as a read-only audit. No application code was modified. Re-run the
review after the P0/P1 items land to re-score categories 1, 3, and 6.*

---
---

# ADDENDUM — Multi-User Readiness Review (2026-07-05)

> **STATUS (updated):** S1–S10 IMPLEMENTED + proven on staging (PRs #109–#113; harness 57/57). Production DB/function deploy is the batched step in `supabase/SECURITY-DEPLOY.md` (Simon). S11/S12/S13 tracked below; S14 is a dashboard setting.

**Trigger:** the Team package went live (teams / team_members / player_status +
the first cross-user RLS, PRs #106/#107) and the app is about to onboard MULTIPLE
ACTIVE USERS, including a coach who reads OTHER users' derived data. This addendum
re-audits from that angle. **Method:** four parallel domain reviews — (1) DB/RLS/auth,
(2) client XSS/secrets, (3) sync/isolation/edge-functions, (4) deps/CI/config/validation
— cross-checked against the actual source. The single-user isolation model held up
well; the new exposure is at the **trust boundaries** the multi-user pivot introduces:
the public OAuth callbacks, the public anon key vs client-only validation, and the
coach-shared surface.

## What was verified CLEAN (no action)
- **Per-user cache isolation** on a shared device: every localStorage key is
  `${base}_${namespace}` keyed on the Supabase uid; `signOut()` clears the auth token
  AND `clearNamespace()` wipes the previous user's cache. Raw vitals cached under
  `htp_daily_metrics_v4_<uid>` are namespaced + cleared. No leak across users.
- **No `service_role` key** in any client or committed file. Only the anon JWT ships
  (browser-safe, RLS-protected, and already in the bundle by design).
- **No raw-HTML XSS sink** — no `innerHTML`/`dangerouslySetInnerHTML` fed by user text
  in the mobile app; all user fields render through React's auto-escaping JSX. (The one
  `dangerouslySetInnerHTML` in apps/web is static JSON-LD.)
- **Deploy pipeline** ships only `VITE_` browser-safe vars, uses `npm ci`, gates on the
  test suite, least-privilege permissions, no `pull_request_target`. **PWA cache** does
  not cache authenticated Supabase responses. **Mobile CSP** exists (build-time meta:
  `default-src 'self'; object-src 'none'; script-src 'self'` — no `unsafe-eval`).
- RLS is enabled on **every** table with `auth.uid()` + matching `with check`; the two
  prod RPCs (`delete_user`, `set_device_primary`) pin `search_path` and derive identity
  from `auth.uid()`; the team spine's `is_coach_of` join cannot leak across teams and the
  founder bootstrap only seats the caller themselves.

## Prioritized findings + disposition

| # | Finding | Sev | Disposition |
|---|---------|-----|-------------|
| **S1** | **OAuth callbacks trust an unsigned `state` as `user_id`** and write provider tokens with service_role — token-planting / account-link hijack (fitbit + strava `-auth-callback`). | **CRITICAL** | **DONE** (PR #111, staging) — nonce table + issue/consume RPCs; client legacy-fallback; prod deploy pending (supabase/SECURITY-DEPLOY.md). |
| **S2** | **`wearable_connections` RLS `SELECT *` exposes raw `access_token`/`refresh_token`** to the owning browser — durable OAuth-credential leak under XSS. | **CRITICAL** | **DONE** (PR #110, staging) — column SELECT revoked; harness proves denial 42501. |
| **S3** | **DB has no bound on coach-visible free-text** — `injuries.body_part`, `users.profile` JSONB (display name / markers / athlete_model), and profile enums are validated in client JS only; the public anon key bypasses that. | **HIGH** | **DONE** (PR #110, staging) — body_part/team/status length checks + 256KB profile cap. |
| **S4** | **Edge functions log raw vitals / PII** — `fitbit-sync` logs raw Google-Health payloads (HRV/RHR/sleep); `strava-sync` stores full activity incl. GPS in `workouts.raw`. | **HIGH** | **DONE** (PR #112) — raw-vitals log removed. |
| **S5** | **`.env.local.prod-backup` is committed to git** (anon-only, so low-severity, but violates the repo's own rule and the `.prod-backup` suffix dodged `.gitignore`). | **MEDIUM** | **DONE** (PR #109) — removed + glob-ignored; rotate anon key at leisure. |
| **S6** | **`delete_user()` + `deleteTrainingData()` miss `set_logs` and `workouts`** — per-set history + imported activities survive account deletion (GDPR erasure gap; UUID-reissue bleed). | **MEDIUM** | **DONE** (PR #110) — delete_user() explicit; soft-delete +workouts. |
| **S7** | **Outbox drain can race the namespace switch** on a same-device user swap (two independent `onAuthStateChange` listeners, no ordering guarantee). | **MEDIUM** | **DONE** (PR #113) — raw-listener drains removed; syncFromCloud + 'online' only. |
| **S8** | **Sync functions are unbounded** — a caller can pass a multi-year `date_from…date_to` or hammer the endpoints to burn shared Google/Strava quota + function minutes for all users. | **MEDIUM** | **DONE** (PR #112) — 92-day clamp (cooldown deferred, LOW). |
| **S9** | **member can flip their own `status` back to `active`** after a coach set it `left` (re-join a team they were removed from). | **MEDIUM** | **DONE** (PR #110) — removed-member rejoin blocked. |
| **S10** | **`handle_new_user()` trigger does not pin `search_path`** (low exploitability — Supabase-internal, fixed target — but inconsistent with every other DEFINER fn). | **LOW** | **DONE** (PR #110). |
| **S11** | **`player_status` values are self-attested** by the player's client — a player can write dishonest coach-facing safety signals (RLS guarantees own-row, not honesty). | **HIGH (integrity)** | DESIGN — server-side derivation (Edge Function / trigger from owner-only tables). Deferred: no live player_status data yet; tracked as a follow-up. |
| **S12** | **Coach dashboard `/dashboard` has no auth gate** (self-admitted stub). | **HIGH (blocker)** | **DONE (gate)** — Next `middleware.ts` gates `/dashboard/*` on a valid Supabase session + active-coach membership; real `signInCoach`; dashboard still on MOCK data (live reads stay behind this gate — S11/next step). S13 next-bump still pending before ship. |
| **S13** | **`next@14` carries HIGH XSS advisories** (apps/web, not yet shipped). | **HIGH (pre-ship)** | FIX-BEFORE-SHIP — bump `next` off the advisory line before the coach dashboard deploys. |
| **S14** | Open signup + no captcha/rate-limit; email-confirmation posture not captured in the repo. | **MEDIUM** | PARTLY SIMON — enable "Confirm email" + signup rate-limit in the prod Auth dashboard; document the intended posture in-repo. |
| **S15** | Misc hygiene: CORS `*` on JWT functions; `state` not `encodeURIComponent`'d; `setReassessAnswer` loose `|| quarter===1` fallback; `010` constraints `NOT VALID` never `VALIDATE`d; avatars world-readable (by design). | **LOW** | FIX the code nits; document the by-design ones. |

## Rollout discipline
Every DB change lands on **staging** first (CLI stays linked to staging), is proven by
`supabase/tests/rls-harness.mjs`, and the migration is committed to the repo — **production
application is a deliberate, batched step for Simon's review** (the same human-gated
boundary as the team spine). Edge-function code fixes are committed; deploying them
(`supabase functions deploy`) is likewise a reviewed step. Nothing in this addendum runs
DDL or deploys against production autonomously.
