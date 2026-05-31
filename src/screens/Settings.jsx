import { useState } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import Database from '../lib/Database.js';

export default function Settings() {
  const [theme, setTheme] = useState(localStorage.getItem('htp_theme') || 'auto');
  const replaceAll = useTrainingStore(state => state.replaceAll);
  const resetAll = useTrainingStore(state => state.resetAll);

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
            <button className={theme === 'light' ? 'active' : ''} onClick={() => handleSetTheme('light')} style={{ flex: 1, padding: 8, fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: theme === 'light' ? 'var(--rust)' : 'transparent', color: theme === 'light' ? '#fff' : 'inherit', cursor: 'pointer' }}>Light</button>
            <button className={theme === 'dark' ? 'active' : ''} onClick={() => handleSetTheme('dark')} style={{ flex: 1, padding: 8, fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: theme === 'dark' ? 'var(--rust)' : 'transparent', color: theme === 'dark' ? '#fff' : 'inherit', cursor: 'pointer' }}>Dark</button>
            <button className={theme === 'auto' ? 'active' : ''} onClick={() => handleSetTheme('auto')} style={{ flex: 1, padding: 8, fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: theme === 'auto' ? 'var(--rust)' : 'transparent', color: theme === 'auto' ? '#fff' : 'inherit', cursor: 'pointer' }}>Auto</button>
          </div>
        </div>
      </div>

      <h2 className="h3">Data</h2>
      <div className="settings-group">
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
    </>
  );
}
