/**
 * AuthFlow — container for the signed-out experience. Holds which auth sub-screen
 * is showing (Welcome / Sign in / Create account) and renders it. Replaces the
 * old combined Login screen; App.jsx renders this when signed out.
 */

import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import Welcome from './Welcome.jsx';
import SignIn from './SignIn.jsx';
import CreateAccount from './CreateAccount.jsx';

export default function AuthFlow() {
  const [screen, setScreen] = useState('welcome'); // 'welcome' | 'signin' | 'create'
  const clearError = () => useAuthStore.setState({ errorMessage: null });
  const go = (s) => { clearError(); setScreen(s); };

  if (screen === 'signin') return <SignIn onBack={() => go('welcome')} />;
  if (screen === 'create') return <CreateAccount onBack={() => go('welcome')} />;
  return <Welcome onSignIn={() => go('signin')} onCreate={() => go('create')} />;
}
