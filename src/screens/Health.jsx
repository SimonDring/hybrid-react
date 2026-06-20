/**
 * Health — a dashboard of summary tiles, one per section (Fitness age, Sleep,
 * Recovery, Training load, Trends, Injuries). Each tile shows the summary; the
 * detail lives behind a tap. Daily metrics are folded into Trends (no separate
 * raw-data tile). Readiness itself stays on Home — Health shows the detail behind.
 */
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import { fmtSleep } from '../lib/Readiness.js';
import { loadVerdict } from '../lib/verdicts.js';
import { fitnessAge } from '../lib/fitnessAge.js';

function Tile({ label, value, valueColor, sub, onClick }) {
  return (
    <button className="health-tile" onClick={onClick}>
      <svg className="ht-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      <div className="ht-label">{label}</div>
      <div className="ht-value" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
      {sub && <div className="ht-sub">{sub}</div>}
    </button>
  );
}

export default function Health() {
  const navigate = useNavigate();
  const profile = useTrainingStore(s => s.profile);
  const dailyMetrics = useTrainingStore(s => s.dailyMetrics);
  const load = useTrainingStore(s => s.load);
  const adaptation = useTrainingStore(s => s.adaptation);
  const injuries = useTrainingStore(s => s.injuries);

  const fa = fitnessAge(profile, dailyMetrics);
  const lv = loadVerdict(load, adaptation);
  const sorted = [...dailyMetrics].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const latest = sorted[sorted.length - 1] || {};
  const rd = sorted.map(m => Number(m.readiness_score)).filter(v => !isNaN(v)).slice(-30);
  const rdDelta = rd.length > 1 ? Math.round(rd[rd.length - 1] - rd[0]) : null;
  const activeInjuries = (injuries || []).filter(i => ['active', 'rehabbing', 'monitoring'].includes(i.status));

  return (
    <>
      <h1 className="h1">Health</h1>
      <p className="sub">Recovery and load at a glance — tap a tile for detail.</p>

      <div className="health-grid">
        <Tile
          label="Fitness age"
          value={fa ? `${fa.fitnessAge} yrs` : '—'}
          valueColor={fa ? fa.color : undefined}
          sub={fa ? (fa.status === 'younger' ? `${fa.delta} yrs younger` : fa.status === 'older' ? `${Math.abs(fa.delta)} yrs older` : 'on par') : 'add HRV + resting HR'}
          onClick={() => navigate('/tracking/fitness-age')}
        />
        <Tile
          label="Sleep"
          value={latest.sleep_duration_min != null ? fmtSleep(latest.sleep_duration_min) : '—'}
          sub={latest.sleep_score != null ? `score ${latest.sleep_score}` : 'last night'}
          onClick={() => navigate('/tracking/sleep')}
        />
        <Tile
          label="Recovery"
          value={latest.hrv_ms != null ? `${latest.hrv_ms} ms` : '—'}
          sub={latest.resting_hr != null ? `resting HR ${latest.resting_hr}` : 'HRV + resting HR'}
          onClick={() => navigate('/tracking/recovery')}
        />
        <Tile
          label="Training load"
          value={lv.label}
          valueColor={lv.color}
          sub={load && load.acwr != null ? `ratio ${load.acwr.toFixed(1)}` : 'building baseline'}
          onClick={() => navigate('/tracking/load')}
        />
        <Tile
          label="Trends"
          value={rdDelta != null ? `Readiness ${rdDelta >= 0 ? '↑' : '↓'}${Math.abs(rdDelta)}` : 'Charts'}
          sub="metrics over time"
          onClick={() => navigate('/tracking/trends')}
        />
        <Tile
          label="Injuries"
          value={activeInjuries.length === 0 ? 'None' : `${activeInjuries.length} active`}
          valueColor={activeInjuries.length > 0 ? 'var(--status-strain)' : undefined}
          sub={activeInjuries.length === 0 ? 'all clear' : activeInjuries.map(i => i.title || i.body_part).filter(Boolean).join(', ')}
          onClick={() => navigate('/tracking/injuries')}
        />
      </div>
    </>
  );
}
