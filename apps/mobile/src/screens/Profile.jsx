/**
 * Profile — the account & setup hub, reached from the home-screen avatar. Owns
 * everything that isn't training or progress: who you are (editable photo + name),
 * your setup, plan status, wearable connections and app settings. Strength
 * progress now lives in Atlas.
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import { useAuthStore } from '../stores/authStore.js';
import * as Plan from '../lib/PlanService.js';
import Avatar from '../components/ui/Avatar.jsx';
import { processAvatar } from '../lib/avatarUpload.js';

const STYLE_LABELS = { strength: 'Get stronger', bodybuilding: 'Build muscle', functional: 'Functional fitness', olympic: 'Olympic weightlifting' };
const SPORT_LABELS = { run: 'Running', cycle: 'Cycling', swim: 'Swimming' };
const LEVEL_LABELS = { beginner: 'Beginner', returning: 'Returning', intermediate: 'Intermediate', advanced: 'Advanced' };
const ACCESS_LABELS = { full_gym: 'Full gym', home_weights: 'Home / free weights', none: 'Bodyweight only' };

function Stat({ label, value, suffix }) {
  const has = value !== '' && value != null;
  return (
    <div>
      <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 3 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: has ? 'var(--txt-strong)' : 'var(--txt-muted)' }}>
        {has ? value : '—'}{has && suffix && <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 3 }}>{suffix}</span>}
      </div>
    </div>
  );
}
function Card({ title, children }) {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-lg)', marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', color: 'var(--txt-muted)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
function Empty({ children }) {
  return <div style={{ fontSize: 13, color: 'var(--txt-muted)', fontStyle: 'italic' }}>{children}</div>;
}

export default function Profile() {
  const navigate = useNavigate();
  const profile = useTrainingStore(s => s.profile);
  const injuries = useTrainingStore(s => s.injuries);
  const sessions = useTrainingStore(s => s.sessions);
  const connections = useTrainingStore(s => s.connections);
  const updateProfile = useTrainingStore(s => s.updateProfile);
  const user = useAuthStore(s => s.user);

  const fileRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name || '');

  const experience = profile.experience || {};
  const availability = profile.availability || {};
  const access = profile.access || [];

  const goalText = profile.goal_type === 'sport'
    ? `Support ${SPORT_LABELS[profile.sport] || profile.sport || 'sport'}`
    : (STYLE_LABELS[profile.strength_style] || '—');
  const level = experience.gym || experience.strength_functional || experience.strength_physique;

  const completedCount = Object.values(sessions).filter(s => s && s.completed).length;
  const next = Plan.findNextSession(sessions);
  const totalWeeks = Plan.getPhases().reduce((m, p) => Math.max(m, p.weekEnd || 0), 0);
  const currentWeek = Plan.currentWeekNumber();
  const activeInjuries = injuries.filter(i => ['active', 'rehabbing', 'monitoring'].includes(i.status));
  const hasBaseline = [profile.age, profile.bodyweight_kg].some(v => v !== '' && v != null);
  const connectedCount = (connections || []).filter(c => c.connected_at).length;

  const onPickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    try {
      const url = await processAvatar(file, user && user.id);
      await updateProfile({ avatar: { ...(profile.avatar || {}), url } });
    } catch (err) {
      alert(err.message || 'Could not update your photo.');
    }
    setPhotoBusy(false);
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    setEditName(false);
    if (name && name !== profile.name) await updateProfile({ name });
  };

  return (
    <>
      {/* IDENTITY — editable photo + name */}
      <div className="profile-id">
        <div className="profile-avatar-wrap">
          <Avatar name={profile.name} avatar={profile.avatar} size={72} />
          <button className="profile-cam" onClick={() => fileRef.current && fileRef.current.click()} aria-label="Change photo" disabled={photoBusy}>
            {photoBusy ? <span className="profile-cam-busy" /> : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
              </svg>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} style={{ display: 'none' }} />
        </div>
        <div className="profile-id-text">
          {editName ? (
            <input className="profile-name-input" autoFocus value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={saveName} onKeyDown={e => e.key === 'Enter' && saveName()}
              placeholder="Your name" />
          ) : (
            <button className="profile-name" onClick={() => { setNameDraft(profile.name || ''); setEditName(true); }}>
              {profile.name || 'Add your name'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
            </button>
          )}
          <div className="profile-id-sub">{goalText}{level ? ` · ${LEVEL_LABELS[level] || level}` : ''}</div>
          {user && user.email && <div className="profile-id-email">{user.email}</div>}
        </div>
      </div>

      <Card title="YOU">
        {hasBaseline ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px' }}>
            <Stat label="Age" value={profile.age} suffix="yrs" />
            <Stat label="Bodyweight" value={profile.bodyweight_kg} suffix="kg" />
          </div>
        ) : <Empty>Captured when you set up your plan.</Empty>}
      </Card>

      <Card title="TRAINING">
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 5 }}>GOAL</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt-strong)' }}>{goalText}{level ? ` · ${LEVEL_LABELS[level] || level}` : ''}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px' }}>
            {availability.days_per_week != null && <Stat label="Days / week" value={availability.days_per_week} />}
            {availability.session_minutes != null && <Stat label="Session" value={availability.session_minutes === 90 ? '90+' : availability.session_minutes} suffix="min" />}
            {access.length > 0 && <Stat label="Equipment" value={ACCESS_LABELS[access[0]] || access[0]} />}
          </div>
        </div>
      </Card>

      <Card title="PLAN">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px', marginBottom: next ? 12 : 0 }}>
          {totalWeeks > 0 && <Stat label="Block" value={totalWeeks} suffix="wks" />}
          {currentWeek != null && <Stat label="Current week" value={currentWeek} />}
          <Stat label="Sessions done" value={completedCount} />
        </div>
        {next && (
          <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 10 }}>
            <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 3 }}>UP NEXT</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt-strong)' }}>{next.session.title}</div>
            <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginTop: 2 }}>{next.phase.title} · Week {next.week.num}</div>
          </div>
        )}
        <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 10, marginTop: 10 }}>
          <button onClick={() => navigate('/tracking/injuries')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}>
            <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 2 }}>INJURIES</div>
            <div style={{ fontSize: 13, color: activeInjuries.length > 0 ? 'var(--status-strain)' : 'var(--txt-muted)' }}>
              {activeInjuries.length === 0 ? 'None active' : `${activeInjuries.length} active — ${activeInjuries.map(i => i.title || i.body_part).filter(Boolean).join(', ')}`}
            </div>
          </button>
        </div>
      </Card>

      <Card title="CONNECTIONS & SETTINGS">
        <button className="profile-link" onClick={() => navigate('/settings/integrations')}>
          <span className="pl-main">
            <span className="pl-title">Wearables &amp; apps</span>
            <span className="pl-sub">Fitbit, Garmin, Strava · pick your primary device</span>
          </span>
          <span className="pl-meta">{connectedCount > 0 ? `${connectedCount} connected` : ''} ›</span>
        </button>
        <button className="profile-link" onClick={() => navigate('/settings')}>
          <span className="pl-main">
            <span className="pl-title">Settings</span>
            <span className="pl-sub">Account, data &amp; app</span>
          </span>
          <span className="pl-meta">›</span>
        </button>
      </Card>
    </>
  );
}
