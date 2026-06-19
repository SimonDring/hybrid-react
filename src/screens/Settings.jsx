import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import { useAuthStore } from '../stores/authStore.js';
import Database from '../lib/Database.js';
import { runSessionDMigration } from '../lib/SyncService.js';

export default function Settings() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('htp_theme') || 'dark');
  const [migrationStatus, setMigrationStatus] = useState(
    localStorage.getItem('htp_session_d_migrated') ? 'done' : 'idle'
  );
  const replaceAll = useTrainingStore(state => state.replaceAll);
  const resetAll = useTrainingStore(state => state.resetAll);
  const clearPlan = useTrainingStore(state => state.clearPlan);
  const wipeTrainingData = useTrainingStore(state => state.wipeTrainingData);
  const authStatus = useAuthStore(s => s.status);
  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);
  const updatePassword = useAuthStore(s => s.updatePassword);
  const deleteAccount = useAuthStore(s => s.deleteAccount);

  // Delete-account confirmation (type-to-confirm)
  const [delOpen, setDelOpen] = useState(false);
  const [delText, setDelText] = useState('');
  const [delMsg, setDelMsg] = useState(null);
  const handleClearPlan = async () => {
    if (!confirm('Clear your current plan and set up a new one?\n\nYour training history, logged sessions and tracked lift weights are kept — only the plan is rebuilt from fresh answers.')) return;
    await clearPlan(); // sets onboarded:false → the onboarding wizard takes over
  };
  const handleWipeData = async () => {
    if (!confirm('Delete all your logged training data — sessions, check-ins, daily metrics, injuries and tracked lift weights?\n\nYour account, profile and current plan are kept. This cannot be undone.')) return;
    await wipeTrainingData();
    alert('Your training data has been deleted.');
  };
  const handleDeleteAccount = async () => {
    if (delText.trim().toUpperCase() !== 'DELETE') { setDelMsg('Type DELETE to confirm.'); return; }
    setDelMsg('Deleting…');
    const ok = await deleteAccount();
    if (!ok) setDelMsg(useAuthStore.getState().errorMessage || 'Could not delete account. Try again.');
    // on success the app signs out and this screen unmounts
  };

  // Set / change password (works while signed in — no email needed)
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState(null);
  const handleSetPassword = async () => {
    if (newPw.length < 6) { setPwMsg('Use at least 6 characters.'); return; }
    setPwMsg('Saving…');
    const ok = await updatePassword(newPw);
    if (ok) {
      setNewPw(''); setPwMsg('Password updated ✓');
      setTimeout(() => { setPwOpen(false); setPwMsg(null); }, 1400);
    } else {
      setPwMsg(useAuthStore.getState().errorMessage || 'Could not update password.');
    }
  };

  const handleSetTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('htp_theme', newTheme);
    if (newTheme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
    // Update theme-color meta
    const isDark = newTheme === 'dark' ||
      (newTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#100d09' : '#f4f1ea');
  };

  const handleMigrate = async () => {
    setMigrationStatus('running');
    const result = await runSessionDMigration();
    if (result.skipped) {
      setMigrationStatus('done');
    } else if (result.ok) {
      const { counts } = result;
      setMigrationStatus(
        `done:${counts.sessions}s,${counts.checkins}c,${counts.injuries}i`
      );
    } else {
      setMigrationStatus('error:' + result.reason);
    }
  };

  const handleExport = () => {
    const data = Database.services.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hybrid-training-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!confirm('This will replace all current data with the imported file. Continue?')) return;
        replaceAll(data);
        alert('Import complete');
      } catch (err) {
        alert('Could not parse file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (!confirm('Permanently delete ALL training data? This cannot be undone.')) return;
    if (!confirm('Are you really sure? All sessions, check-ins, and reassessment answers will be lost.')) return;
    resetAll();
    alert('All data reset');
  };

  const counts = {
    users: Database.tables.users.all().length,
    sessions: Database.tables.sessions.all().length,
    sessionLogs: Database.tables.sessionLogs.all().length,
    weeklyCheckins: Database.tables.weeklyCheckins.all().length,
    reassessments: Database.tables.reassessments.all().length
  };

  return (
    <>
      <h1 className="h1">Settings</h1>
      <p className="sub">Appearance, data, and app management.</p>

      <h2 className="h3">Appearance</h2>
      <div className="settings-group">
        <div className="settings-row" style={{ display: 'block' }}>
          <div style={{ marginBottom: 10 }}>Theme</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className={theme === 'light' ? 'active' : ''} onClick={() => handleSetTheme('light')} style={{ flex: 1, padding: 8, fontSize: 13, borderRadius: 8, border: '1px solid var(--hairline)', background: theme === 'light' ? 'var(--rust)' : 'transparent', color: theme === 'light' ? '#fff' : 'inherit', cursor: 'pointer' }}>Light</button>
            <button className={theme === 'dark' ? 'active' : ''} onClick={() => handleSetTheme('dark')} style={{ flex: 1, padding: 8, fontSize: 13, borderRadius: 8, border: '1px solid var(--hairline)', background: theme === 'dark' ? 'var(--rust)' : 'transparent', color: theme === 'dark' ? '#fff' : 'inherit', cursor: 'pointer' }}>Dark</button>
            <button className={theme === 'auto' ? 'active' : ''} onClick={() => handleSetTheme('auto')} style={{ flex: 1, padding: 8, fontSize: 13, borderRadius: 8, border: '1px solid var(--hairline)', background: theme === 'auto' ? 'var(--rust)' : 'transparent', color: theme === 'auto' ? '#fff' : 'inherit', cursor: 'pointer' }}>Auto</button>
          </div>
        </div>
      </div>

      <h2 className="h3">Integrations</h2>
      <button
        className="settings-row"
        onClick={() => navigate('/settings/integrations')}
        style={{ width: '100%', textAlign: 'left' }}
      >
        Wearables &amp; apps
        <span style={{ marginLeft: 'auto', color: 'var(--txt-muted)' }}>›</span>
      </button>
      <p className="sub" style={{ fontSize: 11, marginBottom: 20 }}>
        Connect Fitbit, Garmin, Strava and choose your primary device.
      </p>

      <h2 className="h3">Data</h2>
      <div className="settings-group">
        {authStatus === 'signed_in' && (
          <button
            className="settings-row"
            onClick={handleMigrate}
            disabled={migrationStatus === 'running' || migrationStatus === 'done' || migrationStatus.startsWith('done:')}
          >
            <span>
              {migrationStatus === 'running' && 'Syncing…'}
              {migrationStatus === 'idle' && 'Push local data to cloud'}
              {(migrationStatus === 'done' || migrationStatus.startsWith('done:')) && 'Local data synced to cloud'}
              {migrationStatus.startsWith('error:') && 'Sync failed — tap to retry'}
            </span>
            <span className="sr-meta">
              {migrationStatus === 'idle' && 'Once'}
              {migrationStatus === 'running' && '…'}
              {(migrationStatus === 'done' || migrationStatus.startsWith('done:')) && '✓'}
              {migrationStatus.startsWith('error:') && '⚠'}
            </span>
          </button>
        )}
        <button className="settings-row" onClick={handleExport}>
          <span>Export data</span>
          <span className="sr-meta">JSON</span>
        </button>
        <label className="settings-row" style={{ cursor: 'pointer' }}>
          <span>Import data</span>
          <span className="sr-meta">JSON</span>
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </label>
        <button className="settings-row danger" onClick={handleReset} style={{ color: 'var(--rust)' }}>
          <span>Reset all data</span>
          <span className="sr-meta">⚠</span>
        </button>
      </div>

      <h2 className="h3">Storage</h2>
      <ul className="kv-list">
        <li><span className="k">Users</span><span className="v">{counts.users}</span></li>
        <li><span className="k">Sessions</span><span className="v">{counts.sessions}</span></li>
        <li><span className="k">Session logs</span><span className="v">{counts.sessionLogs}</span></li>
        <li><span className="k">Weekly check-ins</span><span className="v">{counts.weeklyCheckins}</span></li>
        <li><span className="k">Reassessments</span><span className="v">{counts.reassessments}</span></li>
      </ul>

      <h2 className="h3">Plan</h2>
      <div className="settings-group">
        <button className="settings-row" onClick={handleClearPlan}>
          <span>Clear plan &amp; start over</span>
          <span className="sr-meta">↻</span>
        </button>
      </div>
      <p className="sub" style={{ fontSize: 11, marginBottom: 20 }}>
        Rebuilds your plan from fresh setup answers. Keeps your history, logged sessions and tracked lift weights.
      </p>

      <h2 className="h3">About</h2>
      <ul className="kv-list">
        <li><span className="k">Version</span><span className="v">2.0 React</span></li>
        <li><span className="k">Schema</span><span className="v">v4</span></li>
        <li><span className="k">Storage</span><span className="v">Local (this device)</span></li>
      </ul>

      <h2 className="h3">Account</h2>
      {authStatus === 'signed_in' && user ? (
        <>
          <ul className="kv-list">
            <li><span className="k">Signed in as</span><span className="v">{user.email}</span></li>
          </ul>

          {!pwOpen ? (
            <button
              className="settings-row"
              onClick={() => { setPwOpen(true); setPwMsg(null); }}
              style={{ marginTop: 4 }}
            >
              <span>Set / change password</span>
              <span className="sr-meta">›</span>
            </button>
          ) : (
            <div style={{
              marginTop: 8, padding: '14px 16px', borderRadius: 12,
              border: '1px solid var(--hairline)', background: 'var(--bg-surface)'
            }}>
              <div style={{ fontSize: 13, color: 'var(--txt-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                Set a password for {user.email}. You'll use it to sign in next time.
              </div>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="New password (min 6 characters)"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                style={{
                  width: '100%', boxSizing: 'border-box', fontSize: 16, padding: '12px 14px',
                  borderRadius: 11, border: '1px solid var(--hairline)', background: 'var(--bg-surface-2)',
                  fontFamily: 'inherit', color: 'var(--txt-strong)', marginBottom: 10
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSetPassword}
                  style={{
                    flex: 1, padding: 12, borderRadius: 11, border: 'none',
                    background: 'var(--rust)', color: '#fff', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >
                  Save password
                </button>
                <button
                  onClick={() => { setPwOpen(false); setNewPw(''); setPwMsg(null); }}
                  style={{
                    padding: '12px 18px', borderRadius: 11, border: '1px solid var(--hairline)',
                    background: 'transparent', color: 'var(--txt-muted)', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >
                  Cancel
                </button>
              </div>
              {pwMsg && (
                <div style={{ fontSize: 13, marginTop: 10, color: pwMsg.includes('✓') ? 'var(--moss)' : 'var(--rust)' }}>
                  {pwMsg}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => { if (confirm('Sign out of this device?')) signOut(); }}
            style={{
              width: '100%', padding: 13, marginTop: 10, borderRadius: 11,
              border: '1px solid var(--hairline)', background: 'transparent',
              color: 'var(--rust)', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            Sign out
          </button>

          {/* Lighter reset — wipe history, keep the account + plan */}
          <button
            onClick={handleWipeData}
            style={{ width: '100%', padding: 13, marginTop: 10, borderRadius: 11, border: '1px solid var(--hairline)', background: 'transparent', color: 'var(--txt-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Delete my training data
          </button>

          {/* Danger zone — permanent account deletion */}
          {!delOpen ? (
            <button
              onClick={() => { setDelOpen(true); setDelMsg(null); setDelText(''); }}
              style={{ width: '100%', padding: 13, marginTop: 10, borderRadius: 11, border: '1px solid var(--hairline)', background: 'transparent', color: 'var(--rust)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Delete account
            </button>
          ) : (
            <div style={{ marginTop: 10, padding: '14px 16px', borderRadius: 12, border: '1px solid var(--rust)', background: 'var(--bg-surface)' }}>
              <div style={{ fontSize: 13, color: 'var(--txt-strong)', fontWeight: 700, marginBottom: 6 }}>Permanently delete your account</div>
              <div style={{ fontSize: 12.5, color: 'var(--txt-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                This erases your account and all your data everywhere — sessions, metrics, plan and tracked lifts. It can't be undone. Type <strong>DELETE</strong> to confirm.
              </div>
              <input
                value={delText}
                onChange={e => setDelText(e.target.value)}
                placeholder="DELETE"
                style={{ width: '100%', boxSizing: 'border-box', fontSize: 16, padding: '12px 14px', borderRadius: 11, border: '1px solid var(--hairline)', background: 'var(--bg-surface-2)', fontFamily: 'inherit', color: 'var(--txt-strong)', marginBottom: 10 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleDeleteAccount} style={{ flex: 1, padding: 12, borderRadius: 11, border: 'none', background: 'var(--rust)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Delete forever</button>
                <button onClick={() => { setDelOpen(false); setDelText(''); setDelMsg(null); }} style={{ padding: '12px 18px', borderRadius: 11, border: '1px solid var(--hairline)', background: 'transparent', color: 'var(--txt-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              </div>
              {delMsg && <div style={{ fontSize: 13, marginTop: 10, color: 'var(--rust)' }}>{delMsg}</div>}
            </div>
          )}
        </>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--txt-muted)' }}>
          Not signed in. Data is stored locally on this device only.
        </p>
      )}
    </>
  );
}
