/**
 * WeekSchedule — the current plan week as a horizontally scrollable strip of
 * day-cards for the home screen. Each card shows its weekday + date and the
 * session(s) due that day (discipline colour, focus, duration + status), or
 * "Rest". Today is highlighted and auto-centred; the recommended next session is
 * ringed and tagged "Up next".
 *
 * Data comes from PlanService.buildCalendar (dated/generated plans only) — returns
 * null for legacy plans with no start date, so Home falls back to its next-session
 * card.
 */

import { useRef, useEffect } from 'react';
import { buildCalendar, localISO, recommendedSession } from '../lib/PlanService.js';

const DISC_COLOR = {
  gym: 'var(--disc-gym)', run: 'var(--disc-run)', swim: 'var(--disc-swim)',
  cycle: 'var(--disc-cycle)', brick: 'var(--disc-brick)', general: 'var(--disc-general)'
};
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const stripDay = (title) => (title || '').replace(/^[A-Za-z]+\s·\s/, '');

// Monday of the week containing `d` (local, midnight).
function mondayOf(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export default function WeekSchedule({ sessions, onOpen }) {
  const cal = buildCalendar(sessions);
  const todayRef = useRef(null);

  // Centre today within the strip on mount (horizontal only — never jump the page).
  useEffect(() => {
    if (todayRef.current) todayRef.current.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, []);

  if (!cal) return null;

  const todayISO = localISO(new Date());
  const rec = recommendedSession(sessions);
  const recKey = rec && rec.key;

  const monday = mondayOf(new Date());
  const days = [];
  for (let i = 0; i < 7; i++) { const d = new Date(monday); d.setDate(monday.getDate() + i); days.push(d); }

  return (
    <div className="weeksched">
      <div className="weeksched-head">This week</div>
      <div className="ws-strip">
        {days.map(d => {
          const iso = localISO(d);
          const entries = cal.byDate[iso] || [];
          const isToday = iso === todayISO;
          const hasUpNext = entries.some(e => recKey && e.key === recKey && !e.completed && !e.skipped);
          return (
            <div key={iso} ref={isToday ? todayRef : null}
              className={`ws-card${isToday ? ' today' : ''}${hasUpNext ? ' upnext' : ''}`}>
              <div className="ws-card-head">
                <span className="ws-dow">{DOW[d.getDay()]}</span>
                <span className="ws-dom">{d.getDate()}</span>
              </div>
              <div className="ws-card-body">
                {entries.length === 0
                  ? <span className="ws-rest">Rest</span>
                  : entries.map(e => {
                      const up = recKey && e.key === recKey && !e.completed && !e.skipped;
                      const meta = e.completed ? 'Done' : e.skipped ? 'Missed' : up ? 'Next' : (e.duration || '').replace(/^~/, '').replace(' min', 'm');
                      return (
                        <button key={e.key} onClick={() => onOpen(e)}
                          className={`ws-chip${e.completed ? ' done' : ''}${e.skipped ? ' missed' : ''}${up ? ' up' : ''}`}
                          style={{ '--disc': DISC_COLOR[e.discipline] || 'var(--disc-general)' }}>
                          <span className="ws-chip-title">{stripDay(e.title)}</span>
                          <span className="ws-chip-meta">{meta}</span>
                        </button>
                      );
                    })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
