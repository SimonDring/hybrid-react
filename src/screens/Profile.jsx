/**
 * Profile screen — READ-ONLY view of everything that informs the plan.
 *
 * This is the human-readable mirror of what the AI coach sees: baseline,
 * ranked goals, active injuries, and a snapshot of the active plan. It is
 * intentionally NOT editable here — details are captured during onboarding
 * (Stage B) and changes flow through the AI coach (Stage 5), not manual edits.
 *
 * App, account, and wearable integration live behind the cogwheel (Settings),
 * reachable from the TopBar on this top-level screen and the link at the bottom.
 *
 * Data source: users.profile (name/age/height/weight/goals) + the injuries
 * table + the plan template, all via the store. No separate localStorage keys.
 */

import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { computePaces } from '../lib/plan/running.js';

// Label maps for codes captured during onboarding (kept human-readable here).
const FOCUS_LABELS = {
  run: 'Running', swim: 'Swimming', cycle: 'Cycling', triathlon: 'Triathlon',
  gym: 'Gym',
  strength_functional: 'Gym — functional', strength_physique: 'Gym — bodybuilding',
  general_health: 'Functional fitness'
};
const RUN_DIST_LABELS = { '5k': '5K', '10k': '10K', half: 'Half-marathon', marathon: 'Marathon' };
const STYLE_LABELS = { strength: 'Strength / power', bodybuilding: 'Muscle & physique', functional: 'Functional fitness' };
const LEVEL_LABELS = {
  beginner: 'Beginner', returning: 'Returning', intermediate: 'Intermediate', advanced: 'Advanced'
};
const ACCESS_LABELS = {
  full_gym: 'Full gym', home_weights: 'Home weights', pool: 'Pool',
  bike: 'Bike / turbo', open_water: 'Open water', none: 'No equipment'
};

// Read-only labelled value. Shows a muted placeholder when not set yet.
function Stat({ label, value, suffix }) {
  const has = value !== '' && value != null;
  return (
    <div>
      <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 3 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: has ? 'var(--txt-strong)' : 'var(--txt-muted)' }}>
        {has ? value : '—'}
        {has && suffix && <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 3 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{
      padding: '14px 16px', background: 'var(--bg-surface)',
      border: '1px solid var(--hairline)', borderRadius: 14, marginBottom: 12
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.5, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function Empty({ children }) {
  return <div style={{ fontSize: 13, color: 'var(--txt-muted)', fontStyle: 'italic' }}>{children}</div>;
}

function LinkRow({ title, sub, badge, onClick }) {
  return (
    <button className="link-row" onClick={onClick}>
      <div className="lr-body">
        <div className="lr-title">{title}</div>
        <div className="lr-sub">{sub}</div>
      </div>
      {badge && <span className="lr-badge">{badge}</span>}
      <svg className="lr-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const profile  = useTrainingStore(s => s.profile);
  const injuries = useTrainingStore(s => s.injuries);
  const sessions = useTrainingStore(s => s.sessions);

  const goals = profile.goals || [];
  const focus = profile.focus || [];
  const experience = profile.experience || {};
  const availability = profile.availability || {};
  const access = profile.access || [];

  // Structured run/swim goals → human-readable targets (incl. predicted time).
  const runGoal = profile.run_goal;
  const swimGoal = profile.swim_goal;
  const runLevel = experience.run || experience.triathlon || 'beginner';
  const runPrediction = runGoal && runGoal.distance
    ? computePaces(runGoal.distance, runGoal.current, runLevel, runGoal.target_time) : null;
  const hasGoalTargets = (runGoal && runGoal.distance) || (swimGoal && swimGoal.distance_m);
  const hasTraining = focus.length > 0 || availability.days_per_week != null || access.length > 0;
  const activeInjuries = injuries.filter(i => i.status === 'active' || i.status === 'rehabbing' || i.status === 'monitoring');

  // Plan snapshot (read-only) — completed count + what's up next.
  const completedCount = Object.values(sessions).filter(s => s && s.completed).length;
  const next = Plan.findNextSession(sessions);
  const phaseCount = Plan.getPhases().length;
  const totalWeeks = Plan.getPhases().reduce((m, p) => Math.max(m, p.weekEnd || 0), 0);
  const startDate = Plan.getStartDate();
  const currentWeek = Plan.currentWeekNumber();
  const startLabel = startDate
    ? startDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const hasBaseline = [profile.name, profile.age, profile.height_cm, profile.bodyweight_kg]
    .some(v => v !== '' && v != null);

  return (
    <>
      <h1 className="h1" style={{ marginBottom: 4 }}>Profile</h1>
      <p className="sub">
        What your coach knows about you and your plan. This updates from your data and the
        AI coach — there's nothing to edit here.
      </p>

      {/* Baseline */}
      <div className="h3">You</div>
      <Card title="BASELINE">
        {hasBaseline ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px' }}>
            <Stat label="Name" value={profile.name || ''} />
            <Stat label="Age" value={profile.age} suffix="yrs" />
            <Stat label="Height" value={profile.height_cm} suffix="cm" />
            <Stat label="Weight" value={profile.bodyweight_kg} suffix="kg" />
          </div>
        ) : (
          <Empty>Your details will be captured when you set up your plan.</Empty>
        )}
      </Card>

      {/* Goals */}
      <div className="h3">Goals</div>
      {hasGoalTargets && (
        <Card title="GOAL TARGETS">
          <div style={{ display: 'grid', gap: 10 }}>
            {runGoal && runGoal.distance && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt-strong)' }}>
                  🏃 {RUN_DIST_LABELS[runGoal.distance] || runGoal.distance}
                  {runGoal.target_date && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--txt-muted)', marginLeft: 6 }}>by {runGoal.target_date}</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginTop: 2 }}>
                  {runPrediction && runPrediction.goalPrediction
                    ? `${runPrediction.isTarget ? 'Target' : runPrediction.estimated ? 'Estimated' : 'Projected'} ${runPrediction.goalPrediction} · goal ${runPrediction.paces.goal}/km · easy ${runPrediction.paces.easy}/km`
                    : 'Pace targets set from your training'}
                </div>
              </div>
            )}
            {swimGoal && swimGoal.distance_m && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt-strong)' }}>
                  🏊 {swimGoal.distance_m} m continuous
                  {swimGoal.target_date && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--txt-muted)', marginLeft: 6 }}>by {swimGoal.target_date}</span>}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
      {(goals.length > 0 || !hasGoalTargets) && (
        <Card title={hasGoalTargets ? 'OTHER GOALS' : 'RANKED BY PRIORITY'}>
          {goals.length > 0 ? (
            goals.map((g, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: i === goals.length - 1 ? 0 : 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--txt-muted)' }}>{g.rank ?? i + 1}.</span>
                <span style={{ fontSize: 14, color: 'var(--txt-strong)', flex: 1 }}>{g.label || '—'}</span>
                {g.target_date && <span style={{ fontSize: 11, color: 'var(--txt-muted)' }}>{g.target_date}</span>}
              </div>
            ))
          ) : (
            <Empty>No goals set yet — these come from your setup, then the coach refines them.</Empty>
          )}
        </Card>
      )}

      {/* Training context (captured at onboarding) */}
      <div className="h3">Training</div>
      <Card title="FOCUS & AVAILABILITY">
        {hasTraining ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {focus.length > 0 && (
              <div>
                <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 5 }}>FOCUS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {focus.map(k => (
                    <span key={k} style={{
                      fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 100,
                      background: 'var(--bg-surface-2)', color: 'var(--txt-strong)'
                    }}>
                      {FOCUS_LABELS[k] || k}{experience[k] ? ` · ${LEVEL_LABELS[experience[k]] || experience[k]}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px' }}>
              {availability.days_per_week != null && <Stat label="Days / week" value={availability.days_per_week} />}
              {availability.session_minutes != null && <Stat label="Session" value={availability.session_minutes === 90 ? '90+' : availability.session_minutes} suffix="min" />}
            </div>
            {access.length > 0 && (
              <div>
                <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 5 }}>ACCESS</div>
                <div style={{ fontSize: 13, color: 'var(--txt-strong)' }}>
                  {access.map(k => ACCESS_LABELS[k] || k).join(' · ')}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Empty>Captured when you set up your plan.</Empty>
        )}
      </Card>

      {/* Plan snapshot */}
      <div className="h3">Your plan</div>
      <Card title="SNAPSHOT">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px', marginBottom: next ? 12 : 0 }}>
          <Stat label="Phases" value={phaseCount} />
          {totalWeeks > 0 && <Stat label="Plan length" value={totalWeeks} suffix="wks" />}
          {currentWeek != null && <Stat label="Current week" value={currentWeek} />}
          <Stat label="Sessions done" value={completedCount} />
          {startLabel && <Stat label="Started" value={startLabel} />}
        </div>
        {next && (
          <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 10 }}>
            <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 3 }}>UP NEXT</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt-strong)' }}>{next.session.title}</div>
            <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginTop: 2 }}>
              {next.phase.title} · Week {next.week.num}
            </div>
          </div>
        )}
      </Card>

      {/* Injuries (read-only summary) */}
      <div className="h3">Health</div>
      <div className="link-list" style={{ marginBottom: 22 }}>
        <LinkRow
          title={activeInjuries.length === 0 ? 'No active injuries' : `${activeInjuries.length} active ${activeInjuries.length === 1 ? 'injury' : 'injuries'}`}
          sub={activeInjuries.length === 0
            ? 'View your injury history'
            : activeInjuries.map(i => i.title || i.body_part).filter(Boolean).join(' · ')}
          badge={activeInjuries.length ? `${activeInjuries.length} active` : null}
          onClick={() => navigate('/tracking/injuries')}
        />
      </div>

      {/* Reviews + settings */}
      <div className="h3">More</div>
      <div className="link-list">
        <LinkRow
          title="Quarterly review"
          sub="AI assessment of your progress (coming soon)"
          onClick={() => navigate('/profile/review')}
        />
        <LinkRow
          title="Settings & integrations"
          sub="Appearance, wearables, data, account"
          onClick={() => navigate('/settings')}
        />
      </div>
    </>
  );
}
