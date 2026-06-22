/**
 * SetNewPassword — shown when a password-reset link opens the app.
 *
 * Supabase fires PASSWORD_RECOVERY on auth state change; authStore sets
 * recoveryMode, and App.jsx renders this screen instead of the tab app until
 * the user sets a new password (or we clear recovery on success).
 */

import { useState } from 'react';
import { useAuthStore } from '../stores/authStore.js';

const INPUT = {
  width: '100%', fontSize: 16, padding: '14px 16px', borderRadius: 12,
  border: '1px solid var(--hairline)', background: 'var(--bg-surface)',
  fontFamily: 'inherit', color: 'var(--txt-strong)', marginBottom: 12,
  boxSizing: 'border-box'
};
const BTN = (active) => ({
  width: '100%', padding: 15, borderRadius: 12, border: 'none',
  background: active ? 'var(--rust)' : 'var(--bg-surface-2)',
  color: active ? '#fff' : 'var(--txt-muted)',
  fontSize: 15, fontWeight: 600, cursor: active ? 'pointer' : 'default',
  fontFamily: 'inherit'
});

export default function SetNewPassword() {
  const updatePassword = useAuthStore(s => s.updatePassword);
  const errorMessage   = useAuthStore(s => s.errorMessage);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const valid = password.length >= 8;
  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    await updatePassword(password);   // on success, recoveryMode clears → app renders
    setSaving(false);
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '32px 24px', maxWidth: 440, margin: '0 auto'
    }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 10 }}>
          Hybrid Training
        </div>
        <h1 className="h1" style={{ marginBottom: 8 }}>Set a new password</h1>
        <p className="sub" style={{ marginBottom: 0 }}>Choose a new password for your account.</p>
      </div>
      <input type="password" autoComplete="new-password"
        placeholder="New password (min 8 characters)" value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()} style={INPUT} autoFocus />
      <button onClick={submit} disabled={!valid || saving} style={BTN(valid && !saving)}>
        {saving ? 'Saving…' : 'Save new password'}
      </button>
      {errorMessage && <p style={{ fontSize: 13, color: 'var(--rust)', marginTop: 14 }}>{errorMessage}</p>}
    </div>
  );
}
