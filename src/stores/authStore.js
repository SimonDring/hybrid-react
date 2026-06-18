/**
 * authStore — tracks Supabase auth session and exposes sign-in / sign-out.
 *
 * Primary auth is email + password + name (signUp / signInWithPassword) with
 * password reset, plus Apple/Google OAuth (signInWithOAuth). The older email-OTP
 * methods (signInWithEmail / verifyOtp) are kept as a fallback. This store listens
 * to auth state changes and keeps `user` current. Signup is open to anyone.
 *
 * Graceful degradation: if Supabase isn't configured (no env keys), the store
 * reports a "not configured" state and the app can fall back to local-only mode.
 *
 * IMPORTANT: this store only handles WHO you are. It does NOT touch training
 * data — that stays in the Database/trainingStore until Session C wires sync.
 */

import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import Database from '../lib/Database.js';
import * as Storage from '../lib/Storage.js';
import { deleteAccount as deleteCloudAccount } from '../lib/SyncService.js';

// Point the on-device cache at the right account, then reload the in-memory
// Database so the UI only ever sees the active user's data. Runs on first load
// and on every auth-state change. `session` is null when signed out.
function applyNamespaceForSession(session) {
  const target = session?.user?.id || 'anon';
  Storage.setNamespace(target);
  // One-time per device: fold any pre-namespacing bare keys into this namespace.
  Storage.migrateUnnamespacedKeysOnce(target);
  // One-time per user: adopt anon data if this account has none yet.
  if (session) Storage.adoptAnonDataOnce(target);
  Database.services.reloadFromStorage();
}

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

  // Create a new account with email + password + name. Signup is open (the invite
  // allowlist was removed in migration 004), so any email may create an account.
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
      set({ signingUp: false, errorMessage: error.message });
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

  // Start an OAuth sign-in (Google or Apple). Redirects away and returns to the
  // app; supabaseClient's detectSessionInUrl finishes the session, and the
  // onAuthStateChange listener applies the namespace + pulls data.
  async signInWithOAuth(provider) {
    if (!isSupabaseConfigured) {
      set({ errorMessage: 'Supabase is not configured. Add keys to .env.local.' });
      return;
    }
    set({ errorMessage: null });
    const redirectTo = window.location.origin + import.meta.env.BASE_URL;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });
    if (error) set({ errorMessage: error.message });
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
      // "Auth session missing!" means the (often old) session has lapsed. Bounce
      // to sign-in so they can get a fresh session (e.g. via an email code) and
      // try again — rather than showing a dead-end error.
      if (/session/i.test(error.message)) {
        set({ status: 'signed_out', user: null, errorMessage: 'Your session expired — sign in again, then set your password.' });
      } else {
        set({ errorMessage: error.message });
      }
      return false;
    }
    set({ recoveryMode: false });
    // Strip any recovery token from the URL so a reload doesn't re-enter recovery.
    if (typeof window !== 'undefined' && /type=recovery|access_token|[?&]code=/.test(window.location.href)) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    return true;
  },

  async signOut() {
    if (!isSupabaseConfigured) return;
    const ns = Storage.getNamespace();
    await supabase.auth.signOut();
    // Belt-and-braces: wipe this account's on-device cache so nothing lingers
    // before the next sign-in, then point the cache at the anonymous namespace.
    if (ns && ns !== 'anon') Storage.clearNamespace(ns);
    Storage.setNamespace('anon');
    Database.services.reloadFromStorage();
    set({ status: 'signed_out', user: null, linkSentTo: null, recoveryMode: false });
  },

  // Permanently delete the account: wipe cloud data + the auth user (server-side),
  // then clear this device and sign out. Returns true on success.
  async deleteAccount() {
    const res = await deleteCloudAccount();
    if (!res.ok) {
      set({ errorMessage: res.error || 'Could not delete your account. Please try again.' });
      return false;
    }
    Database.services.resetAll();                 // clear local cache on this device
    if (isSupabaseConfigured) await supabase.auth.signOut();
    set({ status: 'signed_out', user: null, linkSentTo: null, recoveryMode: false, errorMessage: null });
    return true;
  },

  // Called once at startup to check for an existing session and subscribe
  // to future auth changes.
  async init() {
    if (!isSupabaseConfigured) {
      set({ status: 'not_configured' });
      return;
    }

    // A password-reset link lands the app here. Detect recovery from the URL up
    // front: depending on the auth flow the recovery shows up as a hash/query
    // `type=recovery` (implicit) or as a code exchange that fires the
    // PASSWORD_RECOVERY event (PKCE). Catching both — and keeping recoveryMode
    // "sticky" — is what reliably routes the user to the set-new-password screen.
    if (/type=recovery/.test(window.location.href)) {
      set({ recoveryMode: true });
    }

    // Subscribe BEFORE getSession so we can't miss an early PASSWORD_RECOVERY.
    supabase.auth.onAuthStateChange((event, session) => {
      applyNamespaceForSession(session);
      set((prev) => ({
        status: session ? 'signed_in' : 'signed_out',
        user: session ? session.user : null,
        linkSentTo: null,
        recoveryMode: event === 'PASSWORD_RECOVERY' ? true : prev.recoveryMode
      }));
      // Pull data on a real sign-in — but not mid password-reset.
      if (session && event === 'SIGNED_IN' && !get().recoveryMode) {
        syncAfterSignIn();
      }
    });

    const { data } = await supabase.auth.getSession();
    applyNamespaceForSession(data.session);
    set((prev) => ({
      status: data.session ? 'signed_in' : 'signed_out',
      user: data.session ? data.session.user : null,
      recoveryMode: prev.recoveryMode
    }));
    if (data.session && !get().recoveryMode) syncAfterSignIn();
  }
}));

export default useAuthStore;
