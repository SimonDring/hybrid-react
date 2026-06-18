/**
 * Welcome — the auth landing screen. Two clear paths (Sign in / Create account)
 * plus Apple/Google social sign-in. Social buttons both create and sign in: a
 * brand-new social user lands in onboarding (App.jsx routes by whether a plan
 * exists), a returning one lands in the app.
 */

import { useAuthStore } from '../../stores/authStore.js';
import { Shell, BTN_PRIMARY, BTN_GHOST, BTN_SOCIAL } from './authShell.jsx';

export default function Welcome({ onSignIn, onCreate }) {
  const signInWithOAuth = useAuthStore(s => s.signInWithOAuth);
  const errorMessage = useAuthStore(s => s.errorMessage);
  return (
    <Shell heading="Welcome" sub="Train smarter. Sign in or create your account to get started.">
      <button style={BTN_SOCIAL} onClick={() => signInWithOAuth('apple')}> Continue with Apple</button>
      <button style={BTN_SOCIAL} onClick={() => signInWithOAuth('google')}>Continue with Google</button>
      <div style={{ height: 8 }} />
      <button style={BTN_PRIMARY(true)} onClick={onCreate}>Create account</button>
      <button style={BTN_GHOST} onClick={onSignIn}>Sign in</button>
      {errorMessage && <p style={{ fontSize: 13, color: 'var(--rust)', marginTop: 14 }}>{errorMessage}</p>}
    </Shell>
  );
}
