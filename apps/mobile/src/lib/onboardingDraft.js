/**
 * onboardingDraft — localStorage draft of in-progress onboarding answers, so
 * backgrounding/closing the app mid-wizard doesn't lose everything. Deliberately
 * NOT SyncService: this is transient UI state with no user row yet, cleared the
 * moment onboarding completes. Stale drafts (>7 days) are ignored and removed.
 */
export const DRAFT_KEY = 'onboarding_draft_v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function saveDraft(answers, step) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, step, savedAt: Date.now() })); } catch { /* storage full/blocked — drafting is best-effort */ }
}
export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || !d.answers || Date.now() - (d.savedAt || 0) > MAX_AGE_MS) { clearDraft(); return null; }
    return d;
  } catch { return null; }
}
export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}
