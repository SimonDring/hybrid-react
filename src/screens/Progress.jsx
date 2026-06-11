/**
 * Progress — the strength-app core every top tracker centres on: where your lifts
 * stand, and how recovered you are. Two modules:
 *   • Lifts & PRs — estimated 1-rep max per main lift (from logged top sets via
 *     liftProgression), shown with bodyweight-relative strength.
 *   • Recovery — readiness / sleep / HRV from wearables + manual (folds in the old
 *     Tracking dashboard + the Trends charts).
 */

import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import { resolveLifts } from '../lib/liftProgression.js';
import { computeReadiness, fmtSleep } from '../lib/Readiness.js';

const LIFTS = [
  { key: 'squat', label: 'Squat' },
  { key: 'bench', label: 'Bench' },
  { key: 'deadlift', label: 'Deadlift' }
];

function timeAgo(iso) {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.round(d / 7)}w ago`;
  return `${Math.round(d / 30)}mo ago`;
}

function LinkRow({ title, sub, badge, onClick }) {
  return (
    <button className="link-row" onClick={onClick}>
      <div className="lr-body">
        <div className="lr-title">{title}</div>
        <div className="lr-sub">{sub}</div>
      </div>
      {badge && <span className="lr-badge">{badge}</span>}
      <svg className="lr-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
    </button>
  );
}

export default function Progress() {
  const navigate = useNavigate();
  const profile = useTrainingStore(s => s.profile);
  const sessions = useTrainingStore(s => s.sessions);
  const dailyMetrics = useTrainingStore(s => s.dailyMetrics);
  const logs = useTrainingStore(s => s.logs);

  const lifts = resolveLifts(profile);
  const liftLog = profile.lift_log || {};
  const bw = Number(profile.bodyweight_kg) || null;
  const completed = Object.values(sessions).filter(s => s && s.completed).length;
  const hasLogged = Object.keys(liftLog).length > 0;
  const readiness = computeReadiness(dailyMetrics, logs);

  return (
    <>
      <h1 className="h1">Progress</h1>
      <p className="sub">Where your lifts stand, and how recovery's tracking.</p>

      {/* LIFTS & PRs */}
      <h2 className="h3">Strength</h2>
      <div className="stat-grid cols-3">
        {LIFTS.map(l => {
          const e = lifts[l.key];
          const ratio = e && bw ? (e / bw).toFixed(2) : null;
          const ago = timeAgo(liftLog[l.key] && liftLog[l.key].at);
          return (
            <div key={l.key} className="stat-card">
              <div className="l">{l.label}</div>
              <div className="v">{e ? Math.round(e) : '—'}</div>
              <div className="d">{e ? `kg${ratio ? ` · ${ratio}×bw` : ''}${ago ? ` · ${ago}` : ''}` : 'log a set'}</div>
            </div>
          );
        })}
      </div>
      <p className="sub" style={{ fontSize: 12, marginTop: 8, marginBottom: 22 }}>
        {hasLogged
          ? 'Estimated 1-rep max, updated from your logged top sets — these climb as you get stronger.'
          : 'Log your top set after a main lift and your estimated 1-rep maxes will track here.'}
      </p>

      {/* SUMMARY */}
      <div className="stat-grid cols-2" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="l">Sessions done</div>
          <div className="v">{completed}</div>
          <div className="d">all time</div>
        </div>
        <div className="stat-card">
          <div className="l">Readiness</div>
          <div className="v" style={{ color: readiness.score != null ? `var(--${readiness.accent})` : 'var(--txt-muted)' }}>{readiness.score ?? '—'}</div>
          <div className="d">{readiness.score != null ? (readiness.estimated ? 'estimate' : 'today') : 'no data'}</div>
        </div>
      </div>

      {/* RECOVERY */}
      <h2 className="h3">Recovery</h2>
      {dailyMetrics.length === 0 ? (
        <button className="callout amber" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block' }} onClick={() => navigate('/tracking/wearables')}>
          <strong>No recovery data yet.</strong> Connect a wearable or add today's sleep, HRV and resting HR →
        </button>
      ) : (
        <div className="stat-grid cols-3" style={{ marginBottom: 14 }}>
          <div className="stat-card"><div className="l">Sleep</div><div className="v">{readiness.vitals.sleepMin != null ? fmtSleep(readiness.vitals.sleepMin) : '—'}</div><div className="d"></div></div>
          <div className="stat-card"><div className="l">HRV</div><div className="v">{readiness.vitals.hrv ?? '—'}</div><div className="d">{readiness.vitals.hrv != null ? 'ms' : ''}</div></div>
          <div className="stat-card"><div className="l">Resting HR</div><div className="v">{readiness.vitals.rhr ?? '—'}</div><div className="d">{readiness.vitals.rhr != null ? 'bpm' : ''}</div></div>
        </div>
      )}
      <div className="link-list">
        <LinkRow title="Daily metrics" sub="Sleep, HRV, resting HR, readiness — wearable + manual" onClick={() => navigate('/tracking/wearables')} />
        <LinkRow title="Trends" sub="Recovery & activity over time" onClick={() => navigate('/tracking/trends')} badge={dailyMetrics.length >= 2 ? `${dailyMetrics.length} days` : null} />
      </div>
    </>
  );
}
