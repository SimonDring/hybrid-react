/**
 * Atlas — the athlete profile, read straight off the Performance Model (WP-29).
 *
 * A radar of the qualities the athlete's SPORT demands (or, for build athletes, the
 * qualities their plan trains), with the athlete's capability inside the demand ring;
 * ranked gap-bars (worst first); and a focus panel that IS the engine's top limiting
 * factor with its own emitted rationale — the same diagnosis the planner works from.
 * The strength-progress goals stay folded in below. iOS-first, single column.
 */

import { useState } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { localISO } from '@performance-os/engine';
import { computeAtlas } from '../lib/atlas.js';
import { goalMomentum } from '../lib/goals.js';
import RadarChart from '../components/ui/RadarChart.jsx';
import MetricRing from '../components/ui/MetricRing.jsx';

const PILL = { on_track: 'On track', building: 'Building', behind: 'Behind', nodata: '—' };

export default function Atlas() {
  const profile = useTrainingStore(s => s.profile);
  const sessions = useTrainingStore(s => s.sessions);

  const currentWeek = Plan.currentWeekNumber();
  const atlas = computeAtlas(profile, localISO(new Date()));
  const { goals } = goalMomentum(profile, sessions, currentWeek);

  const labels = atlas.pillars.map(p => p.label);
  const series = [
    ...(atlas.hasDemand ? [{ name: 'Your sport demands', color: 'var(--accent-warm)', values: atlas.pillars.map(p => p.demand), dash: '6,4', width: 1.4 }] : []),
    { name: 'You', color: 'var(--accent)', values: atlas.pillars.map(p => p.score), fill: 0.18, width: 2 }
  ];
  const ranked = atlas.pillars.slice().sort((a, b) =>
    atlas.hasDemand ? (b.gap - a.gap) : (a.score - b.score));

  return (
    <>
      <div className="atlas-head">
        <div style={{ minWidth: 0 }}>
          <h1 className="h1" style={{ marginBottom: 2 }}>Atlas</h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            {atlas.hasDemand
              ? 'Your capability against what your sport demands.'
              : 'Your capability across the qualities your plan trains.'}
          </p>
        </div>
        <span className="atlas-chip">{atlas.label}</span>
      </div>

      <div className="atlas-legend">
        <span className="al-key"><i style={{ background: 'var(--accent)' }} />You</span>
        {atlas.hasDemand && <span className="al-key"><i style={{ background: 'var(--accent-warm)' }} />Sport demand</span>}
        {atlas.estimated && <span className="atlas-est">Estimated from your training history — log lifts to sharpen it</span>}
      </div>

      <div className="atlas-radar">
        <RadarChart labels={labels} series={series} />
      </div>

      {atlas.focus && (
        <div className="atlas-focus">
          <div className="af-eyebrow">Your focus</div>
          <div className="af-title">{atlas.focus.headline}</div>
          <div className="af-why">{atlas.focus.meaning}</div>
          <div className="af-why" style={{ marginTop: 6 }}>{atlas.focus.whyItMatters}</div>
          <FocusDetail text={atlas.focus.detail} />
        </div>
      )}

      <div className="atlas-bars">
        <div className="atlas-bars-head">Where you stand</div>
        {ranked.map((p, idx) => (
          <div className="pillar" key={p.id}>
            <div className="pillar-top">
              <span className="pillar-name">{p.label}</span>
              {atlas.hasDemand && idx < 2 ? <span className="pillar-focus">Focus</span> : <span className="pillar-score">{p.score}</span>}
            </div>
            <div className="pillar-track">
              <div className="pillar-fill" style={{ width: `${p.score}%`, background: atlas.hasDemand && idx < 2 ? 'var(--status-strain)' : 'var(--accent)' }} />
              {p.demand != null && <span className="pillar-mk" style={{ left: `${p.demand}%`, background: 'var(--accent-warm)' }} />}
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

function FocusDetail({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 8 }}>
      <button className="btn-text" style={{ padding: 0, fontSize: 12 }} onClick={() => setOpen(o => !o)}>
        {open ? 'Hide the numbers ▲' : 'How we worked this out ▼'}
      </button>
      {open && <div className="af-detail">{text}</div>}
    </div>
  );
}
