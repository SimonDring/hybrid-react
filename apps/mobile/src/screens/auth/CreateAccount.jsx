/**
 * CreateAccount — name + email + password account creation. Signup is open (no
 * invite allowlist). On success the user lands in the onboarding wizard (routed
 * by App.jsx, since a new account has no plan yet). If email confirmation is on,
 * we show a "check your email" note instead.
 */

import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import { Shell, INPUT, BTN_PRIMARY, BTN_GHOST } from './authShell.jsx';

export default function CreateAccount({ onBack }) {
  const signUp = useAuthStore(s => s.signUp);
  const signingUp = useAuthStore(s => s.signingUp);
  const errorMessage = useAuthStore(s => s.errorMessage);
  const confirmEmailSent = useAuthStore(s => s.confirmEmailSent);
  const resetLinkSent = useAuthStore(s => s.resetLinkSent);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const validPassword = password.length >= 8;
  const validName = name.trim().length > 0;
  const canSignUp = validName && validEmail && validPassword && !signingUp;
  const submit = () => { if (canSignUp) signUp(email, password, name); };

  if (confirmEmailSent) {
    return (
      <Shell heading="Check your email"
             sub={`We sent a confirmation link to ${confirmEmailSent}. Click it to finish creating your account, then come back and sign in.`}>
        <button onClick={() => { resetLinkSent(); onBack(); }} style={BTN_GHOST}>Back</button>
      </Shell>
    );
  }

  return (
    <Shell heading="Create your account" sub="Set up your account to start building your plan.">
      <input type="text" autoCapitalize="words" placeholder="Your name" value={name}
        onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} style={INPUT} />
      <input type="email" inputMode="email" autoCapitalize="off" autoCorrect="off"
        placeholder="you@example.com" value={email}
        onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} style={INPUT} />
      <input type="password" autoComplete="new-password"
        placeholder="Choose a password (min 8 characters)" value={password}
        onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} style={INPUT} />
      <button onClick={submit} disabled={!canSignUp} style={BTN_PRIMARY(canSignUp)}>
        {signingUp ? 'Creating…' : 'Create account'}
      </button>
      <button onClick={onBack} style={BTN_GHOST}>Back</button>
      {errorMessage && <p style={{ fontSize: 13, color: 'var(--rust)', marginTop: 14 }}>{errorMessage}</p>}
    </Shell>
  );
}
