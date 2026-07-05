import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore.js';
import { useTrainingStore } from '../stores/trainingStore.js';
import { joinTeamWithCode, listMyTeams, leaveTeam } from '../lib/SyncService.js';

/**
 * Teams — the player joins a team with a share code (Simon's join-code decision).
 * Joining starts the coach-facing status roll-up for that team. What a coach can
 * see is spelled out here (derived readiness/load/availability; never raw vitals).
 */
export default function Teams() {
  const authStatus = useAuthStore(s => s.status);
  const refreshTeamStatus = useTrainingStore(s => s.refreshTeamStatus);
  const refreshTeamSchedule = useTrainingStore(s => s.refreshTeamSchedule);

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);       // { kind: 'ok'|'err', text }

  const load = useCallback(async () => {
    setLoading(true);
    setTeams(await listMyTeams());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const onJoin = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setMsg(null);
    const res = await joinTeamWithCode(code);
    if (res.ok) {
      setMsg({ kind: 'ok', text: `Joined ${res.team?.name || 'the team'} ✓` });
      setCode('');
      refreshTeamStatus?.();     // populate the coach board now
      refreshTeamSchedule?.();   // pull the coach's schedule into the plan
      await load();
    } else {
      setMsg({ kind: 'err', text: res.error });
    }
    setBusy(false);
  };

  const onLeave = async (team) => {
    if (!confirm(`Leave ${team.name}? Your coach will no longer see your status for this team.`)) return;
    const res = await leaveTeam(team.team_id);
    if (res.ok) { refreshTeamSchedule?.(); await load(); }
    else setMsg({ kind: 'err', text: res.error || 'Could not leave.' });
  };

  if (authStatus !== 'signed_in') {
    return (
      <>
        <h1 className="h1">Teams</h1>
        <p className="sub">Sign in to join a team and share your training status with a coach.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="h1" style={{ marginBottom: 2 }}>Teams</h1>
      <p className="sub" style={{ marginBottom: 20 }}>
        Join your team with the code your coach shares. Your coach sees your
        readiness, load and availability — <strong>never</strong> your raw health data.
      </p>

      {/* Join by code */}
      <h2 className="h3">Join a team</h2>
      <form onSubmit={onJoin} style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 8 }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code (e.g. AB3K9Z)"
          autoCapitalize="characters"
          maxLength={12}
          style={{
            flex: 1, padding: '11px 14px', borderRadius: 11, fontSize: 15, letterSpacing: '0.08em',
            border: '1px solid var(--hairline)', background: 'var(--bg-surface-2)', color: 'var(--txt-strong)',
            fontFamily: 'inherit', textTransform: 'uppercase',
          }}
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          style={{
            padding: '11px 18px', borderRadius: 11, border: 'none', fontFamily: 'inherit',
            background: busy || !code.trim() ? 'var(--bg-surface-2)' : 'var(--accent)',
            color: busy || !code.trim() ? 'var(--txt-muted)' : '#0b0f12', fontWeight: 700, fontSize: 14,
            cursor: busy || !code.trim() ? 'default' : 'pointer',
          }}
        >
          {busy ? 'Joining…' : 'Join'}
        </button>
      </form>
      {msg && (
        <p className="sub" style={{ fontSize: 12, marginBottom: 20, color: msg.kind === 'ok' ? 'var(--moss)' : 'var(--rust)' }}>
          {msg.text}
        </p>
      )}

      {/* My teams */}
      <h2 className="h3" style={{ marginTop: 12 }}>Your teams</h2>
      {loading ? (
        <p className="sub" style={{ fontSize: 12 }}>Loading…</p>
      ) : teams.length === 0 ? (
        <p className="sub" style={{ fontSize: 12 }}>You haven't joined a team yet.</p>
      ) : (
        <div className="settings-group">
          {teams.map((t) => (
            <div key={t.team_id} className="settings-row" style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--txt-strong)' }}>{t.name}</div>
                <div style={{ fontSize: 11, color: 'var(--txt-muted)' }}>
                  {t.role === 'coach' ? 'Coach' : 'Player'}{t.sport ? ` · ${t.sport.replace(/_/g, ' ')}` : ''}
                </div>
              </div>
              <button
                onClick={() => onLeave(t)}
                style={{
                  marginLeft: 'auto', padding: '6px 12px', borderRadius: 9, fontFamily: 'inherit',
                  border: '1px solid var(--hairline)', background: 'transparent', color: 'var(--txt-muted)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Leave
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
