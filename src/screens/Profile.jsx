/**
 * Profile — a tight Midnight snapshot of you + your plan, with your strength GOALS
 * surfaced prominently (they drive Progress), plus the single path to Settings.
 * Read-only: details come from onboarding; rebuild via Settings → Clear plan.
 */

import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { liftGoal } from '../lib/goals.js';

const STYLE_LABELS = { strength: 'Get stronger', bodybuilding: 'Build muscle', functional: 'Functional fitness' };
const SPORT_LABELS = { run: 'Running', cycle: 'Cycling', swim: 'Swimming' };
const LEVEL_LABELS = { beginner: 'Beginner', returning: 'Returning', intermediate: 'Intermediate', advanced: 'Advanced' };
const ACCESS_LABELS = { full_gym: 'Full gym', home_weights: 'Home / free weights', none: 'Bodyweight only' };
const PILL = { on_track: 'On track', building: 'Building', behind: 'Behind', nodata: '—' };

function Stat({ label, value, suffix }) {
  const has = value !== '' && value != null;
  return (
    <div>
      <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 3 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: has ? 'var(--txt-strong)' : 'var(--txt-muted)' }}>
        {has ? value : '—'}{has && suffix && <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 3 }}>{suffix}</span>}
      </div>
    </div>
  );
}
function Card({ title, children }) {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-lg)', marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', color: 'var(--txt-muted)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
function Empty({ children }) {
  return <div style={{ fontSize: 13, color: 'var(--txt-muted)', fontStyle: 'italic' }}>{children}</div>;
}

export default function Profile() {
  const navigate = useNavigate();
  const profile = useTrainingStore(s => s.profile);
  const injuries = useTrainingStore(s => s.injuries);
  const sessions = useTrainingStore(s => s.sessions);

  const experience = profile.experience || {};
  const availability = profile.availability || {};
  const access = profile.access || [];

  const goalText = profile.goal_type === 'sport'
    ? `Support ${SPORT_LABELS[profile.sport] || profile.sport || 'sport'}`
    : (STYLE_LABELS[profile.strength_style] || '—');
  const level = experience.gym || experience.strength_functional || experience.strength_physique;

  const completedCount = Object.values(sessions).filter(s => s && s.completed).length;
  const next = Plan.findNextSession(sessions);
  const totalWeeks = Plan.getPhases().reduce((m, p) => Math.max(m, p.weekEnd || 0), 0);
  const currentWeek = Plan.currentWeekNumber();
  const activeInjuries = injuries.filter(i => ['active', 'rehabbing', 'monitoring'].includes(i.status));
  const hasBaseline = [profile.name, profile.age, profile.bodyweight_kg].some(v => v !== '' && v != null);
  const liftGoals = ['squat', 'bench', 'deadlift'].map(k => liftGoal(k, profile));
  const haveLiftData = liftGoals.some(g => g.status !== 'nodata');

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 className="h1" style={{ marginBottom: 0 }}>Profile</h1>
        <button className="btn-icon" aria-label="Settings" onClick={() => navigate('/settings')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>
      <p className="sub">Your setup, goals and plan — captured at onboarding. Rebuild it in Settings.</p>

      <Card title="YOU">
        {hasBaseline ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px' }}>
            <Stat label="Name" value={profile.name || ''} />
            <Stat label="Age" value={profile.age} suffix="yrs" />
            <Stat label="Bodyweight" value={profile.bodyweight_kg} suffix="kg" />
          </div>
        ) : <Empty>Captured when you set up your plan.</Empty>}
      </Card>

      <Card title="STRENGTH GOALS">
        {haveLiftData ? (
          <>
            <div className="goal-rows">
              {liftGoals.map(g => (
                <div key={g.key} className="goal-row">
                  <div className="goal-row-head">
                    <span className="grw-name">{g.label}</span>
                    <span className={`grw-pill ${g.status}`}>{g.mode === 'target' ? 'Your target' : PILL[g.status]}</span>
                  </div>
                  <div className="grw-sub">
                    <span>{g.current != null ? `${g.current} kg` : 'Log a set'}</span>
                    <span>{g.target ? `Target ${g.target} kg` : ''}{g.sub ? `${g.target ? ' · ' : ''}${g.sub}` : ''}</span>
                  </div>
                  {g.pct != null && <div className="grw-bar"><span style={{ width: `${g.pct}%`, background: g.color }} /></div>}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 10, lineHeight: 1.45 }}>
              Targets auto-set from strength standards for your bodyweight. Custom targets coming soon.
            </div>
          </>
        ) : <Empty>Log a top set after a main lift and your strength goals appear here.</Empty>}
      </Card>

      <Card title="TRAINING">
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 5 }}>GOAL</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt-strong)' }}>{goalText}{level ? ` · ${LEVEL_LABELS[level] || level}` : ''}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px' }}>
            {availability.days_per_week != null && <Stat label="Days / week" value={availability.days_per_week} />}
            {availability.session_minutes != null && <Stat label="Session" value={availability.session_minutes === 90 ? '90+' : availability.session_minutes} suffix="min" />}
            {access.length > 0 && <Stat label="Equipment" value={ACCESS_LABELS[access[0]] || access[0]} />}
          </div>
        </div>
      </Card>

      <Card title="PLAN">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px', marginBottom: next ? 12 : 0 }}>
          {totalWeeks > 0 && <Stat label="Block" value={totalWeeks} suffix="wks" />}
          {currentWeek != null && <Stat label="Current week" value={currentWeek} />}
          <Stat label="Sessions done" value={completedCount} />
        </div>
        {next && (
          <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 10 }}>
            <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 3 }}>UP NEXT</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt-strong)' }}>{next.session.title}</div>
            <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginTop: 2 }}>{next.phase.title} · Week {next.week.num}</div>
          </div>
        )}
        <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 10, marginTop: 10 }}>
          <button onClick={() => navigate('/tracking/injuries')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}>
            <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 2 }}>INJURIES</div>
            <div style={{ fontSize: 13, color: activeInjuries.length > 0 ? 'var(--status-strain)' : 'var(--txt-muted)' }}>
              {activeInjuries.length === 0 ? 'None active' : `${activeInjuries.length} active — ${activeInjuries.map(i => i.title || i.body_part).filter(Boolean).join(', ')}`}
            </div>
          </button>
        </div>
      </Card>
    </>
  );
}
