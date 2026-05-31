/**
 * Injuries screen (lives under Tracking).
 *
 * Full injury log, wired to the Database `injuries` table via the store.
 * Each injury: body part, title, severity, status, dates, rehab plan, affected
 * activities, a recovery log (progress entries), and prevention notes.
 *
 * VIRTUAL PHYSIO PIPELINE (Stage 5):
 *   A "Get rehab suggestions" button will send injury details to a Claude Edge
 *   Function and return physio-style rehab guidance (clearly labelled as AI, not
 *   medical advice). The AI also reads active injuries to reduce only affected
 *   activities in the plan, tracks recovery responses, and on recovery restores
 *   activity + writes prevention notes. The data model already supports all of
 *   this (rehab_plan_source, physio_approved, ai_generated, recovery_log,
 *   prevention_notes, affected_activities).
 */

import { useState } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import { ACTIVITY_TYPES } from '../data/activityTypes.js';

const STATUS_OPTIONS = [
  { key: 'active', label: 'Active', color: '#b04a2e' },
  { key: 'rehabbing', label: 'Rehabbing', color: '#c89a3a' },
  { key: 'monitoring', label: 'Monitoring', color: '#4a5d3a' },
  { key: 'recovered', label: 'Recovered', color: '#6a665d' }
];

const ACTIVITY_KEYS = Object.keys(ACTIVITY_TYPES); // ['strength','swim'] for now

function statusMeta(key) {
  return STATUS_OPTIONS.find(s => s.key === key) || STATUS_OPTIONS[0];
}

const EMPTY_FORM = {
  body_part: '', title: '', description: '', severity: 3, status: 'active',
  date_occurred: new Date().toISOString().split('T')[0],
  rehab_plan: '', affected_activities: []
};

export default function Injuries() {
  const injuries = useTrainingStore(s => s.injuries);
  const addInjury = useTrainingStore(s => s.addInjury);
  const updateInjury = useTrainingStore(s => s.updateInjury);
  const removeInjury = useTrainingStore(s => s.removeInjury);
  const addRecoveryLogEntry = useTrainingStore(s => s.addRecoveryLogEntry);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState(null);
  const [logDraft, setLogDraft] = useState({});

  const active = injuries.filter(i => i.status === 'active' || i.status === 'rehabbing' || i.status === 'monitoring');
  const resolved = injuries.filter(i => i.status === 'recovered');

  const submit = () => {
    if (!form.title && !form.body_part) {
      alert('Give the injury at least a title or body part.');
      return;
    }
    addInjury(form);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const toggleActivity = (key) => {
    setForm(f => ({
      ...f,
      affected_activities: f.affected_activities.includes(key)
        ? f.affected_activities.filter(a => a !== key)
        : [...f.affected_activities, key]
    }));
  };

  const markRecovered = (inj) => {
    updateInjury(inj.id, { status: 'recovered', date_recovered: new Date().toISOString().split('T')[0] });
  };

  const submitLogEntry = (injId) => {
    const draft = logDraft[injId];
    if (!draft || !draft.note) return;
    addRecoveryLogEntry(injId, draft);
    setLogDraft(d => ({ ...d, [injId]: { note: '', response: '' } }));
  };

  const InjuryCard = ({ inj }) => {
    const meta = statusMeta(inj.status);
    const expanded = expandedId === inj.id;
    return (
      <div style={{
        border: '1px solid var(--hairline)', borderRadius: 14, marginBottom: 10,
        background: 'var(--bg-surface)', overflow: 'hidden'
      }}>
        <button
          onClick={() => setExpandedId(expanded ? null : inj.id)}
          style={{
            width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
            background: 'transparent', border: 'none', padding: '14px 16px',
            borderLeft: `3px solid ${meta.color}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt-strong)' }}>
                {inj.title || inj.body_part || 'Untitled injury'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginTop: 2 }}>
                {inj.body_part}{inj.body_part && inj.date_occurred ? ' · ' : ''}{inj.date_occurred}
              </div>
            </div>
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: meta.color, background: `${meta.color}1a`, borderRadius: 100, padding: '4px 9px'
            }}>{meta.label}</span>
          </div>
        </button>

        {expanded && (
          <div style={{ padding: '0 16px 16px', borderLeft: `3px solid ${meta.color}` }}>
            {inj.description && (
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--txt-body)', marginBottom: 12 }}>{inj.description}</p>
            )}

            {inj.affected_activities && inj.affected_activities.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 5 }}>Affected activities</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {inj.affected_activities.map(a => (
                    <span key={a} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: 'var(--bg-surface-2)', color: 'var(--txt-body)' }}>
                      {ACTIVITY_TYPES[a] ? ACTIVITY_TYPES[a].label : a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {inj.rehab_plan && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 5 }}>Rehab plan</div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--txt-body)', whiteSpace: 'pre-wrap' }}>{inj.rehab_plan}</p>
              </div>
            )}

            {/* Recovery log */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 6 }}>Recovery log</div>
              {(inj.recovery_log || []).length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--txt-muted)', fontStyle: 'italic', marginBottom: 8 }}>No entries yet.</p>
              )}
              {(inj.recovery_log || []).map((e, i) => (
                <div key={i} style={{ fontSize: 12.5, marginBottom: 6, paddingLeft: 10, borderLeft: '2px solid var(--hairline)' }}>
                  <span style={{ color: 'var(--txt-muted)' }}>{e.date}</span> — {e.note}
                  {e.response && <span style={{ color: 'var(--moss)', fontWeight: 600 }}> ({e.response})</span>}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input
                  type="text"
                  placeholder="Add progress note…"
                  value={(logDraft[inj.id] && logDraft[inj.id].note) || ''}
                  onChange={e => setLogDraft(d => ({ ...d, [inj.id]: { ...(d[inj.id] || {}), note: e.target.value } }))}
                  style={{ flex: 1, fontSize: 13, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--hairline)', background: 'transparent', fontFamily: 'inherit', color: 'var(--txt-strong)' }}
                />
                <button onClick={() => submitLogEntry(inj.id)} style={{
                  padding: '8px 12px', borderRadius: 8, border: 'none', background: 'var(--rust)',
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                }}>Add</button>
              </div>
            </div>

            {/* Virtual physio placeholder */}
            <div style={{
              padding: '10px 12px', borderRadius: 10, background: 'var(--bg-surface-2)',
              fontSize: 11.5, color: 'var(--txt-muted)', marginBottom: 12, lineHeight: 1.45
            }}>
              <strong style={{ color: 'var(--txt-body)' }}>Virtual physio</strong> — AI rehab suggestions will appear here once integrated. They'll be labelled as AI guidance, not medical advice.
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {inj.status !== 'recovered' && (
                <button onClick={() => markRecovered(inj)} style={{
                  flex: 1, minWidth: 130, padding: '10px', borderRadius: 9, border: '1px solid var(--moss)',
                  background: 'transparent', color: 'var(--moss)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                }}>Mark recovered</button>
              )}
              <button onClick={() => { if (confirm('Delete this injury record?')) removeInjury(inj.id); }} style={{
                padding: '10px 14px', borderRadius: 9, border: '1px solid var(--hairline)',
                background: 'transparent', color: 'var(--txt-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
              }}>Delete</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <h1 className="h1">Injury log</h1>
      <p className="sub">Track injuries, rehab, and recovery. Active injuries will guide AI plan adjustments once integrated.</p>

      {!showForm && (
        <button onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }} style={{
          width: '100%', padding: 12, borderRadius: 12, border: '1.5px dashed var(--hairline)',
          background: 'transparent', fontSize: 14, fontWeight: 600, color: 'var(--rust)',
          cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20
        }}>+ Log an injury</button>
      )}

      {showForm && (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <div className="h3" style={{ marginTop: 0 }}>New injury</div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 5 }}>Body part</label>
            <input type="text" value={form.body_part} onChange={e => setForm(f => ({ ...f, body_part: e.target.value }))} placeholder="e.g. Left knee" style={{ width: '100%', fontSize: 15, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--hairline)', background: 'transparent', fontFamily: 'inherit', color: 'var(--txt-strong)' }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 5 }}>Title / diagnosis</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Patellar tendinopathy" style={{ width: '100%', fontSize: 15, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--hairline)', background: 'transparent', fontFamily: 'inherit', color: 'var(--txt-strong)' }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 5 }}>Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="How it happened, how it feels…" style={{ width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--hairline)', background: 'transparent', fontFamily: 'inherit', color: 'var(--txt-strong)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 5 }}>Date occurred</label>
              <input type="date" value={form.date_occurred} onChange={e => setForm(f => ({ ...f, date_occurred: e.target.value }))} style={{ width: '100%', fontSize: 13, padding: '9px 10px', borderRadius: 9, border: '1px solid var(--hairline)', background: 'transparent', fontFamily: 'inherit', color: 'var(--txt-strong)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 5 }}>Severity (1–5)</label>
              <input type="number" min="1" max="5" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} style={{ width: '100%', fontSize: 13, padding: '9px 10px', borderRadius: 9, border: '1px solid var(--hairline)', background: 'transparent', fontFamily: 'inherit', color: 'var(--txt-strong)' }} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 6 }}>Affected activities</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ACTIVITY_KEYS.map(k => {
                const on = form.affected_activities.includes(k);
                return (
                  <button key={k} onClick={() => toggleActivity(k)} style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 100,
                    border: `1px solid ${on ? 'var(--rust)' : 'var(--hairline)'}`,
                    background: on ? 'var(--rust)' : 'transparent',
                    color: on ? '#fff' : 'var(--txt-muted)', cursor: 'pointer', fontFamily: 'inherit'
                  }}>{ACTIVITY_TYPES[k].label}</button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 5 }}>Rehab plan</label>
            <textarea rows={3} value={form.rehab_plan} onChange={e => setForm(f => ({ ...f, rehab_plan: e.target.value }))} placeholder="Exercises, frequency, physio protocol…" style={{ width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--hairline)', background: 'transparent', fontFamily: 'inherit', color: 'var(--txt-strong)' }} />
          </div>

          <button onClick={submit} style={{ width: '100%', padding: 13, borderRadius: 11, border: 'none', background: 'var(--rust)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Save injury</button>
          <button onClick={() => setShowForm(false)} style={{ width: '100%', padding: 11, marginTop: 8, borderRadius: 11, border: '1px solid var(--hairline)', background: 'transparent', color: 'var(--txt-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        </div>
      )}

      {injuries.length === 0 && !showForm && (
        <p style={{ fontSize: 13, color: 'var(--txt-muted)', textAlign: 'center', marginTop: 30 }}>No injuries logged. Good.</p>
      )}

      {active.length > 0 && (
        <>
          <div className="h3">Current</div>
          {active.map(inj => <InjuryCard key={inj.id} inj={inj} />)}
        </>
      )}

      {resolved.length > 0 && (
        <>
          <div className="h3" style={{ marginTop: 20 }}>Recovered</div>
          {resolved.map(inj => <InjuryCard key={inj.id} inj={inj} />)}
        </>
      )}
    </>
  );
}
