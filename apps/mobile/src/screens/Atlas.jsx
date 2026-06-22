/**
 * Atlas — the sport-specific athlete profile.
 *
 * A radar of the pillars that matter for the user's sport, with their shape inside
 * estimated top-5% / elite reference rings; ranked gap-bars (worst first) so the
 * laggards are obvious; a plain-language note tying the biggest gap back to what
 * the gym engine is emphasising; and the strength-progress goals (folded in from
 * the old Progress screen). iOS-first, single column.
 */

import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { computePillars } from '../lib/atlas/pillars.js';
import { goalMomentum } from '../lib/goals.js';
import RadarChart from '../components/ui/RadarChart.jsx';
import MetricRing from '../components/ui/MetricRing.jsx';

const PILL = { on_track: 'On track', building: 'Building', behind: 'Behind', nodata: '—' };

export default function Atlas() {
  const profile = useTrainingStore(s => s.profile);
  const sessions = useTrainingStore(s => s.sessions);
  const logs = useTrainingStore(s => s.logs);
  const dailyMetrics = useTrainingStore(s => s.dailyMetrics);
  const load = useTrainingStore(s => s.load);

  const currentWeek = Plan.currentWeekNumber();
  const atlas = computePillars(profile, { sessions, logs, dailyMetrics, load, currentWeek });
  const { goals } = goalMomentum(profile, sessions, currentWeek);

  const labels = atlas.pillars.map(p => p.label);
  const series = [
    { name: 'Elite', color: 'var(--disc-run)', values: atlas.pillars.map(p => p.elite), dash: '2,3', width: 1.4 },
    { name: 'Top 5%', color: 'var(--accent-warm)', values: atlas.pillars.map(p => p.top5), dash: '6,4', width: 1.4 },
    { name: 'You', color: 'var(--accent)', values: atlas.pillars.map(p => p.score), fill: 0.18, width: 2 }
  ];
  const ranked = atlas.pillars.slice().sort((a, b) => b.gap - a.gap);

  return (
    <>
      <div className="atlas-head">
        <div style={{ minWidth: 0 }}>
          <h1 className="h1" style={{ marginBottom: 2 }}>Atlas</h1>
          <p className="sub" style={{ marginBottom: 0 }}>How you stack up across the pillars that matter for your sport.</p>
        </div>
        <span className="atlas-chip">{atlas.label}</span>
      </div>

      <div className="atlas-legend">
        <span className="al-key"><i style={{ background: 'var(--accent)' }} />You</span>
        <span className="al-key"><i style={{ background: 'var(--accent-warm)' }} />Top 5%</span>
        <span className="al-key"><i style={{ background: 'var(--disc-run)' }} />Elite</span>
        <span className="atlas-est">Estimated benchmarks</span>
      </div>

      <div className="atlas-radar">
        <RadarChart labels={labels} series={series} />
      </div>

      {atlas.focus && (
        <div className="atlas-focus">
          <div className="af-eyebrow">Biggest gap</div>
          <div className="af-title">{atlas.focus.label} · {atlas.focus.score}</div>
          <div className="af-why">{atlas.focus.why}</div>
        </div>
      )}

      <div className="atlas-bars">
        <div className="atlas-bars-head">Where you stand</div>
        {ranked.map((p, idx) => (
          <div className="pillar" key={p.id}>
            <div className="pillar-top">
              <span className="pillar-name">{p.label}</span>
              {idx < 2 ? <span className="pillar-focus">Focus</span> : <span className="pillar-score">{p.score}</span>}
            </div>
            <div className="pillar-track">
              <div className="pillar-fill" style={{ width: `${p.score}%`, background: idx < 2 ? 'var(--status-strain)' : 'var(--accent)' }} />
              <span className="pillar-mk" style={{ left: `${p.top5}%`, background: 'var(--accent-warm)' }} />
              <span className="pillar-mk" style={{ left: `${p.elite}%`, background: 'var(--disc-run)' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="atlas-bars-head" style={{ marginTop: 24 }}>Your lifts</div>
      <div className="goal-rows" style={{ marginTop: 6 }}>
        {goals.map(g => (
          <div key={g.key} className="goal-row-r">
            <MetricRing value={g.pct || 0} max={100} size={46} stroke={4} color={g.color}>
              <span className="grr-pct">{g.pct != null ? g.pct : '—'}</span>
            </MetricRing>
            <div className="grr-body">
              <div className="grr-top">
                <span className="grr-name">{g.label}</span>
                <span className={`grw-pill ${g.status}`}>{PILL[g.status]}</span>
              </div>
              <div className="grr-sub">
                {g.current != null ? (g.key === 'consistency' ? `${g.current}/wk` : `${g.current} kg`) : 'Log a set'} · {g.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
