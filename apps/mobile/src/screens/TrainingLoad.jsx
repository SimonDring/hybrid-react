/**
 * Training Load — acute vs chronic load (ACWR), with a plain-language verdict, the
 * numbers, recent per-session loads, and an eye-toggle "how this is calculated"
 * explainer for the curious.
 */
import { useState } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import { loadVerdict, formVerdict, confidenceNote } from '../lib/verdicts.js';
import InfoTip from '../components/ui/InfoTip.jsx';
import { GLOSSARY } from '../data/metricGlossary.js';

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function TrainingLoad() {
  const load = useTrainingStore(s => s.load) || { acute: 0, chronic: 0, acwr: null, band: null, sessions: [] };
  const adaptation = useTrainingStore(s => s.adaptation);
  const lv = loadVerdict(load, adaptation);
  const form = useTrainingStore(s => s.formView) || { ctl: 0, atl: 0, tsb: 0, band: null, confidence: null };
  const fv = formVerdict(form);
  const [info, setInfo] = useState(false);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 className="h1" style={{ marginBottom: 0 }}>Training load</h1>
        <button className="btn-icon" aria-label="How training load is calculated" aria-expanded={info}
          onClick={() => setInfo(v => !v)} style={{ color: info ? 'var(--accent)' : 'var(--txt-muted)' }}>
          <EyeIcon />
        </button>
      </div>
      <p className="sub">How hard you've been training lately vs your recent baseline.</p>

      {info && (
        <div className="info-panel">
          <div className="info-title">How this is calculated</div>
          <ol className="info-steps">
            <li><b>Session load</b> — time spent in each heart-rate zone, weighted so harder zones count more (the Edwards TRIMP method). No heart rate for a session? We estimate it from how long it lasted.</li>
            <li><b>Acute load</b> — your rolling <b>7-day</b> total: how much you've done recently.</li>
            <li><b>Chronic load</b> — your rolling <b>28-day</b> baseline: what your body is used to, smoothed day to day.</li>
            <li><b>Ratio (ACWR)</b> — acute ÷ chronic. Around <b>1.0</b> means you're training in line with your baseline.</li>
            <li><b>Sweet spot 0.8–1.3.</b> Above ~1.5 means you're ramping faster than you've adapted to (higher injury risk), so the plan eases off automatically.</li>
          </ol>
        </div>
      )}

      {load.acwr == null ? (
        <div className="callout amber">Not enough history yet — a few weeks of sessions and your load trend appears here.</div>
      ) : (
        <div className="health-card" style={{ marginBottom: 16 }}>
          <div className="hc-load-label" style={{ color: lv.color }}>{lv.label}</div>
          <div className="hc-note" style={{ marginTop: 4 }}>{lv.note}</div>
          <div className="stat-grid cols-3" style={{ marginTop: 14 }}>
            <div className="stat-card"><div className="l">Acute · 7d</div><div className="v">{load.acute}</div><div className="d">recent</div></div>
            <div className="stat-card"><div className="l">Chronic · 28d</div><div className="v">{load.chronic}</div><div className="d">baseline</div></div>
            <div className="stat-card"><div className="l">Ratio <InfoTip {...GLOSSARY.trainingLoad} /></div><div className="v" style={{ color: lv.color }}>{load.acwr.toFixed(2)}</div><div className="d">{lv.label}</div></div>
          </div>
        </div>
      )}

      <h2 className="h3">Form</h2>
      <div className="health-card" style={{ marginBottom: 16 }}>
        <div className="hc-headline" style={{ color: fv.color }}>{fv.headline}</div>
        <div className="hc-note" style={{ marginTop: 4 }}>{fv.note}</div>
        <div className="stat-grid cols-3" style={{ marginTop: 14 }}>
          <div className="stat-card"><div className="l">Fitness · CTL</div><div className="v">{form.ctl.toFixed(1)}</div><div className="d">baseline</div></div>
          <div className="stat-card"><div className="l">Fatigue · ATL</div><div className="v">{form.atl.toFixed(1)}</div><div className="d">recent</div></div>
          <div className="stat-card"><div className="l">Form · TSB</div><div className="v" style={{ color: fv.color }}>{form.tsb.toFixed(1)}</div><div className="d">{fv.label}</div></div>
        </div>
        {confidenceNote(form.confidence) && (
          <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 8 }}>{confidenceNote(form.confidence)}</div>
        )}
      </div>

      <h2 className="h3">Recent sessions</h2>
      {load.sessions.length === 0 ? (
        <p className="sub">No logged sessions yet.</p>
      ) : (
        <div className="link-list">
          {load.sessions.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--hairline)' }}>
              <span style={{ color: 'var(--txt-body)', fontSize: 13 }}>{s.date}{s.estimated ? ' · est.' : ''}</span>
              <span style={{ color: 'var(--txt-strong)', fontSize: 13, fontWeight: 600 }}>{s.load}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
