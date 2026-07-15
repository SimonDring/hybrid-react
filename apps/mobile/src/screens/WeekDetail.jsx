import { useNavigate, useParams } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { sessionKey, MUSCLE_LABELS, parseTeamSchedule } from '@performance-os/engine';
import { getTeamSchedule } from '../lib/teamScheduleCache.js';
import InfoTip from '../components/ui/InfoTip.jsx';
import { GLOSSARY } from '../data/metricGlossary.js';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_TITLES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PATTERN_DAY_IDX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

// WP-52: the coach's schedule reshapes the plan (match days lose gym slots, sport days
// are kept clear) — the athlete must SEE why (Art 14; the audit's top team improvement:
// "a player whose Wednesday gym day vanished has no idea why"). Pure mapping of the
// cached teams.schedule onto this week's seven days: per-day team-load type + any
// fixture dated inside the week. Render-only; the constraint itself is applied by
// the engine's applyTeamSchedule via PlanService.activeProfile.
function teamWeekInfo(weekNum) {
  const sched = parseTeamSchedule(getTeamSchedule());
  if (!sched) return null;
  const byIdx = {};
  for (const d of sched.weeklyPattern || []) {
    const i = PATTERN_DAY_IDX[d && d.day];
    if (i != null && d.type && d.type !== 'rest') byIdx[i] = d.type;
  }
  const fixtures = [];
  for (let i = 0; i < 7; i++) {
    const date = Plan.dateForSession(weekNum, DAY_TITLES[i]);
    if (!date) continue;
    const iso = Plan.localISO(date);
    for (const f of sched.fixtures || []) {
      if (f && f.date === iso) fixtures.push({ dayIdx: i, date: iso, label: f.opponent || f.label || 'Match' });
    }
  }
  return { byIdx, fixtures };
}

function dayForSession(title) {
  const t = title.toLowerCase();
  if (t.includes('monday')) return 0;
  if (t.includes('tuesday')) return 1;
  if (t.includes('wednesday')) return 2;
  if (t.includes('thursday')) return 3;
  if (t.includes('friday')) return 4;
  if (t.includes('saturday') || t.includes('sat')) return 5;
  if (t.includes('sunday')) return 6;
  return null;
}

// Derive a short type tag from the session title. Uses Midnight design tokens.
function sessionType(title) {
  const t = title.toLowerCase();
  if (t.includes('deload')) return { label: 'DELOAD', color: '#F2C14E' };
  if (t.includes('full body')) return { label: 'FULL', color: '#97A6FF' };
  if (t.includes('upper') || t.includes('push') || t.includes('pull')) return { label: 'UPPER', color: '#B0BBFF' };
  if (t.includes('lower') || t.includes('leg') || t.includes('quad') || t.includes('squat') || t.includes('posterior')) return { label: 'LOWER', color: '#7A8FEE' };
  return { label: 'LIFT', color: '#97A6FF' };
}

export default function WeekDetail() {
  const navigate = useNavigate();
  const { phaseId, weekNum } = useParams();
  const sessions = useTrainingStore(state => state.sessions);

  const phase = Plan.getPhase(Number(phaseId));
  const week = phase ? phase.weeks.find(w => w.num === Number(weekNum)) : null;
  if (!phase || !week) return <div style={{ padding: 24 }}>Week not found</div>;

  // WP-52: the coach's team schedule, mapped onto this week (null for team-less athletes).
  const teamInfo = teamWeekInfo(week.num);

  // TR-02 / M4a T4: the declared consumer of the D14 report's render-ready
  // projection (`_validation.explain`, from PlanService's shippedValidation —
  // packages/engine/src/lib/validation/contract.js#explainValidation). Safety
  // removals (enforced.removed, always tier-1 SAFETY & LAW) surface first —
  // they're the reason work is MISSING, not just adjusted — then any other
  // trim/veto still standing on the shipped week (e.g. a duration/equipment
  // trim). A validator that only passed emits nothing here (§5: notices exclude
  // 'pass').
  const explain = week._validation && week._validation.explain;
  const validationNotices = explain
    ? [...explain.removed, ...explain.notices]
    : [];

  // Build day → session index map for the strip
  const dayMap = {};
  week.sessions.forEach((s, i) => {
    const d = dayForSession(s.title);
    if (d !== null) {
      if (!dayMap[d]) dayMap[d] = [];
      dayMap[d].push(i);
    }
  });

  const completedCount = week.sessions.filter((_, i) => {
    const k = sessionKey(phase.id, week.num, i);
    return sessions[k] && sessions[k].completed;
  }).length;

  // WP-30b: forgiveness is only meaningful on the CURRENT week (it describes what
  // this reflow just decided). Reads the reflow's emitted ledger via PlanService.
  const isCurrent = Plan.currentWeekNumber() === week.num;
  const forgiven = isCurrent ? (Plan.lastForgiven() || {}) : {};
  const forgivenList = Object.entries(forgiven)
    .filter(([, sets]) => sets > 0)
    .map(([m, sets]) => `${MUSCLE_LABELS[m] || m} ${Math.round(sets)} set${Math.round(sets) !== 1 ? 's' : ''}`);

  return (
    <>
      <div className="eyebrow">Phase {phase.id} · {phase.title}</div>
      <h1 className="h1" style={{ fontSize: 28 }}>Week {week.num}</h1>

      {/* Progress line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 4, background: 'var(--hairline)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${Math.round(completedCount / week.sessions.length * 100)}%`,
            height: '100%',
            background: 'var(--accent)',
            borderRadius: 2,
            transition: 'width 0.3s ease'
          }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          {completedCount}/{week.sessions.length}
        </span>
      </div>

      <p className="sub" style={{ marginBottom: 14 }}>{week.theme}</p>

      {week.taper ? (
        <div className="callout amber" style={{ marginBottom: 14 }}>
          <strong>Taper week</strong> <InfoTip {...GLOSSARY.taper} /> — Volume cut, intensity kept. Sharpen and arrive fresh.
        </div>
      ) : week.autoDeload ? (
        <div className="callout amber" style={{ marginBottom: 14 }}>
          <strong>Auto-deload</strong> — {week.deloadReason || 'Fatigue is running high'}. Volume cut so you recover.
        </div>
      ) : week.deload ? (
        <div className="callout amber" style={{ marginBottom: 14 }}>
          <strong>Deload week</strong> <InfoTip {...GLOSSARY.deload} /> — Volume reduced. Mandatory.
        </div>
      ) : null}

      {/* WP-30b: the reflow's OWN adjustment reasons (emitted, never re-derived).
          _intensityEased = 'low readiness — eased' / 'travel — eased'; display trims
          the shared suffix. Forgiveness (current week only): sets past the safe
          catch-up window the plan moved on from — honest, no silent drops (Art 10). */}
      {week._intensityEased && (
        <div className="callout amber" style={{ marginBottom: 14 }}>
          <strong>Eased this week</strong> — {week._intensityEased.replace(/ — eased$/, '')}. Effort targets sit a touch lower; the volume stays.
        </div>
      )}
      {isCurrent && forgivenList.length > 0 && (
        <div className="callout slate" style={{ marginBottom: 14 }}>
          <strong>Missed work forgiven</strong> — {forgivenList.join(', ')} from earlier weeks {forgivenList.length === 1 ? 'was' : 'were'} past the safe catch-up window, so the plan moves on instead of cramming.
        </div>
      )}
      {/* WP-43: the remaining invisible adjustments become visible (Art 14/15). */}
      {week.deloadDeferred && (
        <div className="callout slate" style={{ marginBottom: 14 }}>
          <strong>Deload deferred</strong> — you're recovering well, so this week's planned easy week is pushed back and normal training continues.
        </div>
      )}
      {week._ruleTrim && (
        <div className="callout amber" style={{ marginBottom: 14 }}>
          <strong>Adjusted for your sport week</strong> — session volume is trimmed to about {Math.round((week._ruleTrim.mult || 1) * 100)}% around your fixtures and training load.
        </div>
      )}
      {/* TR-02 / M4a T4 (13-VALIDATION-STRATEGY §8.3 — the declared consumer for
          week._validation / meta.validation): "why your plan was trimmed" — every
          safety veto (M4a T2 enforcement) and every other trim/veto the D14 report
          found on this shipped week, rendered from the same render-ready projection
          (explainValidation) PlanService attaches as `_validation.explain`. Nothing
          here is re-derived — it is a direct read of the trace the validators already
          produced (Art 14/15: no silent disposal). */}
      {validationNotices.length > 0 && (
        <div className="callout amber" style={{ marginBottom: 14 }}>
          <strong>Why your plan was trimmed</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {validationNotices.map((n, i) => (
              <li key={i} style={{ fontSize: 13, marginTop: i ? 4 : 0 }}>
                {n.item ? <strong>{n.item}</strong> : null}{n.item ? ' — ' : ''}{n.reason}
                {' '}<span style={{ opacity: 0.65 }}>({n.tierName})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {isCurrent && week._catchUp && (
        <div className="callout slate" style={{ marginBottom: 14 }}>
          <strong>Catch-up included</strong> — about {week._catchUp.sets} {week._catchUp.sets === 1 ? 'set' : 'sets'} from recently missed sessions {week._catchUp.sets === 1 ? 'is' : 'are'} folded into this week's work.
        </div>
      )}

      {/* WP-52: match days are visible — the schedule that reshaped this week, shown. */}
      {teamInfo && teamInfo.fixtures.length > 0 && (
        <div className="callout amber" style={{ marginBottom: 14 }}>
          <strong>Match {teamInfo.fixtures.length === 1 ? 'day' : 'days'}</strong> — {teamInfo.fixtures.map((f) => `${DAY_TITLES[f.dayIdx]} vs ${f.label}`).join(' · ')}. Your coach's schedule keeps gym work clear of {teamInfo.fixtures.length === 1 ? 'it' : 'them'}.
        </div>
      )}

      {/* Day strip */}
      <div className="week-strip" style={{ marginBottom: 20 }}>
        {DAYS.map((d, i) => {
          const idxs = dayMap[i] || [];
          const allDone = idxs.length > 0 && idxs.every(idx => {
            const k = sessionKey(phase.id, week.num, idx);
            return sessions[k] && sessions[k].completed;
          });
          const hasSession = idxs.length > 0;
          const isFixture = teamInfo ? teamInfo.fixtures.some((f) => f.dayIdx === i) : false;
          const dayType = teamInfo ? teamInfo.byIdx[i] : null;
          const teamType = isFixture ? 'match' : (dayType && dayType !== 'gym' ? dayType : null);
          return (
            <div
              key={i}
              className={`week-strip-day ${allDone ? 'done' : hasSession ? 'planned' : 'empty'}`}
              onClick={() => {
                if (idxs.length === 1) {
                  navigate(`/phases/${phase.id}/weeks/${week.num}/sessions/${idxs[0]}`);
                }
              }}
              style={{ cursor: idxs.length === 1 ? 'pointer' : 'default' }}
              title={teamType ? `Team: ${teamType}` : undefined}
            >
              <div className="wsd-label">{d}</div>
              <div className="wsd-dot">{hasSession ? (allDone ? '✓' : idxs.length) : ''}</div>
              {teamType && (
                <div style={{ fontSize: 9, lineHeight: '10px', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em', color: teamType === 'match' ? 'var(--ochre)' : 'var(--txt-muted)' }}>
                  {teamType === 'match' ? 'match' : 'team'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compact session list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {week.sessions.map((s, i) => {
          const key = sessionKey(phase.id, week.num, i);
          const st = sessions[key];
          const isDone = st && st.completed;
          const isStarted = st && st.startedAt && !st.completed;
          const type = sessionType(s.title);

          // Parse title: "Monday · Lower (heavy)" → day="Monday", focus="Lower (heavy)"
          const parts = s.title.split('·');
          const day = parts[0].trim();
          const focus = parts.slice(1).join('·').trim() || s.title;

          // Extract duration in short form: "60–70 min · RPE peak 8" → "60–70 min"
          const shortDur = s.duration ? s.duration.split('·')[0].trim() : '';

          return (
            <button
              key={i}
              onClick={() => navigate(`/phases/${phase.id}/weeks/${week.num}/sessions/${i}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr auto',
                alignItems: 'center',
                gap: 10,
                padding: '8px 11px',
                background: isDone
                  ? 'rgba(74,93,58,0.07)'
                  : 'var(--bg-surface)',
                border: '1px solid var(--hairline)',
                borderRadius: 11,
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
                fontFamily: 'inherit',
                opacity: isDone ? 0.75 : 1
              }}
            >
              {/* Type pill */}
              <div style={{
                fontSize: 8.5,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: type.color,
                background: `${type.color}18`,
                borderRadius: 5,
                padding: '3px 0',
                textAlign: 'center',
                lineHeight: 1.2
              }}>
                {type.label}
              </div>

              {/* Name + duration */}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: 'var(--txt-strong)',
                  lineHeight: 1.25,
                  marginBottom: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {focus}
                </div>
                <div style={{ fontSize: 10.5, opacity: 0.55 }}>
                  {day} · {shortDur}
                </div>
              </div>

              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isDone && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: 'var(--moss)',
                    background: 'rgba(120,180,80,0.14)',
                    borderRadius: 6,
                    padding: '3px 7px'
                  }}>
                    DONE
                  </span>
                )}
                {isStarted && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: 'var(--rust)',
                    background: 'rgba(232,90,50,0.14)',
                    borderRadius: 6,
                    padding: '3px 7px'
                  }}>
                    STARTED
                  </span>
                )}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ width: 14, height: 14, opacity: 0.3, flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
