/**
 * authStore — tracks Supabase auth session and exposes sign-in / sign-out.
 *
 * Primary auth is email + password + name (signUp / signInWithPassword) with
 * password reset. The older email-OTP methods (signInWithEmail / verifyOtp) are
 * kept as a fallback. This store listens to auth state changes and keeps `user`
 * current. Account creation is gated by a server-side invite allowlist.
 *
 * Graceful degradation: if Supabase isn't configured (no env keys), the store
 * reports a "not configured" state and the app can fall back to local-only mode.
 *
 * IMPORTANT: this store only handles WHO you are. It does NOT touch training
 * data — that stays in the Database/trainingStore until Session C wires sync.
 */

import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

// Import lazily to avoid circular dependency (authStore ← trainingStore ← Database)
function getTrainingStore() {
  return import('./trainingStore.js').then(m => m.useTrainingStore);
}

async function syncAfterSignIn() {
  try {
    const useTrainingStore = await getTrainingStore();
    useTrainingStore.getState().syncFromCloud();
  } catch (e) {
    console.warn('[authStore] syncAfterSignIn failed:', e);
  }
}

export const useAuthStore = create((set, get) => ({
  // 'loading' until we've checked for an existing session
  status: 'loading',          // 'loading' | 'signed_in' | 'signed_out' | 'not_configured'
  user: null,                 // Supabase user object (has .id, .email)
  sendingLink: false,         // true while a code is being sent
  linkSentTo: null,           // email the code was sent to (drives step 2 UI)
  verifyingOtp: false,        // true while the entered code is being verified
  signingUp: false,           // true while a signUp request is in flight
  signingIn: false,           // true while a password sign-in is in flight
  resetSent: false,           // true once a password-reset email has been sent
  confirmEmailSent: null,     // email a confirmation link was sent to (sign-up)
  recoveryMode: false,        // true after a reset link opens the app (set new password)
  errorMessage: null,

  // Send a magic link to the given email
  async signInWithEmail(email) {
    if (!isSupabaseConfigured) {
      set({ errorMessage: 'Supabase is not configured. Add keys to .env.local.' });
      return;
    }
    set({ sendingLink: true, errorMessage: null });
    const redirectTo = window.location.origin + import.meta.env.BASE_URL;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo }
    });
    if (error) {
      set({ sendingLink: false, errorMessage: error.message });
    } else {
      set({ sendingLink: false, linkSentTo: email.trim() });
    }
  },

  // Verify the 6-digit OTP code the user received by email.
  // On success the onAuthStateChange listener fires SIGNED_IN and handles the rest.
  async verifyOtp(email, token) {
    set({ verifyingOtp: true, errorMessage: null });
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: token.trim(),
      type: 'email'
    });
    if (error) {
      set({ verifyingOtp: false, errorMessage: error.message });
    } else {
      set({ verifyingOtp: false });
    }
  },

  // Create a new account with email + password + name.
  // The DB allowlist trigger rejects emails that aren't invited — GoTrue masks
  // that as a generic "Database error", which we translate to a friendly note.
  async signUp(email, password, name) {
    if (!isSupabaseConfigured) {
      set({ errorMessage: 'Supabase is not configured. Add keys to .env.local.' });
      return;
    }
    set({ signingUp: true, errorMessage: null, resetSent: false });
    const redirectTo = window.location.origin + import.meta.env.BASE_URL;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: (name || '').trim() }, emailRedirectTo: redirectTo }
    });
    if (error) {
      // The allowlist rejection surfaces as a 500 "Database error saving new user".
      const msg = /database error/i.test(error.message)
        ? "This email isn't on the invite list yet. Ask Simon to add you."
        : error.message;
      if (/database error/i.test(error.message)) console.warn('[authStore] signUp DB error:', error.message);
      set({ signingUp: false, errorMessage: msg });
      return;
    }
    // With email confirmation ON, signUp returns a user but no session.
    // With it OFF, a session is created and onAuthStateChange signs them in.
    if (data.session) {
      set({ signingUp: false });
    } else {
      set({ signingUp: false, confirmEmailSent: email.trim() });
    }
  },

  // Sign in with an existing email + password. Success is handled by the
  // onAuthStateChange listener (SIGNED_IN) set up in init().
  async signInWithPassword(email, password) {
    if (!isSupabaseConfigured) {
      set({ errorMessage: 'Supabase is not configured. Add keys to .env.local.' });
      return;
    }
    set({ signingIn: true, errorMessage: null, resetSent: false });
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) {
      set({ signingIn: false, errorMessage: error.message });
    } else {
      set({ signingIn: false });
    }
  },

  // Email a password-reset link. The link returns to the app where the user
  // can set a new password (recovery handling is wired in init()).
  async sendPasswordReset(email) {
    if (!isSupabaseConfigured) {
      set({ errorMessage: 'Supabase is not configured. Add keys to .env.local.' });
      return;
    }
    set({ errorMessage: null });
    const redirectTo = window.location.origin + import.meta.env.BASE_URL;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) {
      set({ errorMessage: error.message });
    } else {
      set({ resetSent: true });
    }
  },

  // Clear the "code sent" / "confirm email" / "reset sent" states.
  resetLinkSent() {
    set({ linkSentTo: null, confirmEmailSent: null, resetSent: false, errorMessage: null });
  },

  // Set a new password. Used both from the reset-link recovery flow and from
  // a normal signed-in "change password" action.
  async updatePassword(password) {
    if (!isSupabaseConfigured) return;
    set({ errorMessage: null });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      set({ errorMessage: error.message });
      return false;
    }
    set({ recoveryMode: false });
    return true;
  },

  async signOut() {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    set({ status: 'signed_out', user: null, linkSentTo: null, recoveryMode: false });
  },

  // Called once at startup to check for an existing session and subscribe
  // to future auth changes.
  async init() {
    if (!isSupabaseConfigured) {
      set({ status: 'not_configured' });
      return;
    }
    const { data } = await supabase.auth.getSession();
    set({
      status: data.session ? 'signed_in' : 'signed_out',
      user: data.session ? data.session.user : null
    });
    // Sync on startup if already signed in (not just on fresh sign-in events)
    if (data.session) syncAfterSignIn();
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        status: session ? 'signed_in' : 'signed_out',
        user: session ? session.user : null,
        linkSentTo: null,
        // A reset link opens the app in recovery mode → prompt for a new password.
        recoveryMode: _event === 'PASSWORD_RECOVERY'
      });
      // When signing IN (not out), pull fresh data from Supabase
      if (session && _event === 'SIGNED_IN') {
        syncAfterSignIn();
      }
    });
  }
}));

export default useAuthStore;
