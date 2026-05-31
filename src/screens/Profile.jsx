/**
 * Profile screen.
 *
 * Sections, top to bottom:
 *   1. General info — name, age, height, weight (persisted to Database users.profile)
 *   2. Goals — ranked, editable, persisted to users.profile
 *   3. Injuries — SUMMARY of active injuries with a link to the full log in Tracking
 *   4. Reference links (overview, decisions, principles, reassess)
 *
 * All data lives in the Database layer (users.profile + injuries table), NOT a
 * separate localStorage key. When AI integration arrives (Stage 5), the
 * plan-generation prompt reads exactly this data with no extra wiring.
 */

import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';

function Field({ label, value, onChange, type = 'text', placeholder = '', suffix }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
        opacity: 0.6, marginBottom: 5, textTransform: 'uppercase'
      }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', fontSize: 16, padding: '10px 12px', borderRadius: 10,
            border: '1px solid var(--hairline)', background: 'var(--bg-surface)',
            fontFamily: 'inherit', color: 'var(--txt-strong)'
          }}
        />
        {suffix && <span style={{ fontSize: 13, color: 'var(--txt-muted)', flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const profile = useTrainingStore(s => s.profile);
  const injuries = useTrainingStore(s => s.injuries);
  const updateProfile = useTrainingStore(s => s.updateProfile);
  const setGoals = useTrainingStore(s => s.setGoals);

  const [form, setForm] = useState({
    name: profile.name || '',
    age: profile.age ?? '',
    height_cm: profile.height_cm ?? '',
    bodyweight_kg: profile.bodyweight_kg ?? ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      name: profile.name || '',
      age: profile.age ?? '',
      height_cm: profile.height_cm ?? '',
      bodyweight_kg: profile.bodyweight_kg ?? ''
    });
  }, [profile.name, profile.age, profile.height_cm, profile.bodyweight_kg]);

  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 1400); };

  const commitField = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    const numericFields = ['age', 'height_cm', 'bodyweight_kg'];
    const stored = numericFields.includes(field)
      ? (value === '' ? null : parseFloat(value))
      : value;
    updateProfile({ [field]: stored });
    flashSaved();
  };

  const goals = profile.goals || [];

  const updateGoal = (idx, field, value) => {
    const next = goals.map((g, i) => i === idx ? { ...g, [field]: value } : g);
    setGoals(next);
    flashSaved();
  };
  const addGoal = () => setGoals([...goals, { rank: goals.length + 1, label: '', target_date: '' }]);
  const removeGoal = (idx) => {
    const next = goals.filter((_, i) => i !== idx).map((g, i) => ({ ...g, rank: i + 1 }));
    setGoals(next);
    flashSaved();
  };

  const activeInjuries = injuries.filter(i => i.status === 'active' || i.status === 'rehabbing');

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 className="h1" style={{ marginBottom: 0 }}>Profile</h1>
        {saved && <span style={{ fontSize: 11, color: 'var(--moss)', fontWeight: 700, letterSpacing: '0.08em' }}>SAVED ✓</span>}
      </div>
      <p className="sub">Your baseline, goals, and health context. This feeds AI plan generation when integrated.</p>

      <div className="h3">General</div>
      <div className="form-card" style={{ marginBottom: 22 }}>
        <Field label="Name" value={form.name} onChange={v => commitField('name', v)} placeholder="Your name" />
        <Field label="Age" value={form.age} onChange={v => commitField('age', v)} type="number" placeholder="28" suffix="years" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Height" value={form.height_cm} onChange={v => commitField('height_cm', v)} type="number" placeholder="180" suffix="cm" />
          <Field label="Weight" value={form.bodyweight_kg} onChange={v => commitField('bodyweight_kg', v)} type="number" placeholder="80" suffix="kg" />
        </div>
      </div>

      <div className="h3">Goals — ranked by priority</div>
      <div style={{ marginBottom: 22 }}>
        {goals.map((g, idx) => (
          <div key={idx} style={{
            display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 10,
            alignItems: 'flex-start', marginBottom: 10, padding: '12px 14px',
            background: 'var(--bg-surface)', border: '1px solid var(--hairline)', borderRadius: 12
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: 'var(--txt-strong)'
            }}>{g.rank}</div>
            <div>
              <input
                type="text" value={g.label}
                onChange={e => updateGoal(idx, 'label', e.target.value)}
                placeholder="Describe the goal"
                style={{ width: '100%', fontSize: 14, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--hairline)', background: 'transparent', fontFamily: 'inherit', color: 'var(--txt-strong)', marginBottom: 6 }}
              />
              <input
                type="date" value={g.target_date || ''}
                onChange={e => updateGoal(idx, 'target_date', e.target.value)}
                style={{ fontSize: 12, padding: '5px 8px', borderRadius: 7, border: '1px solid var(--hairline)', background: 'transparent', fontFamily: 'inherit', color: 'var(--txt-muted)' }}
              />
            </div>
            <button onClick={() => removeGoal(idx)} style={{
              background: 'transparent', border: 'none', color: 'var(--txt-muted)',
              fontSize: 16, cursor: 'pointer', padding: 4, opacity: 0.5
            }}>✕</button>
          </div>
        ))}
        <button onClick={addGoal} style={{
          width: '100%', padding: 10, borderRadius: 10, border: '1.5px dashed var(--hairline)',
          background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--txt-muted)',
          cursor: 'pointer', fontFamily: 'inherit'
        }}>+ Add goal</button>
      </div>

      <div className="h3">Injuries</div>
      <button
        onClick={() => navigate('/tracking/injuries')}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
          padding: '14px 16px', marginBottom: 22, borderRadius: 14,
          background: activeInjuries.length ? 'rgba(176,74,46,0.06)' : 'var(--bg-surface)',
          border: '1px solid ' + (activeInjuries.length ? 'rgba(176,74,46,0.22)' : 'var(--hairline)')
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt-strong)', marginBottom: 3 }}>
              {activeInjuries.length === 0
                ? 'No active injuries'
                : activeInjuries.length + ' active ' + (activeInjuries.length === 1 ? 'injury' : 'injuries')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt-muted)' }}>
              {activeInjuries.length === 0
                ? 'Tap to log an injury or view history'
                : activeInjuries.map(i => i.title || i.body_part).filter(Boolean).join(' · ')}
            </div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, opacity: 0.3 }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </button>

      <div className="h3">Reference</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { path: '/profile/overview', title: '12-month overview', sub: 'Phase timeline' },
          { path: '/profile/decisions', title: 'Decision framework', sub: 'If/then responses to disruptions' },
          { path: '/profile/principles', title: 'Operating principles', sub: 'Non-negotiables' },
          { path: '/profile/reassess', title: 'Quarterly reassessment', sub: 'Review and adapt the plan' }
        ].map(item => (
          <button key={item.path} onClick={() => navigate(item.path)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
            background: 'var(--bg-surface)', border: '1px solid var(--hairline)',
            borderRadius: 14, textAlign: 'left', cursor: 'pointer', width: '100%', fontFamily: 'inherit'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt-strong)', marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>{item.sub}</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, opacity: 0.3 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </>
  );
}
