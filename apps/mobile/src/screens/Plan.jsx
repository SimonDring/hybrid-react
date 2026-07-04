/**
 * Plan (Program) — one low-click surface for browsing the whole block, on one
 * screen. A horizontal WEEK STEPPER (current week pinned) selects a week; its
 * sessions show inline below — a session is one tap from here. The day-by-day
 * calendar lives on Today (Home), so it isn't duplicated here.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { sessionKey } from '@performance-os/engine';
import SessionRow from '../components/ui/SessionRow.jsx';

export default function PlanScreen() {
  const navigate = useNavigate();
  const sessions = useTrainingStore(s => s.sessions);
  const phases = Plan.getPhases();
  const totalWeeks = phases.reduce((m, p) => Math.max(m, p.weekEnd || 0), 0);
  const currentWeek = Plan.currentWeekNumber();

  const weeks = [];
  phases.forEach(p => (p.weeks || []).forEach(w => weeks.push({ ...w, phaseId: p.id, phaseTitle: p.title })));

  const [selNum, setSelNum] = useState(currentWeek || (weeks[0] && weeks[0].num) || 1);
  const sel = weeks.find(w => w.num === selNum) || weeks[0] || null;
  const selRef = useRef(null);
  useEffect(() => {
    if (selRef.current) selRef.current.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, []);

  const weekProgress = (w) => {
    const total = w.sessions.length;
    let done = 0;
    w.sessions.forEach((_, i) => {
      const k = sessionKey(w.phaseId, w.num, i);
      if (sessions[k] && sessions[k].completed) done++;
    });
    return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
  };

  return (
    <>
      <h1 className="h1">Your plan</h1>
      <p className="sub">
        {totalWeeks
          ? `A ${totalWeeks}-week block${currentWeek ? ` · week ${currentWeek} now` : ''} — tap a week to see its sessions.`
          : 'Your training block.'}
      </p>

      {weeks.length > 0 && (
        <>
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
                  <span className="wk-chip-tag">{w.taper ? 'Taper' : w.deload ? 'Deload' : isCur ? 'Now' : ''}</span>
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
                {(sel.taper || sel.deload) && <span className="wk-deload">{sel.taper ? 'Taper' : 'Deload'}</span>}
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
                  const k = sessionKey(sel.phaseId, sel.num, i);
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
