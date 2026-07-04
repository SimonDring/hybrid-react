import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import * as Utils from '@performance-os/engine/lib/Utils.js';
import { activityFor } from '../data/activityTypes.js';
import ExerciseInfo from '../components/ExerciseInfo.jsx';
import { clearChecked } from '../lib/SessionProgress.js';
import { trackedLiftsInSession } from '@performance-os/engine';

// The single prescription string shown in the compact preview row — sets×reps for
// strength ("4 × 5"), distance/target for run/swim/cycle. Weight & RPE are
// deliberately omitted from the preview; they appear set-by-set in the runner.
function prescriptionFor(item) {
  const act = activityFor(item);
  if (act.key === 'strength') return item.sets || '';
  const emph = act.columns.find(c => c.emphasis);
  return (emph ? emph.accessor(item) : (item.distance || item.sets)) || '';
}

function SessionPhysiology({ state, candidates, onUnlink, onLink }) {
  if (!state || !state.completed) return null;
  const hasHr = state.avgHr != null || state.maxHr != null;
  const z = state.hrZones;
  const lw = state.linkedWorkout;
  const zoneMax = z ? Math.max(z.z1, z.z2, z.z3, z.z4, z.z5, 1) : 1;
  const ZONES = [['z1','Z1','--moss'],['z2','Z2','--moss'],['z3','Z3','--ochre'],['z4','Z4','--rust'],['z5','Z5','--rust']];

  return (
    <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 12, border: '1px solid var(--hairline)', background: 'var(--bg-surface)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)', marginBottom: 8 }}>Your session</div>

      {!hasHr && (
        <div style={{ fontSize: 12, color: 'var(--txt-muted)' }}>No HR data for this session yet.</div>
      )}

      {hasHr && (
        <div style={{ display: 'flex', gap: 18, marginBottom: z ? 12 : 0 }}>
          <div><div style={{ fontSize: 11, color: 'var(--txt-muted)' }}>Avg HR</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt-strong)' }}>{state.avgHr ?? '—'}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--txt-muted)' }}>Max HR</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt-strong)' }}>{state.maxHr ?? '—'}</div></div>
          {state.calories != null && <div><div style={{ fontSize: 11, color: 'var(--txt-muted)' }}>Calories</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt-strong)' }}>{Math.round(state.calories)}</div></div>}
        </div>
      )}

      {z && (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 56 }}>
            {ZONES.map(([k, label, col]) => (
              <div key={k} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: `${(z[k] / zoneMax) * 44}px`, background: `var(${col})`, borderRadius: 4, minHeight: 2 }} />
                <div style={{ fontSize: 9, color: 'var(--txt-muted)', marginTop: 3 }}>{label}</div>
                <div style={{ fontSize: 9, color: 'var(--txt-muted)' }}>{z[k]}m</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--txt-muted)', marginTop: 6 }}>Zones estimated from your resting & max HR.</div>
        </div>
      )}

      {lw ? (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--txt-body)' }}>
          Linked Strava {lw.type}{lw.distance_m ? ` · ${(lw.distance_m / 1000).toFixed(2)} km` : ''}
          {' · '}
          <button onClick={() => onUnlink(lw.id)} style={{ background: 'none', border: 'none', color: 'var(--rust)', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 11 }}>unlink</button>
        </div>
      ) : candidates.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginBottom: 4 }}>Link a Strava workout from this day:</div>
          {candidates.map(w => (
            <button key={w.id} onClick={() => onLink(w.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: '1px solid var(--hairline)', borderRadius: 8, padding: '6px 10px', marginTop: 4, color: 'var(--txt-body)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              {w.type}{w.distance_m ? ` · ${(w.distance_m / 1000).toFixed(2)} km` : ''}{w.start_time ? ` · ${new Date(w.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SessionDetail() {
  const { phaseId, weekNum, sessionIdx } = useParams();
  const sessions = useTrainingStore(state => state.sessions);
  const startSession = useTrainingStore(state => state.startSession);
  const completeSession = useTrainingStore(state => state.completeSession);
  const uncompleteSession = useTrainingStore(state => state.uncompleteSession);
  const cancelSession = useTrainingStore(state => state.cancelSession);
  const logLiftSets = useTrainingStore(state => state.logLiftSets);
  const setLogsBySession = useTrainingStore(state => state.setLogsBySession);
  const unlinkWorkoutFromSession = useTrainingStore(s => s.unlinkWorkoutFromSession);
  const linkWorkoutToSession     = useTrainingStore(s => s.linkWorkoutToSession);
  const allWorkouts              = useTrainingStore(s => s.workouts);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showForm, setShowForm] = useState(false);
  const [ratings, setRatings] = useState({ quality: null, energy: null, recovery: null });
  const [notes, setNotes] = useState('');
  const [infoItem, setInfoItem] = useState(null); // exercise tapped for the form guide
  const [injuryBannerOpen, setInjuryBannerOpen] = useState(false);

  const phase = Plan.getPhase(Number(phaseId));
  const week = phase ? phase.weeks.find(w => w.num === Number(weekNum)) : null;
  const session = week ? week.sessions[Number(sessionIdx)] : null;
  const key = Utils.weekKey(Number(phaseId), Number(weekNum), Number(sessionIdx));
  const state = sessions[key];

  useEffect(() => {
    setShowForm(false);
    setRatings({ quality: null, energy: null, recovery: null });
    setNotes('');
  }, [key]);

  // The runner sends the athlete back here with ?finish=1 when the last set is done —
  // open the rating form straight away so completion is one tap, not a hunt.
  useEffect(() => {
    if (searchParams.get('finish') === '1' && state && state.started && !state.completed) {
      setShowForm(true);
    }
  }, [searchParams, state]);

  if (!session) return <div style={{ padding: 24 }}>Session not found</div>;

  // Main barbell lifts in this session whose top set drives progression. The runner
  // logs every set, so progression is derived from that real data (topLoggedSet) —
  // there's no manual top-set entry to re-key.
  const trackedLifts = trackedLiftsInSession(session);

  // completed/started come epoch-gated from the store view, so a stale row left over
  // from a previous plan reads as fresh (offers Start) instead of done/in-progress.
  const isDone = state && state.completed;
  const isStarted = state && state.started;

  const runnerPath = `/phases/${phaseId}/weeks/${weekNum}/sessions/${sessionIdx}/run`;

  // Start freezes the session (pin-on-start in the store) then opens the focused
  // set-by-set runner. Resume re-enters the runner for an already-started session.
  const handleStart = () => { startSession(key); navigate(runnerPath); };
  const handleResume = () => navigate(runnerPath);

  const handleCancel = () => {
    if (!confirm('Started this by mistake? This clears the start time and resets it to not started. Your logged sets will be cleared.')) return;
    cancelSession(key);
    clearChecked(key);
  };

  // The heaviest working set this session logged for a tracked lift (tiebreak: most
  // reps). The runner records every set, so we derive progression from real data
  // rather than asking the athlete to re-enter their top set.
  const topLoggedSet = (l) => {
    const rows = (state && setLogsBySession[state.id]) || [];
    const matches = rows.filter(r =>
      !r.is_primer && r.actual_weight != null && r.actual_rpe != null &&
      (r.exercise_key === l.key || r.exercise_name === l.name)
    );
    if (!matches.length) return null;
    matches.sort((a, b) => (b.actual_weight - a.actual_weight) || ((b.actual_reps || 0) - (a.actual_reps || 0)));
    const t = matches[0];
    return { key: l.key, weight: Number(t.actual_weight), reps: t.actual_reps || l.reps, rpe: Number(t.actual_rpe), targetRpe: l.targetRpe, factor: l.factor };
  };

  const handleSubmit = () => {
    // Autoregulate next week's weights from the sets the runner actually logged
    // (heaviest working set per tracked lift). OPTIONAL — never blocks completion
    // (writes locally first, syncs in the background, logs its own errors). A session
    // completed without logging any sets simply doesn't adjust weights — no data to
    // learn from — which is the right behaviour.
    const sets = trackedLifts.map(topLoggedSet).filter(Boolean);
    if (sets.length) Promise.resolve(logLiftSets(sets)).catch(e => console.error('Top-set log failed (continuing):', e));

    // Completion is the primary action — fire and close the form immediately. The
    // store writes localStorage synchronously and syncs to Supabase in the
    // background, so the UI never waits on (or is blocked by) the network.
    Promise.resolve(completeSession(key, {
      quality: ratings.quality,
      energy: ratings.energy,
      recovery: ratings.recovery,
      notes
    })).catch(e => console.error('Complete session failed:', e));

    clearChecked(key);
    setShowForm(false);
    setRatings({ quality: null, energy: null, recovery: null });
    setNotes('');
  };

  const handleUncomplete = () => {
    if (confirm('Mark this session as incomplete? This resets it to "not started" and removes your ratings.')) {
      uncompleteSession(key);
      clearChecked(key);
    }
  };

  return (
    <>
      <div className="eyebrow">Phase {phase.id} · Week {week.num}</div>
      <h1 className="h1" style={{ fontSize: 24, marginBottom: 2 }}>{session.title}</h1>
      <p className="sub" style={{ marginBottom: 20 }}>
        {session.duration}
        {session._trainNow && (
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'rgba(111,211,196,0.12)', borderRadius: 6, padding: '2px 7px' }}>
            ADAPTED
          </span>
        )}
      </p>

      {/* Injury modification banner */}
      {session.injuryBanner && (
        <button
          onClick={() => setInjuryBannerOpen(o => !o)}
          style={{
            width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
            background: 'none', border: 'none', padding: 0, marginBottom: 16
          }}
        >
          <div style={{
            borderLeft: '3px solid var(--ochre)', background: 'rgba(200,154,58,0.08)',
            borderRadius: '0 10px 10px 0', padding: '10px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ochre)' }}>
                {session.injuryBanner.fullReplacement ? 'Rehab session' : 'Modified for injury'}
              </div>
              <span style={{ fontSize: 11, color: 'var(--ochre)', opacity: 0.7 }}>
                {injuryBannerOpen ? '▲' : '▼'}
              </span>
            </div>
            {injuryBannerOpen && (
              <div style={{ fontSize: 12, color: 'var(--txt-body)', lineHeight: 1.6, marginTop: 6 }}>
                {session.injuryBanner.message}.
                {!session.injuryBanner.fullReplacement && session.injuryBanner.blockedCount > 0 && (
                  <> {session.injuryBanner.blockedCount} exercise{session.injuryBanner.blockedCount !== 1 ? 's' : ''} that load this area have been removed and replaced with rehab exercises.</>
                )}
                {session.injuryBanner.phase && (
                  <> Current phase: <strong>{session.injuryBanner.phase}</strong>.</>
                )}
              </div>
            )}
          </div>
        </button>
      )}

      {/* Session preview — two bordered SECTION cards (Primer = teal, Main = neutral),
          each a compact one-line-per-exercise list: name + a single prescription
          badge (sets×reps for strength, distance/target for run/swim). Weight, RPE and
          cues are deliberately NOT here — they appear set-by-set in the runner. */}
      {(() => {
        const visible = session.items.filter(it => !it.substituted);
        const SECTIONS = [
          { key: 'primer', label: 'Primer', sub: 'prime the main lifts' },
          { key: 'main',   label: 'Main',   sub: null }
        ];
        const sectionOf = (it) => (it.section === 'primer' ? 'primer' : 'main');

        return SECTIONS
          .map(sec => ({ sec, rows: visible.filter(it => sectionOf(it) === sec.key) }))
          .filter(({ rows }) => rows.length)
          .map(({ sec, rows }) => (
            <div className={`section-card ${sec.key}`} key={sec.key}>
              <div className="sc-head">
                <span className="sc-label">{sec.label}</span>
                {sec.sub && <span className="sc-sub">{sec.sub}</span>}
                {sec.key === 'primer' && <span className="sc-tag">circuit</span>}
              </div>
              {rows.map((item, i) => (
                <div className="sx-row" key={i}>
                  <span className="sx-num" style={item.superset ? { color: 'var(--accent)' } : undefined}>{item.num}</span>
                  <div className="sx-main">
                    <span className="sx-name">{item.name}</span>
                    <button
                      className="sx-info"
                      aria-label={`How to do ${item.name}`}
                      onClick={() => setInfoItem(item)}
                    >ⓘ</button>
                    {item.rehab && <span className="sx-tag rehab">Rehab</span>}
                    {item.prevention && <span className="sx-tag prev">Prev</span>}
                  </div>
                  <span className="sx-badge">{prescriptionFor(item)}</span>
                </div>
              ))}
            </div>
          ));
      })()}

      {/* Completion state */}
      {isDone && (
        <>
          <div className="callout green" style={{ marginTop: 20 }}>
            <strong>Completed</strong>
            {state.completedAt && (
              <div style={{ fontSize: 12, marginTop: 2, opacity: 0.7 }}>
                {new Date(state.completedAt).toLocaleString()}
              </div>
            )}
            {state.quality != null && (
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{state.quality}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.08em' }}>QUALITY</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{state.energy}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.08em' }}>ENERGY</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{state.recovery}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.08em' }}>RECOVERY</div>
                </div>
              </div>
            )}
            {state.notes && (
              <div style={{ fontSize: 13, marginTop: 10, fontStyle: 'italic', opacity: 0.8 }}>
                "{state.notes}"
              </div>
            )}
          </div>
          <button
            className="btn-secondary"
            style={{ marginTop: 10, width: '100%' }}
            onClick={handleUncomplete}
          >
            Mark as incomplete
          </button>
          {isDone && (() => {
            const day = (state.completedAt || '').split('T')[0];
            const candidates = (allWorkouts || []).filter(w =>
              !w.session_id && day && (w.start_time || '').split('T')[0] === day
            );
            return (
              <SessionPhysiology
                state={state}
                candidates={candidates}
                onUnlink={(workoutId) => unlinkWorkoutFromSession(workoutId, state.id)}
                onLink={(workoutId) => linkWorkoutToSession(workoutId, state.id)}
              />
            );
          })()}
        </>
      )}

      {/* Rating form */}
      {!isDone && showForm && (
        <div className="form-card" style={{ marginTop: 20 }}>
          <div className="h3" style={{ marginTop: 0, marginBottom: 16 }}>Rate this session</div>

          {[
            { key: 'quality', label: 'Session quality', hint: '1 = terrible · 5 = excellent' },
            { key: 'energy', label: 'Energy coming in', hint: '1 = exhausted · 5 = fresh' },
            { key: 'recovery', label: 'Recovery feeling', hint: '1 = wrecked · 5 = fully recovered' }
          ].map(({ key: rk, label, hint }) => (
            <div key={rk} className="form-row" style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>
                {label}
                <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 8, fontWeight: 400 }}>{hint}</span>
              </label>
              <div className="rating-row">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    className={`rating-btn ${ratings[rk] === n ? 'active' : ''}`}
                    onClick={() => setRatings(prev => ({ ...prev, [rk]: n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="form-row" style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Notes (optional)</label>
            <textarea
              rows={3}
              placeholder="What went well? What didn't? Any technique cues to remember?"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <button className="btn-primary" style={{ width: '100%' }} onClick={handleSubmit}>
            Save & complete
          </button>
          <button
            className="btn-secondary"
            style={{ marginTop: 8, width: '100%' }}
            onClick={() => setShowForm(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Start / complete buttons */}
      {!isDone && !showForm && (
        <>
          {!isStarted && (
            <button
              className="btn-primary"
              style={{ marginTop: 20, width: '100%' }}
              onClick={handleStart}
            >
              Start session
            </button>
          )}
          {isStarted && (
            <>
              <div className="session-live" style={{ marginTop: 20 }}>
                <div className="sl-head">
                  <span className="sl-progress">In progress</span>
                  {state.startedAt && (
                    <span className="sl-started">Started {new Date(state.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>
              </div>
              <button
                className="btn-primary"
                style={{ marginTop: 12, width: '100%' }}
                onClick={handleResume}
              >
                Resume session
              </button>
              <button
                className="btn-secondary"
                style={{ marginTop: 8, width: '100%' }}
                onClick={() => setShowForm(true)}
              >
                Complete session
              </button>
              <button
                className="btn-text"
                style={{ marginTop: 8, width: '100%' }}
                onClick={handleCancel}
              >
                Started by mistake? Cancel
              </button>
            </>
          )}
        </>
      )}

      {infoItem && (
        <ExerciseInfo
          name={infoItem.name}
          focus={session.title}
          fallbackCue={infoItem.note || infoItem.cue}
          onClose={() => setInfoItem(null)}
        />
      )}
    </>
  );
}
