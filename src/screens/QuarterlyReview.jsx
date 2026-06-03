/**
 * Quarterly review — READ-ONLY AI placeholder (route: /profile/review).
 *
 * Replaces the old manual reflection form. Every ~12 weeks the AI coach will
 * read the exact data snapshot shown here — goal progress, check-in and daily
 * recovery trends, session adherence, injuries — and write an assessment plus
 * proposed next-phase changes. Until Claude is wired in (Stage 5), this shows
 * the snapshot and a disabled "Generate review" action so the surface is ready.
 *
 * What you see here is what the AI sees: no extra wiring needed at integration.
 */

import { useTrainingStore } from '../stores/trainingStore.js';

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
  if (downGood.includes(field)) return t === 'down' ? 'var(--moss)' : 'var(--rust)';
  if (upGood.includes(field)) return t === 'up' ? 'var(--moss)' : 'var(--rust)';
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

export default function QuarterlyReview() {
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

  const noData = logs.length === 0 && dailyMetrics.length === 0 && completedCount === 0;

  return (
    <>
      <h1 className="h1">Quarterly review</h1>
      <p className="sub">
        Every ~12 weeks your coach assesses how you're tracking against your goals and proposes
        what the next phase should look like — built from the data below.
      </p>

      {/* AI placeholder + (disabled) action */}
      <div style={{
        padding: '16px', background: 'rgba(176,74,46,0.04)',
        border: '1px dashed rgba(176,74,46,0.25)', borderRadius: 14, marginBottom: 20
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--rust)', marginBottom: 6 }}>
          AI REVIEW · COMING SOON
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.85, marginBottom: 14 }}>
          When your AI coach is live, it reads the snapshot below — goal progress, recovery trends,
          adherence, and injuries — and writes a plain-language assessment plus specific next-phase
          adjustments. No forms to fill in.
        </div>
        <button
          disabled
          style={{
            width: '100%', padding: 13, borderRadius: 11, border: 'none',
            background: 'var(--bg-surface-2)', color: 'var(--txt-muted)',
            fontSize: 14, fontWeight: 600, cursor: 'not-allowed', fontFamily: 'inherit'
          }}
        >
          Generate review (coming soon)
        </button>
      </div>

      {/* DATA SNAPSHOT — everything the AI will read */}
      <div className="h3">Your quarter in data</div>

      {goals.length > 0 && (
        <SnapshotCard title="GOALS (RANKED)">
          {goals.map((g, i) => (
            <div key={i} style={{ fontSize: 13, marginBottom: 4, display: 'flex', gap: 8 }}>
              <span style={{ fontWeight: 800, color: 'var(--txt-muted)' }}>{g.rank ?? i + 1}.</span>
              <span style={{ color: 'var(--txt-strong)' }}>{g.label || '—'}</span>
              {g.target_date && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt-muted)' }}>{g.target_date}</span>}
            </div>
          ))}
        </SnapshotCard>
      )}

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

      <SnapshotCard title="ADHERENCE & HEALTH">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px' }}>
          <Stat label="Sessions done" value={completedCount} unit="" />
          {adherence != null && <Stat label="Completion" value={adherence} unit="%" />}
          <div>
            <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 2 }}>ACTIVE INJURIES</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: activeInjuries.length ? 'var(--rust)' : 'var(--txt-strong)' }}>
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

      {noData && (
        <p style={{ fontSize: 12, opacity: 0.55, fontStyle: 'italic', marginBottom: 16 }}>
          Train and sync your wearable to populate this snapshot — the more data, the sharper the AI review.
        </p>
      )}
    </>
  );
}
