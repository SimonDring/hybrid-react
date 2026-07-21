/**
 * PitchLog — hand-log a pitch/match session (Phase 3 S6a; lives under Tracking).
 *
 * The athlete records minutes played, session RPE, and availability (all self-report),
 * plus optional GPS numbers transcribed off their tracker (third-party). The store action
 * runs each datum through the engine's Metric Dictionary adapter (validate at the boundary),
 * then writes owner-private observations to the M5 substrate. Nothing here is coach-visible.
 *
 * Units: the form takes friendly units (km, km/h) and converts to the dictionary's canonical
 * units (metres, m/s) before logging — the commensurability ruling the dictionary demands.
 */
import { useEffect, useState } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';

const labelStyle = {
  display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', opacity: 0.6, marginBottom: 5,
};
const inputStyle = {
  width: '100%', fontSize: 15, padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--hairline)', background: 'transparent',
  fontFamily: 'inherit', color: 'var(--txt-strong)', boxSizing: 'border-box',
};
const todayISO = () => new Date().toISOString().slice(0, 10);

const AVAIL = [
  { key: 'available', label: 'Available', color: 'var(--moss)' },
  { key: 'modified', label: 'Modified', color: 'var(--ochre)' },
  { key: 'unavailable', label: 'Unavailable', color: 'var(--rust)' },
];

function Field({ label, children }) {
  return <div style={{ marginBottom: 14 }}><label style={labelStyle}>{label}</label>{children}</div>;
}

function num(v) { const n = Number(v); return v !== '' && !Number.isNaN(n) ? n : undefined; }

export default function PitchLog() {
  const logPitchSession = useTrainingStore(s => s.logPitchSession);
  const loadPitchSessions = useTrainingStore(s => s.loadPitchSessions);
  const pitchSessions = useTrainingStore(s => s.pitchSessions);

  const [playedOn, setPlayedOn] = useState(todayISO());
  const [minutes, setMinutes] = useState('');
  const [rpe, setRpe] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [showGps, setShowGps] = useState(false);
  const [distanceKm, setDistanceKm] = useState('');
  const [sprints, setSprints] = useState('');
  const [topSpeedKmh, setTopSpeedKmh] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { kind: 'ok'|'err', text }

  useEffect(() => { loadPitchSessions(); }, [loadPitchSessions]);

  const canSave = num(minutes) != null || rpe != null || availability != null;

  async function save() {
    setBusy(true); setMsg(null);
    const input = {
      playedOn,
      minutes: num(minutes),
      rpe: rpe ?? undefined,
      availability: availability ?? undefined,
      // GPS (third-party) — convert friendly units to the dictionary's canonical m / m·s⁻¹
      distanceM: num(distanceKm) != null ? Math.round(num(distanceKm) * 1000) : undefined,
      sprintCount: num(sprints) != null ? Math.round(num(sprints)) : undefined, // int column

      topSpeedMs: num(topSpeedKmh) != null ? Number((num(topSpeedKmh) / 3.6).toFixed(2)) : undefined,
    };
    const res = await logPitchSession(input);
    setBusy(false);
    if (!res.ok) { setMsg({ kind: 'err', text: (res.errors || ['Could not save.']).join(' ') }); return; }
    // reset the effort fields; keep the date for a quick second entry
    setMinutes(''); setRpe(null); setAvailability(null);
    setDistanceKm(''); setSprints(''); setTopSpeedKmh(''); setShowGps(false);
    const warn = (res.warnings && res.warnings.length) ? ` (skipped: ${res.warnings.length} field${res.warnings.length > 1 ? 's' : ''})` : '';
    setMsg({ kind: 'ok', text: `Session logged${warn}.` });
  }

  return (
    <>
      <h1 className="h1">Log a pitch session</h1>
      <p className="sub">Minutes, effort and availability from a match or pitch/skills session. Feeds your load picture — never shared with a coach.</p>

      <div className="form-card" style={{ marginBottom: 20 }}>
        <Field label="Date">
          <input type="date" value={playedOn} max={todayISO()} onChange={e => setPlayedOn(e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Minutes played">
          <input type="number" inputMode="numeric" min="0" max="200" value={minutes}
            onChange={e => setMinutes(e.target.value)} placeholder="e.g. 70" style={inputStyle} />
        </Field>

        <Field label="Session RPE (0–10)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button key={n} type="button" onClick={() => setRpe(rpe === n ? null : n)}
                className={`opt-chip ${rpe === n ? 'is-selected' : ''}`}
                style={{ minWidth: 34, padding: '8px 0', flex: '1 0 auto', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>{n}</button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginTop: 5 }}>0 = rest · 10 = maximal effort</div>
        </Field>

        <Field label="Availability">
          <div style={{ display: 'flex', gap: 6 }}>
            {AVAIL.map(a => (
              <button key={a.key} type="button" onClick={() => setAvailability(availability === a.key ? null : a.key)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 600, color: 'var(--txt-strong)',
                  border: `1.5px solid ${availability === a.key ? a.color : 'var(--hairline)'}`,
                  background: availability === a.key ? `color-mix(in srgb, ${a.color} 12%, transparent)` : 'transparent',
                }}>{a.label}</button>
            ))}
          </div>
        </Field>

        {!showGps ? (
          <button type="button" onClick={() => setShowGps(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
            color: 'var(--accent)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          }}>+ Add GPS data from your tracker</button>
        ) : (
          <div style={{ borderTop: '1px solid var(--hairline)', marginTop: 4, paddingTop: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginBottom: 10 }}>
              From your GPS watch or vest (recorded by the device, not a guess).
            </div>
            <Field label="Total distance (km)">
              <input type="number" inputMode="decimal" min="0" step="0.1" value={distanceKm}
                onChange={e => setDistanceKm(e.target.value)} placeholder="e.g. 8.2" style={inputStyle} />
            </Field>
            <Field label="Sprints">
              <input type="number" inputMode="numeric" min="0" step="1" value={sprints}
                onChange={e => setSprints(e.target.value)} placeholder="e.g. 14" style={inputStyle} />
            </Field>
            <Field label="Top speed (km/h)">
              <input type="number" inputMode="decimal" min="0" step="0.1" value={topSpeedKmh}
                onChange={e => setTopSpeedKmh(e.target.value)} placeholder="e.g. 29.2" style={inputStyle} />
            </Field>
          </div>
        )}

        {msg && (
          <div style={{
            marginTop: 4, marginBottom: 10, fontSize: 13, fontWeight: 600,
            color: msg.kind === 'ok' ? 'var(--moss)' : 'var(--rust)',
          }}>{msg.text}</div>
        )}

        <button type="button" className="btn-primary" disabled={!canSave || busy} onClick={save}
          style={{ opacity: (!canSave || busy) ? 0.5 : 1 }}>
          {busy ? 'Saving…' : 'Log session'}
        </button>
      </div>

      <div className="h3" style={{ marginBottom: 10 }}>Recent sessions</div>
      {(!pitchSessions || pitchSessions.length === 0) ? (
        <p className="sub" style={{ marginTop: 0 }}>No sessions logged yet. Your first entry appears here.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {pitchSessions.map((s) => {
            const av = AVAIL.find(a => a.key === s.availability);
            const bits = [];
            if (s.minutes != null) bits.push(`${s.minutes} min`);
            if (s.rpe != null) bits.push(`RPE ${s.rpe}`);
            if (s.srpe != null) bits.push(`load ${s.srpe}`);
            if (s.distanceM != null) bits.push(`${(s.distanceM / 1000).toFixed(1)} km`);
            if (s.sprintCount != null) bits.push(`${s.sprintCount} sprints`);
            if (s.topSpeedMs != null) bits.push(`${(s.topSpeedMs * 3.6).toFixed(1)} km/h top`);
            return (
              <div key={s.ref} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-strong)' }}>{s.on || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginTop: 2 }}>{bits.join(' · ') || 'logged'}</div>
                </div>
                {av && <span style={{ fontSize: 11, fontWeight: 700, color: av.color }}>{av.label}</span>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
