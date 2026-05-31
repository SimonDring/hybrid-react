/**
 * Reassessment screen — quarterly (every 12 weeks) or after a major life event.
 *
 * Structure:
 *   1. AI-analysis placeholder (Stage 5)
 *   2. Data snapshot — auto-pulled from ALL sources the AI will analyse:
 *        - Weekly check-ins (weight, RHR, sleep, RPE, knee trends)
 *        - Daily metrics (HRV, readiness, resting HR from Fitbit-ready table)
 *        - Session adherence (completion rate = performance signal)
 *        - Active injuries
 *        - Goals (what we're assessing against)
 *   3. Reflective questions (human judgement the AI can't replace)
 *
 * AI integration (Stage 5): submitting will send answers + this exact data
 * snapshot to Claude, which assesses whether the plan is working against the
 * goals and proposes specific next-phase adjustments. The snapshot below is
 * deliberately the same data the AI will receive — what you see is what it sees.
 */

import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../data/Plan.js';
import * as Utils from '../lib/Utils.js';

const QUESTIONS = [
  { id: 'q_body', section: 'Body & health', label: 'How is your body feeling overall? Include any niggles, energy, and recovery quality.' },
  { id: 'q_progress', section: 'Training progress', label: 'What has improved over the last 12 weeks? What has stayed the same or got worse?' },
  { id: 'q_adherence', section: 'Plan adherence', label: 'How closely did you follow the plan? What got in the way, and how often?' },
  { id: 'q_goals', section: 'Goals', label: 'Are your goals still the right goals? Has anything changed in what you want?' },
  { id: 'q_life', section: 'Life context', label: 'What is changing next quarter — travel, work, anything affecting training?' },
  { id: 'q_next', section: 'Next quarter', label: 'What should the next 12 weeks look like? What would make it a success?' },
  { id: 'q_other', section: 'Anything else', label: 'Anything else worth recording the above did not cover?' }
];

// --- trend helpers ---
function avg(rows, field) {
  const v = rows.map(r => parseFloat(r[field])).filter(n => !isNaN(n));
  return v.length ? (v.reduce((a, b) => a + b, 0) / v.length) : null;
}
function trendDir(rows, field) {
  const v = rows.map(r => parseFloat(r[field])).filter(n => !isNaN(n));
  if (v.length < 3) return null;
  const half = Math.floor(v.length / 2);
  const firstAvg = v.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const secondAvg = v.slice(half).reduce((a, b) => a + b, 0) / (v.length - half);
  const delta = secondAvg - firstAvg;
  if (Math.abs(delta) < 0.2) return 'stable';
  return delta > 0 ? 'up' : 'down';
}
const arrow = (t) => t === 'up' ? '↑' : t === 'down' ? '↓' : t === 'stable' ? '→' : '';

// good-direction colouring: rhr/knee down good, sleep/readiness/hrv up good
function trendColour(field, t) {
  if (!t || t === 'stable') return 'var(--txt-muted)';
  const downGood = ['rhr', 'knee', 'resting_hr'];
  const upGood = ['sleep', 'readiness_score', 'hrv_ms', 'sleep_score'];
  if (downGood.includes(field)) return t === 'down' ? '#4a5d3a' : '#b04a2e';
  if (upGood.includes(field)) return t === 'up' ? '#4a5d3a' : '#b04a2e';
  return 'var(--txt-muted)';
}

function Stat({ label, value, unit, t, field }) {
  if (value == null) return null;
  return (
    <div>
      <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 2 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt-strong)' }}>
        {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
        {unit && <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 3 }}>{unit}</span>}
        {t && <span style={{ fontSize: 13, marginLeft: 4, color: trendColour(field, t) }}>{arrow(t)}</span>}
      </div>
    </div>
  );
}

function SnapshotCard({ title, children }) {
  return (
    <div style={{
      padding: '14px 16px', background: 'var(--bg-surface)',
      border: '1px solid var(--hairline)', borderRadius: 14, marginBottom: 12
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.5, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

export default function Reassess() {
  const reassess = useTrainingStore(s => s.reassess);
  const setReassess = useTrainingStore(s => s.setReassess);
  const logs = useTrainingStore(s => s.logs);
  const dailyMetrics = useTrainingStore(s => s.dailyMetrics);
  const sessions = useTrainingStore(s => s.sessions);
  const injuries = useTrainingStore(s => s.injuries);
  const profile = useTrainingStore(s => s.profile);

  const last12Checkins = logs.slice(-12);
  const last90Daily = dailyMetrics.slice(-90);

  // Session adherence = completion rate across all template sessions touched
  const completedCount = Object.values(sessions).filter(s => s && s.completed).length;
  const startedCount = Object.values(sessions).filter(s => s && (s.completed || s.startedAt)).length;
  const adherence = startedCount > 0 ? Math.round((completedCount / startedCount) * 100) : null;

  const activeInjuries = injuries.filter(i => i.status === 'active' || i.status === 'rehabbing' || i.status === 'monitoring');
  const goals = profile.goals || [];

  const sections = [...new Set(QUESTIONS.map(q => q.section))];

  return (
    <>
      <h1 className="h1">Quarterly reassessment</h1>
      <p className="sub">
        Every 12 weeks, or when life shifts. Honest answers — combined with the data below — drive the next phase.
      </p>

      {/* AI placeholder */}
      <div style={{
        padding: '14px 16px', background: 'rgba(176,74,46,0.04)',
        border: '1px dashed rgba(176,74,46,0.25)', borderRadius: 14, marginBottom: 20
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--rust)', marginBottom: 6 }}>
          AI ANALYSIS · STAGE 5
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.8 }}>
          When Claude is integrated, submitting this reassessment sends your answers plus the exact data
          snapshot below — check-in trends, daily recovery metrics, session adherence, injuries — and assesses
          whether you're adapting and progressing toward your goals, then proposes specific next-phase changes.
        </div>
      </div>

      {/* DATA SNAPSHOT — everything the AI will read */}
      <div className="h3">Your quarter in data</div>

      {/* Goals being assessed against */}
      {goals.length > 0 && (
        <SnapshotCard title="GOALS (RANKED)">
          {goals.map((g, i) => (
            <div key={i} style={{ fontSize: 13, marginBottom: 4, display: 'flex', gap: 8 }}>
              <span style={{ fontWeight: 800, color: 'var(--txt-muted)' }}>{g.rank}.</span>
              <span style={{ color: 'var(--txt-strong)' }}>{g.label || '—'}</span>
              {g.target_date && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt-muted)' }}>{g.target_date}</span>}
            </div>
          ))}
        </SnapshotCard>
      )}

      {/* Weekly check-in trends */}
      {last12Checkins.length > 0 && (
        <SnapshotCard title={`WEEKLY CHECK-INS · LAST ${last12Checkins.length}`}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px' }}>
            <Stat label="Weight" field="bw" value={avg(last12Checkins, 'bw')} unit="kg" t={trendDir(last12Checkins, 'bw')} />
            <Stat label="Resting HR" field="rhr" value={avg(last12Checkins, 'rhr')} unit="bpm" t={trendDir(last12Checkins, 'rhr')} />
            <Stat label="Sleep" field="sleep" value={avg(last12Checkins, 'sleep')} unit="/10" t={trendDir(last12Checkins, 'sleep')} />
            <Stat label="Avg RPE" field="rpe" value={avg(last12Checkins, 'rpe')} unit="/10" t={trendDir(last12Checkins, 'rpe')} />
            <Stat label="Knee" field="knee" value={avg(last12Checkins, 'knee')} unit="/10" t={trendDir(last12Checkins, 'knee')} />
          </div>
        </SnapshotCard>
      )}

      {/* Daily metrics (Fitbit-ready) */}
      {last90Daily.length > 0 && (
        <SnapshotCard title={`DAILY METRICS · LAST ${last90Daily.length} DAYS`}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px' }}>
            <Stat label="HRV" field="hrv_ms" value={avg(last90Daily, 'hrv_ms')} unit="ms" t={trendDir(last90Daily, 'hrv_ms')} />
            <Stat label="Resting HR" field="resting_hr" value={avg(last90Daily, 'resting_hr')} unit="bpm" t={trendDir(last90Daily, 'resting_hr')} />
            <Stat label="Readiness" field="readiness_score" value={avg(last90Daily, 'readiness_score')} unit="/100" t={trendDir(last90Daily, 'readiness_score')} />
            <Stat label="Sleep score" field="sleep_score" value={avg(last90Daily, 'sleep_score')} unit="/100" t={trendDir(last90Daily, 'sleep_score')} />
          </div>
        </SnapshotCard>
      )}

      {/* Adherence + injuries row */}
      <SnapshotCard title="ADHERENCE & HEALTH">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px' }}>
          <Stat label="Sessions done" value={completedCount} unit="" />
          {adherence != null && <Stat label="Completion" value={adherence} unit="%" />}
          <div>
            <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 2 }}>ACTIVE INJURIES</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: activeInjuries.length ? '#b04a2e' : 'var(--txt-strong)' }}>
              {activeInjuries.length}
            </div>
          </div>
        </div>
        {activeInjuries.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 8 }}>
            {activeInjuries.map(i => i.title || i.body_part).filter(Boolean).join(' · ')}
          </div>
        )}
      </SnapshotCard>

      {(logs.length === 0 && dailyMetrics.length === 0) && (
        <p style={{ fontSize: 12, opacity: 0.55, fontStyle: 'italic', marginBottom: 16 }}>
          Log check-ins and daily metrics to populate this snapshot — the more data, the better the AI assessment later.
        </p>
      )}

      {/* Reflective questions */}
      <div className="h3" style={{ marginTop: 8 }}>Your reflections</div>
      {sections.map(section => (
        <div key={section} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 8 }}>{section}</div>
          {QUESTIONS.filter(q => q.section === section).map(q => (
            <div key={q.id} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, lineHeight: 1.4, marginBottom: 8, color: 'var(--txt-strong)' }}>
                {q.label}
              </label>
              <textarea
                rows={3}
                value={reassess[q.id] || ''}
                onChange={e => setReassess(q.id, e.target.value)}
                placeholder="Your honest answer..."
                style={{
                  width: '100%', resize: 'vertical', fontSize: 14, padding: '10px 12px',
                  borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--bg-surface)',
                  fontFamily: 'inherit', color: 'var(--txt-strong)'
                }}
              />
            </div>
          ))}
        </div>
      ))}

      <div style={{ fontSize: 11, opacity: 0.5, fontStyle: 'italic', marginBottom: 24 }}>
        Answers save as you type. No submit button yet — in Stage 5, submitting will trigger the AI analysis.
      </div>
    </>
  );
}
