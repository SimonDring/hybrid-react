// src/components/ui/SessionRow.jsx
// A single session as a compact row: discipline accent, focus title, day + duration,
// and a status affordance (done / started / chevron). Used by the Program week panel.
import * as Plan from '../../lib/PlanService.js';

const DISC = {
  gym: 'var(--disc-gym)', run: 'var(--disc-run)', swim: 'var(--disc-swim)',
  cycle: 'var(--disc-cycle)', brick: 'var(--disc-brick)', general: 'var(--disc-general)'
};

export default function SessionRow({ session, done, started, onClick }) {
  const disc = Plan.sessionDiscipline(session) || 'gym';
  const color = DISC[disc] || DISC.general;
  const parts = (session.title || '').split('·');
  const focus = parts.slice(1).join('·').trim() || session.title || 'Session';
  const day = parts[0].trim();
  const dur = session.duration ? session.duration.split('·')[0].trim() : '';

  return (
    <button className={`session-row${done ? ' done' : ''}`} onClick={onClick}>
      <span className="sr-accent" style={{ background: color }} />
      <span className="sr-body">
        <span className="sr-title">{focus}</span>
        <span className="sr-meta">{day}{dur ? ` · ${dur}` : ''}</span>
      </span>
      {done
        ? <span className="sr-check" aria-label="done">✓</span>
        : started
          ? <span className="sr-tag">Started</span>
          : <svg className="sr-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>}
    </button>
  );
}
