/**
 * SessionHelper — convenience predicates for session state.
 * In the React version, calls Database directly (no State facade).
 */

import Database from './Database.js';

export function isCompleted(templateRef) {
  const status = Database.services.sessionStatus(templateRef);
  return status.status === 'completed';
}

export function isStarted(templateRef) {
  const status = Database.services.sessionStatus(templateRef);
  return status.status === 'in_progress';
}

export function data(templateRef) {
  const status = Database.services.sessionStatus(templateRef);
  if (!status.session) return null;
  const s = status.session;
  const log = status.log;
  return {
    completed: s.status === 'completed',
    startedAt: s.started_at || null,
    completedAt: s.completed_at || null,
    quality: log ? log.quality : null,
    energy: log ? log.energy : null,
    recovery: log ? log.recovery : null,
    notes: log ? (log.notes || '') : ''
  };
}

export default { isCompleted, isStarted, data };
