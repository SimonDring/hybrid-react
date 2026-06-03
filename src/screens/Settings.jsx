import { useState } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import { useAuthStore } from '../stores/authStore.js';
import Database from '../lib/Database.js';
import { runSessionDMigration, getFitbitAuthUrl } from '../lib/SyncService.js';

export default function Settings() {
  const [theme, setTheme] = useState(localStorage.getItem('htp_theme') || 'auto');
  const [migrationStatus, setMigrationStatus] = useState(
    localStorage.getItem('htp_session_d_migrated') ? 'done' : 'idle'
  );
  const replaceAll = useTrainingStore(state => state.replaceAll);
  const resetAll = useTrainingStore(state => state.resetAll);
  const fitbitConnection        = useTrainingStore(s => s.fitbitConnection);
  const fitbitSyncing           = useTrainingStore(s => s.fitbitSyncing);
  const syncFitbitToday         = useTrainingStore(s => s.syncFitbitToday);
  const refreshFitbitConnection = useTrainingStore(s => s.refreshFitbitConnection);
  const authStatus = useAuthStore(s => s.status);
  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);
  const updatePassword = useAuthStore(s => s.updatePassword);

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

  const connectFitbit = () => {
    if (!user) return;
    window.open(getFitbitAuthUrl(user.id), '_blank');
  };
  const lastSynced = fitbitConnection?.last_synced_at
    ? new Date(fitbitConnection.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

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
    if (meta) meta.setAttribute('content', isDark ? '#14110d' : '#f4f1ea');
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
      <div style={{
        padding: '14px 16px', borderRadius: 12, marginBottom: 8,
        border: '1px solid var(--hairline)', background: 'var(--bg-surface)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)' }}>
              {fitbitConnection ? 'Fitbit connected' : 'Connect Fitbit'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 2 }}>
              {fitbitConnection
                ? (lastSynced ? `Last synced today at ${lastSynced}` : 'Not yet synced today')
                : 'Auto-fills sleep, HR, HRV, steps, and more'}
            </div>
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
              border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', marginTop: 8
            }}
          >
            Already connected? Tap to check status
          </button>
        )}
      </div>
      <p className="sub" style={{ fontSize: 11, marginBottom: 20 }}>
        Your synced recovery and activity data appears under Tracking → Daily metrics.
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
        </>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--txt-muted)' }}>
          Not signed in. Data is stored locally on this device only.
        </p>
      )}
    </>
  );
}
