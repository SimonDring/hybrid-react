# Midnight Home (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the Home (`Today`) screen in the Midnight language — a readiness *verdict* hero, today's session + week strip, a training-load band, catch-up, and the on-demand Train-now entry — all driven by the `verdicts` translation helpers built in Phase 1.

**Architecture:** Introduce a small shared UI kit under `src/components/ui/` (`MetricRing`, `LoadBand`, `ReadinessHero`) — the first members of the component kit the spec calls for, built now because Home is their first real consumer. `Home.jsx` is recomposed to use them plus the existing `TrainingCalendar` (restyled to Midnight tokens). Readiness/load copy + color come from `src/lib/verdicts.js` (already shipped + tested in Phase 1). Presentational components have no unit-test surface in this codebase, so each task verifies with `npm run build` (compiles) and a final visual checkpoint; the only logic (verdicts) is already covered by `tests/verdicts.js`.

**Tech Stack:** React 18 + Vite, plain CSS (`src/styles/main.css`), existing helpers `computeReadiness`/`fmtSleep` (`src/lib/Readiness.js`), `readinessVerdict`/`loadVerdict` (`src/lib/verdicts.js`), `PlanService` calendar helpers.

## Global Constraints

- Dark-only Midnight. Use real semantic tokens only; NEVER `--card-bg`, `--border`, `--accent-bg`. No legacy warm hardcoded hex (`#b04a2e`, `rgba(176,74,46,…)`, ember/lime/ochre) — use `--accent`/`--accent-2`/`--accent-warm`, `--status-positive|caution|strain`, `--disc-*`, `--bg-*`, `--txt-*`, `--hairline`.
- Status colors vs discipline colors stay on separate ramps; a discipline tint always pairs with a label/icon.
- Sentence case; font weights 400/500/600 only.
- Verdict copy/color come from `verdicts.js` — do not hardcode readiness/load wording in the components.
- `npm run dev` is long-running: verify compilation with `npm run build`. Visual verification is the controller's/human's job.
- Branch `feat/midnight-redesign` (already checked out). Commit per task.

---

## File structure

- Create: `src/components/ui/MetricRing.jsx` — reusable circular progress ring (Home hero now; Progress goal rings later).
- Create: `src/components/ui/LoadBand.jsx` — training-load verdict band (consumes `loadVerdict`).
- Create: `src/components/ui/ReadinessHero.jsx` — readiness verdict hero (consumes `readinessVerdict` + `MetricRing` + `fmtSleep`).
- Modify: `src/components/TrainingCalendar.jsx` — discipline colors → `--disc-*` tokens.
- Modify: `src/screens/Home.jsx` — recompose using the new components.
- Modify: `src/styles/main.css` — CSS for the new components + retune the readiness-hero block to Midnight; add a `.disc-*` color helper set.

---

## Task 1: MetricRing component

**Files:**
- Create: `src/components/ui/MetricRing.jsx`
- Modify: `src/styles/main.css` (append `.ring*` rules)

**Interfaces:**
- Produces: `MetricRing({ value, max=100, size=132, stroke=7, color='var(--accent)', trackColor='rgba(255,255,255,0.08)', children })` — renders an SVG ring filled `value/max`, with `children` centered. Used by `ReadinessHero` (Task 3) and later by Progress.

- [ ] **Step 1: Create the component**

```jsx
// src/components/ui/MetricRing.jsx
// Reusable circular progress ring. value/max drives the arc; children render centered.
export default function MetricRing({
  value = 0, max = 100, size = 132, stroke = 7,
  color = 'var(--accent)', trackColor = 'rgba(255,255,255,0.08)', children
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, (Number(value) || 0) / max));
  const offset = circ * (1 - pct);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        {value != null && (
          <circle className="ring-arc" cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset} />
        )}
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Append CSS**

```css
/* ---------- MetricRing ---------- */
.ring { position: relative; flex-shrink: 0; }
.ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ring-arc { transition: stroke-dashoffset 0.6s ease; }
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: build succeeds (the component isn't imported yet; this just confirms valid syntax).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/MetricRing.jsx src/styles/main.css
git commit -m "feat(ui): MetricRing reusable circular progress component"
```

---

## Task 2: LoadBand component

**Files:**
- Create: `src/components/ui/LoadBand.jsx`
- Modify: `src/styles/main.css` (append `.loadband*` rules)

**Interfaces:**
- Consumes: `loadVerdict(load, adaptation)` from `src/lib/verdicts.js` → `{ tone, label, note, color }`; `load.band ∈ 'under'|'sweet'|'high'|'over'|null`.
- Produces: `LoadBand({ load, adaptation })` — a labeled 4-segment band with the active band lit in the verdict color, plus the plain-language note.

- [ ] **Step 1: Create the component**

```jsx
// src/components/ui/LoadBand.jsx
// Training-load verdict: a 4-segment band (easy→too-much) with the current band lit,
// plus the plain-language note. Copy/color come from loadVerdict.
import { loadVerdict } from '../../lib/verdicts.js';

const SEGMENTS = ['under', 'sweet', 'high', 'over'];

export default function LoadBand({ load, adaptation }) {
  const v = loadVerdict(load, adaptation);
  const band = load && load.band;
  return (
    <div className="loadband">
      <div className="lb-head">
        <span className="lb-label">Training load</span>
        <span className="lb-verdict" style={{ color: v.color }}>{v.label}</span>
      </div>
      <div className="lb-bar" role="img" aria-label={`Training load: ${v.label}`}>
        {SEGMENTS.map(seg => (
          <span key={seg} className={`lb-seg${seg === band ? ' on' : ''}`}
            style={seg === band ? { background: v.color } : undefined} />
        ))}
      </div>
      <div className="lb-note">{v.note}</div>
    </div>
  );
}
```

- [ ] **Step 2: Append CSS**

```css
/* ---------- LoadBand ---------- */
.loadband { background: var(--bg-surface); border: 1px solid var(--hairline); border-radius: var(--r-lg); padding: 14px 16px; margin-bottom: var(--s-5); }
.lb-head { display: flex; justify-content: space-between; align-items: baseline; }
.lb-label { font-size: 12px; letter-spacing: 0.08em; color: var(--txt-muted); }
.lb-verdict { font-size: 13px; font-weight: 500; }
.lb-bar { display: flex; gap: 3px; margin-top: 9px; }
.lb-seg { flex: 1; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.08); }
.lb-note { font-size: 12px; color: var(--txt-body); margin-top: 8px; line-height: 1.45; }
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/LoadBand.jsx src/styles/main.css
git commit -m "feat(ui): LoadBand training-load verdict band"
```

---

## Task 3: ReadinessHero component

**Files:**
- Create: `src/components/ui/ReadinessHero.jsx`
- Modify: `src/styles/main.css` (append `.rhero*` rules)

**Interfaces:**
- Consumes: `readinessVerdict(readiness)` → `{ tone, headline, note, color }`; the `readiness` object from `computeReadiness` (`{ score, status, estimated, vitals:{ sleepMin, hrv, rhr } }`); `fmtSleep(min)` from `src/lib/Readiness.js`; `MetricRing` (Task 1).
- Produces: `ReadinessHero({ readiness, onOpen })` — a tappable hero: ring + score, action-first verdict headline + note, a faint evidence line (sleep/hrv/rhr), tinted by the verdict tone. `onOpen` navigates to daily metrics.

- [ ] **Step 1: Create the component**

```jsx
// src/components/ui/ReadinessHero.jsx
// The Home hero: readiness as a verdict first, raw vitals demoted to faint evidence.
import { readinessVerdict, } from '../../lib/verdicts.js';
import { fmtSleep } from '../../lib/Readiness.js';
import MetricRing from './MetricRing.jsx';

export default function ReadinessHero({ readiness, onOpen }) {
  const v = readinessVerdict(readiness);
  const score = readiness ? readiness.score : null;
  const vitals = (readiness && readiness.vitals) || {};
  const evidence = [
    vitals.sleepMin != null ? `slept ${fmtSleep(vitals.sleepMin)}` : null,
    vitals.hrv != null ? `hrv ${vitals.hrv}` : null,
    vitals.rhr != null ? `rhr ${vitals.rhr}` : null
  ].filter(Boolean);

  return (
    <button className="rhero" data-tone={v.tone} style={{ '--tone': v.color }} onClick={onOpen}>
      <span className="rhero-glow" aria-hidden="true" />
      <span className="rhero-eyebrow">Readiness{readiness && readiness.estimated ? ' · estimate' : ''}</span>
      <span className="rhero-main">
        <MetricRing value={score ?? 0} size={104} stroke={6} color="var(--tone)">
          <span className="rhero-score">{score != null ? score : '—'}</span>
        </MetricRing>
        <span className="rhero-copy">
          <span className="rhero-headline">{v.headline}</span>
          <span className="rhero-note">{v.note}</span>
        </span>
      </span>
      {evidence.length > 0 && <span className="rhero-evidence">{evidence.join(' · ')}</span>}
    </button>
  );
}
```

- [ ] **Step 2: Append CSS**

```css
/* ---------- ReadinessHero ---------- */
.rhero { position: relative; overflow: hidden; display: block; width: 100%; text-align: left; cursor: pointer; font-family: inherit;
  background: var(--bg-surface); border: 1px solid var(--hairline); border-radius: var(--r-xl); padding: var(--s-5); margin-bottom: var(--s-5); }
.rhero:active { transform: scale(0.99); }
.rhero-glow { position: absolute; top: -70px; right: -50px; width: 210px; height: 210px; border-radius: 50%;
  background: radial-gradient(circle, var(--tone), transparent 70%); opacity: 0.16; pointer-events: none; }
.rhero-eyebrow { position: relative; display: block; font-size: 11px; letter-spacing: 0.14em; color: var(--txt-muted); margin-bottom: var(--s-4); }
.rhero-main { position: relative; display: flex; align-items: center; gap: var(--s-5); }
.rhero-score { font-size: 30px; font-weight: 600; color: var(--txt-strong); }
.rhero-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.rhero-headline { font-size: 19px; font-weight: 500; color: var(--txt-strong); line-height: 1.15; }
.rhero-note { font-size: 13px; color: var(--txt-body); line-height: 1.4; }
.rhero-evidence { position: relative; display: block; margin-top: var(--s-4); font-size: 12px; color: var(--txt-muted); }
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/ReadinessHero.jsx src/styles/main.css
git commit -m "feat(ui): ReadinessHero verdict hero (ring + verdict + evidence)"
```

---

## Task 4: TrainingCalendar → Midnight discipline tokens

**Files:**
- Modify: `src/components/TrainingCalendar.jsx`
- Modify: `src/styles/main.css` (`.cal-cell.sel`, `.cal-detail-head.done`, `.cal-session-check`)

**Interfaces:**
- Consumes: `--disc-*` tokens (from Phase 1).
- Produces: calendar dots/accents drawn from the discipline ramp; selection + done states use Midnight accent/status.

- [ ] **Step 1: Swap the hardcoded discipline palette for tokens**

In `src/components/TrainingCalendar.jsx`, replace the `DISC_COLOR` map:

```js
const DISC_COLOR = {
  gym: 'var(--disc-gym)', run: 'var(--disc-run)', swim: 'var(--disc-swim)',
  cycle: 'var(--disc-cycle)', brick: 'var(--disc-brick)', general: 'var(--disc-general)'
};
```

(The existing fallbacks `|| '#888'` stay; they're only hit for unknown disciplines.)

- [ ] **Step 2: Retune calendar accents in CSS**

In `src/styles/main.css`, change these three rules:

```css
.cal-cell.sel { border-color: var(--accent); background: rgba(111,211,196,0.10); }
.cal-detail-head.done { color: var(--status-positive); }
.cal-session-check { font-size: 18px; color: var(--status-positive); flex-shrink: 0; }
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/TrainingCalendar.jsx src/styles/main.css
git commit -m "feat(calendar): Midnight discipline tokens + accent selection"
```

---

## Task 5: Recompose Home.jsx

**Files:**
- Modify: `src/screens/Home.jsx`
- Modify: `src/styles/main.css` (retune `.trainnow-cta`, adaptation banner, `.catchup*` to Midnight if any warm hardcoded values remain; add `.home-adapt*` if used)

**Interfaces:**
- Consumes: `ReadinessHero`, `LoadBand` (this phase), `TrainingCalendar`, `computeReadiness`, `PlanService` helpers, store actions `completeSession`/`skipSession`/`revertWeekAdaptation`/`unrevertWeekAdaptation`, and `load`/`adaptation` from the store.
- Produces: the recomposed Today screen.

- [ ] **Step 1: Rewrite Home.jsx**

Replace the whole file with:

```jsx
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { computeReadiness } from '../lib/Readiness.js';
import TrainingCalendar from '../components/TrainingCalendar.jsx';
import ReadinessHero from '../components/ui/ReadinessHero.jsx';
import LoadBand from '../components/ui/LoadBand.jsx';

const DISC_LABEL = { gym: 'Gym', run: 'Run', swim: 'Swim', cycle: 'Ride', brick: 'Brick', general: 'Movement' };
const stripDay = (title) => (title || '').replace(/^[A-Za-z]+\s·\s/, '');

function greeting(d) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
function shortDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function Home() {
  const navigate = useNavigate();
  const sessions = useTrainingStore(s => s.sessions);
  const dailyMetrics = useTrainingStore(s => s.dailyMetrics);
  const logs = useTrainingStore(s => s.logs);
  const load = useTrainingStore(s => s.load);
  const adaptation = useTrainingStore(s => s.adaptation);
  const completeSession = useTrainingStore(s => s.completeSession);
  const skipSession = useTrainingStore(s => s.skipSession);
  const revertWeekAdaptation = useTrainingStore(s => s.revertWeekAdaptation);
  const unrevertWeekAdaptation = useTrainingStore(s => s.unrevertWeekAdaptation);

  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const readiness = computeReadiness(dailyMetrics, logs);

  const openSession = (s) => navigate(`/phases/${s.phaseId}/weeks/${s.weekNum}/sessions/${s.idx}`);

  const hasCalendar = !!Plan.getStartDate();
  const next = hasCalendar ? null : Plan.recommendedSession(sessions);

  const todayISO = Plan.localISO(now);
  const cal = hasCalendar ? Plan.buildCalendar(sessions) : null;
  let pastDue = [];
  if (cal) {
    Object.keys(cal.byDate).filter(iso => iso < todayISO).forEach(iso => {
      cal.byDate[iso].forEach(e => { if (!e.completed && !e.skipped) pastDue.push({ ...e, iso }); });
    });
    pastDue.sort((a, b) => b.iso.localeCompare(a.iso));
    pastDue = pastDue.slice(0, 6);
  }

  return (
    <>
      <div className="today-greeting">
        <div className="today-date">{greeting(now)} · {dateLabel}</div>
      </div>

      {/* READINESS — verdict-first hero */}
      <ReadinessHero readiness={readiness} onOpen={() => navigate('/tracking/wearables')} />

      {/* ADAPTATION — shown when the load engine adjusted this week */}
      {adaptation && (
        <div className={`home-adapt${adaptation.reverted ? ' reverted' : ''}`}>
          <div className="ha-title">{adaptation.reverted ? 'Following the plan' : 'Plan adjusted'}</div>
          <div className="ha-reason">{adaptation.reason}</div>
          <button className="ha-action"
            onClick={() => adaptation.reverted ? unrevertWeekAdaptation(adaptation.week) : revertWeekAdaptation(adaptation.week)}>
            {adaptation.reverted ? 'Let load adapt this week' : 'Revert to plan'}
          </button>
        </div>
      )}

      {/* TODAY + WEEK STRIP */}
      {hasCalendar ? (
        <TrainingCalendar sessions={sessions} onOpen={openSession} />
      ) : next ? (
        <button className="today-card" onClick={() => navigate(`/phases/${next.phase.id}/weeks/${next.week.num}/sessions/${next.sessionIdx}`)}
          style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', border: 'none', cursor: 'pointer' }}>
          <div className="today-eyebrow">Week {next.week.num} · {next.phase.title || `Phase ${next.phase.id}`}</div>
          <div className="today-title">{next.session.title}</div>
          <div className="today-meta">{next.session.duration}</div>
        </button>
      ) : null}

      {/* TRAINING LOAD — verdict band */}
      <LoadBand load={load} adaptation={adaptation} />

      {/* CATCH UP — one-tap Done/Missed for past-due sessions */}
      {pastDue.length > 0 && (
        <div className="catchup">
          <div className="catchup-head">Catch up — {pastDue.length} to settle</div>
          {pastDue.map(e => (
            <div className="catchup-row" key={e.key}>
              <button className="catchup-main" onClick={() => openSession(e)}>
                <span className="catchup-title">{stripDay(e.title)}</span>
                <span className="catchup-sub">{shortDate(e.iso)} · {DISC_LABEL[e.discipline] || 'Session'}</span>
              </button>
              <button className="catchup-btn done" onClick={() => completeSession(e.key, {})}>Done</button>
              <button className="catchup-btn miss" onClick={() => skipSession(e.key)}>Missed</button>
            </div>
          ))}
        </div>
      )}

      {/* TRAIN NOW — on-demand "got a gap" session (demoted to the bottom) */}
      <button onClick={() => navigate('/train-now')} className="trainnow-cta">
        <span className="tn-cta-text">
          <span className="tn-cta-title">Train now</span>
          <span className="tn-cta-sub">Got a gap? A session for your time &amp; kit</span>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
      </button>
    </>
  );
}
```

- [ ] **Step 2: Add the adaptation-banner CSS (Midnight)**

Append to `src/styles/main.css`:

```css
/* ---------- Home adaptation banner ---------- */
.home-adapt { background: rgba(242,193,78,0.10); border: 1px solid rgba(242,193,78,0.30); border-radius: var(--r-md); padding: 12px 14px; margin-bottom: var(--s-4); }
.home-adapt.reverted { background: var(--bg-surface-2); border-color: var(--hairline); }
.ha-title { font-size: 13px; font-weight: 500; color: var(--txt-strong); margin-bottom: 2px; }
.ha-reason { font-size: 12px; color: var(--txt-body); }
.ha-action { margin-top: 8px; background: none; border: none; color: var(--accent); font-size: 12px; font-weight: 500; cursor: pointer; padding: 0; font-family: inherit; }
```

- [ ] **Step 3: Retune any warm hardcoded values in the Home blocks**

Search `src/styles/main.css` for `.trainnow-cta`, `.catchup`, `.catchup-btn`, `.tn-cta*`. For each declaration using a legacy warm hardcoded hex (`#b04a2e`, `rgba(176,74,46,…)`, `#f4f1ea` as a background, etc.) or a banned token, repoint it at the Midnight equivalent (`var(--accent)`, `var(--bg-surface)`, `var(--bg-surface-2)`, `var(--txt-strong)`, `var(--hairline)`, `--status-*`). Leave token-based declarations alone. (The old `.today-hero`/`.th-*`/`.vital-*`/`.th-prompt` rules are now unused — leave them for the Phase 7 dead-CSS sweep; do not spend time deleting them here.)

- [ ] **Step 4: Verify it compiles**

Run: `npm run build`
Expected: build succeeds, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Home.jsx src/styles/main.css
git commit -m "feat(home): recompose Today on Midnight — verdict hero, week strip, load band"
```

- [ ] **Step 6: Visual checkpoint (controller/human)**

The controller renders the app (browser preview) or the human runs `npm run dev` and confirms on Home: the readiness hero shows a verdict headline + ring tinted by tone (teal/amber/coral) + the faint evidence line; the week strip uses discipline-colored dots; the load band reads a plain-language verdict; catch-up + Train-now read as Midnight. Note any light leak or warm remnant for a follow-up fix.

---

## Self-review

**Spec coverage (spec §6.1):** readiness VerdictBlock hero → Task 3 (+ Task 1 ring); adaptation banner restyled → Task 5; today's session + week strip → Task 4 + `TrainingCalendar` in Task 5; load band → Task 2 + Task 5; catch-up → Task 5; Train-now (demoted) → Task 5. Verdict copy/color sourced from `verdicts.js` (Phase 1) — no duplicated wording.

**Placeholder scan:** none — full component code and full `Home.jsx` provided; CSS rules given verbatim. Task 5 Step 3 is a scoped retune-if-present instruction with the exact tokens to use, not a vague "handle styling."

**Type consistency:** `MetricRing` prop names (`value`, `size`, `stroke`, `color`, `children`) match the calls in `ReadinessHero`. `readinessVerdict`/`loadVerdict` return `{ tone, headline|label, note, color }` exactly as consumed. `ReadinessHero`/`LoadBand` props (`readiness`, `onOpen`, `load`, `adaptation`) match the `Home.jsx` call sites. Store selectors (`load`, `adaptation`, `completeSession`, `skipSession`, `revertWeekAdaptation`, `unrevertWeekAdaptation`) match Phase-1/D names already in the store.
