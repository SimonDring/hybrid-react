import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../data/Plan.js';
import * as Utils from '../lib/Utils.js';

export default function SessionDetail() {
  const { phaseId, weekNum, sessionIdx } = useParams();
  const sessions = useTrainingStore(state => state.sessions);
  const startSession = useTrainingStore(state => state.startSession);
  const completeSession = useTrainingStore(state => state.completeSession);
  const uncompleteSession = useTrainingStore(state => state.uncompleteSession);

  const [showForm, setShowForm] = useState(false);
  const [ratings, setRatings] = useState({ quality: null, energy: null, recovery: null });
  const [notes, setNotes] = useState('');

  const phase = Plan.getPhase(Number(phaseId));
  const week = phase ? phase.weeks.find(w => w.num === Number(weekNum)) : null;
  const session = week ? week.sessions[Number(sessionIdx)] : null;
  const key = Utils.weekKey(Number(phaseId), Number(weekNum), Number(sessionIdx));
  const state = sessions[key];

  // Reset form state when navigating between sessions
  useEffect(() => {
    setShowForm(false);
    setRatings({ quality: null, energy: null, recovery: null });
    setNotes('');
  }, [key]);

  if (!session) return <div>Session not found</div>;

  const isDone = state && state.completed;
  const isStarted = state && state.startedAt && !state.completed;

  const handleStart = () => {
    startSession(key);
  };

  const handleSubmit = () => {
    completeSession(key, {
      quality: ratings.quality,
      energy: ratings.energy,
      recovery: ratings.recovery,
      notes: notes
    });
    setShowForm(false);
    setRatings({ quality: null, energy: null, recovery: null });
    setNotes('');
  };

  const handleUncomplete = () => {
    if (confirm('Mark this session as not completed? Your ratings will be removed.')) {
      uncompleteSession(key);
    }
  };

  return (
    <>
      <div className="eyebrow">Phase {phase.id} · Week {week.num}</div>
      <h1 className="h1" style={{ fontSize: 26 }}>{session.title}</h1>
      <p className="sub">{session.duration}</p>

      <div className="session">
        <div className="session-head">
          <h4>{session.title}</h4>
        </div>
        {session.items.map((item, i) => (
          <div key={i} className={`exercise ${item.tag || ''}`}>
            <div className="e-num">{item.num}</div>
            <div className="e-name">
              {item.name}
              {item.note && <small style={{ display: 'block' }}>{item.note}</small>}
            </div>
            <div className="e-sets">{item.sets}</div>
            <div className="e-rpe">{item.rpe}</div>
          </div>
        ))}
      </div>

      {isDone && (
        <>
          <div className="callout green" style={{ marginTop: 16 }}>
            <strong>Completed</strong>
            {state.completedAt && <div style={{ fontSize: 12, marginTop: 2 }}>{new Date(state.completedAt).toLocaleString()}</div>}
            {state.quality != null && (
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
                <span>Quality: {state.quality}/5</span>
                <span>Energy: {state.energy}/5</span>
                <span>Recovery: {state.recovery}/5</span>
              </div>
            )}
            {state.notes && <div style={{ fontSize: 13, marginTop: 8, fontStyle: 'italic' }}>"{state.notes}"</div>}
          </div>
          <button className="btn-secondary" style={{ marginTop: 12, width: '100%' }} onClick={handleUncomplete}>
            Mark as incomplete
          </button>
        </>
      )}

      {!isDone && showForm && (
        <div className="form-card" style={{ marginTop: 16 }}>
          <h3 className="h3" style={{ marginTop: 0 }}>Rate your session</h3>

          {[
            { key: 'quality', label: 'Quality' },
            { key: 'energy', label: 'Energy' },
            { key: 'recovery', label: 'Recovery' }
          ].map(({ key: ratingKey, label }) => (
            <div key={ratingKey} className="form-row">
              <label>{label}</label>
              <div className="rating-row">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    className={`rating-btn ${ratings[ratingKey] === n ? 'active' : ''}`}
                    onClick={() => setRatings({ ...ratings, [ratingKey]: n })}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="form-row">
            <label>Notes (optional)</label>
            <textarea
              rows={3}
              placeholder="What went well? What didn't?"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <button className="btn-primary" style={{ width: '100%' }} onClick={handleSubmit}>
            Save & complete
          </button>
          <button className="btn-secondary" style={{ marginTop: 8, width: '100%' }} onClick={() => setShowForm(false)}>
            Cancel
          </button>
        </div>
      )}

      {!isDone && !showForm && (
        <>
          {!isStarted && (
            <button className="btn-primary" style={{ marginTop: 16, width: '100%' }} onClick={handleStart}>
              Start session
            </button>
          )}
          {isStarted && (
            <>
              <div className="callout" style={{ marginTop: 16 }}>
                <strong>In progress</strong>
                Started {state.startedAt && new Date(state.startedAt).toLocaleTimeString()}
              </div>
              <button className="btn-primary" style={{ marginTop: 12, width: '100%' }} onClick={() => setShowForm(true)}>
                Complete session
              </button>
            </>
          )}
        </>
      )}
    </>
  );
}
