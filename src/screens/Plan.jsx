/**
 * Plan (Program) — one low-click surface for the whole block. The calendar is the
 * fast path (≤2 taps to any session); below it a horizontal WEEK STEPPER lets you
 * scan every week across phases and tap one to see its sessions inline — no more
 * Plan → Phase → Week page drilling. A session is one tap from here.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import * as Utils from '../lib/Utils.js';
import TrainingCalendar from '../components/TrainingCalendar.jsx';
import SessionRow from '../components/ui/SessionRow.jsx';

export default function PlanScreen() {
  const navigate = useNavigate();
  const sessions = useTrainingStore(s => s.sessions);
  const phases = Plan.getPhases();
  const hasCalendar = !!Plan.getStartDate();
  const totalWeeks = phases.reduce((m, p) => Math.max(m, p.weekEnd || 0), 0);
  const currentWeek = Plan.currentWeekNumber();

  // Flatten weeks across phases, carrying phase context.
  const weeks = [];
  phases.forEach(p => (p.weeks || []).forEach(w => weeks.push({ ...w, phaseId: p.id, phaseTitle: p.title })));

  const [selNum, setSelNum] = useState(currentWeek || (weeks[0] && weeks[0].num) || 1);
  const sel = weeks.find(w => w.num === selNum) || weeks[0] || null;
  const selRef = useRef(null);
  useEffect(() => {
    if (selRef.current) selRef.current.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, []);

  const openSession = (s) => navigate(`/phases/${s.phaseId}/weeks/${s.weekNum}/sessions/${s.idx}`);

  const weekProgress = (w) => {
    const total = w.sessions.length;
    let done = 0;
    w.sessions.forEach((_, i) => {
      const k = Utils.weekKey(w.phaseId, w.num, i);
      if (sessions[k] && sessions[k].completed) done++;
    });
    return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
  };

  return (
    <>
      <h1 className="h1">Your plan</h1>
      <p className="sub">
        {totalWeeks
          ? `A ${totalWeeks}-week block${currentWeek ? ` · week ${currentWeek} now` : ''}, periodised and adapting as you go.`
          : 'Your training block.'}
      </p>

      {hasCalendar && <TrainingCalendar sessions={sessions} onOpen={openSession} />}

      {weeks.length > 0 && (
        <>
          <h2 className="h3" style={{ marginTop: 20 }}>The block</h2>

          <div className="wk-stepper">
            {weeks.map(w => {
              const { done, total } = weekProgress(w);
              const isCur = w.num === currentWeek;
              const isSel = w.num === selNum;
              return (
                <button
                  key={`${w.phaseId}-${w.num}`}
                  ref={isSel ? selRef : null}
                  className={`wk-chip${isSel ? ' sel' : ''}${isCur ? ' now' : ''}`}
                  onClick={() => setSelNum(w.num)}
                >
                  <span className="wk-chip-num">{w.num}</span>
                  <span className="wk-chip-tag">{w.deload ? 'Deload' : isCur ? 'Now' : ''}</span>
                  <span className="wk-chip-prog">{done}/{total}</span>
                </button>
              );
            })}
          </div>

          {sel && (
            <div className="wk-panel">
              <div className="wk-panel-head">
                <div>
                  <div className="wk-panel-eyebrow">Phase {sel.phaseId} · {sel.phaseTitle}</div>
                  <div className="wk-panel-title">Week {sel.num}{sel.theme ? ` · ${sel.theme}` : ''}</div>
                </div>
                {sel.deload && <span className="wk-deload">Deload</span>}
              </div>

              {(() => {
                const p = weekProgress(sel);
                return (
                  <div className="wk-prog">
                    <div className="wk-prog-bar"><span style={{ width: `${p.pct}%` }} /></div>
                    <span className="wk-prog-label">{p.done}/{p.total}</span>
                  </div>
                );
              })()}

              <div className="wk-sessions">
                {sel.sessions.map((s, i) => {
                  const k = Utils.weekKey(sel.phaseId, sel.num, i);
                  const st = sessions[k];
                  return (
                    <SessionRow
                      key={i}
                      session={s}
                      done={st && st.completed}
                      started={st && st.startedAt && !st.completed}
                      onClick={() => navigate(`/phases/${sel.phaseId}/weeks/${sel.num}/sessions/${i}`)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
