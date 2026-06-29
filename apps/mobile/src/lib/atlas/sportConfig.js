/**
 * sportConfig — resolves a profile to its Atlas pillar config. Authored SKB sports
 * (gaelic_football, hurling, swimming, and any future fully-authored sport) drive the
 * radar from their `atlas` block; run sub-disciplines + cycle keep the legacy pillar
 * sets (ported verbatim from the retired data/sports/index.js, so existing run/cycle
 * users' radars are unchanged). Pillar scoring still lives in athletePillars.js + signals.js.
 */
import skb, { normalizeSportId } from '@performance-os/engine/lib/sportKnowledge/index.js';

export const LEGACY = {
  run_sprint: { key: 'run_sprint', label: 'Sprint runner', family: 'power',     pillars: ['explosive','speed_strength','strength','core','anaerobic','recovery','consistency'] },
  run_middle: { key: 'run_middle', label: 'Middle-distance runner', family: 'mixed', pillars: ['aerobic','lower_power','durability','core','strength','recovery','consistency'] },
  run_long:   { key: 'run_long', label: 'Distance runner', family: 'endurance',  pillars: ['aerobic','durability','lower_power','core','strength','recovery','consistency'] },
  cycle:      { key: 'cycle', label: 'Cyclist', family: 'endurance',            pillars: ['aerobic','leg_power','hip_stability','core','strength','recovery','consistency'] },
  build:      { key: 'build', label: 'Strength athlete', family: 'mixed',       pillars: ['strength','upper_body','lower_body','core','recovery','consistency'] }
};

export function sportConfigFor(profile = {}) {
  if (profile.goal_type === 'sport' && profile.sport) {
    const p = skb.get(normalizeSportId(profile.sport));
    if (p && p.atlas && Array.isArray(p.atlas.pillars)) {
      return { key: p.id, label: p.label, family: p.atlas.family || 'mixed', pillars: p.atlas.pillars };
    }
    if (profile.sport === 'run') return LEGACY[`run_${profile.run_discipline || 'middle'}`] || LEGACY.run_middle;
    if (LEGACY[profile.sport]) return LEGACY[profile.sport];
  }
  return LEGACY.build;
}
export default { sportConfigFor, LEGACY };
