import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../data/Plan.js';
import * as Utils from '../lib/Utils.js';
import { activityFor } from '../data/activityTypes.js';
import RestTimer from '../components/RestTimer.jsx';
import { getChecked, toggleChecked, clearChecked } from '../lib/SessionProgress.js';

export default function SessionDetail() {
  const { phaseId, weekNum, sessionIdx } = useParams();
  const sessions = useTrainingStore(state => state.sessions);
  const startSession = useTrainingStore(state => state.startSession);
  const completeSession = useTrainingStore(state => state.completeSession);
  const uncompleteSession = useTrainingStore(state => state.uncompleteSession);

  const [showForm, setShowForm] = useState(false);
  const [ratings, setRatings] = useState({ quality: null, energy: null, recovery: null });
  const [notes, setNotes] = useState('');
  const [checked, setChecked] = useState([]);

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
  }, [key]);

  if (!session) return <div style={{ padding: 24 }}>Session not found</div>;

  const isDone = state && state.completed;
  const isStarted = state && state.startedAt && !state.completed;

  const handleStart = () => startSession(key);

  const toggleItem = (idx) => setChecked(toggleChecked(key, idx));

  const handleSubmit = () => {
    completeSession(key, {
      quality: ratings.quality,
      energy: ratings.energy,
      recovery: ratings.recovery,
      notes
    });
    clearChecked(key);
    setChecked([]);
    setShowForm(false);
    setRatings({ quality: null, energy: null, recovery: null });
    setNotes('');
  };

  const handleUncomplete = () => {
    if (confirm('Mark this session as incomplete? Ratings will be removed.')) {
      uncompleteSession(key);
    }
  };

  return (
    <>
      <div className="eyebrow">Phase {phase.id} · Week {week.num}</div>
      <h1 className="h1" style={{ fontSize: 24, marginBottom: 2 }}>{session.title}</h1>
      <p className="sub" style={{ marginBottom: 20 }}>{session.duration}</p>

      {/* Exercise table — columns driven by each item's activity type */}
      {(() => {
        // Group consecutive items by activity type so each group gets its own
        // header row with the right columns. Most sessions are a single type,
        // but a session can mix (e.g. strength + mobility, or run + swim).
        const groups = [];
        session.items.forEach((item, gIdx) => {
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
                    style={{ borderLeft: `3px solid ${isTagged ? activity.accent : 'transparent'}` }}
                    onClick={isStarted ? () => toggleItem(idx) : undefined}
                    role={isStarted ? 'button' : undefined}
                  >
                    <div className="gt-main" style={{ gridTemplateColumns: gridTemplate }}>
                      <div className="gt-ex">
                        {isStarted && <span className={`gt-check ${done ? 'on' : ''}`} aria-hidden="true">✓</span>}
                        <span className="gt-num">{item.num}</span>
                        <span className="gt-name">{item.name}</span>
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
                  <span className="sl-progress">{checked.length}/{session.items.length} done</span>
                  {state.startedAt && (
                    <span className="sl-started">Started {new Date(state.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>
                <RestTimer />
              </div>
              <button
                className="btn-primary"
                style={{ marginTop: 12, width: '100%' }}
                onClick={() => setShowForm(true)}
              >
                Complete session
              </button>
            </>
          )}
        </>
      )}
    </>
  );
}
