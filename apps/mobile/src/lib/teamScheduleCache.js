/**
 * teamScheduleCache — the player-side cache of their team's coach-set schedule
 * (`teams.schedule`, member-read RLS). Plan generation is synchronous, so the
 * schedule is cached here (namespaced localStorage via Storage — per-account,
 * like every other cache) and refreshed by the store on sign-in sync and on
 * join/leave. A raw value is stored as fetched; the engine's parseTeamSchedule
 * decides validity at the point of use.
 */
import * as Storage from './Storage.js';

const KEY = 'htp_team_schedule_v1';

/** The raw schedule (or null). Consumers pass it to applyTeamSchedule. */
export function getTeamSchedule() {
  return Storage.load(KEY, null);
}

export function setTeamSchedule(raw) {
  if (raw == null) Storage.remove(KEY);
  else Storage.save(KEY, raw);
}

export default { getTeamSchedule, setTeamSchedule };
