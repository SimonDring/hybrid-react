// Builds a Performance-Model demand profile from the SKB: base importances from the sport's
// physicalProfile, elevated for the chosen position's primary qualities. Pure; imports in-package
// SKB data directly (same pattern as estimation.js). Never throws on unknown sport/position.
import * as SKB from '../sportKnowledge/index.js';
import { mapSkbQuality } from '../../data/sportQualityMap.js';

const PRIMARY_FLOOR = 0.9;   // a position's primary qualities are at least this demanding

export function buildDemandProfile(sportId, positionId) {
  const profile = SKB.get(sportId);
  if (!profile || !profile.physicalProfile || !profile.physicalProfile.qualities) return [];

  // base: max importance per PM quality across all contributing SKB qualities
  const byPm = new Map(); // pmId → { importance, evidence }
  for (const [skbName, q] of Object.entries(profile.physicalProfile.qualities)) {
    const pm = mapSkbQuality(skbName);
    if (!pm || !q || typeof q.importance !== 'number') continue;
    const importance = Math.min(1, Math.max(0, q.importance / 10));
    const cur = byPm.get(pm);
    if (!cur || importance > cur.importance) byPm.set(pm, { importance, evidence: `skb:${sportId}:${skbName}` });
  }

  // position boost: elevate the position's primaryQualities to the floor
  const positions = SKB.section(sportId, 'positions') || [];
  const pos = positions.find((p) => p.name === positionId);
  if (pos && Array.isArray(pos.primaryQualities)) {
    for (const skbName of pos.primaryQualities) {
      const pm = mapSkbQuality(skbName);
      if (!pm) continue;
      const cur = byPm.get(pm) || { importance: 0, evidence: `skb:${sportId}:position` };
      if (cur.importance < PRIMARY_FLOOR) byPm.set(pm, { importance: PRIMARY_FLOOR, evidence: `skb:${sportId}:pos:${positionId}` });
    }
  }

  return [...byPm.entries()].map(([qualityId, v]) => ({ qualityId, importance: v.importance, source: 'skb', evidence: v.evidence }));
}
