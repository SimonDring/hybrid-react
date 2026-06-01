/**
 * Wearables / Daily metrics screen (under Tracking).
 *
 * Manual entry now; Fitbit-automatic later. Writes to the Database
 * `daily_metrics` table via upsertDailyMetric (one row per date — entering the
 * same date again updates rather than duplicates, so future Fitbit sync is
 * idempotent).
 *
 * Fields mirror what Fitbit produces (sleep, HRV, resting HR, readiness, SpO2,
 * etc.) plus manual subjective fields (energy, soreness, mood) that stay useful
 * even after wearable integration. When Fitbit is connected (Stage 5-6), rows
 * arrive with source='fitbit' and these forms become a fallback / override.
 */

import { useState } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { getFitbitAuthUrl } from '../lib/SyncService.js';

const FIELD_GROUPS = [
  {
    group: 'Recovery',
    fields: [
      { key: 'resting_hr', label: 'Resting HR', suffix: 'bpm' },
      { key: 'hrv_ms', label: 'HRV', suffix: 'ms' },
      { key: 'breathing_rate', label: 'Breathing rate', suffix: 'brpm' },
      { key: 'spo2_pct', label: 'SpO₂', suffix: '%' },
      { key: 'readiness_score', label: 'Readiness score', suffix: '/100' }
    ]
  },
  {
    group: 'Sleep',
    fields: [
      { key: 'sleep_duration_min', label: 'Sleep duration', suffix: 'min' },
      { key: 'sleep_score', label: 'Sleep score', suffix: '/100' },
      { key: 'sleep_deep_min', label: 'Deep', suffix: 'min' },
      { key: 'sleep_rem_min', label: 'REM', suffix: 'min' },
      { key: 'sleep_light_min', label: 'Light', suffix: 'min' }
    ]
  },
  {
    group: 'Activity',
    fields: [
      { key: 'steps', label: 'Steps', suffix: '' },
      { key: 'active_minutes', label: 'Active minutes', suffix: 'min' },
      { key: 'calories_out', label: 'Calories out', suffix: 'kcal' }
    ]
  }
];

const SUBJECTIVE = [
  { key: 'energy', label: 'Energy' },
  { key: 'soreness', label: 'Soreness' },
  { key: 'mood', label: 'Mood' }
];

export default function Wearables() {
  const dailyMetrics        = useTrainingStore(s => s.dailyMetrics);
  const upsertDailyMetric   = useTrainingStore(s => s.upsertDailyMetric);
  const fitbitConnection    = useTrainingStore(s => s.fitbitConnection);
  const fitbitSyncing       = useTrainingStore(s => s.fitbitSyncing);
  const syncFitbitToday     = useTrainingStore(s => s.syncFitbitToday);
  const refreshFitbitConnection = useTrainingStore(s => s.refreshFitbitConnection);
  const user = useAuthStore(s => s.user);

  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);

  // Pre-fill from any existing row for the selected date
  const existing = dailyMetrics.find(d => d.date === date) || {};
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);

  // Merge existing values with in-progress edits for display
  const valueFor = (key) => {
    if (key in form) return form[key];
    return existing[key] != null ? existing[key] : '';
  };

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const onDateChange = (newDate) => {
    setDate(newDate);
    setForm({}); // reset edits; existing row for new date pre-fills via valueFor
  };

  const save = () => {
    upsertDailyMetric({ date, source: 'manual', ...form });
    setForm({});
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const recent = [...dailyMetrics].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 7);

  const inputStyle = {
    width: '100%', fontSize: 15, padding: '9px 10px', borderRadius: 9,
    border: '1px solid var(--hairline)', background: 'transparent',
    fontFamily: 'inherit', color: 'var(--txt-strong)'
  };
  const labelStyle = {
    display: 'block', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', opacity: 0.6, marginBottom: 4
  };

  const connectFitbit = () => {
    if (!user) return;
    window.open(getFitbitAuthUrl(user.id), '_blank');
  };

  const lastSynced = fitbitConnection?.last_synced_at
    ? new Date(fitbitConnection.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 className="h1" style={{ marginBottom: 0 }}>Daily metrics</h1>
        {saved && <span style={{ fontSize: 11, color: 'var(--moss)', fontWeight: 700, letterSpacing: '0.08em' }}>SAVED ✓</span>}
      </div>
      <p className="sub">Recovery data from Fitbit, plus manual subjective scores. One entry per day.</p>

      {/* Fitbit connection panel */}
      <div style={{
        padding: '14px 16px', borderRadius: 12, marginBottom: 20,
        border: '1px solid var(--hairline)', background: 'var(--bg-surface)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: fitbitConnection ? 8 : 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)' }}>
              {fitbitConnection ? 'Fitbit connected' : 'Connect Fitbit'}
            </div>
            {fitbitConnection && (
              <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 2 }}>
                {lastSynced ? `Last synced today at ${lastSynced}` : 'Not yet synced today'}
              </div>
            )}
            {!fitbitConnection && (
              <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 2 }}>
                Auto-fills sleep, HR, HRV, steps, and more
              </div>
            )}
          </div>
          {!fitbitConnection ? (
            <button onClick={connectFitbit} style={{
              padding: '8px 14px', borderRadius: 9, border: 'none',
              background: 'var(--rust)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
            }}>
              Connect
            </button>
          ) : (
            <button
              onClick={syncFitbitToday}
              disabled={fitbitSyncing}
              style={{
                padding: '8px 14px', borderRadius: 9,
                border: '1px solid var(--hairline)', background: 'transparent',
                color: fitbitSyncing ? 'var(--txt-muted)' : 'var(--txt-strong)',
                fontSize: 13, fontWeight: 600, cursor: fitbitSyncing ? 'default' : 'pointer',
                fontFamily: 'inherit'
              }}
            >
              {fitbitSyncing ? 'Syncing…' : 'Sync now'}
            </button>
          )}
        </div>
        {!fitbitConnection && (
          <button
            onClick={refreshFitbitConnection}
            style={{
              fontSize: 11, color: 'var(--txt-muted)', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
              marginTop: 6
            }}
          >
            Already connected? Tap to check status
          </button>
        )}
      </div>

      {/* Date selector */}
      <div className="form-card" style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Date</label>
        <input type="date" value={date} onChange={e => onDateChange(e.target.value)} style={inputStyle} />
        {existing.date && (
          <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 6 }}>
            Editing existing entry for this date{existing.source ? ` (source: ${existing.source})` : ''}.
          </div>
        )}
      </div>

      {/* Metric groups */}
      {FIELD_GROUPS.map(grp => (
        <div key={grp.group} style={{ marginBottom: 16 }}>
          <div className="h3">{grp.group}</div>
          <div className="form-card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {grp.fields.map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}{f.suffix ? ` (${f.suffix})` : ''}</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={valueFor(f.key)}
                    onChange={e => setField(f.key, e.target.value)}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Subjective 1-5 */}
      <div style={{ marginBottom: 16 }}>
        <div className="h3">How you feel (1–5)</div>
        <div className="form-card">
          {SUBJECTIVE.map(s => (
            <div key={s.key} style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{s.label}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map(n => {
                  const active = String(valueFor(s.key)) === String(n);
                  return (
                    <button key={n} onClick={() => setField(s.key, n)} style={{
                      flex: 1, padding: '10px 0', borderRadius: 9,
                      border: `1px solid ${active ? 'var(--rust)' : 'var(--hairline)'}`,
                      background: active ? 'var(--rust)' : 'transparent',
                      color: active ? '#fff' : 'var(--txt-muted)',
                      fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                    }}>{n}</button>
                  );
                })}
              </div>
            </div>
          ))}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              rows={2}
              value={valueFor('notes')}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Anything notable today?"
              style={{ ...inputStyle, fontSize: 14 }}
            />
          </div>
        </div>
      </div>

      <button onClick={save} style={{
        width: '100%', padding: 14, borderRadius: 12, border: 'none',
        background: 'var(--rust)', color: '#fff', fontSize: 15, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit', marginBottom: 24
      }}>Save daily metrics</button>

      {/* Recent entries */}
      {recent.length > 0 && (
        <>
          <div className="h3">Recent</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {recent.map(d => (
              <button key={d.id} onClick={() => onDateChange(d.date)} style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, alignItems: 'center',
                padding: '10px 14px', borderRadius: 11, border: '1px solid var(--hairline)',
                background: 'var(--bg-surface)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', width: '100%'
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-muted)' }}>{d.date}</div>
                <div style={{ fontSize: 12, color: 'var(--txt-body)' }}>
                  {[
                    d.readiness_score != null && `Readiness ${d.readiness_score}`,
                    d.resting_hr != null && `RHR ${d.resting_hr}`,
                    d.hrv_ms != null && `HRV ${d.hrv_ms}`,
                    d.sleep_score != null && `Sleep ${d.sleep_score}`
                  ].filter(Boolean).join(' · ') || 'No metrics'}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
