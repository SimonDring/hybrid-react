/**
 * Login screen — email magic-link sign-in.
 *
 * Shown by App.jsx when the user is signed out. Two states:
 *   1. Email entry form
 *   2. "Check your inbox" confirmation after the link is sent
 *
 * No password. Supabase emails a one-time link; clicking it signs you in and
 * redirects back here, where the auth store flips to signed_in and App swaps
 * to the real app.
 */

import { useState } from 'react';
import { useAuthStore } from '../stores/authStore.js';

export default function Login() {
  const signInWithEmail = useAuthStore(s => s.signInWithEmail);
  const resetLinkSent = useAuthStore(s => s.resetLinkSent);
  const sendingLink = useAuthStore(s => s.sendingLink);
  const linkSentTo = useAuthStore(s => s.linkSentTo);
  const errorMessage = useAuthStore(s => s.errorMessage);
  const status = useAuthStore(s => s.status);

  const [email, setEmail] = useState('');

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const submit = () => {
    if (!valid) return;
    signInWithEmail(email);
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
        <h1 className="h1" style={{ marginBottom: 8 }}>
          {linkSentTo ? 'Check your inbox' : 'Sign in'}
        </h1>
        <p className="sub" style={{ marginBottom: 0 }}>
          {linkSentTo
            ? `We sent a sign-in link to ${linkSentTo}. Open it on this device to continue.`
            : 'Enter your email and we\u2019ll send you a secure sign-in link. No password needed.'}
        </p>
      </div>

      {status === 'not_configured' && (
        <div style={{
          padding: '14px 16px', borderRadius: 12, marginBottom: 20,
          background: 'rgba(176,74,46,0.08)', border: '1px solid rgba(176,74,46,0.25)',
          fontSize: 13, lineHeight: 1.5, color: 'var(--txt-body)'
        }}>
          Supabase isn't configured yet. Add your keys to <code>.env.local</code> and restart the dev server.
        </div>
      )}

      {!linkSentTo ? (
        <>
          <input
            type="email"
            inputMode="email"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            style={{
              width: '100%', fontSize: 16, padding: '14px 16px', borderRadius: 12,
              border: '1px solid var(--hairline)', background: 'var(--bg-surface)',
              fontFamily: 'inherit', color: 'var(--txt-strong)', marginBottom: 12
            }}
          />
          <button
            onClick={submit}
            disabled={!valid || sendingLink}
            style={{
              width: '100%', padding: 15, borderRadius: 12, border: 'none',
              background: valid && !sendingLink ? 'var(--rust)' : 'var(--bg-surface-2)',
              color: valid && !sendingLink ? '#fff' : 'var(--txt-muted)',
              fontSize: 15, fontWeight: 600, cursor: valid && !sendingLink ? 'pointer' : 'default',
              fontFamily: 'inherit', transition: 'background 0.15s'
            }}
          >
            {sendingLink ? 'Sending\u2026' : 'Send sign-in link'}
          </button>
        </>
      ) : (
        <button
          onClick={resetLinkSent}
          style={{
            width: '100%', padding: 14, borderRadius: 12,
            border: '1px solid var(--hairline)', background: 'transparent',
            color: 'var(--txt-muted)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit'
          }}
        >
          Use a different email
        </button>
      )}

      {errorMessage && (
        <p style={{ fontSize: 13, color: 'var(--rust)', marginTop: 14 }}>{errorMessage}</p>
      )}

      <p style={{ fontSize: 11, opacity: 0.5, marginTop: 28, lineHeight: 1.5 }}>
        Your data is private to your account. Signing in lets it sync across your devices.
      </p>
    </div>
  );
}
