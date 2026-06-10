/**
 * TrainingCalendar — a horizontal, scrollable date strip for the home screen.
 *
 * Each day shows its weekday letter + date number, colour-coded dots for the
 * session(s) scheduled that day (filled when completed), and is selectable. The
 * selected day's session shows below as a block you tap anywhere to open. Today
 * is centred on load. Discipline colours: gym green, run rust, swim blue, ride
 * amber, brick purple.
 *
 * Data comes from PlanService.buildCalendar (dated/generated plans only).
 */

import { useState, useRef, useEffect } from 'react';
import { buildCalendar, localISO } from '../lib/PlanService.js';

const DISC_COLOR = { gym: '#5a8a5a', run: '#c2613f', swim: '#3a8fb0', cycle: '#c89a3a', brick: '#9a6fb0', general: '#7a8a6a' };
const DISC_LABEL = { gym: 'Gym', run: 'Run', swim: 'Swim', cycle: 'Ride', brick: 'Brick', general: 'Movement' };
const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const stripDay = (title) => (title || '').replace(/^[A-Za-z]+\s·\s/, '');

function SessionBlock({ s, onOpen }) {
  const color = DISC_COLOR[s.discipline] || '#888';
  const cls = `cal-session${s.completed ? ' done' : ''}${s.skipped ? ' missed' : ''}`;
  return (
    <button className={cls} onClick={() => onOpen(s)} style={{ borderLeftColor: color }}>
      <span className="cal-session-body">
        <span className="cal-session-title">{stripDay(s.title)}</span>
        <span className="cal-session-meta">
          {s.skipped ? 'Missed — tap to redo' : `${DISC_LABEL[s.discipline] || 'Session'} · est. ${(s.duration || '').replace(/^~/, '')}`}
        </span>
      </span>
      {s.completed
        ? <span className="cal-session-check" aria-label="completed">✓</span>
        : s.skipped
          ? <span className="cal-session-tag missed-tag">MISSED</span>
          : <svg className="cal-session-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>}
    </button>
  );
}

export default function TrainingCalendar({ sessions, onOpen }) {
  const cal = buildCalendar(sessions);
  const todayISO = localISO(new Date());
  const [selected, setSelected] = useState(todayISO);
  const todayRef = useRef(null);

  // Centre today on first render.
  useEffect(() => {
    if (todayRef.current) todayRef.current.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, []);

  if (!cal) return null;

  const days = [];
  for (let d = new Date(cal.start); d <= cal.end; d.setDate(d.getDate() + 1)) days.push(new Date(d));

  const todays = cal.byDate[selected] || [];
  const selDate = new Date(selected + 'T00:00:00');
  const isToday = selected === todayISO;
  const heading = isToday ? 'Today' : selDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
  const allDone = todays.length > 0 && todays.every(s => s.completed);

  return (
    <div className="cal cal-card">
      <div className="cal-strip">
        {days.map(d => {
          const iso = localISO(d);
          const entries = cal.byDate[iso] || [];
          const sel = iso === selected;
          const today = iso === todayISO;
          return (
            <button key={iso} ref={today ? todayRef : null}
              className={`cal-cell${sel ? ' sel' : ''}${today ? ' today' : ''}`}
              onClick={() => setSelected(iso)}>
              <span className="cal-dow">{DAY_LETTER[d.getDay()]}</span>
              <span className="cal-dom">{d.getDate()}</span>
              <span className="cal-dots">
                {entries.slice(0, 3).map((e, i) => {
                  const c = DISC_COLOR[e.discipline] || '#888';
                  // completed = solid, missed = hollow ring, upcoming = soft.
                  return <i key={i} style={e.skipped
                    ? { background: 'transparent', boxShadow: `inset 0 0 0 1.5px ${c}`, opacity: 0.6 }
                    : { background: c, opacity: e.completed ? 1 : 0.4 }} />;
                })}
              </span>
            </button>
          );
        })}
      </div>

      <div className="cal-detail">
        <div className={`cal-detail-head${allDone ? ' done' : ''}`}>
          {todays.length === 0
            ? `${heading} · rest day`
            : allDone ? `${heading} · all done ✓` : heading}
        </div>
        {todays.length === 0
          ? <div className="cal-rest">Recovery day — let the work land.</div>
          : todays.map(s => <SessionBlock key={s.key} s={s} onOpen={onOpen} />)}
      </div>
    </div>
  );
}
