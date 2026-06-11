/**
 * Plan — the training block, calendar-first. The calendar is the fast path
 * (tap a day → open that session, ≤2 taps to anything in the block); the phase
 * tiles below let you browse the block ahead. Replaces the old "Phases" list +
 * its stale 52-week copy.
 */

import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import * as Utils from '../lib/Utils.js';
import TrainingCalendar from '../components/TrainingCalendar.jsx';

export default function PlanScreen() {
  const navigate = useNavigate();
  const sessions = useTrainingStore(state => state.sessions);
  const phases = Plan.getPhases();
  const hasCalendar = !!Plan.getStartDate();
  const totalWeeks = phases.reduce((m, p) => Math.max(m, p.weekEnd || 0), 0);
  const currentWeek = Plan.currentWeekNumber();

  const openSession = (s) => navigate(`/phases/${s.phaseId}/weeks/${s.weekNum}/sessions/${s.idx}`);

  return (
    <>
      <h1 className="h1">Your plan</h1>
      <p className="sub">
        {totalWeeks ? `A ${totalWeeks}-week block${currentWeek ? ` · you're in week ${currentWeek}` : ''}, periodised and adapting as you go.` : 'Your training block.'}
      </p>

      {hasCalendar && <TrainingCalendar sessions={sessions} onOpen={openSession} />}

      <h2 className="h3" style={{ marginTop: 20 }}>Blocks</h2>
      {phases.map(phase => {
        let total = 0, done = 0;
        (phase.weeks || []).forEach(wk => wk.sessions.forEach((_, i) => {
          total++;
          const k = Utils.weekKey(phase.id, wk.num, i);
          if (sessions[k] && sessions[k].completed) done++;
        }));
        const pct = total > 0 ? Math.round(done / total * 100) : 0;
        return (
          <button key={phase.id} className="phase-tile" onClick={() => navigate(`/phases/${phase.id}`)} data-status={phase.status}>
            <div className="pt-num">{phase.id}</div>
            <div className="pt-range">{phase.range}</div>
            <div className="pt-title">{phase.title}</div>
            <div className="pt-desc">{phase.tagline}</div>
            <div className="pt-foot">
              <span className={`pt-status ${phase.status}`}>{phase.status}</span>
              {total > 0 && <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>{done}/{total} · {pct}%</span>}
            </div>
          </button>
        );
      })}
    </>
  );
}
