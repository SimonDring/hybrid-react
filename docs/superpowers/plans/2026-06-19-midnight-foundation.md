# Midnight Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the whole app to the dark-only "Midnight" design language (tokens + typography + shell) and add the rule-based translation helpers that turn engine signals into plain-language verdicts.

**Architecture:** The app already ships a working dark theme as a `data-theme="dark"` override, proving every screen reads from the semantic tokens (`--bg-*`, `--txt-*`, `--hairline`, accent *roles*). We promote dark to the default, retune its values from warm (ember/lime) to Midnight (navy + teal/periwinkle/amber), delete the light/auto branches, and add new accent/status/discipline tokens — so the entire app reskins from one CSS file with minimal screen churn. We retire the serif by pointing `--serif` at the sans stack (no need to edit ~20 usages). Translation helpers are pure functions in `src/lib/verdicts.js`, tested with the project's existing plain-Node assertion pattern. Reusable UI components are intentionally **not** built speculatively here — they are extracted into a shared kit by the later screen plans as each component gains its first real consumer (YAGNI; component APIs are more reliable when shaped by actual use).

**Tech Stack:** React 18 + Vite, Zustand, plain CSS (`src/styles/main.css`), ESM Node test scripts (`node tests/<name>.js`).

## Global Constraints

- Dark-only. Delete the `html[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` branches; do not add a light theme.
- Use the real semantic token NAMES; never introduce `--card-bg`, `--border`, or `--accent-bg`.
- Status colors and discipline colors come from separate ramps; a discipline tint must always be paired with a label or icon, never color-alone.
- Sentence case everywhere in UI copy. No ALL CAPS headers (use letter-spacing on sentence case for the label tier).
- Two-to-three font weights only (400 / 500 / 600). No 700+.
- `npm run dev` must run cleanly after every task; walk all four tabs.
- Commit in small, described steps. We are on branch `feat/midnight-redesign` (already created).

---

## File structure

- Modify: `src/styles/main.css` — token blocks (`:root` x2), delete dark/auto overrides, retire serif, typography polish, shell tweaks.
- Create: `src/lib/verdicts.js` — `readinessVerdict()`, `loadVerdict()` pure helpers.
- Create: `tests/verdicts.js` — Node assertion test for the helpers.
- Modify (shell tweaks only): `src/styles/main.css` `.tab.active`, `.tab-train*` rules. The `TabBar.jsx`/`TopBar.jsx` markup is unchanged; only CSS is touched.

---

## Task 1: Midnight token retheme (dark-only)

**Files:**
- Modify: `src/styles/main.css` — the base `:root` (≈ lines 4–22), the `/* THEME TOKENS */ :root` block (≈ lines 861–897), the `html[data-theme="dark"]` block (≈ lines 899–921), the `@media (prefers-color-scheme: dark)` block (≈ lines 924–948).

**Interfaces:**
- Consumes: nothing.
- Produces: the Midnight token vocabulary every later task/screen reads — `--bg-app #0D1016`, `--bg-surface #161B24`, `--bg-surface-2 #1B2230`, `--bg-surface-elev #20283A`, `--txt-strong #F0F3F7`, `--txt-body #C2C9D6`, `--txt-muted #7F8A9C`, `--txt-faint #5D6675`, `--hairline rgba(255,255,255,0.07)`, `--accent #6FD3C4`, `--accent-2 #97A6FF`, `--accent-warm #F2C14E`, `--status-positive #6FD3C4`, `--status-caution #F2C14E`, `--status-strain #E8836F`, `--disc-gym #97A6FF`, `--disc-run #E0A1B0`, `--disc-swim #5FB6D4`, `--disc-cycle #C9B273`, `--disc-brick #B79BE0`, `--disc-general #8A93A3`. Radius `--r-sm 12 / --r-md 16 / --r-lg 20`.

- [ ] **Step 1: Retire serif + remap legacy accents in the base `:root`**

In the first `:root` (the one defining `--serif`, `--ink`, `--paper`, `--rust`…), change the serif var to fall back to sans, and remap the legacy accent palette to Midnight so existing `var(--rust)` / `var(--moss)` / `var(--ochre)` / `var(--slate)` usages stay coherent. Replace these specific lines:

```css
  --serif: var(--sans);
  --rust: #e8836f;
  --moss: #6fd3c4;
  --ochre: #f2c14e;
  --slate: #97a6ff;
```

(Keep `--sans`, `--mono`, `--ink`, `--paper*`, `--line`, `--muted`, safe-area and bar-height vars as they are — `--ink`/`--paper` already coexist with dark mode today.)

- [ ] **Step 2: Replace the THEME TOKENS `:root` block with the Midnight set**

Replace the entire block that begins `/* ---------- THEME TOKENS ---------- */` `:root { … }` with:

```css
/* ---------- THEME TOKENS (Midnight, dark-only) ---------- */
:root {
  /* Spacing scale (4-based) */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px;
  --s-5: 20px; --s-6: 24px; --s-7: 32px; --s-8: 40px; --s-9: 48px;
  /* Radius */
  --r-sm: 12px; --r-md: 16px; --r-lg: 20px; --r-xl: 24px; --r-full: 999px;
  /* Shadows — Midnight leans on hairlines + fills; shadows are subtle */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.4), 0 6px 20px rgba(0,0,0,0.3);
  --shadow-lg: 0 10px 36px rgba(0,0,0,0.55);
  --shadow-inset: inset 0 0 0 1px rgba(255,255,255,0.04);
  /* Surfaces */
  --bg-app: #0D1016;
  --bg-surface: #161B24;
  --bg-surface-2: #1B2230;
  --bg-surface-elev: #20283A;
  --bg-ink: #080B10;
  --bg-tab: rgba(13,16,22,0.92);
  /* Text */
  --txt-strong: #F0F3F7;
  --txt-body: #C2C9D6;
  --txt-muted: #7F8A9C;
  --txt-soft: #5D6675;
  --txt-faint: #5D6675;
  --hairline: rgba(255,255,255,0.07);
  --hairline-strong: rgba(255,255,255,0.12);
  --topbar-h: 56px;
  --tabbar-h: 68px;
  /* Midnight brand accents */
  --accent: #6FD3C4;       /* teal — primary interactive + positive */
  --accent-2: #97A6FF;     /* periwinkle — secondary data */
  --accent-warm: #F2C14E;  /* amber — tertiary / caution */
  /* Status / verdict ramp (meaning only) */
  --status-positive: #6FD3C4;
  --status-caution: #F2C14E;
  --status-strain: #E8836F;
  /* Discipline tints (categorical, separate ramp; always with a label/icon) */
  --disc-gym: #97A6FF;
  --disc-run: #E0A1B0;
  --disc-swim: #5FB6D4;
  --disc-cycle: #C9B273;
  --disc-brick: #B79BE0;
  --disc-general: #8A93A3;
  /* Semantic accent ROLES → Midnight */
  --c-action: var(--accent);
  --c-success: var(--status-positive);
  --c-warn: var(--status-caution);
  --c-info: var(--accent-2);
  /* Text that sits ON a filled accent */
  --on-action: #08130F;
  --on-success: #08130F;
  --on-warn: #241B0C;
}
```

- [ ] **Step 3: Delete the light/auto override blocks**

Delete the entire `html[data-theme="dark"], html[data-theme="dark"] body { … }` block AND the entire `@media (prefers-color-scheme: dark) { html:not([data-theme]) { … } }` block. (Base `:root` is now Midnight dark; these overrides are dead.)

- [ ] **Step 4: Run the app and walk every tab**

Run: `npm run dev`
Expected: app loads in Midnight dark (navy `#0D1016` page, `#161B24` cards). Walk Today / Plan / Progress / Profile and open one session. Confirm no light "paper" panels leak. If a panel renders light, it is using a legacy light token directly (e.g. `var(--paper)` as a surface) — repoint that one rule at `var(--bg-surface)` / `var(--txt-strong)` and note it; deeper per-screen color fixes land in each screen's own plan.

- [ ] **Step 5: Verify the light branches are gone**

Run: `grep -n "data-theme=\"dark\"\|prefers-color-scheme: dark" src/styles/main.css`
Expected: only the dead `.tab.active::before` data-theme rule may remain (removed in Task 5); no token override blocks. If token override blocks remain, delete them.

- [ ] **Step 6: Commit**

```bash
git add src/styles/main.css
git commit -m "feat(theme): Midnight dark-only token system; retire serif and light/auto branches"
```

---

## Task 2: Typography polish (tabular numerals, weight hygiene)

**Files:**
- Modify: `src/styles/main.css` — `html, body` rule (≈ line 25) and `.h1` (≈ line 1054).

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces: lining/tabular numerals app-wide so figures don't jitter as they animate/update.

- [ ] **Step 1: Add tabular numerals to the base body rule**

In the `html, body { … }` rule, add this declaration:

```css
  font-feature-settings: "tnum" 1, "lnum" 1;
```

- [ ] **Step 2: Confirm the big display heading reads in sans**

`.h1` uses `font-family: var(--serif)`, which now resolves to the sans stack (Task 1, Step 1) — no edit needed. Leave the `clamp()` size; Midnight keeps a large display heading. Confirm `.h1 em { color: var(--rust); }` now reads as coral (acceptable accent on a heading).

- [ ] **Step 3: Run and eyeball numbers**

Run: `npm run dev`
Expected: numbers (readiness score, stat-card values, week/phase numbers) render in a consistent tabular sans; headings are sans, not serif.

- [ ] **Step 4: Commit**

```bash
git add src/styles/main.css
git commit -m "feat(type): tabular/lining numerals app-wide; serif resolves to sans"
```

---

## Task 3: Readiness translation helper (TDD)

**Files:**
- Create: `src/lib/verdicts.js`
- Test: `tests/verdicts.js`

**Interfaces:**
- Consumes: the readiness object shape from `computeReadiness` (`{ status: 'strong'|'moderate'|'low'|'unknown', … }`).
- Produces: `readinessVerdict(readiness) → { tone, headline, note, color }` where `tone ∈ 'positive'|'caution'|'strain'|'neutral'` and `color` is a CSS var string. Also exports the internal `TONE` map for reuse by `loadVerdict` (Task 4).

- [ ] **Step 1: Write the failing test**

Create `tests/verdicts.js`:

```js
import { readinessVerdict } from '../src/lib/verdicts.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

assert(readinessVerdict({ status: 'strong' }).tone === 'positive', 'T1 strong → positive');
assert(readinessVerdict({ status: 'moderate' }).tone === 'caution', 'T2 moderate → caution');
assert(readinessVerdict({ status: 'low' }).tone === 'strain', 'T3 low → strain');
assert(readinessVerdict({ status: 'unknown' }).tone === 'neutral', 'T4 unknown → neutral');
assert(readinessVerdict(null).tone === 'neutral', 'T5 null → neutral');
assert(readinessVerdict({ status: 'strong' }).color === 'var(--status-positive)', 'T6 positive → status-positive token');
assert(typeof readinessVerdict({ status: 'low' }).headline === 'string' && readinessVerdict({ status: 'low' }).headline.length > 0, 'T7 headline present');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/verdicts.js`
Expected: FAIL — `Cannot find module '../src/lib/verdicts.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/verdicts.js`:

```js
/**
 * verdicts — turns engine signals (readiness, load) into a plain-language verdict
 * with a status tone + color token. Pure functions, no deps. Rule-based today;
 * the AI coach can replace the copy behind this same interface later.
 */

export const TONE = {
  positive: 'var(--status-positive)',
  caution: 'var(--status-caution)',
  strain: 'var(--status-strain)',
  neutral: 'var(--txt-muted)'
};

const READINESS = {
  strong:   { tone: 'positive', headline: 'Primed — push today', note: "You're recovered. Good day to go hard." },
  moderate: { tone: 'caution',  headline: 'Train as planned',    note: 'Solid enough — train as planned and listen to your body.' },
  low:      { tone: 'strain',   headline: 'Ease in today',       note: "Recovery's down. Keep it light or swap for easy work." },
  unknown:  { tone: 'neutral',  headline: 'How are you feeling?', note: 'Log a check-in or connect a wearable to see readiness.' }
};

export function readinessVerdict(readiness) {
  const status = (readiness && readiness.status) || 'unknown';
  const base = READINESS[status] || READINESS.unknown;
  return { ...base, color: TONE[base.tone] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/verdicts.js`
Expected: PASS T1–T7.

- [ ] **Step 5: Commit**

```bash
git add src/lib/verdicts.js tests/verdicts.js
git commit -m "feat(verdicts): readiness → plain-language verdict helper"
```

---

## Task 4: Load translation helper (TDD)

**Files:**
- Modify: `src/lib/verdicts.js`
- Modify: `tests/verdicts.js`

**Interfaces:**
- Consumes: `load` (`{ acwr, band: 'under'|'sweet'|'high'|'over' }`), optional `adaptation` (`{ reverted, reason }`), and `TONE` from Task 3.
- Produces: `loadVerdict(load, adaptation) → { tone, label, note, color }`.

- [ ] **Step 1: Add failing tests**

Append to `tests/verdicts.js`:

```js
import { loadVerdict } from '../src/lib/verdicts.js';

assert(loadVerdict({ acwr: 1.0, band: 'sweet' }).tone === 'positive', 'T8 sweet → positive');
assert(loadVerdict({ acwr: 1.6, band: 'over' }).tone === 'strain', 'T9 over → strain');
assert(loadVerdict({ acwr: 0.6, band: 'under' }).tone === 'caution', 'T10 under → caution');
assert(loadVerdict({ acwr: 1.45, band: 'high' }).tone === 'caution', 'T11 high → caution');
assert(loadVerdict({ acwr: null, band: null }).tone === 'neutral', 'T12 no data → neutral');
assert(loadVerdict(null).tone === 'neutral', 'T13 null → neutral');
assert(loadVerdict({ acwr: 1.6, band: 'over' }, { reverted: false, reason: 'Easing this week — you ramped fast.' }).note === 'Easing this week — you ramped fast.', 'T14 active adaptation reason wins');
assert(loadVerdict({ acwr: 1.6, band: 'over' }, { reverted: true, reason: 'x' }).note !== 'x', 'T15 reverted adaptation ignored');
```

> Note: `import` statements hoist, so adding this `import { loadVerdict }` line lower in the file is fine; keep it next to the Task 3 import if you prefer.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/verdicts.js`
Expected: T1–T7 PASS; T8+ FAIL — `loadVerdict is not a function`.

- [ ] **Step 3: Implement `loadVerdict`**

Append to `src/lib/verdicts.js`:

```js
const LOAD = {
  sweet: { tone: 'positive', label: 'Balanced',     note: 'Right where you want to be — the plan stays as written.' },
  under: { tone: 'caution',  label: 'Light',        note: "Below your usual — there's room to build back up." },
  high:  { tone: 'caution',  label: 'High',         note: "You've ramped quickly — easing slightly this week." },
  over:  { tone: 'strain',   label: 'Overreaching', note: 'Well above baseline — easing off so you can absorb it.' }
};

export function loadVerdict(load, adaptation) {
  if (!load || load.acwr == null || !load.band) {
    return { tone: 'neutral', label: 'Building baseline', note: 'A few more sessions and your load trend appears here.', color: TONE.neutral };
  }
  const base = LOAD[load.band] || LOAD.sweet;
  const note = (adaptation && !adaptation.reverted && adaptation.reason) ? adaptation.reason : base.note;
  return { tone: base.tone, label: base.label, note, color: TONE[base.tone] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/verdicts.js`
Expected: PASS T1–T15.

- [ ] **Step 5: Commit**

```bash
git add src/lib/verdicts.js tests/verdicts.js
git commit -m "feat(verdicts): training-load → plain-language verdict helper"
```

---

## Task 5: Shell restyle (TabBar + TopBar to Midnight)

**Files:**
- Modify: `src/styles/main.css` — `.tab.active` (≈ line 1039), the dead `html[data-theme="dark"] .tab.active::before` rule (≈ line 1052), and the `.tab-train*` rules (search `tab-train`).

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces: an active tab + center Train action in the teal accent; no behavioral change to `TabBar.jsx`/`TopBar.jsx`.

- [ ] **Step 1: Make the active tab teal and remove the dead data-theme rule**

Replace:

```css
.tab.active { color: var(--txt-strong); }
```

with:

```css
.tab.active { color: var(--accent); }
```

Then delete the line:

```css
html[data-theme="dark"] .tab.active::before { background: rgba(244,241,234,0.06); }
```

- [ ] **Step 2: Tint the center Train action teal**

Find the `.tab-train-icon` rule (search `tab-train-icon` in `main.css`). Set its fill/background and glyph color to the accent by replacing its `background`/`color` declarations with:

```css
  background: var(--accent);
  color: var(--on-action);
```

If a `.tab-train-label` color is set to a legacy accent, point it at `var(--accent)`. If `.tab-train-icon` has no explicit `background` today, add the two declarations above to that rule.

- [ ] **Step 3: Run and verify the shell**

Run: `npm run dev`
Expected: bottom tab bar is dark glass; the active tab label/icon is teal; the center Train button is a teal disc with dark glyph; the top bar is dark with the coral sync dot when syncing. Confirm on all four tabs.

- [ ] **Step 4: Commit**

```bash
git add src/styles/main.css
git commit -m "feat(shell): Midnight TabBar active + center Train accent"
```

---

## Notes / follow-ups (not tasks here)

- If `src/screens/Settings.jsx` exposes a light/dark/auto theme toggle, it is now inert (no light tokens exist). Remove or hide it in the Phase 7 cleanup plan (or here if it's a trivial, isolated control).
- Per-screen hardcoded light colors (e.g. inline `color: '#f4f1ea'` in `Home.jsx`, calendar discipline hexes in `TrainingCalendar.jsx`) are addressed in each screen's own plan, where those components are recomposed onto the token vocabulary and the shared component kit.

---

## Self-review

**Spec coverage (spec §4 Foundation + §4.5 translation layer):** §4.1 color tokens → Task 1. §4.2 typography (sans, tabular numerals) → Tasks 1–2. §4.3 radius → Task 1. §4.5 readiness + load verdicts → Tasks 3–4. Shell restyle (§4.4 TabBar/TopBar) → Task 5. The remaining §4.4 component kit (Card, MetricRing, GoalRing, etc.) is deliberately deferred to the screen plans (architecture note) — flagged, not dropped. §8 migration (delete light/auto branches, keep semantic names) → Task 1.

**Placeholder scan:** none — every code step contains complete code; every CSS step names the exact rule and the exact replacement.

**Type consistency:** `readinessVerdict`/`loadVerdict` return `{ tone, …, color }` with `tone ∈ positive|caution|strain|neutral`; `TONE` is the single source of color strings, shared across both. Tests reference the same names. Token names used in CSS (`--accent`, `--status-*`, `--bg-surface*`, `--txt-*`) match the values produced in Task 1.
