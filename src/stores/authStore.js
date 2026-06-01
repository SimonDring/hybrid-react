/**
 * authStore — tracks Supabase auth session and exposes sign-in / sign-out.
 *
 * Uses Supabase Auth with email magic-link (passwordless). On sign-in, Supabase
 * emails a link; clicking it redirects back to the app and establishes a
 * session. This store listens to auth state changes and keeps `user` current.
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
  sendingLink: false,         // true while a magic link is being sent
  linkSentTo: null,           // email the link was sent to (for the "check your inbox" UI)
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

  // Clear the "link sent" state (e.g. to try a different email)
  resetLinkSent() {
    set({ linkSentTo: null, errorMessage: null });
  },

  async signOut() {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    set({ status: 'signed_out', user: null, linkSentTo: null });
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
    supabase.auth.onAuthStateChange((_event, session) => {
      const wasSignedOut = !session;
      set({
        status: session ? 'signed_in' : 'signed_out',
        user: session ? session.user : null,
        linkSentTo: null
      });
      // When signing IN (not out), pull fresh data from Supabase
      if (session && _event === 'SIGNED_IN') {
        syncAfterSignIn();
      }
    });
  }
}));

export default useAuthStore;
