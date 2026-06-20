import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import * as Utils from '../lib/Utils.js';
import { activityFor } from '../data/activityTypes.js';
import RestTimer from '../components/RestTimer.jsx';
import ExerciseInfo from '../components/ExerciseInfo.jsx';
import { getChecked, toggleChecked, clearChecked } from '../lib/SessionProgress.js';
import { trackedLiftsInSession } from '../lib/liftProgression.js';

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
  const unlinkWorkoutFromSession = useTrainingStore(s => s.unlinkWorkoutFromSession);
  const linkWorkoutToSession     = useTrainingStore(s => s.linkWorkoutToSession);
  const allWorkouts              = useTrainingStore(s => s.workouts);

  const [showForm, setShowForm] = useState(false);
  const [ratings, setRatings] = useState({ quality: null, energy: null, recovery: null });
  const [notes, setNotes] = useState('');
  const [checked, setChecked] = useState([]);
  const [infoItem, setInfoItem] = useState(null); // exercise tapped for the form guide
  const [injuryBannerOpen, setInjuryBannerOpen] = useState(false);
  const [lifts, setLifts] = useState({}); // top-set log: key → { weight, rpe }
  const [restStart, setRestStart] = useState(null); // { secs, at } — seeds RestTimer on set completion

  const phase = Plan.getPhase(Number(phaseId));
  const week = phase ? phase.weeks.find(w => w.num === Number(weekNum)) : null;
  const session = week ? week.sessions[Number(sessionIdx)] : null;
  const key = Utils.weekKey(Number(phaseId), Number(weekNum), Number(sessionIdx));
  const state = sessions[key];

  useEffect(() => {
    setShowForm(false);
    setRatings({ quality: null, energy: null, recovery: null });
    setNotes('');
    setChecked(getChecked(key));
    setLifts({});
    setRestStart(null);
  }, [key]);

  if (!session) return <div style={{ padding: 24 }}>Session not found</div>;

  // Main barbell lifts in this session whose top set we log to drive progression.
  const trackedLifts = trackedLiftsInSession(session);
  const targetKg = (t) => { const m = /([\d.]+)/.exec(t || ''); return m ? Number(m[1]) : null; };

  const isDone = state && state.completed;
  const isStarted = state && state.startedAt && !state.completed;

  const handleStart = () => startSession(key);

  const fmtRest = (s) => {
    if (s < 60) return `Rest ${s}s`;
    if (s % 60 === 0) return `Rest ${s / 60} min`;
    return `Rest ${Math.floor(s / 60)} min ${s % 60}s`;
  };

  const toggleItem = (idx) => {
    const next = toggleChecked(key, idx);
    setChecked(next);
    if (next.includes(idx)) {
      const item = session.items[idx];
      if (item?.restSec) setRestStart({ secs: item.restSec, at: Date.now() });
    }
  };

  const handleCancel = () => {
    if (!confirm('Started this by mistake? This clears the start time and resets it to not started. Your check-offs will be cleared.')) return;
    cancelSession(key);
    clearChecked(key);
    setChecked([]);
  };

  const handleSubmit = () => {
    // Log top-set results for the main lifts → autoregulates next week's weights.
    // This is OPTIONAL and must never block completion: fire it off (it writes
    // locally first, then syncs in the background and logs any error itself).
    const sets = trackedLifts.map(l => {
      const entry = lifts[l.key] || {};
      const weight = entry.weight != null && entry.weight !== '' ? Number(entry.weight) : targetKg(l.target);
      return (weight && entry.rpe) ? { key: l.key, weight, reps: l.reps, rpe: entry.rpe, targetRpe: l.targetRpe, factor: l.factor } : null;
    }).filter(Boolean);
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
    setChecked([]);
    setShowForm(false);
    setRatings({ quality: null, energy: null, recovery: null });
    setNotes('');
    setLifts({});
  };

  const handleUncomplete = () => {
    if (confirm('Mark this session as incomplete? This resets it to "not started" and removes your ratings.')) {
      uncompleteSession(key);
      clearChecked(key);
      setChecked([]);
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

      {/* Exercise table — columns driven by each item's activity type */}
      {(() => {
        // Group consecutive items by activity type so each group gets its own
        // header row with the right columns. Most sessions are a single type,
        // but a session can mix (e.g. strength + mobility, or run + swim).
        const groups = [];
        session.items.filter(it => !it.substituted).forEach((item, gIdx) => {
          const activity = activityFor(item);
          const last = groups[groups.length - 1];
          if (last && last.activity.key === activity.key) {
            last.items.push({ item, idx: gIdx });
          } else {
            groups.push({ activity, items: [{ item, idx: gIdx }] });
          }
        });

        return groups.map((group, gi) => {
          const { activity, items } = group;
          // Build the grid template from the column definitions.
          // Exercise name column is flexible (1fr); others size to content.
          const cols = activity.columns;
          const gridTemplate = `minmax(0,1fr) ${cols.map(c => c.wide ? 'minmax(70px,1.1fr)' : '54px').join(' ')}`;

          return (
            <div className="gym-table" key={gi} style={{ marginBottom: gi < groups.length - 1 ? 10 : 4 }}>
              {/* Activity-type header */}
              <div className="gt-head" style={{ gridTemplateColumns: gridTemplate }}>
                <div className="gt-h-ex">{activity.label}</div>
                {cols.map(c => (
                  <div key={c.key} className={`gt-h-cell ${c.wide ? 'gt-h-wide' : ''}`}>{c.label}</div>
                ))}
              </div>

              {items.map(({ item, idx }, i) => {
                const isTagged = !!item.tag;
                const cue = activity.cue(item);
                const done = checked.includes(idx);
                return (
                  <div
                    key={i}
                    className={`gt-row ${isStarted ? 'checkable' : ''} ${done ? 'is-checked' : ''}`}
                    style={{ borderLeft: `3px solid ${item.superset ? 'var(--accent)' : isTagged ? activity.accent : 'transparent'}` }}
                    onClick={isStarted ? () => toggleItem(idx) : undefined}
                    role={isStarted ? 'button' : undefined}
                  >
                    <div className="gt-main" style={{ gridTemplateColumns: gridTemplate }}>
                      <div className="gt-ex">
                        {isStarted && <span className={`gt-check ${done ? 'on' : ''}`} aria-hidden="true">✓</span>}
                        <span className="gt-num" style={item.superset ? { color: 'var(--accent)' } : undefined}>{item.num}</span>
                        <span className="gt-name">{item.name}</span>
                        <button
                          className="gt-info"
                          aria-label={`How to do ${item.name}`}
                          onClick={(e) => { e.stopPropagation(); setInfoItem(item); }}
                        >ⓘ</button>
                        {item.rehab && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: 'var(--moss)', background: 'rgba(74,93,58,0.12)', borderRadius: 100, padding: '2px 7px', marginLeft: 6
                          }}>Rehab</span>
                        )}
                        {item.prevention && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: 'var(--txt-muted)', background: 'rgba(106,102,93,0.12)', borderRadius: 100, padding: '2px 7px', marginLeft: 6
                          }}>Prev</span>
                        )}
                      </div>
                      {cols.map(c => {
                        const val = c.accessor(item);
                        const cls = [
                          'gt-cell',
                          c.emphasis ? 'gt-emphasis' : '',
                          c.accent ? 'gt-accent' : '',
                          c.wide ? 'gt-wide' : ''
                        ].filter(Boolean).join(' ');
                        return <div key={c.key} className={cls}>{val}</div>;
                      })}
                    </div>
                    {cue && <div className="gt-note">{cue}</div>}
                    {item.rehab && item.rationale && (
                      <div className="gt-note" style={{ color: 'var(--moss)', fontStyle: 'italic' }}>
                        {item.rationale}
                      </div>
                    )}
                    {item.prevention && item.preventionNote && (
                      <div className="gt-note" style={{ color: 'var(--txt-muted)', fontStyle: 'italic' }}>
                        {item.preventionNote}
                      </div>
                    )}
                    {item.restSec > 0 && <div className="gt-rest">{fmtRest(item.restSec)}</div>}
                  </div>
                );
              })}
            </div>
          );
        });
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
          {/* Top-set logging for the main lifts — drives next week's targets */}
          {trackedLifts.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="h3" style={{ marginTop: 0, marginBottom: 4 }}>Log your top set</div>
              <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginBottom: 14 }}>
                How the last set felt sets next week's weight — heavier if it was easy, steady if it was right.
              </div>
              {trackedLifts.map(l => (
                <div key={l.key} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
                    {l.name} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--txt-muted)' }}>· {l.reps} reps{l.target ? ` · target ${l.target}` : ''}</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <input type="number" inputMode="decimal" placeholder={targetKg(l.target) != null ? String(targetKg(l.target)) : 'kg'}
                      value={lifts[l.key]?.weight ?? ''}
                      onChange={e => setLifts(p => ({ ...p, [l.key]: { ...p[l.key], weight: e.target.value } }))}
                      style={{ width: 90, fontSize: 16, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--bg-surface)', color: 'var(--txt-strong)', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    <span style={{ fontSize: 13, color: 'var(--txt-muted)' }}>kg used</span>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--txt-muted)', marginBottom: 5 }}>FINAL-SET RPE</div>
                  <div className="rating-row">
                    {[6, 7, 8, 9, 10].map(n => (
                      <button key={n} className={`rating-btn ${lifts[l.key]?.rpe === n ? 'active' : ''}`}
                        onClick={() => setLifts(p => ({ ...p, [l.key]: { ...p[l.key], rpe: n } }))}>{n}</button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ borderBottom: '1px solid var(--hairline)', margin: '4px 0 16px' }} />
            </div>
          )}

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
                  <span className="sl-progress">{checked.length}/{session.items.length} done</span>
                  {state.startedAt && (
                    <span className="sl-started">Started {new Date(state.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>
                <RestTimer restStart={restStart} />
              </div>
              <button
                className="btn-primary"
                style={{ marginTop: 12, width: '100%' }}
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
